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

test("pending provider data does not present metadata freshness as an availability check", async () => {
  const page = await read("es/donde-ver/interstellar/index.html");

  assert.doesNotMatch(page, /Última comprobación/);
  assert.match(page, /Datos pendientes de fuente comercial/);
});

test("search index contains people from credits and client search consumes those terms", async () => {
  const records = JSON.parse(await read("data/search-index.json"));
  const interstellar = records.find((record) => record.locale === "es" && record.id === "movie:157336");

  assert.ok(interstellar);
  assert.ok(interstellar.searchTerms.includes("Christopher Nolan"));
  assert.ok(interstellar.searchTerms.includes("Matthew McConaughey"));

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
