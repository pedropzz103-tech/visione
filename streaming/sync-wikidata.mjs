import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { fetchWikidataFilmMetadata, findWikidataFilm, mergeWikidataIntoTitle } from "./adapters/wikidata.mjs";

const dataUrl = new URL("./data/titles.json", import.meta.url);
const args = new Set(process.argv.slice(2));
const allMovies = args.has("--all-movies");
const dryRun = args.has("--dry-run");
const slugArg = process.argv.find((arg) => arg.startsWith("--slug="));
const requestedSlug = slugArg ? slugArg.slice("--slug=".length).trim() : null;

if (!allMovies && !requestedSlug) {
  console.error("Usage: node streaming/sync-wikidata.mjs --all-movies [--dry-run] OR --slug=<movie-slug> [--dry-run]");
  process.exitCode = 2;
} else {
  const raw = JSON.parse(await readFile(dataUrl, "utf8"));
  const output = [];
  let updated = 0;

  for (const title of raw) {
    if (title.type !== "movie" || (!allMovies && title.slug !== requestedSlug)) {
      output.push(title);
      continue;
    }

    let qid = String(title.source?.wikidata_id ?? "").trim();
    if (!/^Q\d+$/.test(qid)) {
      const candidate = await findWikidataFilm({
        name: title.original_title || title.titles?.es || title.slug,
        year: title.year
      });
      qid = candidate?.id ?? "";
    }

    if (!qid) {
      console.warn(`Wikidata: no unique exact film match for ${title.slug} (${title.year ?? "unknown year"})`);
      output.push(title);
      continue;
    }

    const mapped = await fetchWikidataFilmMetadata(qid);
    if (!mapped) {
      console.warn(`Wikidata: entity ${qid} was not available for ${title.slug}`);
      output.push(title);
      continue;
    }

    output.push(mergeWikidataIntoTitle(title, mapped));
    updated += 1;
    console.log(`Wikidata: ${title.slug} <- ${qid}`);
  }

  if (requestedSlug && !raw.some((title) => title.type === "movie" && title.slug === requestedSlug)) {
    throw new Error(`Movie slug not found: ${requestedSlug}`);
  }

  if (!dryRun) {
    await writeFile(dataUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  }

  console.log(`Wikidata sync ${dryRun ? "dry-run " : ""}complete: ${updated} movies updated in ${fileURLToPath(dataUrl)}.`);
}
