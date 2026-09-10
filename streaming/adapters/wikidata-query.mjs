const DEFAULT_ENDPOINT = "https://query.wikidata.org/sparql";
const DEFAULT_USER_AGENT = "VISIONE/1.0 (+https://visione.one/data-credits/)";
const MAX_DISCOVERY_LIMIT = 100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function boundedInteger(value, { min, max, fallback }) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function yearFromBinding(value) {
  const match = String(value ?? "").match(/^(\d{4})-/);
  return match ? Number(match[1]) : null;
}

export function buildWikidataFilmDiscoveryQuery({
  fromYear = new Date().getUTCFullYear(),
  toYear = fromYear,
  limit = 50,
  offset = 0
} = {}) {
  const startYear = boundedInteger(fromYear, { min: 1888, max: 2100, fallback: new Date().getUTCFullYear() });
  const endYear = boundedInteger(toYear, { min: startYear, max: 2100, fallback: startYear });
  const safeLimit = boundedInteger(limit, { min: 1, max: MAX_DISCOVERY_LIMIT, fallback: 50 });
  const safeOffset = boundedInteger(offset, { min: 0, max: 1_000_000, fallback: 0 });

  return `SELECT ?item ?itemLabel ?releaseDate ?imdb WHERE {
  ?item wdt:P31 wd:Q11424 ;
        wdt:P577 ?releaseDate .
  FILTER(YEAR(?releaseDate) >= ${startYear} && YEAR(?releaseDate) <= ${endYear})
  OPTIONAL { ?item wdt:P345 ?imdb . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es,pt". }
}
ORDER BY ?releaseDate ?item
LIMIT ${safeLimit}
OFFSET ${safeOffset}`;
}

export function parseWikidataFilmBindings(payload) {
  const seen = new Set();
  const output = [];

  for (const binding of payload?.results?.bindings ?? []) {
    const id = String(binding?.item?.value ?? "").split("/").pop();
    const title = String(binding?.itemLabel?.value ?? "").trim();
    const year = yearFromBinding(binding?.releaseDate?.value);
    const imdb = String(binding?.imdb?.value ?? "").trim() || null;
    if (!/^Q\d+$/.test(id) || !title || !year || seen.has(id)) continue;
    seen.add(id);
    output.push({ id, title, year, imdb });
  }

  return output;
}

export async function queryWikidataSparql(query, {
  endpoint = DEFAULT_ENDPOINT,
  fetchImpl = globalThis.fetch,
  userAgent = DEFAULT_USER_AGENT,
  maxRetries = 3,
  retryDelayMs = 1500,
  timeoutMs = 20_000
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");
  const sparql = String(query ?? "").trim();
  if (!sparql) throw new Error("A SPARQL query is required");

  const url = new URL(endpoint);
  url.searchParams.set("query", sparql);
  url.searchParams.set("format", "json");

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    let response;
    try {
      response = await fetchImpl(url, {
        headers: {
          Accept: "application/sparql-results+json",
          "Accept-Encoding": "gzip,deflate",
          "User-Agent": userAgent
        },
        signal: controller?.signal
      });
    } finally {
      if (timer) clearTimeout(timer);
    }

    if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
      const retryAfter = Number(response.headers?.get?.("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : retryDelayMs * (attempt + 1);
      await sleep(delay);
      continue;
    }
    if (!response.ok) throw new Error(`Wikidata Query Service request failed with ${response.status}`);
    return response.json();
  }

  throw new Error("Wikidata Query Service retries exhausted");
}

export async function discoverWikidataFilms(options = {}) {
  const query = buildWikidataFilmDiscoveryQuery(options);
  const payload = await queryWikidataSparql(query, options);
  return parseWikidataFilmBindings(payload);
}
