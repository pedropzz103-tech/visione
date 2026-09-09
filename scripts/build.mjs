import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { evaluateTitleQuality, validateTitle } from "./lib/catalog.mjs";
import { LOCALES, SITE_URL, providerPath, titlePath } from "./lib/config.mjs";
import { buildSearchIndex } from "./lib/search.mjs";
import { renderCreditsPage, renderGlobalPage, renderLocalePage, renderProviderPage, renderTitlePage } from "./lib/render.mjs";
import { generateSitemap } from "./lib/seo.mjs";

async function writePage(root, route, html) {
  const relative = route === "/" ? "index.html" : path.join(route.replace(/^\//, ""), "index.html");
  const destination = path.join(root, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html, "utf8");
}

export async function buildSite({ sourceRoot, outputRoot, catalog, providers }) {
  const sourcePath = fileURLToPath(sourceRoot instanceof URL ? sourceRoot : pathToFileURL(sourceRoot));
  const targetPath = path.resolve(outputRoot);
  const titles = catalog.titles.map((title) => validateTitle(title));
  const lastmod = catalog.generated_at?.slice(0, 10);
  const sitemapPages = [];
  try {
    const existingSitemap = await readFile(path.join(sourcePath, "sitemap.xml"), "utf8");
    for (const match of existingSitemap.matchAll(/<loc>(https:\/\/visione\.one\/news\/[^<]+)<\/loc>/g)) {
      sitemapPages.push({ canonical: match[1], indexable: true });
    }
  } catch {
    // A clean build can begin without editorial content; repository builds retain it.
  }

  for (const directory of [...Object.keys(LOCALES), "credits"]) {
    await rm(path.join(targetPath, directory), { recursive: true, force: true });
  }

  await writePage(targetPath, "/", renderGlobalPage());
  sitemapPages.push({ canonical: `${SITE_URL}/`, indexable: true, lastmod });
  for (const locale of Object.keys(LOCALES)) {
    await writePage(targetPath, `/${locale}/`, renderLocalePage({ locale, titles, providers: providers.providers }));
    sitemapPages.push({ canonical: `${SITE_URL}/${locale}/`, indexable: true, lastmod });
    for (const title of titles) {
      await writePage(targetPath, titlePath(locale, title.slug), renderTitlePage({ locale, title, providers: providers.providers }));
      sitemapPages.push({ canonical: `${SITE_URL}${titlePath(locale, title.slug)}`, indexable: evaluateTitleQuality(title, locale).indexable, lastmod: title.updated_at?.slice(0, 10) });
    }
    for (const provider of providers.providers) {
      await writePage(targetPath, providerPath(locale, provider.id), renderProviderPage({ locale, provider, titles }));
      const country = LOCALES[locale].country;
      const hasTitles = titles.some((title) => title.offers[country].some((offer) => offer.provider_id === provider.id));
      sitemapPages.push({ canonical: `${SITE_URL}${providerPath(locale, provider.id)}`, indexable: hasTitles, lastmod });
    }
  }
  await writePage(targetPath, "/credits/", renderCreditsPage());
  sitemapPages.push({ canonical: `${SITE_URL}/credits/`, indexable: true, lastmod });
  await writeFile(path.join(targetPath, "sitemap.xml"), generateSitemap(sitemapPages), "utf8");

  await mkdir(path.join(targetPath, "data"), { recursive: true });
  await writeFile(path.join(targetPath, "data", "search-index.json"), `${JSON.stringify(buildSearchIndex(titles))}\n`, "utf8");

  const sourceAssets = path.join(sourcePath, "assets");
  const targetAssets = path.join(targetPath, "assets");
  await mkdir(targetAssets, { recursive: true });
  if (path.resolve(sourceAssets) !== path.resolve(targetAssets)) {
    for (const asset of ["discovery.css", "discovery-i18n.js", "discovery-search.js", "library.js"]) {
      await copyFile(path.join(sourceAssets, asset), path.join(targetAssets, asset));
    }
  }
  return { titleCount: titles.length, localeCount: Object.keys(LOCALES).length };
}

async function main() {
  const root = path.resolve(import.meta.dirname, "..");
  const [catalog, providers] = await Promise.all([
    readFile(path.join(root, "data", "catalog.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data", "providers.json"), "utf8").then(JSON.parse),
  ]);
  const result = await buildSite({ sourceRoot: pathToFileURL(`${root}${path.sep}`), outputRoot: root, catalog, providers });
  console.log(`Build: generated ${result.titleCount} titles across ${result.localeCount} locales.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
