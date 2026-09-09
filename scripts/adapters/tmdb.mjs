import { normalizeTitle, validateTitle } from "../lib/catalog.mjs";

const countryCodes = ["ES", "PT", "BR"];
const localeLanguage = { es: "es-ES", pt: "pt-PT", br: "pt-BR" };
const offerGroups = {
  flatrate: "subscription",
  free: "free",
  ads: "free",
  rent: "rent",
  buy: "buy",
};

export function isFresh(snapshot, now = new Date(), maxAgeHours = 24) {
  const updated = Date.parse(snapshot?.updated_at);
  if (!Number.isFinite(updated) || !Number.isFinite(maxAgeHours) || maxAgeHours < 0) return false;
  return now.getTime() - updated <= maxAgeHours * 60 * 60 * 1000;
}

function mapCountryOffers(watchProviders, fetchedAt) {
  const offers = { ES: [], PT: [], BR: [] };
  const status = { ES: "unknown", PT: "unknown", BR: "unknown" };

  for (const country of countryCodes) {
    const result = watchProviders?.results?.[country];
    if (!result) continue;
    for (const [group, type] of Object.entries(offerGroups)) {
      for (const provider of result[group] ?? []) {
        offers[country].push({
          provider_id: String(provider.provider_id),
          provider_name: provider.provider_name,
          provider_logo: provider.logo_path ? `https://image.tmdb.org/t/p/original${provider.logo_path}` : null,
          type,
          price: null,
          currency: null,
          url: result.link,
          source_url: result.link,
          verified_at: fetchedAt,
          attribution: "Availability data supplied by JustWatch through TMDB",
        });
      }
    }
    status[country] = offers[country].length ? "confirmed" : "no_offers";
  }
  return { offers, status };
}

export function mapTmdbTitle({ detail, watchProviders, mediaType, translations = {}, fetchedAt = new Date().toISOString() }) {
  const type = mediaType === "tv" || mediaType === "series" ? "series" : "movie";
  const titleField = type === "series" ? "name" : "title";
  const originalField = type === "series" ? "original_name" : "original_title";
  const dateField = type === "series" ? "first_air_date" : "release_date";
  const { offers, status } = mapCountryOffers(watchProviders, fetchedAt);
  const localized = Object.fromEntries(Object.keys(localeLanguage).map((locale) => {
    const translated = translations[locale] ?? detail;
    return [locale, translated?.[titleField] ?? detail?.[titleField] ?? null];
  }));
  const overviews = Object.fromEntries(Object.keys(localeLanguage).map((locale) => {
    const translated = translations[locale] ?? detail;
    return [locale, translated?.overview ?? detail?.overview ?? null];
  }));

  return normalizeTitle({
    id: `${type}:${detail.id}`,
    type,
    slug: slugify(localized.es ?? localized.pt ?? localized.br ?? detail[titleField]),
    titles: localized,
    original_title: detail[originalField] ?? null,
    overview: overviews,
    year: Number.parseInt(detail[dateField]?.slice(0, 4), 10) || null,
    runtime_minutes: detail.runtime ?? detail.episode_run_time?.[0] ?? null,
    genres: (detail.genres ?? []).map((genre) => genre.name),
    countries: (detail.production_countries ?? detail.origin_country ?? []).map((country) => country.iso_3166_1 ?? country),
    keywords: (detail.keywords?.keywords ?? detail.keywords?.results ?? []).map((keyword) => keyword.name),
    poster: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
    backdrop: detail.backdrop_path ? `https://image.tmdb.org/t/p/original${detail.backdrop_path}` : null,
    credits: {
      directors: (detail.credits?.crew ?? []).filter((person) => person.job === "Director").map((person) => person.name),
      creators: (detail.created_by ?? []).map((person) => person.name),
      cast: (detail.credits?.cast ?? []).slice(0, 8).map((person) => person.name),
    },
    seasons: (detail.seasons ?? []).map((season) => ({ number: season.season_number, name: season.name, episode_count: season.episode_count })),
    offers,
    availability_status: status,
    source: {
      name: "The Movie Database (TMDB)",
      url: `https://www.themoviedb.org/${type === "series" ? "tv" : "movie"}/${detail.id}`,
      attribution: "Metadata from TMDB. Availability data from JustWatch through TMDB.",
    },
    updated_at: fetchedAt,
  });
}

export function slugify(value = "") {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function tmdbRequest(path, { token, baseUrl, language }) {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}${path}`);
  if (language) url.searchParams.set("language", language);
  url.searchParams.set("append_to_response", "credits,keywords");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!response.ok) throw new Error(`TMDB request failed with ${response.status} for ${url.pathname}`);
  return response.json();
}

export async function fetchTmdbTitle({ id, mediaType, token, baseUrl = "https://api.themoviedb.org/3", fetchedAt = new Date().toISOString() }) {
  if (!token) throw new Error("TMDB_READ_ACCESS_TOKEN is required for TMDB ingestion");
  const resource = mediaType === "series" || mediaType === "tv" ? "tv" : "movie";
  const translations = {};
  for (const [locale, language] of Object.entries(localeLanguage)) {
    translations[locale] = await tmdbRequest(`/${resource}/${id}`, { token, baseUrl, language });
  }
  const watchProviders = await tmdbRequest(`/${resource}/${id}/watch/providers`, { token, baseUrl });
  return validateTitle(mapTmdbTitle({ detail: translations.es, watchProviders, mediaType: resource, translations, fetchedAt }));
}
