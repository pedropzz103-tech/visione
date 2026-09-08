import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const generatedRoots = ["es", "pt", "br", "credits"];

async function walk(directory, predicate = () => true) {
  const files = [];
  let entries = [];
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute, predicate));
    else if (predicate(absolute)) files.push(absolute);
  }
  return files;
}

function one(html, pattern, label, file) {
  const match = html.match(pattern);
  if (!match) throw new Error(`${label} missing in ${file}`);
  return match[1];
}

export async function validateGeneratedSite(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const candidates = [path.join(root, "index.html")];
  for (const directory of generatedRoots) candidates.push(...await walk(path.join(root, directory), (file) => file.endsWith(".html")));
  const htmlFiles = [];
  for (const file of candidates) {
    try { if ((await stat(file)).isFile()) htmlFiles.push(file); } catch { /* Optional generated root. */ }
  }
  if (!htmlFiles.length) throw new Error("No generated HTML files found");

  const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
  const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
  const canonicalOwners = new Map();

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const canonical = one(html, /<link rel="canonical" href="([^"]+)"/, "Canonical", file);
    if (canonicalOwners.has(canonical)) throw new Error(`Duplicate canonical ${canonical}: ${canonicalOwners.get(canonical)} and ${file}`);
    canonicalOwners.set(canonical, file);

    const robots = one(html, /<meta name="robots" content="([^"]+)"/, "Robots directive", file);
    if (robots.includes("noindex") && sitemapUrls.has(canonical)) throw new Error(`Noindex page is present in sitemap: ${canonical}`);
    if (!robots.includes("noindex") && !sitemapUrls.has(canonical)) throw new Error(`Indexable generated page missing from sitemap: ${canonical}`);

    const h1Count = (html.match(/<h1(?:\s|>)/g) ?? []).length;
    if (h1Count !== 1) throw new Error(`Expected exactly one h1 in ${file}, found ${h1Count}`);

    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => {
      try { return JSON.parse(match[1]); } catch (error) { throw new Error(`Invalid JSON-LD in ${file}: ${error.message}`); }
    });
    const isTitle = /[\\/](?:donde-ver|onde-ver|onde-assistir)[\\/]/.test(file);
    if (isTitle) {
      for (const type of ["BreadcrumbList", "FAQPage"]) {
        if (!schemas.some((schema) => schema["@type"] === type)) throw new Error(`${type} schema missing in ${file}`);
      }
      if (!schemas.some((schema) => ["Movie", "TVSeries"].includes(schema["@type"]))) throw new Error(`Movie or TVSeries schema missing in ${file}`);
      if (!html.includes('class="detail-section sources-panel"')) throw new Error(`Source attribution missing in ${file}`);
    }
  }

  return { htmlFiles: htmlFiles.length, sitemapUrls: sitemapUrls.size, duplicateCanonicals: 0 };
}

export async function validateSyntax(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const modules = await walk(root, (file) => file.endsWith(".mjs") || (file.startsWith(path.join(root, "assets")) && file.endsWith(".js")));
  for (const file of modules) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`JavaScript syntax failed for ${file}: ${result.stderr || result.stdout}`);
  }

  const css = await readFile(path.join(root, "assets", "discovery.css"), "utf8");
  if ((css.match(/{/g) ?? []).length !== (css.match(/}/g) ?? []).length) throw new Error("Unbalanced braces in discovery.css");
  if (/;\s*[a-z][\w-]*\s*;/i.test(css)) throw new Error("Malformed CSS declaration in discovery.css");
  const validUnits = new Set(["px", "rem", "em", "vw", "vh", "vmin", "vmax", "ch", "ex", "fr", "s", "ms", "deg", "rad", "turn", "dpi", "dppx"]);
  for (const match of css.matchAll(/(?<!#)\b\d+(?:\.\d+)?([a-z]+)\b/gi)) {
    if (!validUnits.has(match[1].toLowerCase())) throw new Error(`Unknown CSS unit ${match[1]} in discovery.css`);
  }
  return { modules: modules.length };
}

export async function validateInterfaces() {
  const [catalog, config, search, seo] = await Promise.all([
    import("./lib/catalog.mjs"), import("./lib/config.mjs"), import("./lib/search.mjs"), import("./lib/seo.mjs"),
  ]);
  const required = [catalog.validateTitle, catalog.evaluateTitleQuality, config.titlePath, search.buildSearchIndex, seo.generateSitemap];
  if (required.some((value) => typeof value !== "function")) throw new Error("A required build interface is missing");
  return { interfaces: required.length };
}

async function validateSafety(root) {
  const files = await walk(root, (file) => /\.(?:m?js|json|ya?ml|html|css)$/.test(file) && !file.includes(`${path.sep}docs${path.sep}`) && !file.includes(`${path.sep}tests${path.sep}`));
  const secretPatterns = [/gh[pousr]_[A-Za-z0-9]{30,}/, /sk-[A-Za-z0-9]{20,}/, /Bearer\s+[A-Za-z0-9._-]{30,}/];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (secretPatterns.some((pattern) => pattern.test(content))) throw new Error(`Possible secret committed in ${file}`);
    if ((file.includes(`${path.sep}.github${path.sep}`) || file.includes(`${path.sep}scripts${path.sep}`)) && /tablet\.visione\.one/i.test(content)) {
      throw new Error(`Protected hostname referenced by executable project code: ${file}`);
    }
  }
}

async function main() {
  const root = path.resolve(import.meta.dirname, "..");
  const mode = process.argv[2];
  if (mode === "--syntax") {
    const result = await validateSyntax(root);
    console.log(`Syntax: ${result.modules} JavaScript modules and discovery CSS validated.`);
    return;
  }
  if (mode === "--interfaces") {
    const result = await validateInterfaces();
    console.log(`Interfaces: ${result.interfaces} build contracts validated.`);
    return;
  }
  const [site] = await Promise.all([validateGeneratedSite(root), validateSyntax(root), validateInterfaces(), validateSafety(root)]);
  console.log(`Validation: ${site.htmlFiles} generated HTML pages and ${site.sitemapUrls} sitemap URLs validated.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
