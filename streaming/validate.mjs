import { access, readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getLocale, SUPPORTED_LOCALES } from "./config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

async function exists(path) {
  try { await access(join(root, path)); return true; } catch { return false; }
}

async function collectHtml(dir, prefix = dir) {
  const absolute = join(root, dir);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtml(child, join(prefix, entry.name)));
    else if (entry.isFile() && extname(entry.name) === ".html") files.push(child.replaceAll("\\", "/"));
  }
  return files;
}

function canonicalOf(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] ?? null;
}

function robotsOf(html) {
  return html.match(/<meta name="robots" content="([^"]+)"/i)?.[1] ?? "";
}

function localHrefToFile(href) {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const clean = href.split("#")[0].split("?")[0];
  if (!clean || clean === "/") return "index.html";
  if (clean.endsWith("/")) return `${clean.slice(1)}index.html`;
  return clean.slice(1);
}

export async function validateBuild() {
  const errors = [];
  const canonicals = new Map();
  const streamingFiles = [];

  for (const locale of SUPPORTED_LOCALES) {
    if (!await exists(`${locale}/index.html`)) errors.push(`Missing locale home: ${locale}`);
    else streamingFiles.push(...await collectHtml(locale));
  }

  const sitemapText = {};
  for (const locale of SUPPORTED_LOCALES) {
    const path = `streaming-sitemap-${locale}.xml`;
    if (!await exists(path)) errors.push(`Missing sitemap: ${path}`);
    else sitemapText[locale] = await readFile(join(root, path), "utf8");
  }

  for (const file of streamingFiles) {
    const html = await readFile(join(root, file), "utf8");
    const canonical = canonicalOf(html);
    const robots = robotsOf(html);
    if (!canonical) errors.push(`Missing canonical: ${file}`);
    else if (canonicals.has(canonical)) errors.push(`Duplicate canonical ${canonical}: ${canonicals.get(canonical)} and ${file}`);
    else canonicals.set(canonical, file);

    const locale = file.split("/")[0];
    if (!SUPPORTED_LOCALES.includes(locale)) continue;
    const sitemap = sitemapText[locale] ?? "";
    if (robots.includes("noindex") && canonical && sitemap.includes(`<loc>${canonical}</loc>`)) {
      errors.push(`noindex page appears in sitemap: ${file}`);
    }

    const config = getLocale(locale);
    const isTitle = file.includes(`/${config.titleSegment}/`);
    if (isTitle) {
      for (const alternate of SUPPORTED_LOCALES) {
        const lang = getLocale(alternate).lang;
        if (!html.includes(`hreflang="${lang}"`)) errors.push(`Missing hreflang ${lang}: ${file}`);
      }
      if (!html.includes('"@type":"Movie"') && !html.includes('"@type":"TVSeries"')) {
        errors.push(`Missing media JSON-LD: ${file}`);
      }
      if (!html.includes("Última") && !html.includes("comprobación") && !html.includes("verificação")) {
        errors.push(`Missing visible freshness information: ${file}`);
      }
    }

    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const target = localHrefToFile(match[1]);
      if (!target || target.startsWith("news/") || target.startsWith("assets/")) continue;
      if (!await exists(target)) errors.push(`Broken generated internal link from ${file}: ${match[1]}`);
    }
  }

  for (const locale of SUPPORTED_LOCALES) {
    const html = await readFile(join(root, `${locale}/index.html`), "utf8");
    if (robotsOf(html).includes("noindex")) errors.push(`Locale home must be indexable: ${locale}`);
    if (!sitemapText[locale]?.includes(`<loc>https://visione.one/${locale}/</loc>`)) errors.push(`Locale home missing from sitemap: ${locale}`);
  }

  const credits = JSON.parse(await readFile(join(root, "streaming/data/titles.json"), "utf8"));
  for (const raw of credits) {
    const offers = Object.values(raw.offers ?? {}).flat();
    for (const offer of offers) {
      if (offer.requires_attribution && (!Array.isArray(offer.attribution) || offer.attribution.length === 0)) {
        errors.push(`Offer requires attribution but none is configured: ${raw.id}/${offer.provider}`);
      }
    }
  }

  if (errors.length) throw new Error(`VISIONE streaming validation failed:\n- ${errors.join("\n- ")}`);
  return { pages: streamingFiles.length, canonicals: canonicals.size };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await validateBuild();
  console.log(`VISIONE validation passed: ${result.pages} pages, ${result.canonicals} unique canonicals.`);
}
