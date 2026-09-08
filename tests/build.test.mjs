import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildSite } from "../scripts/build.mjs";

const sourceRoot = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"));
const providers = JSON.parse(await readFile(new URL("../data/providers.json", import.meta.url), "utf8"));

async function withBuiltSite(run) {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "visione-build-"));
  try {
    await buildSite({ sourceRoot, outputRoot, catalog, providers });
    await run(outputRoot);
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
}

const readBuilt = (root, relativePath) => readFile(path.join(root, relativePath), "utf8");

test("build creates a search-first global entry and all locale homes", async () => {
  await withBuiltSite(async (root) => {
    const [global, es, pt, br] = await Promise.all([
      readBuilt(root, "index.html"),
      readBuilt(root, "es/index.html"),
      readBuilt(root, "pt/index.html"),
      readBuilt(root, "br/index.html"),
    ]);

    assert.match(global, /VISIONE/);
    assert.match(global, /href="\/es\/"/);
    assert.match(global, /href="\/pt\/"/);
    assert.match(global, /href="\/br\/"/);
    assert.match(global, /href="\/news\/"/);
    assert.match(global, /role="search"/);
    assert.match(es, /Encuentra dónde ver películas y series/);
    assert.match(pt, /Descobre onde ver filmes e séries/);
    assert.match(br, /Descubra onde assistir filmes e séries/);
    for (const html of [es, pt, br]) assert.match(html, /role="search"/);
  });
});

test("build creates representative movie, series, provider, and credits pages", async () => {
  await withBuiltSite(async (root) => {
    const [movie, series, provider, credits] = await Promise.all([
      readBuilt(root, "pt/onde-ver/coda/index.html"),
      readBuilt(root, "br/onde-assistir/stranger-things/index.html"),
      readBuilt(root, "es/plataformas/netflix/index.html"),
      readBuilt(root, "credits/index.html"),
    ]);

    assert.match(movie, /Apple TV\+/);
    assert.match(movie, /Preço não fornecido pela fonte/);
    assert.match(series, /Temporada 1/);
    assert.match(series, /Netflix/);
    assert.match(provider, /Stranger Things/);
    assert.match(credits, /TMDB|The Movie Database/);
    assert.match(credits, /JustWatch/);
  });
});

test("build writes a compact local search index with localized paths", async () => {
  await withBuiltSite(async (root) => {
    const index = JSON.parse(await readBuilt(root, "data/search-index.json"));
    assert.equal(index.length, 3);
    assert.equal(index.find((entry) => entry.titles.br === "Stranger Things").paths.br, "/br/onde-assistir/stranger-things/");
    assert.ok(index.every((entry) => !("overview" in entry) && !("offers" in entry)));
  });
});

test("title pages disclose source freshness and legal destination behavior", async () => {
  await withBuiltSite(async (root) => {
    const html = await readBuilt(root, "es/donde-ver/stranger-things/index.html");
    assert.match(html, /Atualizado|Actualizado/);
    assert.match(html, /Netflix official catalog/);
    assert.match(html, /target="_blank" rel="noopener noreferrer sponsored?"|target="_blank" rel="noopener noreferrer"/);
    assert.doesNotMatch(html, /assistir agora|ver ahora.*VISIONE/i);
  });
});

test("title pages publish canonical, hreflang, breadcrumbs, and fact-backed schema", async () => {
  await withBuiltSite(async (root) => {
    const html = await readBuilt(root, "pt/onde-ver/coda/index.html");
    assert.match(html, /rel="canonical" href="https:\/\/visione\.one\/pt\/onde-ver\/coda\/"/);
    assert.match(html, /hreflang="es-ES" href="https:\/\/visione\.one\/es\/donde-ver\/coda\/"/);
    assert.match(html, /hreflang="pt-PT"/);
    assert.match(html, /hreflang="pt-BR"/);
    assert.match(html, /hreflang="x-default"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
    assert.match(html, /"@type":"Movie"/);
    assert.doesNotMatch(html, /aggregateRating|Review/);
  });
});

test("generated sitemap combines editorial and quality-approved discovery URLs", async () => {
  await withBuiltSite(async (root) => {
    const sitemap = await readBuilt(root, "sitemap.xml");
    assert.match(sitemap, /<loc>https:\/\/visione\.one\/news\/about\.html<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/visione\.one\/pt\/onde-ver\/coda\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/visione\.one\/es\/plataformas\/netflix\/<\/loc>/);
  });
});
