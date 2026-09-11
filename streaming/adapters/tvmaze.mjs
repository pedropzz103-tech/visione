import { normalizeTitle } from "../schema.mjs";
import { slugify } from "./tmdb.mjs";

const COUNTRY_TO_LOCALE = Object.freeze({ ES: "es", PT: "pt", BR: "br" });
const DEFAULT_USER_AGENT = "VISIONE/1.0 (+https://visione.one/data-credits/)";

function compactStrings(values = []) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function plainText(html = "") {
  return String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedName(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function premiereYear(show) {
  return Number.parseInt(String(show?.premiered ?? "").slice(0, 4), 10) || null;
}

function localizedTitles(show) {
  const titles = { es: show.name ?? "", pt: show.name ?? "", br: show.name ?? "" };
  for (const aka of show?._embedded?.akas ?? []) {
    const locale = COUNTRY_TO_LOCALE[aka?.country?.code];
    if (locale && aka?.name) titles[locale] = String(aka.name).trim();
  }
  return titles;
}

function mappedCredits(show) {
  const creators = compactStrings(
    (show?._embedded?.crew ?? [])
      .filter((entry) => String(entry?.type ?? "").toLowerCase() === "creator")
      .map((entry) => entry?.person?.name)
  );
  const cast = compactStrings(
    (show?._embedded?.cast ?? [])
      .slice(0, 12)
      .map((entry) => entry?.person?.name)
  );

  return {
    ...(creators[0] ? { creator: creators[0] } : {}),
    ...(creators.length ? { creators } : {}),
    cast
  };
}

function mergeCredits(existing = {}, incoming = {}) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming ?? {})) {
    if (Array.isArray(value)) {
      if (value.length) merged[key] = value;
      continue;
    }
    if (typeof value === "string") {
      if (value.trim()) merged[key] = value;
      continue;
    }
    if (value !== undefined && value !== null) merged[key] = value;
  }
  return merged;
}

function seasonCount(show) {
  const numbered = (show?._embedded?.seasons ?? [])
    .map((season) => Number(season?.number))
    .filter((number) => Number.isInteger(number) && number > 0);
  return numbered.length ? new Set(numbered).size : null;
}

function discoveryScore(show) {
  const weight = Number(show?.weight) || 0;
  const rating = Number(show?.rating?.average) || 0;
  const year = premiereYear(show) || 1900;
  const recency = Math.max(0, Math.min(20, year - 2006));
  const image = show?.image?.original || show?.image?.medium ? 20 : 0;
  return weight + rating * 5 + recency + image;
}

export function mapTvmazeShow(show, { fetchedAt = new Date().toISOString(), discoveredAt = null, discoveryScore: sourceScore = null } = {}) {
  if (!show?.id) throw new Error("TVmaze show id is required");
  if (!show?.name) throw new Error("TVmaze show name is required");

  const titles = localizedTitles(show);
  const summary = plainText(show.summary);
  const sourceUrl = show.url ? String(show.url) : `https://www.tvmaze.com/shows/${show.id}`;
  const runtime = Number(show.averageRuntime ?? show.runtime) || null;
  const poster = show.image?.original ?? show.image?.medium ?? null;

  return normalizeTitle({
    id: `series:tvmaze:${show.id}`,
    type: "series",
    slug: slugify(show.name),
    titles,
    original_title: show.name,
    year: premiereYear(show),
    runtime,
    seasons: seasonCount(show),
    overview: { es: "", pt: "", br: "" },
    genres: compactStrings(show.genres ?? []),
    poster,
    backdrop: null,
    artwork: poster ? { kind: "source-image", source: "TVmaze", license: "CC BY-SA", source_url: sourceUrl } : { kind: "none", source: "TVmaze", license: "CC BY-SA" },
    discovery: { source: discoveredAt ? "tvmaze-web-schedule" : null, discovered_at: discoveredAt, score: sourceScore ?? discoveryScore(show) },
    rating: show.rating?.average ? { value: Number(show.rating.average), source: "TVmaze" } : null,
    credits: mappedCredits(show),
    related: [],
    offers: { ES: [], PT: [], BR: [] },
    availability_status: { ES: "unknown", PT: "unknown", BR: "unknown" },
    updated_at: fetchedAt,
    availability_updated_at: null,
    source: {
      metadata: "TVmaze",
      availability: "unconfigured",
      attribution: ["TV metadata: TVmaze (CC BY-SA)"],
      license: "CC BY-SA",
      tvmaze_id: Number(show.id),
      tvmaze_url: sourceUrl,
      external_ids: {
        imdb: show.externals?.imdb ?? null,
        thetvdb: show.externals?.thetvdb ?? null
      },
      source_summary: summary || null
    }
  });
}

