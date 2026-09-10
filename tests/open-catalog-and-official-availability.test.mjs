import assert from "node:assert/strict";
import test from "node:test";

function sampleTitle() {
  return {
    id: "movie:157336",
    type: "movie",
    slug: "interstellar",
    titles: { es: "Interstellar", pt: "Interstellar", br: "Interestelar" },
    original_title: "Interstellar",
    year: 2014,
    runtime: 169,
    seasons: null,
    overview: {
      es: "Un antiguo piloto se une a una misión interestelar que busca un nuevo hogar para la humanidad.",
      pt: "Um antigo piloto junta-se a uma missão interestelar que procura um novo lar para a humanidade.",
      br: "Um ex-piloto entra em uma missão interestelar que busca um novo lar para a humanidade."
    },
    genres: ["Drama", "Science Fiction"],
    poster: null,
    backdrop: null,
    rating: null,
    credits: { director: "Christopher Nolan", cast: ["Matthew McConaughey"] },
    related: [],
    offers: { ES: [], PT: [], BR: [] },
    availability_status: { ES: "unknown", PT: "unknown", BR: "unknown" },
    updated_at: "2026-09-11T00:00:00Z",
    availability_updated_at: null,
    source: { metadata: "Wikidata", availability: "unconfigured", attribution: ["Metadata: Wikidata (CC0)"] }
  };
}

test("WDQS discovery query is bounded and does not use fuzzy REGEX search", async () => {
  const { buildWikidataFilmDiscoveryQuery } = await import("../streaming/adapters/wikidata-query.mjs");
  const query = buildWikidataFilmDiscoveryQuery({ fromYear: 2025, toYear: 2026, limit: 25, offset: 50 });

  assert.match(query, /wdt:P31\s+wd:Q11424/);
  assert.match(query, /YEAR\(\?releaseDate\)\s*>=\s*2025/);
  assert.match(query, /YEAR\(\?releaseDate\)\s*<=\s*2026/);
  assert.match(query, /LIMIT 25/);
  assert.match(query, /OFFSET 50/);
  assert.doesNotMatch(query, /REGEX/i);
});

test("WDQS bindings are normalized into lightweight discovery candidates", async () => {
  const { parseWikidataFilmBindings } = await import("../streaming/adapters/wikidata-query.mjs");
  const candidates = parseWikidataFilmBindings({
    results: {
      bindings: [{
        item: { value: "http://www.wikidata.org/entity/Q13417189" },
        itemLabel: { value: "Interstellar" },
        releaseDate: { value: "2014-11-05T00:00:00Z" },
        imdb: { value: "tt0816692" }
      }]
    }
  });

  assert.deepEqual(candidates, [{ id: "Q13417189", title: "Interstellar", year: 2014, imdb: "tt0816692" }]);
});

test("every.film enrichment preserves curated copy and provider availability", async () => {
  const { mergeEveryFilmIntoTitle } = await import("../streaming/adapters/everyfilm.mjs");
  const existing = sampleTitle();
  existing.offers.ES = [{ provider: "prime-video", monetization: "rent", price: 2.99, currency: "EUR", url: "https://example.test", attribution: [] }];
  existing.availability_status.ES = "available";
  existing.availability_updated_at = "2026-09-11T08:00:00Z";

  const merged = mergeEveryFilmIntoTitle(existing, {
    id: 70523,
    title: "Interstellar",
    year: 2014,
    fused_rating: 8.8,
    completeness: 0.92,
    contributors: 31,
    sources: ["tmdb", "imdb", "douban"]
  }, { fetchedAt: "2026-09-11T09:00:00Z" });

  assert.deepEqual(merged.titles, existing.titles);
  assert.deepEqual(merged.overview, existing.overview);
  assert.equal(merged.offers.ES.length, 1);
  assert.equal(merged.offers.ES[0].provider, "prime-video");
  assert.equal(merged.offers.ES[0].monetization, "rent");
  assert.equal(merged.offers.ES[0].price, 2.99);
  assert.equal(merged.offers.ES[0].currency, "EUR");
  assert.deepEqual(merged.availability_status, existing.availability_status);
  assert.equal(merged.availability_updated_at, "2026-09-11T08:00:00Z");
  assert.equal(merged.rating.value, 8.8);
  assert.equal(merged.rating.source, "every.film");
  assert.equal(merged.source.every_film_id, 70523);
  assert.equal(merged.source.every_film_completeness, 0.92);
  assert.ok(merged.source.attribution.includes("Additional metadata: every.film (CC BY-SA 4.0)"));
});

