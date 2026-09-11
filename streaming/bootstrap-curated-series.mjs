import { readFile, writeFile } from "node:fs/promises";
import { fetchTvmazeShow, findTvmazeShow, mapTvmazeShow } from "./adapters/tvmaze.mjs";

const titlesUrl = new URL("./data/titles.json", import.meta.url);
const seedsUrl = new URL("./data/curated-series-seeds.json", import.meta.url);
const dryRun = process.argv.includes("--dry-run");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const titles = JSON.parse(await readFile(titlesUrl, "utf8"));
const seeds = JSON.parse(await readFile(seedsUrl, "utf8"));
const existingTvmazeIds = new Set(titles.map((title) => Number(title.source?.tvmaze_id)).filter((id) => Number.isInteger(id) && id > 0));
const existingIdentity = new Set(titles.flatMap((title) => [
  `${String(title.original_title ?? "").trim().toLowerCase()}|${title.year}`,
  `${String(title.titles?.es ?? "").trim().toLowerCase()}|${title.year}`,
  `${String(title.titles?.pt ?? "").trim().toLowerCase()}|${title.year}`,
  `${String(title.titles?.br ?? "").trim().toLowerCase()}|${title.year}`
]));
const slugs = new Set(titles.map((title) => title.slug));
const additions = [];
const now = new Date().toISOString();

for (const seed of seeds) {
  const key = `${String(seed.name).trim().toLowerCase()}|${Number(seed.year)}`;
  if (existingIdentity.has(key)) continue;
  try {
    const candidate = await findTvmazeShow({ name: seed.name, year: seed.year });
    if (!candidate?.id || existingTvmazeIds.has(Number(candidate.id))) continue;
    const show = await fetchTvmazeShow(candidate.id);
    if (!show?.id || !(show.image?.original || show.image?.medium)) {
      console.warn(`Curated TVmaze seed skipped without usable cover: ${seed.name} (${seed.year})`);
      continue;
    }
    const mapped = mapTvmazeShow(show, { fetchedAt: now, discoveredAt: now });
    if (slugs.has(mapped.slug)) {
      console.warn(`Curated TVmaze seed slug collision skipped: ${mapped.slug}`);
      continue;
    }
    slugs.add(mapped.slug);
    existingTvmazeIds.add(Number(show.id));
    additions.push(mapped);
    console.log(`Curated TVmaze: + ${mapped.slug} <- ${show.id}`);
  } catch (error) {
    console.warn(`Curated TVmaze seed failed for ${seed.name} (${seed.year}): ${error.message}`);
  }
  await pause(260);
}

if (!dryRun && additions.length) {
  await writeFile(titlesUrl, `${JSON.stringify([...titles, ...additions], null, 2)}\n`, "utf8");
}
console.log(`Curated TVmaze bootstrap ${dryRun ? "dry-run " : ""}complete: ${additions.length} new series.`);
