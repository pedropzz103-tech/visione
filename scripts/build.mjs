import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateTitle } from "./lib/catalog.mjs";
import { LOCALES, providerPath, titlePath } from "./lib/config.mjs";
import { buildSearchIndex } from "./lib/search.mjs";
import { renderCreditsPage, renderGlobalPage, renderLocalePage, renderProviderPage, renderTitlePage } from "./lib/render.mjs";

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

  for (const directory of [...Object.keys(LOCALES), "credits"]) {
    await rm(path.join(targetPath, directory), { recursive: true, force: true });
  }

  await writePage(targetPath, "/", renderGlobalPage());
  for (const locale of Object.keys(LOCALES)) {
    await writePage(targetPath, `/${locale}/`, renderLocalePage({ locale, titles, providers: providers.providers }));
    for (const title of titles) {
      await writePage(targetPath, titlePath(locale, title.slug), renderTitlePage({ locale, title, providers: providers.providers }));
    }
    for (const provider of providers.providers) {
      await writePage(targetPath, providerPath(locale, provider.id), renderProviderPage({ locale, provider, titles }));
    }
  }
  await writePage(targetPath, "/credits/", renderCreditsPage());

  await mkdir(path.join(targetPath, "data"), { recursive: true });
  await writeFile(path.join(targetPath, "data", "search-index.json"), `${JSON.stringify(buildSearchIndex(titles))}\n`, "utf8");

  const sourceAssets = path.join(sourcePath, "assets");
  const targetAssets = path.join(targetPath, "assets");
  await mkdir(targetAssets, { recursive: true });
  if (path.resolve(sourceAssets) !== path.resolve(targetAssets)) {
    for (const asset of ["discovery.css", "discovery-search.js", "library.js"]) {
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