test("every.film enrichment rejects a mismatched title identity", async () => {
  const { mergeEveryFilmIntoTitle } = await import("../streaming/adapters/everyfilm.mjs");
  assert.throws(() => mergeEveryFilmIntoTitle(sampleTitle(), {
    id: 1,
    title: "A Different Film",
    year: 2014,
    fused_rating: 7.5
  }), /identity mismatch/i);
});

test("every.film read helper uses the documented no-key detail endpoint", async () => {
  const { fetchEveryFilmDetail } = await import("../streaming/adapters/everyfilm.mjs");
  const calls = [];
  const result = await fetchEveryFilmDetail(70523, {
    baseUrl: "https://example.test",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ id: 70523, title: "Dark", fused_rating: 8.8 }) };
    }
  });

  assert.equal(result.id, 70523);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/v1\/media\/70523\/detail$/);
  assert.match(calls[0].options.headers["User-Agent"], /VISIONE/);
});

test("official Disney+ page evidence can create a subscription offer", async () => {
  const { parseOfficialProviderPage } = await import("../streaming/adapters/official-availability.mjs");
  const result = parseOfficialProviderPage({
    provider: "disney-plus",
    country: "ES",
    url: "https://www.disneyplus.com/es-es/browse/entity-example",
    expectedTitle: "The Bear",
    text: "The Bear 2022 - 2026 5 temporadas Drama Comedia CONSEGUIR DISNEY+"
  });

  assert.equal(result.status, "available");
  assert.equal(result.offers.length, 1);
  assert.equal(result.offers[0].provider, "disney-plus");
  assert.equal(result.offers[0].monetization, "subscription");
});

test("official Prime Video page evidence extracts rent and buy prices", async () => {
  const { parseOfficialProviderPage } = await import("../streaming/adapters/official-availability.mjs");
  const result = parseOfficialProviderPage({
    provider: "prime-video",
    country: "ES",
    url: "https://www.primevideo.com/-/es/detail/example",
    expectedTitle: "Interstellar",
    text: "Interstellar Periodo de prueba de 7 días gratis Alquilar UHD 2,99 € Comprar UHD 7,99 €"
  });

  assert.equal(result.status, "available");
  assert.deepEqual(result.offers.map((offer) => [offer.monetization, offer.price, offer.currency]), [
    ["rent", 2.99, "EUR"],
    ["buy", 7.99, "EUR"]
  ]);
});

test("negative or ambiguous official pages never become verified unavailable", async () => {
  const { parseOfficialProviderPage } = await import("../streaming/adapters/official-availability.mjs");
  const result = parseOfficialProviderPage({
    provider: "prime-video",
    country: "PT",
    url: "https://www.primevideo.com/-/pt_PT/detail/example",
    expectedTitle: "Interstellar",
    text: "Interstellar Já não está disponível na sua região no Prime Video"
  });

  assert.equal(result.status, "unknown");
  assert.deepEqual(result.offers, []);
  assert.match(result.reason, /negative|unavailable|ambiguous/i);
});

test("positive official evidence updates only its provider and country and ignores negative evidence", async () => {
  const { mergeOfficialAvailabilityEvidence } = await import("../streaming/adapters/official-availability.mjs");
  const existing = sampleTitle();
  existing.offers.ES = [{ provider: "netflix", monetization: "subscription", url: "https://www.netflix.com/title/example", attribution: ["existing"] }];
  existing.availability_status.ES = "available";
  existing.availability_updated_at = "2026-09-11T07:00:00Z";

  const merged = mergeOfficialAvailabilityEvidence(existing, [
    {
      provider: "prime-video",
      country: "ES",
      url: "https://www.primevideo.com/-/es/detail/example",
      expectedTitle: "Interstellar",
      text: "Interstellar Alquilar UHD 2,99 € Comprar UHD 7,99 €",
      checked_at: "2026-09-11T09:00:00Z"
    },
    {
      provider: "prime-video",
      country: "PT",
      url: "https://www.primevideo.com/-/pt_PT/detail/example",
      expectedTitle: "Interstellar",
      text: "Interstellar Já não está disponível na sua região no Prime Video",
      checked_at: "2026-09-11T09:05:00Z"
    }
  ]);

  assert.deepEqual(merged.offers.ES.map((offer) => offer.provider), ["netflix", "prime-video", "prime-video"]);
  assert.equal(merged.availability_status.ES, "available");
  assert.equal(merged.availability_status.PT, "unknown");
  assert.deepEqual(merged.offers.PT, []);
  assert.equal(merged.availability_updated_at, "2026-09-11T09:00:00Z");
  assert.match(merged.source.availability, /official-provider-evidence/);
});
