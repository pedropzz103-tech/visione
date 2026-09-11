import { normalizeTitle } from "../schema.mjs";

const COUNTRY_CODES = Object.freeze(["ES", "PT", "BR"]);
const LOCALE_LANGUAGE = Object.freeze({ es: "es-ES", pt: "pt-PT", br: "pt-BR" });
const OFFER_GROUPS = Object.freeze({
  flatrate: "subscription",
  free: "free",
  ads: "free",
  rent: "rent",
  buy: "buy"
});

const PROVIDER_ALIASES = new Map([
  ["netflix", "netflix"],
  ["amazon prime video", "prime-video"],
  ["prime video", "prime-video"],
  ["disney plus", "disney-plus"],
  ["disney+", "disney-plus"],
  ["max", "max"],
  ["hbo max", "max"],
  ["apple tv plus", "apple-tv"],
  ["apple tv+", "apple-tv"],
  ["apple tv", "apple-tv"],
  ["rakuten tv", "rakuten-tv"],
  ["pluto tv", "pluto-tv"]
]);

export function slugify(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function providerSlug(name = "") {
  const normalized = String(name).trim().toLowerCase();
  return PROVIDER_ALIASES.get(normalized) ?? slugify(normalized);
}

export function isFresh(snapshot, now = new Date(), maxAgeHours = 24) {
  const updated = Date.parse(snapshot?.availability_updated_at ?? snapshot?.updated_at);
  if (!Number.isFinite(updated) || !Number.isFinite(maxAgeHours) || maxAgeHours < 0) return false;
  return now.getTime() - updated <= maxAgeHours * 60 * 60 * 1000;
}

function mapCountryOffers(watchProviders) {
  const offers = { ES: [], PT: [], BR: [] };
  const status = { ES: "unknown", PT: "unknown", BR: "unknown" };
  const results = watchProviders?.results ?? {};

  for (const country of COUNTRY_CODES) {
    if (!Object.prototype.hasOwnProperty.call(results, country)) continue;
    const result = results[country] ?? {};
    const seen = new Set();

    for (const [group, monetization] of Object.entries(OFFER_GROUPS)) {
      for (const provider of result[group] ?? []) {
        const id = providerSlug(provider.provider_name);
        if (!id) continue;
        const key = `${id}:${monetization}`;
        if (seen.has(key)) continue;
        seen.add(key);
        offers[country].push({
          provider: id,
          monetization,
          price: null,
          currency: null,
          url: result.link ? String(result.link) : null,
          affiliate_url: null,
          is_affiliate: false,
          sponsored: false,
          attribution: ["Availability data: JustWatch via TMDB"]
        });
      }
    }

    status[country] = offers[country].length ? "available" : "unavailable";
  }

  return { offers, status };
}

function localizedValue(translations, locale, field, fallback) {
  const value = translations?.[locale]?.[field];
  return value == null || value === "" ? fallback : value;
}

export function mapTmdbTitle({ detail, watchProviders, mediaType, translations = {}, fetchedAt = new Date().toISOString() }) {
  if (!detail?.id) throw new Error("TMDB detail id is required");
  const type = mediaType === "tv" || mediaType === "series" ? "series" : "movie";
  const titleField = type === "series" ? "name" : "title";
  const originalField = type === "series" ? "original_name" : "original_title";
  const dateField = type === "series" ? "first_air_date" : "release_date";
  const fallbackTitle = detail[titleField] ?? detail[originalField];
  if (!fallbackTitle) throw new Error("TMDB title is required");

  const { offers, status } = mapCountryOffers(watchProviders);
  const titles = Object.fromEntries(Object.keys(LOCALE_LANGUAGE).map((locale) => [
    locale,
    localizedValue(translations, locale, titleField, fallbackTitle)
  ]));
  const overview = Object.fromEntries(Object.keys(LOCALE_LANGUAGE).map((locale) => [
    locale,
    localizedValue(translations, locale, "overview", detail.overview ?? "")
  ]));

  const directors = (detail.credits?.crew ?? [])
    .filter((person) => person.job === "Director")
    .map((person) => person.name)
    .filter(Boolean);
  const creators = (detail.created_by ?? [])
    .map((person) => person.name)
    .filter(Boolean);
  const cast = (detail.credits?.cast ?? [])
    .slice(0, 12)
    .map((person) => person.name)
    .filter(Boolean);

  return normalizeTitle({
    id: `${type}:${detail.id}`,
    type,
    slug: slugify(titles.es || titles.pt || titles.br || fallbackTitle),
    titles,
    original_title: detail[originalField] ?? fallbackTitle,
    year: Number.parseInt(String(detail[dateField] ?? "").slice(0, 4), 10) || null,
    runtime: detail.runtime ?? detail.episode_run_time?.[0] ?? null,
    seasons: type === "series" ? (detail.number_of_seasons ?? detail.seasons?.filter((season) => season.season_number > 0).length ?? null) : null,
    overview,
    genres: (detail.genres ?? []).map((genre) => genre.name).filter(Boolean),
    poster: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
    backdrop: detail.backdrop_path ? `https://image.tmdb.org/t/p/original${detail.backdrop_path}` : null,
    credits: {
      ...(directors[0] ? { director: directors[0] } : {}),
      ...(directors.length ? { directors } : {}),
      ...(creators[0] ? { creator: creators[0] } : {}),
      ...(creators.length ? { creators } : {}),
      cast
    },
    related: [],
    offers,
    availability_status: status,
    updated_at: fetchedAt,
    availability_updated_at: fetchedAt,
    source: {
      metadata: "TMDB",
      availability: "JustWatch via TMDB",
      attribution: ["Metadata: TMDB", "Availability data: JustWatch via TMDB"]
    }
  });
}

async function tmdbRequest(path, { token, baseUrl, language = null, appendCredits = false }) {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}${path}`);
  if (language) url.searchParams.set("language", language);
  if (appendCredits) url.searchParams.set("append_to_response", "credits");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`TMDB request failed with ${response.status} for ${url.pathname}`);
  return response.json();
}

export async function fetchTmdbTitle({ id, mediaType, token = process.env.TMDB_READ_ACCESS_TOKEN, baseUrl = "https://api.themoviedb.org/3", fetchedAt = new Date().toISOString() }) {
  if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN is required for TMDB ingestion");
  const resource = mediaType === "series" || mediaType === "tv" ? "tv" : "movie";
  const translations = {};

  for (const [locale, language] of Object.entries(LOCALE_LANGUAGE)) {
    translations[locale] = await tmdbRequest(`/${resource}/${id}`, { token, baseUrl, language, appendCredits: true });
  }

  const detail = translations.es;
  const watchProviders = await tmdbRequest(`/${resource}/${id}/watch/providers`, { token, baseUrl });
  return mapTmdbTitle({ detail, watchProviders, mediaType: resource, translations, fetchedAt });
}
