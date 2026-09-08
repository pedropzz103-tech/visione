import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateTitle } from "./lib/catalog.mjs";
import { fetchTmdbTitle, isFresh } from "./adapters/tmdb.mjs";

const root = path.resolve(import.meta.dirname, "..");
const seedPath = path.join(root, "data", "catalog.seed.json");
const outputPath = path.join(root, "data", "catalog.json");
const seed = JSON.parse(await readFile(seedPath, "utf8"));
const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
const maxAgeHours = Number.parseInt(process.env.CATALOG_MAX_AGE_HOURS ?? "24", 10);

await mkdir(path.dirname(outputPath), { recursive: true });

if (!token) {
  for (const title of seed.titles) validateTitle(title);
  await copyFile(seedPath, outputPath);
  console.log(`Catalog: validated ${seed.titles.length} source-attributed seed titles (TMDB token not configured).`);
} else {
  let current = null;
  try {
    current = JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    current = null;
  }

  if (current && isFresh({ updated_at: current.generated_at }, new Date(), maxAgeHours)) {
    console.log(`Catalog: current snapshot is within the ${maxAgeHours} hour freshness window.`);
  } else {
    const refreshed = [];
    for (const seedTitle of seed.titles) {
      if (!seedTitle.tmdb_id) {
        refreshed.push(validateTitle(seedTitle));
        continue;
      }
      try {
        refreshed.push(await fetchTmdbTitle({
          id: seedTitle.tmdb_id,
          mediaType: seedTitle.type,
          token,
          baseUrl: process.env.TMDB_API_BASE_URL,
        }));
      } catch (error) {
        console.warn(`Catalog: refresh failed for ${seedTitle.id}; keeping last known sourced seed (${error.message}).`);
        refreshed.push(validateTitle(seedTitle));
      }
    }
    const snapshot = { version: 1, generated_at: new Date().toISOString(), source_mode: "tmdb-with-seed-fallback", titles: refreshed };
    await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    console.log(`Catalog: wrote ${refreshed.length} normalized titles.`);
  }
}