export function mergeTvmazeIntoTitle(existingRaw, tvmazeRaw) {
  const existing = normalizeTitle(existingRaw);
  const tvmaze = normalizeTitle(tvmazeRaw);
  if (existing.type !== "series" || tvmaze.type !== "series") throw new Error("TVmaze metadata can only be merged into series records");

  const existingAttribution = Array.isArray(existing.source?.attribution) ? existing.source.attribution.map(String) : [];
  const tvmazeAttribution = Array.isArray(tvmaze.source?.attribution) ? tvmaze.source.attribution.map(String) : [];
  const hasTvmazePoster = Boolean(String(tvmaze.poster ?? "").trim());

  return normalizeTitle({
    ...existing,
    runtime: tvmaze.runtime ?? existing.runtime,
    seasons: tvmaze.seasons ?? existing.seasons,
    genres: tvmaze.genres.length ? tvmaze.genres : existing.genres,
    // TVmaze explicitly exposes direct image URLs for API clients. When a
    // real series poster is present, prefer it to a synthetic VISIONE fallback
    // while retaining TVmaze attribution and the source show URL.
    poster: hasTvmazePoster ? tvmaze.poster : existing.poster,
    backdrop: tvmaze.backdrop ?? existing.backdrop,
    artwork: hasTvmazePoster ? tvmaze.artwork : existing.artwork,
    rating: tvmaze.rating ?? existing.rating,
    credits: mergeCredits(existing.credits, tvmaze.credits),
    titles: existing.titles,
    overview: existing.overview,
    offers: existing.offers,
    availability_status: existing.availability_status,
    availability_updated_at: existing.availability_updated_at,
    discovery: existing.discovery?.source ? existing.discovery : tvmaze.discovery,
    updated_at: tvmaze.updated_at ?? existing.updated_at,
    source: {
      ...existing.source,
      ...tvmaze.source,
      metadata: "TVmaze",
      availability: existing.source?.availability ?? "unconfigured",
      attribution: compactStrings([...existingAttribution, ...tvmazeAttribution])
    }
  });
}

export function selectTvmazeCandidate(results = [], { name, year } = {}) {
  const targetName = normalizedName(name);
  const targetYear = Number(year) || null;
  if (!targetName || !targetYear) return null;

  const shows = results.map((entry) => entry?.show ?? entry).filter(Boolean);
  const exact = shows.filter((show) => normalizedName(show.name) === targetName && premiereYear(show) === targetYear);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const prefixed = shows.filter((show) => premiereYear(show) === targetYear && normalizedName(show.name).startsWith(`${targetName} `));
  return prefixed.length === 1 ? prefixed[0] : null;
}

export function selectTvmazeDiscoveryCandidates(rows = [], { existingIds = new Set(), limit = 10 } = {}) {
  const known = existingIds instanceof Set ? existingIds : new Set(existingIds ?? []);
  const byId = new Map();
  for (const row of rows) {
    const show = row?._embedded?.show ?? row?.show ?? row;
    const id = Number(show?.id);
    if (!Number.isInteger(id) || id <= 0 || known.has(id) || byId.has(id)) continue;
    if (!show?.name || !premiereYear(show)) continue;
    if (!(show?.image?.original || show?.image?.medium)) continue;
    byId.set(id, show);
  }
  return [...byId.values()]
    .sort((a, b) => discoveryScore(b) - discoveryScore(a) || Number(b.id) - Number(a.id))
    .slice(0, Math.max(0, Math.min(100, Number(limit) || 0)));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tvmazeRequest(path, {
  baseUrl = "https://api.tvmaze.com",
  userAgent = DEFAULT_USER_AGENT,
  maxRetries = 3,
  retryDelayMs = 1200,
  fetchImpl = fetch
} = {}) {
  const url = new URL(path, `${baseUrl.replace(/\/$/, "")}/`);
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetchImpl(url, { headers: { Accept: "application/json", "User-Agent": userAgent } });
    if (response.status === 404) return null;
    if (response.status === 429 && attempt < maxRetries) {
      const retryAfter = Number(response.headers?.get?.("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : retryDelayMs * (attempt + 1);
      await sleep(delay);
      continue;
    }
    if (!response.ok) throw new Error(`TVmaze request failed with ${response.status} for ${url.pathname}`);
    return response.json();
  }
  throw new Error(`TVmaze rate limit retries exhausted for ${url.pathname}`);
}

export async function searchTvmazeShows(query, options = {}) {
  const q = String(query ?? "").trim();
  if (!q) throw new Error("TVmaze search query is required");
  return tvmazeRequest(`/search/shows?q=${encodeURIComponent(q)}`, options);
}

export async function fetchTvmazeShow(id, options = {}) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) throw new Error("A positive TVmaze show id is required");
  const embeds = ["cast", "crew", "seasons", "akas"].map((name) => `embed[]=${encodeURIComponent(name)}`).join("&");
  return tvmazeRequest(`/shows/${numericId}?${embeds}`, options);
}

export async function fetchTvmazeWebSchedule(date, options = {}) {
  const value = String(date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("TVmaze web schedule date must use YYYY-MM-DD");
  return (await tvmazeRequest(`/schedule/web?date=${encodeURIComponent(value)}`, options)) ?? [];
}

export async function findTvmazeShow({ name, year }, options = {}) {
  const candidates = await searchTvmazeShows(name, options);
  return selectTvmazeCandidate(candidates ?? [], { name, year });
}
