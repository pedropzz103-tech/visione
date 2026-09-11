import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTitle } from "../streaming/schema.mjs";
import { hasCompleteCover, isPublicInMarket, publicMarkets, verifiedOffersForMarket } from "../streaming/publication.mjs";

function title(overrides = {}) {
  return normalizeTitle({
    id: "series:test",
    type: "series",
    slug: "test-show",
    titles: { es: "Test Show", pt: "Test Show", br: "Test Show" },
    original_title: "Test Show",
    year: 2024,
    runtime: 50,
    seasons: 1,
    overview: { es: "Serie de prueba con suficiente texto factual para validación.", pt: "Série de teste com texto factual suficiente para validação.", br: "Série de teste com texto factual suficiente para validação." },
    genres: ["Drama"],
    poster: "https://static.tvmaze.com/test.jpg",
    artwork: { kind: "source-image", source: "TVmaze", license: "CC BY-SA", source_url: "https://www.tvmaze.com/" },
    credits: { cast: ["Example Actor"] },
    offers: { ES: [{ provider: "netflix", monetization: "subscription", url: "https://www.netflix.com/title/example", attribution: ["Official provider page"] }], PT: [], BR: [] },
    availability_status: { ES: "available", PT: "unknown", BR: "unknown" },
    updated_at: "2026-09-11T08:00:00Z",
    availability_updated_at: "2026-09-11T08:00:00Z",
    source: { metadata: "TVmaze", availability: "official-evidence" },
    ...overrides
  });
}

test("source image satisfies the cover gate", () => {
  assert.equal(hasCompleteCover(title()), true);
});

test("VISIONE editorial cover satisfies the cover gate without a poster URL", () => {
  const record = title({ poster: null, artwork: { kind: "editorial-cover", source: "VISIONE", license: null } });
  assert.equal(hasCompleteCover(record), true);
});

test("missing artwork does not satisfy the cover gate", () => {
  const record = title({ poster: null, artwork: { kind: "none" } });
  assert.equal(hasCompleteCover(record), false);
});

test("verified offers require both positive state and a usable destination URL", () => {
  const offers = verifiedOffersForMarket(title(), "ES");
  assert.equal(offers.length, 1);
  assert.equal(offers[0].provider, "netflix");

  const noUrl = title({ offers: { ES: [{ provider: "netflix", monetization: "subscription" }], PT: [], BR: [] } });
  assert.deepEqual(verifiedOffersForMarket(noUrl, "ES"), []);
});

test("publication is market-specific and requires cover plus verified positive availability", () => {
  const record = title();
  assert.equal(isPublicInMarket(record, "ES"), true);
  assert.equal(isPublicInMarket(record, "PT"), false);
  assert.equal(isPublicInMarket(record, "BR"), false);
  assert.deepEqual(publicMarkets(record), ["ES"]);
});

test("unknown, error and unavailable states never pass the publication gate", () => {
  for (const state of ["unknown", "error", "unavailable"]) {
    const record = title({ availability_status: { ES: state, PT: "unknown", BR: "unknown" } });
    assert.equal(isPublicInMarket(record, "ES"), false, state);
  }
});

test("a title with availability but no complete cover stays private", () => {
  const record = title({ poster: null, artwork: { kind: "none" } });
  assert.equal(isPublicInMarket(record, "ES"), false);
});
