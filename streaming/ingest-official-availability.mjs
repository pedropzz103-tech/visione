import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { mergeOfficialAvailabilityEvidence } from "./adapters/official-availability.mjs";

const titlesUrl = new URL("./data/titles.json", import.meta.url);
const evidenceUrls = [
  new URL("./data/official-availability-evidence.json", import.meta.url),
  new URL("./data/official-availability-evidence-regional.json", import.meta.url)
];
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const strict = args.has("--strict");
const slugArg = process.argv.find((arg) => arg.startsWith("--slug="));
const requestedSlug = slugArg ? slugArg.slice("--slug=".length).trim() : null;

async function readEvidence(url) {
  try {
    const parsed = JSON.parse(await readFile(url, "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`${fileURLToPath(url)} must contain an array`);
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

const titles = JSON.parse(await readFile(titlesUrl, "utf8"));
const evidence = (await Promise.all(evidenceUrls.map(readEvidence))).flat();
const knownSlugs = new Set(titles.map((title) => title.slug));
const acceptedEvidence = [];
let skippedUnknown = 0;

for (const entry of evidence) {
  const slug = String(entry?.slug ?? "").trim();
  if (!slug || !knownSlugs.has(slug)) {
    skippedUnknown += 1;
    const message = `Official availability evidence references an unknown slug: ${slug || "<missing>"}`;
    if (strict || (requestedSlug && requestedSlug === slug)) throw new Error(message);
    console.warn(`${message}; skipped until the title exists.`);
    continue;
  }
  acceptedEvidence.push(entry);
}

const grouped = new Map();
for (const entry of acceptedEvidence) {
  if (requestedSlug && entry.slug !== requestedSlug) continue;
  const values = grouped.get(entry.slug) ?? [];
  values.push(entry);
  grouped.set(entry.slug, values);
}

if (requestedSlug && !knownSlugs.has(requestedSlug)) throw new Error(`Title slug not found: ${requestedSlug}`);

let updated = 0;
const output = titles.map((title) => {
  const entries = grouped.get(title.slug) ?? [];
  if (!entries.length) return title;
  const merged = mergeOfficialAvailabilityEvidence(title, entries);
  if (JSON.stringify(merged) !== JSON.stringify(title)) updated += 1;
  return merged;
});

if (!dryRun) {
  await writeFile(titlesUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

console.log(`Official availability evidence ${dryRun ? "dry-run " : ""}complete: ${updated} titles updated from ${evidenceUrls.length} evidence files; ${skippedUnknown} unknown entries skipped.`);
console.log("This command imports curated evidence only; it does not fetch or scrape provider pages.");
