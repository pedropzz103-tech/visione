import { normalizeTitle } from "../schema.mjs";

const DEFAULT_BASE_URL = "https://every.film";
const DEFAULT_USER_AGENT = "VISIONE/1.0 (+https://visione.one/data-credits/)";
const ATTRIBUTION = "Additional metadata: every.film (CC BY-SA 4.0)";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function compactStrings(values = []) {
  return [...new Set((values ?? []).map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function normalizedName(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function recordId(detail) {
  const raw = detail?.id ?? detail?.media_id;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function recordYear(detail) {
  const direct = Number(detail?.year);
  if (Number.isInteger(direct) && direct > 1800 && direct < 2200) return direct;
  const date = String(detail?.release_date ?? detail?.released ?? "");
  const match = date.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function recordNames(detail) {
  const localized = detail?.localized_titles;
  const localizedValues = Array.isArray(localized)
    ? localized.map((entry) => entry?.title ?? entry?.name)
    : localized && typeof localized === "object"
      ? Object.values(localized).map((entry) => typeof entry === "string" ? entry : entry?.title ?? entry?.name)
      : [];
  return compactStrings([
    detail?.title,
    detail?.name,
    detail?.original_title,
    detail?.original_name,
    ...localizedValues
  ]);
}

function titleNames(title) {
  return compactStrings([
    title.original_title,
    title.titles?.es,
    title.titles?.pt,
    title.titles?.br
  ]);
}

function identityMatches(title, detail) {
  const expected = new Set(titleNames(title).map(normalizedName).filter(Boolean));
  const actual = recordNames(detail).map(normalizedName).filter(Boolean);
  const nameMatches = actual.some((name) => expected.has(name));
  if (!nameMatches) return false;

  const incomingYear = recordYear(detail);
  if (incomingYear && title.year && incomingYear !== title.year) return false;
  return true;
}

function fusedRating(detail) {
  const value = Number(detail?.fused_rating ?? detail?.rating?.fused ?? detail?.rating);
  return Number.isFinite(value) && value >= 0 && value <= 10 ? value : null;
}

export function mergeEveryFilmIntoTitle(existingRaw, detail, { fetchedAt = new Date().toISOString() } = {}) {
  const existing = normalizeTitle(existingRaw);
  const id = recordId(detail);
  if (!id) throw new Error("every.film record id is required");
  if (!identityMatches(existing, detail)) throw new Error("every.film identity mismatch: title/year did not match the VISIONE record");

  const rating = fusedRating(detail);
  const completeness = Number(detail?.completeness);
  const contributors = Number(detail?.contributors);
  const upstreamSources = compactStrings(detail?.sources);
  const attribution = compactStrings([...(existing.source?.attribution ?? []), ATTRIBUTION]);

  return normalizeTitle({
    ...existing,
    rating: rating == null ? existing.rating : { value: rating, source: "every.film" },
    // every.film is supplemental enrichment. Curated copy, artwork and all
    // provider availability remain under their existing authority.
    titles: existing.titles,
    overview: existing.overview,
    poster: existing.poster,
    backdrop: existing.backdrop,
    credits: existing.credits,
    genres: existing.genres,
    offers: existing.offers,
    availability_status: existing.availability_status,
    availability_updated_at: existing.availability_updated_at,
    updated_at: fetchedAt,
    source: {
      ...existing.source,
      attribution,
      every_film_id: id,
      every_film_license: "CC BY-SA 4.0",
      every_film_fetched_at: fetchedAt,
      ...(Number.isFinite(completeness) ? { every_film_completeness: completeness } : {}),
      ...(Number.isFinite(contributors) ? { every_film_contributors: contributors } : {}),
      ...(upstreamSources.length ? { every_film_sources: upstreamSources } : {})
    }
  });
}

export async function fetchEveryFilmDetail(id, {
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  userAgent = DEFAULT_USER_AGENT,
  maxRetries = 3,
  retryDelayMs = 1500
} = {}) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) throw new Error("A positive every.film media id is required");
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");

  const url = new URL(`/api/v1/media/${numericId}/detail`, `${baseUrl.replace(/\/$/, "")}/`);
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip,deflate",
        "User-Agent": userAgent
      }
    });

    if (response.status === 404) return null;
    if (response.status === 429 && attempt < maxRetries) {
      const retryAfter = Number(response.headers?.get?.("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : retryDelayMs * (attempt + 1);
      await sleep(delay);
      continue;
    }
    if (!response.ok) throw new Error(`every.film request failed with ${response.status}`);
    return response.json();
  }

  throw new Error("every.film rate limit retries exhausted");
}
