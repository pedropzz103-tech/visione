import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LOCALES, localePath, providerPath, titlePath } from "../streaming/config.mjs";
import { evaluateIndexability, normalizeTitle, rankOffers } from "../streaming/schema.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const seed = JSON.parse(await read("streaming/data/titles.json"));

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

test("allows a useful explicitly verified unavailable state with availability freshness", () => {
  const raw = structuredClone(seed[0]);
  raw.availability_status.ES = "unavailable";
  raw.availability_updated_at = "2026-09-10T20:00:00Z";
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

test("generates useful localized discovery homes", async () => {
  const [home, es, pt, br] = await Promise.all([
    read("index.html"), read("es/index.html"), read("pt/index.html"), read("br/index.html")
  ]);
  assert.match(home, /data-visione-search/);
  assert.match(home, /href="\/es\/"/);
  assert.match(home, /href="\/pt\/"/);
  assert.match(home, /href="\/br\/"/);
  assert.match(es, /Encuentra dónde ver películas y series/);
  assert.match(pt, /Descobre onde ver filmes e séries/);
  assert.match(br, /Descubra onde assistir filmes e séries/);
  assert.match(es, /hreflang="pt-BR"/);
  assert.match(pt, /hreflang="es-ES"/);
  assert.match(br, /hreflang="pt-PT"/);
});

test("keeps navigation and a compact language selector in the upper-right without country cards", async () => {
  const pages = await Promise.all([
    read("index.html"), read("es/index.html"), read("pt/index.html"), read("br/index.html")
  ]);

  for (const page of pages) {
    const header = page.match(/<header class="stream-header">[\s\S]*?<\/header>/)?.[0];
    assert.ok(header, "streaming header should be rendered");
    assert.match(header, /class="stream-header-actions"/);
    assert.match(header, /class="locale-switcher" aria-label="Idiomas"/);
    assert.match(header, />ES<\/a>[\s\S]*>PT<\/a>[\s\S]*>BR<\/a>/);
    assert.doesNotMatch(header, /🇪🇸|🇵🇹|🇧🇷|>España<|>Portugal<|>Brasil</);
  }

  assert.doesNotMatch(pages[0], /class="market-grid"|class="market-card"|class="mobile-markets"/);
  assert.doesNotMatch(pages[0].match(/<main>[\s\S]*?<\/main>/)?.[0] ?? "", /ES · PT · BR|España|Portugal|Brasil/i);
  for (const page of pages.slice(1)) {
    assert.doesNotMatch(page.match(/<main>[\s\S]*?<\/main>/)?.[0] ?? "", /VISIONE · (ESPAÑA|PORTUGAL|BRASIL)/i);
  }
});

test("renders cinematic discovery homes with the search inside the header", async () => {
  const pages = await Promise.all([
    read("index.html"), read("es/index.html"), read("pt/index.html"), read("br/index.html")
  ]);

  for (const page of pages) {
    assert.match(page, /<body class="stream-body discovery-home">/);
    const header = page.match(/<header class="stream-header">[\s\S]*?<\/header>/)?.[0];
    const hero = page.match(/<section class="(?:global|locale)-hero cinematic-hero">[\s\S]*?<\/section>/)?.[0];
    assert.ok(header, "discovery home should render a header");
    assert.ok(hero, "discovery home should render a cinematic hero");
    assert.match(header, /class="header-search"[\s\S]*?data-visione-search/);
    assert.match(hero, /class="cinematic-backdrop"/);
    assert.match(hero, /class="hero-content"/);
    assert.doesNotMatch(hero, /data-visione-search/);
    assert.match(page, /class="title-rail cinematic-title-rail"/);
  }

  assert.match(pages[0], /visione-cinematic-hero-v2\.png/);
});

test("renders only real discovery collections with rail and mosaic controls", async () => {
  const home = await read("index.html");
  const collections = [...home.matchAll(/<section[^>]+data-catalog-section[\s\S]*?<\/section>/g)].map((match) => match[0]);

  assert.equal(collections.length, 3);
  assert.match(home, /Top 10 hoje/);
  assert.match(home, /Recomendados hoje/);
  assert.match(home, /Escolhas da semana/);
  assert.doesNotMatch(home, /Brevemente nos cinemas|Brevemente no streaming|data-status="awaiting-source"/i);
  const topTen = collections.find((collection) => collection.includes("Top 10 hoje"));
  assert.ok(topTen);
  assert.deepEqual([...topTen.matchAll(/data-rank="(\d+)"/g)].map((match) => Number(match[1])), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(new Set([...topTen.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).size, 10);

  for (const collection of collections) {
    assert.match(collection, /data-catalog-rail/);
    assert.match(collection, /data-rail-prev/);
    assert.match(collection, /data-rail-next/);
    assert.match(collection, /data-rail-view[^>]+aria-expanded="false"/);
  }

  assert.match(home, /Curadoria VISIONE/);
});

test("places one visible navigation control on each side of every catalog rail", async () => {
  const home = await read("index.html");
  const collections = [...home.matchAll(/<section[^>]+data-catalog-section[\s\S]*?<\/section>/g)].map((match) => match[0]);

  for (const collection of collections) {
    const stage = collection.match(/<div class="rail-stage">[\s\S]*?<\/div><\/section>/)?.[0];
    assert.ok(stage, "catalog rail should have a dedicated navigation stage");
    assert.match(stage, /^<div class="rail-stage"><button[^>]+class="rail-edge rail-edge-prev"[^>]+data-rail-prev/);
    assert.match(stage, /<div class="title-rail cinematic-title-rail"[^>]+data-catalog-rail/);
    assert.match(stage, /<button[^>]+class="rail-edge rail-edge-next"[^>]+data-rail-next[^>]*><span aria-hidden="true">›<\/span><\/button><\/div><\/section>$/);
  }
});

test("renders every supported platform as a branded visual tile", async () => {
  const [home, providers] = await Promise.all([
    read("index.html"),
    read("streaming/data/providers.json").then(JSON.parse)
  ]);
  const providerArea = home.match(/<div class="provider-chips">[\s\S]*?<\/div>/)?.[0];

  assert.ok(providerArea);
  assert.equal((providerArea.match(/class="provider-logo"/g) ?? []).length, providers.length);
  for (const provider of providers) {
    assert.match(provider.logo, /^https:\/\//);
    assert.match(providerArea, new RegExp(`data-provider="${provider.id}"[\\s\\S]*?alt=""`));
  }
});

test("computes bounded catalog rail movement", async () => {
  let rail;
  try {
    rail = await import("../assets/catalog-rails.mjs");
  } catch {
    assert.fail("catalog rail behavior module should exist");
  }

  assert.equal(rail.getRailPageDistance(1000), 840);
  assert.equal(rail.getRailPageDistance(200), 240);
  assert.equal(rail.getRailTarget({ scrollLeft: 300, clientWidth: 1000, scrollWidth: 2400 }, 1), 1140);
  assert.equal(rail.getRailTarget({ scrollLeft: 1800, clientWidth: 1000, scrollWidth: 2400 }, 1), 1400);
  assert.equal(rail.getRailTarget({ scrollLeft: 100, clientWidth: 1000, scrollWidth: 2400 }, -1), 0);
  assert.equal(rail.getRailWheelDelta({ deltaX: 0, deltaY: 120 }), 120);
  assert.equal(rail.getRailWheelDelta({ deltaX: -180, deltaY: 20 }), -180);
});

test("generates a locale-aware search index without runtime API dependency", async () => {
  const records = JSON.parse(await read("data/search-index.json"));
  assert.equal(records.length, seed.length * 3);
  assert.ok(records.some((record) => record.locale === "es" && record.url === "/es/donde-ver/interstellar/"));
  assert.ok(records.some((record) => record.locale === "pt" && record.url === "/pt/onde-ver/interstellar/"));
  assert.ok(records.some((record) => record.locale === "br" && record.url === "/br/onde-assistir/interstellar/"));
  const client = await read("assets/streaming.js");
  assert.match(client, /\/data\/search-index\.json/);
  assert.doesNotMatch(client, /api\.themoviedb|justwatch|rapidapi/i);
});

test("renders title pages with canonical, hreflang, JSON-LD and a safe pending state", async () => {
  const page = await read("es/donde-ver/interstellar/index.html");
  assert.match(page, /rel="canonical" href="https:\/\/visione\.one\/es\/donde-ver\/interstellar\/"/);
  assert.match(page, /hreflang="es-ES"/);
  assert.match(page, /hreflang="pt-PT"/);
  assert.match(page, /hreflang="pt-BR"/);
  assert.match(page, /"@type":"Movie"/);
  assert.match(page, /"@type":"BreadcrumbList"/);
  assert.match(page, /"@type":"FAQPage"/);
  assert.match(page, /name="robots" content="noindex,follow/);
  assert.doesNotMatch(page, /Última comprobación/);
  assert.match(page, /fuente comercial|fuente verificable/i);
});

test("never places noindex seed title pages in streaming sitemaps", async () => {
  const [esMap, ptMap, brMap] = await Promise.all([
    read("streaming-sitemap-es.xml"),
    read("streaming-sitemap-pt.xml"),
    read("streaming-sitemap-br.xml")
  ]);
  assert.match(esMap, /https:\/\/visione\.one\/es\//);
  assert.match(ptMap, /https:\/\/visione\.one\/pt\//);
  assert.match(brMap, /https:\/\/visione\.one\/br\//);
  assert.doesNotMatch(esMap, /donde-ver\/interstellar/);
  assert.doesNotMatch(ptMap, /onde-ver\/interstellar/);
  assert.doesNotMatch(brMap, /onde-assistir\/interstellar/);
});
