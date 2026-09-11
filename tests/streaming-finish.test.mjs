import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateIndexability, normalizeTitle } from "../streaming/schema.mjs";
import { renderTitlePage } from "../streaming/render.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const seed = JSON.parse(await read("streaming/data/titles.json"));
const providers = JSON.parse(await read("streaming/data/providers.json"));

function tmdbFixture() {
  return {
    mediaType: "movie",
    fetchedAt: "2026-09-10T20:00:00Z",
    detail: {
      id: 157336,
      title: "Interstellar",
      original_title: "Interstellar",
      release_date: "2014-11-05",
      runtime: 169,
      overview: "A former pilot joins an interstellar mission seeking a future for humanity.",
      genres: [{ name: "Science Fiction" }],
      credits: {
        crew: [{ job: "Director", name: "Christopher Nolan" }],
        cast: [{ name: "Matthew McConaughey" }]
      }
    },
    translations: {
      es: { title: "Interstellar", overview: "Un antiguo piloto se une a una misión interestelar que busca un nuevo hogar para la humanidad." },
      pt: { title: "Interstellar", overview: "Um antigo piloto junta-se a uma missão interestelar que procura um novo lar para a humanidade." },
      br: { title: "Interestelar", overview: "Um ex-piloto entra em uma missão interestelar que busca um novo lar para a humanidade." }
    },
    watchProviders: {
      results: {
        ES: {
          link: "https://www.themoviedb.org/movie/157336/watch",
          flatrate: [{ provider_name: "Netflix", provider_id: 8 }]
        },
        PT: {},
        BR: {}
      }
    }
  };
}

function tvmazeFixture() {
  return {
    id: 53664,
    name: "The Last of Us",
    premiered: "2023-01-15",
    runtime: 60,
    averageRuntime: 58,
    genres: ["Drama", "Action", "Horror"],
    summary: "<p>Joel and Ellie cross a devastated United States.</p>",
    image: {
      medium: "https://static.tvmaze.com/uploads/images/medium_portrait/example.jpg",
      original: "https://static.tvmaze.com/uploads/images/original_untouched/example.jpg"
    },
    externals: { imdb: "tt3581920", thetvdb: 392256 },
    url: "https://www.tvmaze.com/shows/53664/the-last-of-us",
    _embedded: {
      seasons: [{ id: 1, number: 1 }, { id: 2, number: 2 }],
      cast: [
        { person: { name: "Pedro Pascal" } },
        { person: { name: "Bella Ramsey" } }
      ],
      crew: [
        { type: "Creator", person: { name: "Craig Mazin" } },
        { type: "Creator", person: { name: "Neil Druckmann" } }
      ],
      akas: [{ name: "The Last of Us", country: { code: "ES" } }]
    }
  };
}

test("verified availability requires its own freshness timestamp", () => {
  const raw = structuredClone(seed[0]);
  raw.availability_status.ES = "unavailable";
  delete raw.availability_updated_at;

  const result = evaluateIndexability(normalizeTitle(raw), "es");

  assert.equal(result.indexable, false);
  assert.ok(result.reasons.includes("missing-availability-freshness"));
});

test("verified unavailable state becomes indexable with availability freshness", () => {
  const raw = structuredClone(seed[0]);
  raw.availability_status.ES = "unavailable";
  raw.availability_updated_at = "2026-09-10T20:00:00Z";

  const result = evaluateIndexability(normalizeTitle(raw), "es");

  assert.equal(result.indexable, true);
  assert.deepEqual(result.reasons, []);
});

test("pending provider data does not present metadata freshness as an availability check", () => {
  const page = renderTitlePage(normalizeTitle(seed[0]), "es", providers);

  assert.doesNotMatch(page, /Última comprobación/);
  assert.match(page, /Datos pendientes de fuente comercial/);
});

test("failed ingestion is not rendered as a verified no-offer result", () => {
  const raw = structuredClone(seed[0]);
  raw.availability_status.ES = "error";
  const page = renderTitlePage(normalizeTitle(raw), "es", providers);

  assert.match(page, /Datos temporalmente no disponibles/);
  assert.doesNotMatch(page, /Sin oferta verificada/);
});

test("public search index excludes private records and client search consumes credit terms", async () => {
  const records = JSON.parse(await read("data/search-index.json"));
  assert.equal(records.some((record) => record.id === "movie:157336"), false);
  assert.ok(records.every((record) => Array.isArray(record.searchTerms)));

  const client = await read("assets/streaming.js");
  assert.match(client, /record\.searchTerms/);
});

test("TMDB mapper produces current-schema provider availability with attribution", async () => {
  let adapter;
  try {
    adapter = await import("../streaming/adapters/tmdb.mjs");
  } catch {
    assert.fail("current-schema TMDB adapter should exist");
  }

  const record = adapter.mapTmdbTitle(tmdbFixture());

  assert.equal(record.offers.ES[0].provider, "netflix");
  assert.equal(record.offers.ES[0].monetization, "subscription");
  assert.equal(record.availability_status.ES, "available");
  assert.equal(record.availability_status.PT, "unavailable");
  assert.equal(record.availability_updated_at, "2026-09-10T20:00:00Z");
  assert.ok(record.offers.ES[0].attribution.length > 0);
});

