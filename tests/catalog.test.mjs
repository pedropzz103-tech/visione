import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { titlePath } from "../scripts/lib/config.mjs";
import {
  evaluateTitleQuality,
  normalizeTitle,
  rankOffers,
  validateTitle,
} from "../scripts/lib/catalog.mjs";
import { isFresh, mapTmdbTitle } from "../scripts/adapters/tmdb.mjs";

const tmdbFixture = JSON.parse(await readFile(new URL("fixtures/tmdb-title.json", import.meta.url), "utf8"));

const completeTitle = {
  id: "movie:157336",
  type: "movie",
  slug: "interstellar",
  titles: { es: "Interstellar", pt: "Interstellar", br: "Interestelar" },
  original_title: "Interstellar",
  overview: {
    es: "Un grupo de exploradores viaja más allá de nuestra galaxia para buscar un futuro para la humanidad.",
    pt: "Um grupo de exploradores viaja para lá da nossa galáxia em busca de um futuro para a humanidade.",
    br: "Um grupo de exploradores viaja para além da nossa galáxia em busca de um futuro para a humanidade.",
  },
  year: 2014,
  runtime_minutes: 169,
  genres: ["Drama", "Ficção científica"],
  countries: ["US", "GB"],
  credits: { directors: ["Christopher Nolan"], cast: ["Matthew McConaughey"] },
  offers: {
    ES: [{ provider_id: "max", type: "subscription", price: null, currency: null, url: "https://example.com/title", verified_at: "2026-09-08T10:00:00Z", source_url: "https://example.com/source" }],
    PT: [],
    BR: [],
  },
  availability_status: { ES: "confirmed", PT: "unknown", BR: "unknown" },
  source: { name: "Reference source", url: "https://example.com/source", attribution: "Reference source" },
  updated_at: "2026-09-08T10:00:00Z",
};

test("uses stable localized title routes", () => {
  assert.equal(titlePath("es", "interstellar"), "/es/donde-ver/interstellar/");
  assert.equal(titlePath("pt", "interstellar"), "/pt/onde-ver/interstellar/");
  assert.equal(titlePath("br", "interestelar"), "/br/onde-assistir/interestelar/");
});

test("ranks factual offers without inventing prices", () => {
  const ranked = rankOffers([
    { provider_id: "store", type: "buy", price: null, currency: null },
    { provider_id: "service", type: "subscription", price: null, currency: null },
    { provider_id: "free", type: "free", price: null, currency: null },
  ]);

  assert.deepEqual(ranked.map((offer) => offer.type), ["subscription", "free", "buy"]);
  assert.equal(ranked[0].price, null);
});

test("sorts comparable rental prices but never compares different currencies", () => {
  const ranked = rankOffers([
    { provider_id: "eur-high", type: "rent", price: 4.99, currency: "EUR" },
    { provider_id: "brl", type: "rent", price: 3.9, currency: "BRL" },
    { provider_id: "eur-low", type: "rent", price: 2.99, currency: "EUR" },
  ]);

  assert.deepEqual(ranked.map((offer) => offer.provider_id), ["eur-low", "eur-high", "brl"]);
});

test("normalizes optional collections without fabricating absent data", () => {
  const normalized = normalizeTitle({
    id: "tv:1",
    type: "series",
    slug: "example",
    titles: { pt: "Exemplo" },
    source: { name: "Source", url: "https://example.com" },
    updated_at: "2026-09-08T10:00:00Z",
  });

  assert.deepEqual(normalized.genres, []);
  assert.deepEqual(normalized.offers, { ES: [], PT: [], BR: [] });
  assert.deepEqual(normalized.seasons, []);
  assert.equal(normalized.rating, null);
});

test("rejects invalid media and offer types", () => {
  const invalidMedia = { ...completeTitle, type: "clip" };
  const invalidOffer = structuredClone(completeTitle);
  invalidOffer.offers.ES[0].type = "pirate";

  assert.throws(() => validateTitle(invalidMedia), /media type/i);
  assert.throws(() => validateTitle(invalidOffer), /offer type/i);
});

test("quality gate rejects unsupported or unsourced title pages", () => {
  const incomplete = normalizeTitle({ titles: { pt: "X" }, offers: { PT: [] } });

  assert.equal(evaluateTitleQuality(incomplete, "pt").indexable, false);
  assert.match(evaluateTitleQuality(incomplete, "pt").reasons.join(" "), /source|overview|freshness/i);
});

test("quality gate accepts sourced pages with confirmed country offers", () => {
  const result = evaluateTitleQuality(completeTitle, "es");

  assert.equal(result.indexable, true);
  assert.deepEqual(result.reasons, []);
});

test("maps a documented TMDB shape into country-specific normalized offers", () => {
  const title = mapTmdbTitle({
    detail: tmdbFixture.detail,
    watchProviders: tmdbFixture.watchProviders,
    mediaType: "movie",
    translations: { es: tmdbFixture.detail, pt: tmdbFixture.detail, br: tmdbFixture.detail },
    fetchedAt: "2026-09-08T12:00:00Z",
  });

  assert.equal(title.id, "movie:157336");
  assert.equal(title.type, "movie");
  assert.equal(title.offers.ES[0].provider_id, "8");
  assert.equal(title.offers.ES[0].type, "subscription");
  assert.equal(title.offers.ES[0].price, null);
  assert.equal(title.availability_status.PT, "no_offers");
  assert.match(title.source.attribution, /TMDB.*JustWatch/i);
});

test("fresh snapshots avoid unnecessary provider refreshes", () => {
  assert.equal(isFresh({ updated_at: "2026-09-08T10:00:00Z" }, new Date("2026-09-08T12:00:00Z"), 24), true);
  assert.equal(isFresh({ updated_at: "2026-09-07T10:00:00Z" }, new Date("2026-09-08T12:00:00Z"), 24), false);
  assert.equal(isFresh({ updated_at: "not-a-date" }, new Date("2026-09-08T12:00:00Z"), 24), false);
});
