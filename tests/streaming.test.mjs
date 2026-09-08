import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LOCALES, localePath, providerPath, titlePath } from "../streaming/config.mjs";
import { evaluateIndexability, normalizeTitle, rankOffers } from "../streaming/schema.mjs";

const root = new URL("../", import.meta.url);
const seed = JSON.parse(await readFile(new URL("streaming/data/titles.json", root), "utf8"));

test("defines the three launch markets and localized URL families", () => {
  assert.deepEqual(Object.keys(LOCALES), ["es", "pt", "br"]);
  assert.equal(localePath("es"), "/es/");
  assert.equal(titlePath("es", "interstellar"), "/es/donde-ver/interstellar/");
  assert.equal(titlePath("pt", "interstellar"), "/pt/onde-ver/interstellar/");
  assert.equal(titlePath("br", "interstellar"), "/br/onde-assistir/interstellar/");
  assert.equal(providerPath("es", "netflix"), "/es/plataforma/netflix/");
});

test("normalizes every factual seed record", () => {
  assert.ok(seed.length >= 4);
  for (const raw of seed) {
    const title = normalizeTitle(raw);
    assert.ok(title.id);
    assert.ok(title.slug);
    assert.ok(title.titles.es);
    assert.ok(title.titles.pt);
    assert.ok(title.titles.br);
    assert.ok(title.updated_at);
  }
});

test("keeps unverified seed availability out of the index", () => {
  const title = normalizeTitle(seed[0]);
  const result = evaluateIndexability(title, "es");
  assert.equal(result.indexable, false);
  assert.ok(result.reasons.includes("availability-not-verified"));
});

test("allows a useful explicitly verified unavailable state", () => {
  const raw = structuredClone(seed[0]);
  raw.availability_status.ES = "unavailable";
  const title = normalizeTitle(raw);
  const result = evaluateIndexability(title, "es");
  assert.equal(result.indexable, true);
  assert.deepEqual(result.reasons, []);
});

test("ranks subscription then free then the cheapest rental and purchase", () => {
  const offers = rankOffers([
    { monetization: "buy", price: 8.99, currency: "EUR", provider: "apple-tv" },
    { monetization: "rent", price: 4.99, currency: "EUR", provider: "apple-tv" },
    { monetization: "free", price: null, currency: null, provider: "pluto-tv" },
    { monetization: "subscription", price: null, currency: null, provider: "max" },
    { monetization: "rent", price: 3.99, currency: "EUR", provider: "rakuten-tv" }
  ]);
  assert.deepEqual(offers.map((offer) => offer.monetization), ["subscription", "free", "rent", "rent", "buy"]);
  assert.equal(offers[2].provider, "rakuten-tv");
});