test("title pages expose required upstream availability attribution", async () => {
  const { mapTmdbTitle } = await import("../streaming/adapters/tmdb.mjs");
  const record = mapTmdbTitle(tmdbFixture());
  const page = renderTitlePage(record, "es", providers);

  assert.match(page, /JustWatch via TMDB/);
});

test("TMDB fetch helper defaults to the environment token used by build jobs", async () => {
  const { fetchTmdbTitle } = await import("../streaming/adapters/tmdb.mjs");
  const oldFetch = globalThis.fetch;
  const oldToken = process.env.TMDB_READ_ACCESS_TOKEN;
  const authHeaders = [];

  process.env.TMDB_READ_ACCESS_TOKEN = "test-env-token";
  globalThis.fetch = async (url, options = {}) => {
    authHeaders.push(options.headers?.Authorization);
    const href = String(url);
    if (href.includes("/watch/providers")) {
      return { ok: true, json: async () => ({ results: { ES: {}, PT: {}, BR: {} } }) };
    }
    return {
      ok: true,
      json: async () => ({
        id: 157336,
        title: "Interstellar",
        original_title: "Interstellar",
        release_date: "2014-11-05",
        runtime: 169,
        overview: "A former pilot joins an interstellar mission seeking a future for humanity.",
        genres: [],
        credits: { crew: [], cast: [] }
      })
    };
  };

  try {
    await fetchTmdbTitle({ id: 157336, mediaType: "movie", baseUrl: "https://example.test" });
    assert.equal(authHeaders.length, 4);
    assert.ok(authHeaders.every((value) => value === "Bearer test-env-token"));
  } finally {
    globalThis.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
    else process.env.TMDB_READ_ACCESS_TOKEN = oldToken;
  }
});

test("TVmaze mapper produces series metadata without claiming streaming availability", async () => {
  let adapter;
  try {
    adapter = await import("../streaming/adapters/tvmaze.mjs");
  } catch {
    assert.fail("TVmaze adapter should exist");
  }

  const record = adapter.mapTvmazeShow(tvmazeFixture(), { fetchedAt: "2026-09-10T22:30:00Z" });

  assert.equal(record.id, "series:tvmaze:53664");
  assert.equal(record.type, "series");
  assert.equal(record.year, 2023);
  assert.equal(record.runtime, 58);
  assert.equal(record.seasons, 2);
  assert.deepEqual(record.credits.creators, ["Craig Mazin", "Neil Druckmann"]);
  assert.deepEqual(record.credits.cast, ["Pedro Pascal", "Bella Ramsey"]);
  assert.equal(record.poster, tvmazeFixture().image.original);
  assert.deepEqual(record.offers, { ES: [], PT: [], BR: [] });
  assert.deepEqual(record.availability_status, { ES: "unknown", PT: "unknown", BR: "unknown" });
  assert.equal(record.availability_updated_at, null);
  assert.equal(record.source.metadata, "TVmaze");
  assert.ok(record.source.attribution.includes("TV metadata: TVmaze (CC BY-SA)"));
});

test("TVmaze merge enriches an existing localized series without overwriting availability or translations", async () => {
  const { mapTvmazeShow, mergeTvmazeIntoTitle } = await import("../streaming/adapters/tvmaze.mjs");
  const existing = structuredClone(seed.find((item) => item.slug === "the-last-of-us"));
  existing.offers.ES = [{ provider: "max", monetization: "subscription", price: null, currency: null, url: "https://example.test", attribution: [] }];
  existing.availability_status.ES = "available";
  existing.availability_updated_at = "2026-09-10T21:00:00Z";

  const mapped = mapTvmazeShow(tvmazeFixture(), { fetchedAt: "2026-09-10T22:30:00Z" });
  const merged = mergeTvmazeIntoTitle(existing, mapped);

  assert.equal(merged.id, existing.id);
  assert.equal(merged.slug, existing.slug);
  assert.deepEqual(merged.titles, existing.titles);
  assert.deepEqual(merged.overview, existing.overview);
  assert.equal(merged.poster, tvmazeFixture().image.original);
  assert.equal(merged.seasons, 2);
  assert.equal(merged.offers.ES[0].provider, "max");
  assert.equal(merged.availability_status.ES, "available");
  assert.equal(merged.availability_updated_at, "2026-09-10T21:00:00Z");
  assert.equal(merged.source.metadata, "TVmaze");
});

test("TVmaze candidate matching requires name and premiere year to agree", async () => {
  const { selectTvmazeCandidate } = await import("../streaming/adapters/tvmaze.mjs");
  const candidates = [
    { show: { id: 1, name: "The Last of Us", premiered: "2013-01-01" } },
    { show: { id: 53664, name: "The Last of Us", premiered: "2023-01-15" } },
    { show: { id: 3, name: "Last of Us", premiered: "2023-01-15" } }
  ];

  assert.equal(selectTvmazeCandidate(candidates, { name: "The Last of Us", year: 2023 }).id, 53664);
  assert.equal(selectTvmazeCandidate(candidates, { name: "The Last of Us", year: 2024 }), null);
});
