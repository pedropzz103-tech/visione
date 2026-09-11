import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { mergeOfficialAvailabilityEvidence } from "./adapters/official-availability.mjs";

const titlesUrl = new URL("./data/titles.json", import.meta.url);
const evidenceUrl = new URL("./data/official-availability-evidence.json", import.meta.url);
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const slugArg = process.argv.find((arg) => arg.startsWith("--slug="));
const requestedSlug = slugArg ? slugArg.slice("--slug=".length).trim() : null;

const titles = JSON.parse(await readFile(titlesUrl, "utf8"));
const evidence = JSON.parse(await readFile(evidenceUrl, "utf8"));
if (!Array.isArray(evidence)) throw new Error("official-availability-evidence.json must contain an array");

const knownSlugs = new Set(titles.map((title) => title.slug));
for (const entry of evidence) {
  const slug = String(entry?.slug ?? "").trim();
  if (!slug || !knownSlugs.has(slug)) throw new Error(`Official availability evidence references an unknown slug: ${slug || "<missing>"}`);
}

const grouped = new Map();
for (const entry of evidence) {
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

console.log(`Official availability evidence ${dryRun ? "dry-run " : ""}complete: ${updated} titles updated from ${fileURLToPath(evidenceUrl)}.`);
console.log("This command imports evidence only; it does not fetch or scrape provider pages.");
