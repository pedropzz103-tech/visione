import { normalizeTitle } from "../schema.mjs";
import { slugify } from "./tmdb.mjs";

const DEFAULT_API_URL = "https://www.wikidata.org/w/api.php";
const DEFAULT_ENTITY_DATA_URL = "https://www.wikidata.org/wiki/Special:EntityData";
const DEFAULT_USER_AGENT = "VISIONE/1.0 (+https://visione.one/data-credits/)";
const FILM_QID = "Q11424";
const MINUTE_QID = "Q7727";
const SECOND_QID = "Q11574";

function compactStrings(values = []) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function normalizedName(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function claimValues(entity, property) {
  return (entity?.claims?.[property] ?? [])
    .map((claim) => claim?.mainsnak?.datavalue?.value)
    .filter((value) => value !== undefined && value !== null);
}

function claimEntityIds(entity, property) {
  return compactStrings(claimValues(entity, property).map((value) => value?.id));
}

function firstStringClaim(entity, property) {
  const value = claimValues(entity, property)[0];
  return typeof value === "string" ? value : null;
}

function releaseYear(entity) {
  const time = claimValues(entity, "P577")[0]?.time;
  const match = String(time ?? "").match(/^\+?(\d{4})-/);
  return match ? Number(match[1]) : null;
}

function runtimeMinutes(entity) {
  const value = claimValues(entity, "P2047")[0];
  if (!value) return null;
  const amount = Number(value.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unitQid = String(value.unit ?? "").split("/").pop();
  if (unitQid === SECOND_QID) return Math.round(amount / 60);
  if (unitQid === MINUTE_QID || value.unit === "1") return Math.round(amount);
  return null;
}

function label(entity, language) {
  return String(entity?.labels?.[language]?.value ?? "").trim();
}

function localizedTitles(entity) {
  const fallback = label(entity, "en") || label(entity, "es") || label(entity, "pt") || entity.id;
  return {
    es: label(entity, "es") || fallback,
    pt: label(entity, "pt") || fallback,
    br: label(entity, "pt-br") || label(entity, "pt") || fallback
  };
}

function labelsFor(ids, labels = {}) {
  return compactStrings(ids.map((id) => labels[id]));
}

export function mapWikidataFilm(entity, linkedLabels = {}, { fetchedAt = new Date().toISOString() } = {}) {
  if (!/^Q\d+$/.test(String(entity?.id ?? ""))) throw new Error("Wikidata QID is required");
  if (!claimEntityIds(entity, "P31").includes(FILM_QID)) throw new Error(`${entity.id} is not directly identified as a film`);

  const titles = localizedTitles(entity);
  const directors = labelsFor(claimEntityIds(entity, "P57"), linkedLabels);
  const cast = labelsFor(claimEntityIds(entity, "P161"), linkedLabels).slice(0, 12);
  const genres = labelsFor(claimEntityIds(entity, "P136"), linkedLabels);
  const imdb = firstStringClaim(entity, "P345");

  return normalizeTitle({
    id: `movie:wikidata:${entity.id}`,
    type: "movie",
    slug: slugify(titles.es || titles.pt || titles.br),
    titles,
    original_title: label(entity, "en") || titles.es,
    year: releaseYear(entity),
    runtime: runtimeMinutes(entity),
    seasons: null,
    // Wikidata descriptions are short entity descriptions, not plot summaries.
    // Keep overview empty for brand-new records; existing localized copy is preserved on merge.
    overview: { es: "", pt: "", br: "" },
    genres,
    poster: null,
    backdrop: null,
    rating: null,
    credits: {
      ...(directors[0] ? { director: directors[0] } : {}),
      ...(directors.length ? { directors } : {}),
      cast
    },
    related: [],
    offers: { ES: [], PT: [], BR: [] },
    availability_status: { ES: "unknown", PT: "unknown", BR: "unknown" },
    updated_at: fetchedAt,
    availability_updated_at: null,
    source: {
      metadata: "Wikidata",
      availability: "unconfigured",
      attribution: ["Metadata: Wikidata (CC0)"],
      license: "CC0",
      wikidata_id: entity.id,
      wikidata_url: `https://www.wikidata.org/wiki/${entity.id}`,
      external_ids: { imdb: imdb ?? null }
    }
  });
}

export function mergeWikidataIntoTitle(existingRaw, wikidataRaw) {
  const existing = normalizeTitle(existingRaw);
  const wikidata = normalizeTitle(wikidataRaw);
  if (existing.type !== "movie" || wikidata.type !== "movie") {
    throw new Error("Wikidata film metadata can only be merged into movie records");
  }
  const existingAttribution = Array.isArray(existing.source?.attribution) ? existing.source.attribution.map(String) : [];
  const wikidataAttribution = Array.isArray(wikidata.source?.attribution) ? wikidata.source.attribution.map(String) : [];

  return normalizeTitle({
    ...existing,
    runtime: wikidata.runtime ?? existing.runtime,
    genres: wikidata.genres.length ? wikidata.genres : existing.genres,
    credits: Object.keys(wikidata.credits).length ? wikidata.credits : existing.credits,
    // Never replace curated locale copy, artwork, or provider availability here.
    titles: existing.titles,
    overview: existing.overview,
    poster: existing.poster,
    backdrop: existing.backdrop,
    offers: existing.offers,
    availability_status: existing.availability_status,
    availability_updated_at: existing.availability_updated_at,
    updated_at: wikidata.updated_at ?? existing.updated_at,
    source: {
      ...existing.source,
      ...wikidata.source,
      metadata: "Wikidata",
      availability: existing.source?.availability ?? "unconfigured",
      attribution: compactStrings([...existingAttribution, ...wikidataAttribution])
    }
  });
}

export function selectWikidataCandidate(candidates = [], { name, year } = {}) {
  const targetName = normalizedName(name);
  const targetYear = Number(year) || null;
  if (!targetName || !targetYear) return null;
  const exact = candidates.filter((candidate) =>
    normalizedName(candidate?.label) === targetName && Number(candidate?.year) === targetYear
  );
  return exact.length === 1 ? exact[0] : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function wikidataRequest(url, { userAgent = DEFAULT_USER_AGENT, maxRetries = 3, retryDelayMs = 1200 } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(url, {
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
    if (!response.ok) throw new Error(`Wikidata request failed with ${response.status}`);
    return response.json();
  }
  throw new Error("Wikidata rate limit retries exhausted");
}

export async function searchWikidataEntities(query, {
  language = "en",
  limit = 8,
  baseUrl = DEFAULT_API_URL,
  ...requestOptions
} = {}) {
  const q = String(query ?? "").trim();
  if (!q) throw new Error("Wikidata search query is required");
  const url = new URL(baseUrl);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", q);
  url.searchParams.set("language", language);
  url.searchParams.set("uselang", language);
  url.searchParams.set("type", "item");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("maxlag", "5");
  const data = await wikidataRequest(url, requestOptions);
  return data?.search ?? [];
}

export async function fetchWikidataEntity(id, {
  entityDataBase = DEFAULT_ENTITY_DATA_URL,
  ...requestOptions
} = {}) {
  const qid = String(id ?? "").trim();
  if (!/^Q\d+$/.test(qid)) throw new Error("A valid Wikidata QID is required");
  const url = new URL(`${entityDataBase.replace(/\/$/, "")}/${qid}.json`);
  const data = await wikidataRequest(url, requestOptions);
  return data?.entities?.[qid] ?? null;
}

export async function fetchWikidataLabels(ids = [], {
  language = "en",
  baseUrl = DEFAULT_API_URL,
  ...requestOptions
} = {}) {
  const qids = compactStrings(ids).filter((id) => /^Q\d+$/.test(id));
  if (!qids.length) return {};
  const url = new URL(baseUrl);
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", qids.join("|"));
  url.searchParams.set("props", "labels");
  url.searchParams.set("languages", `${language}|es|pt|pt-br|en`);
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("maxlag", "5");
  const data = await wikidataRequest(url, requestOptions);
  return Object.fromEntries(Object.entries(data?.entities ?? {}).map(([id, entity]) => [
    id,
    label(entity, language) || label(entity, "en") || label(entity, "es") || label(entity, "pt") || id
  ]));
}

export async function findWikidataFilm({ name, year }, options = {}) {
  const results = await searchWikidataEntities(name, options);
  const candidates = [];
  for (const result of results) {
    const entity = await fetchWikidataEntity(result.id, options);
    if (!entity || !claimEntityIds(entity, "P31").includes(FILM_QID)) continue;
    candidates.push({ id: entity.id, label: result.label, year: releaseYear(entity), entity });
  }
  return selectWikidataCandidate(candidates, { name, year });
}

export async function fetchWikidataFilmMetadata(id, options = {}) {
  const entity = await fetchWikidataEntity(id, options);
  if (!entity) return null;
  const linkedIds = compactStrings([
    ...claimEntityIds(entity, "P136"),
    ...claimEntityIds(entity, "P57"),
    ...claimEntityIds(entity, "P161")
  ]);
  const linkedLabels = await fetchWikidataLabels(linkedIds, options);
  return mapWikidataFilm(entity, linkedLabels, options);
}
