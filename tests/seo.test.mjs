import assert from "node:assert/strict";
import test from "node:test";

import { breadcrumbSchema, canonicalFor, generateSitemap, hreflangForTitle, titleSchema } from "../scripts/lib/seo.mjs";

const title = {
  type: "movie",
  slug: "coda",
  titles: { es: "CODA", pt: "CODA", br: "No Ritmo do Coração" },
  original_title: "CODA",
  overview: { es: "Sinopsis", pt: "Sinopse", br: "Sinopse" },
  year: 2021,
  genres: ["Drama"],
  credits: { directors: ["Siân Heder"], cast: ["Emilia Jones"] },
};

test("builds stable absolute canonicals", () => {
  assert.equal(canonicalFor("/pt/onde-ver/coda/"), "https://visione.one/pt/onde-ver/coda/");
  assert.throws(() => canonicalFor("https://evil.example/title"), /site path/i);
});

test("maps equivalent localized title URLs to correct hreflang values", () => {
  assert.deepEqual(hreflangForTitle(title), [
    { hreflang: "es-ES", href: "https://visione.one/es/donde-ver/coda/" },
    { hreflang: "pt-PT", href: "https://visione.one/pt/onde-ver/coda/" },
    { hreflang: "pt-BR", href: "https://visione.one/br/onde-assistir/coda/" },
    { hreflang: "x-default", href: "https://visione.one/pt/onde-ver/coda/" },
  ]);
});

test("structured title data omits unsupported ratings and offers", () => {
  const schema = titleSchema(title, "pt");
  assert.equal(schema["@type"], "Movie");
  assert.equal(schema.name, "CODA");
  assert.equal(schema.aggregateRating, undefined);
  assert.equal(schema.potentialAction, undefined);
});

test("breadcrumb schema preserves human-visible order", () => {
  const schema = breadcrumbSchema([
    { name: "VISIONE", path: "/pt/" },
    { name: "CODA", path: "/pt/onde-ver/coda/" },
  ]);
  assert.equal(schema.itemListElement[0].position, 1);
  assert.equal(schema.itemListElement[1].item, "https://visione.one/pt/onde-ver/coda/");
});

test("sitemap excludes noindex pages and rejects duplicate canonicals", () => {
  const sitemap = generateSitemap([
    { canonical: "https://visione.one/", indexable: true, lastmod: "2026-09-08" },
    { canonical: "https://visione.one/thin/", indexable: false, lastmod: "2026-09-08" },
  ]);
  assert.match(sitemap, /<loc>https:\/\/visione\.one\/<\/loc>/);
  assert.doesNotMatch(sitemap, /thin/);
  assert.throws(() => generateSitemap([{ canonical: "https://visione.one/", indexable: true }, { canonical: "https://visione.one/", indexable: true }]), /duplicate canonical/i);
});
