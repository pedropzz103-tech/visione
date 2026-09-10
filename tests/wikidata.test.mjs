import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTitle } from "../streaming/schema.mjs";

function entityFixture() {
  const claim = (id) => [{ mainsnak: { datavalue: { value: { id } } } }];
  const stringClaim = (value) => [{ mainsnak: { datavalue: { value } } }];
  const timeClaim = (time) => [{ mainsnak: { datavalue: { value: { time } } } }];
  const quantityClaim = (amount, unit = "1") => [{ mainsnak: { datavalue: { value: { amount, unit } } } }];
  return {
    id: "Q13417189",
    labels: {
      en: { language: "en", value: "Interstellar" },
      es: { language: "es", value: "Interstellar" },
      pt: { language: "pt", value: "Interstellar" }
    },
    descriptions: {
      en: { language: "en", value: "2014 film by Christopher Nolan" }
    },
    claims: {
      P31: claim("Q11424"),
      P577: timeClaim("+2014-10-26T00:00:00Z"),
      P2047: quantityClaim("+169", "http://www.wikidata.org/entity/Q7727"),
      P136: [...claim("Q471839"), ...claim("Q130232")],
      P57: claim("Q25191"),
      P161: [...claim("Q23659"), ...claim("Q178348")],
      P345: stringClaim("tt0816692")
    }
  };
}

const labelsFixture = {
  Q471839: "science fiction film",
  Q130232: "drama film",
  Q25191: "Christopher Nolan",
  Q23659: "Matthew McConaughey",
  Q178348: "Anne Hathaway"
};

test("Wikidata mapper enriches film metadata without claiming streaming availability", async () => {
  const { mapWikidataFilm } = await import("../streaming/adapters/wikidata.mjs");
  const record = mapWikidataFilm(entityFixture(), labelsFixture, { fetchedAt: "2026-09-10T23:00:00Z" });

  assert.equal(record.id, "movie:wikidata:Q13417189");
  assert.equal(record.type, "movie");
  assert.equal(record.year, 2014);
  assert.equal(record.runtime, 169);
  assert.equal(record.credits.director, "Christopher Nolan");
  assert.deepEqual(record.credits.cast, ["Matthew McConaughey", "Anne Hathaway"]);
  assert.equal(record.source.wikidata_id, "Q13417189");
  assert.equal(record.source.external_ids.imdb, "tt0816692");
  assert.equal(record.source.license, "CC0");
  assert.deepEqual(record.offers, { ES: [], PT: [], BR: [] });
  assert.deepEqual(record.availability_status, { ES: "unknown", PT: "unknown", BR: "unknown" });
  assert.equal(record.availability_updated_at, null);
});

test("Wikidata merge preserves localized copy and all provider availability", async () => {
  const { mapWikidataFilm, mergeWikidataIntoTitle } = await import("../streaming/adapters/wikidata.mjs");
  const existing = normalizeTitle({
    id: "movie:157336",
    type: "movie",
    slug: "interstellar",
    titles: { es: "Interstellar", pt: "Interstellar", br: "Interestelar" },
    original_title: "Interstellar",
    year: 2014,
    runtime: null,
    overview: {
      es: "Una misión interestelar busca un futuro seguro para la humanidad lejos de una Tierra cada vez más hostil.",
      pt: "Uma missão interestelar procura um futuro seguro para a humanidade longe de uma Terra cada vez mais hostil.",
      br: "Uma missão interestelar busca um futuro seguro para a humanidade longe de uma Terra cada vez mais hostil."
    },
    genres: [],
    poster: null,
    backdrop: null,
    credits: {},
    related: [],
    offers: { ES: [{ provider: "netflix", monetization: "subscription", url: "https://example.test" }], PT: [], BR: [] },
    availability_status: { ES: "available", PT: "unknown", BR: "unknown" },
    updated_at: "2026-09-08T00:00:00Z",
    availability_updated_at: "2026-09-10T21:00:00Z",
    source: { metadata: "manual factual seed", availability: "licensed-test", attribution: [] }
  });
  const mapped = mapWikidataFilm(entityFixture(), labelsFixture, { fetchedAt: "2026-09-10T23:00:00Z" });
  const merged = mergeWikidataIntoTitle(existing, mapped);

  assert.equal(merged.id, existing.id);
  assert.equal(merged.slug, existing.slug);
  assert.deepEqual(merged.titles, existing.titles);
  assert.deepEqual(merged.overview, existing.overview);
  assert.equal(merged.offers.ES[0].provider, "netflix");
  assert.equal(merged.availability_status.ES, "available");
  assert.equal(merged.availability_updated_at, "2026-09-10T21:00:00Z");
  assert.equal(merged.runtime, 169);
  assert.equal(merged.source.metadata, "Wikidata");
});

test("Wikidata candidate matching requires an exact normalized label and matching year", async () => {
  const { selectWikidataCandidate } = await import("../streaming/adapters/wikidata.mjs");
  const candidates = [
    { id: "Q1", label: "Interstellar", description: "2009 film", year: 2009 },
    { id: "Q13417189", label: "Interstellar", description: "2014 film", year: 2014 },
    { id: "Q3", label: "Interstellar Film", description: "2014 film", year: 2014 }
  ];
  assert.equal(selectWikidataCandidate(candidates, { name: "Interstellar", year: 2014 }).id, "Q13417189");
  assert.equal(selectWikidataCandidate(candidates, { name: "Interstellar", year: 2020 }), null);
});

test("Wikidata HTTP helper uses identifiable User-Agent and maxlag", async () => {
  const { searchWikidataEntities } = await import("../streaming/adapters/wikidata.mjs");
  const oldFetch = globalThis.fetch;
  let capturedUrl = null;
  let capturedHeaders = null;
  globalThis.fetch = async (url, options = {}) => {
    capturedUrl = String(url);
    capturedHeaders = options.headers;
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ search: [] }) };
  };
  try {
    await searchWikidataEntities("Interstellar", { baseUrl: "https://example.test/w/api.php" });
    assert.match(capturedUrl, /maxlag=5/);
    assert.match(capturedHeaders["User-Agent"], /VISIONE/);
  } finally {
    globalThis.fetch = oldFetch;
  }
});
