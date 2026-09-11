import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { absoluteUrl, getLocale, providerPath, SUPPORTED_LOCALES, titlePath } from "./config.mjs";
import { applyAffiliateConfigToCatalog } from "./affiliate.mjs";
import { isPublicAnywhere, isPublicInMarket } from "./publication.mjs";
import { evaluateIndexability, normalizeTitle } from "./schema.mjs";
import { renderGlobalHome } from "./render-global-home.mjs";
import { renderLocaleHome, renderProviderPage, renderTitlePage } from "./render.mjs";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function write(path, content) {
  const url = new URL(path, root);
  await mkdir(dirname(fileURLToPath(url)), { recursive: true });
  await writeFile(url, content, "utf8");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function decorateDiscoveryHtml(html, providers = []) {
  const creditsLink = '<a href="/data-credits/">Dados & fontes</a>';
  let output = html;
  if (!output.includes('href="/data-credits/"')) {
    output = output.replaceAll('<a href="/news/">Wire</a>', `${creditsLink}<a href="/news/">Wire</a>`);
  }
  if (output.includes('<div class="provider-chips"></div>') && providers.length) {
    const chips = providers.map((provider) => `<span class="provider-chip provider-tile" data-provider="${escapeHtml(provider.id)}"><img class="provider-logo" src="${escapeHtml(provider.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="provider-name">${escapeHtml(provider.name)}</span></span>`).join("");
    output = output.replace('<div class="provider-chips"></div>', `<div class="provider-chips">${chips}</div>`);
  }
  return output;
}

function searchTermsFromCredits(title) {
  const terms = [...(title.genres ?? [])];
  for (const value of Object.values(title.credits ?? {})) {
    if (typeof value === "string") terms.push(value);
    else if (Array.isArray(value)) terms.push(...value.filter((item) => typeof item === "string"));
  }
  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
}

function xmlUrlset(urls) {
  const rows = [...new Set(urls)].map((url) => `  <url><loc>${url}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

function xmlSitemapIndex(paths) {
  const rows = paths.map((path) => `  <sitemap><loc>${absoluteUrl(path)}</loc></sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</sitemapindex>\n`;
}

export async function buildSite() {
  const [rawTitles, providers, affiliateConfig] = await Promise.all([
    readJson("streaming/data/titles.json"),
    readJson("streaming/data/providers.json"),
    readJson("streaming/data/affiliate-config.json").catch(() => [])
  ]);
  const internalTitles = applyAffiliateConfigToCatalog(rawTitles.map(normalizeTitle), affiliateConfig);
  const globalTitles = internalTitles.filter(isPublicAnywhere);

  await write("index.html", decorateDiscoveryHtml(renderGlobalHome(globalTitles, providers), providers));

  const searchRecords = [];
  const sitemapPaths = [];
  const publicCounts = {};

  for (const locale of SUPPORTED_LOCALES) {
    const config = getLocale(locale);
    const titles = internalTitles.filter((title) => isPublicInMarket(title, config.country));
    publicCounts[config.country] = titles.length;

    // Remove stale generated title/provider pages before recreating the eligible set.
    await rm(new URL(`${locale}/${config.titleSegment}/`, root), { recursive: true, force: true });
    await rm(new URL(`${locale}/${config.providerSegment}/`, root), { recursive: true, force: true });

    await write(`${locale}/index.html`, decorateDiscoveryHtml(renderLocaleHome(locale, titles, providers), providers.filter((provider) => provider.markets.includes(config.country))));
    const indexableUrls = [absoluteUrl(`/${locale}/`)];

    for (const title of titles) {
      const output = `${locale}/${config.titleSegment}/${title.slug}/index.html`;
      await write(output, decorateDiscoveryHtml(renderTitlePage(title, locale, providers)));
      if (evaluateIndexability(title, locale).indexable) indexableUrls.push(absoluteUrl(titlePath(locale, title.slug)));
      searchRecords.push({
        id: title.id,
        type: title.type,
        title: title.titles[locale],
        alternateTitles: [...new Set([title.original_title, ...Object.values(title.titles)].filter(Boolean))],
        searchTerms: searchTermsFromCredits(title),
        year: title.year,
        poster: title.poster,
        artwork: title.artwork,
        url: titlePath(locale, title.slug),
        locale
      });
    }

    for (const provider of providers.filter((item) => item.markets.includes(config.country))) {
      const providerTitles = titles.filter((title) => (title.offers[config.country] ?? []).some((offer) => offer.provider === provider.id));
      if (!providerTitles.length) continue;
      const output = `${locale}/${config.providerSegment}/${provider.id}/index.html`;
      await write(output, decorateDiscoveryHtml(renderProviderPage(provider, locale, providerTitles)));
      indexableUrls.push(absoluteUrl(providerPath(locale, provider.id)));
    }

    const sitemapPath = `streaming-sitemap-${locale}.xml`;
    await write(sitemapPath, xmlUrlset(indexableUrls));
    sitemapPaths.push(`/${sitemapPath}`);
  }

  await write("streaming-sitemap-index.xml", xmlSitemapIndex(sitemapPaths));
  await write("data/search-index.json", `${JSON.stringify(searchRecords)}\n`);

  return { titles: internalTitles, globalTitles, providers, searchRecords, sitemapPaths, publicCounts };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await buildSite();
  console.log(`VISIONE build complete: ${result.titles.length} internal titles; ${result.globalTitles.length} public somewhere; ES=${result.publicCounts.ES ?? 0}, PT=${result.publicCounts.PT ?? 0}, BR=${result.publicCounts.BR ?? 0}; ${result.searchRecords.length} localized search records.`);
}
