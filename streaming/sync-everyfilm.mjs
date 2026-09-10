import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { fetchEveryFilmDetail, mergeEveryFilmIntoTitle } from "./adapters/everyfilm.mjs";

const dataUrl = new URL("./data/titles.json", import.meta.url);
const args = new Set(process.argv.slice(2));
const allKnown = args.has("--all-known");
const dryRun = args.has("--dry-run");
const slugArg = process.argv.find((arg) => arg.startsWith("--slug="));
const idArg = process.argv.find((arg) => arg.startsWith("--id="));
const requestedSlug = slugArg ? slugArg.slice("--slug=".length).trim() : null;
const requestedId = idArg ? Number(idArg.slice("--id=".length)) : null;

if (!allKnown && !requestedSlug) {
  console.error("Usage: node streaming/sync-everyfilm.mjs --all-known [--dry-run] OR --slug=<slug> [--id=<every-film-id>] [--dry-run]");
  process.exitCode = 2;
} else if (requestedId != null && (!Number.isInteger(requestedId) || requestedId <= 0)) {
  throw new Error("--id must be a positive every.film media id");
} else {
  const raw = JSON.parse(await readFile(dataUrl, "utf8"));
  const output = [];
  let updated = 0;
  let targeted = 0;

  for (const title of raw) {
    const isTarget = requestedSlug ? title.slug === requestedSlug : Boolean(title.source?.every_film_id);
    if (!isTarget) {
      output.push(title);
      continue;
    }
    targeted += 1;

    const id = requestedSlug && requestedId ? requestedId : Number(title.source?.every_film_id);
    if (!Number.isInteger(id) || id <= 0) {
      if (requestedSlug) throw new Error(`No every.film id is stored for ${requestedSlug}; provide --id=<media-id> for the first pairing`);
      output.push(title);
      continue;
    }

    const detail = await fetchEveryFilmDetail(id);
    if (!detail) {
      console.warn(`every.film: media ${id} not found for ${title.slug}`);
      output.push(title);
      continue;
    }

    output.push(mergeEveryFilmIntoTitle(title, detail));
    updated += 1;
    console.log(`every.film: ${title.slug} <- media ${id}`);
  }

  if (requestedSlug && targeted === 0) throw new Error(`Title slug not found: ${requestedSlug}`);

  if (!dryRun) {
    await writeFile(dataUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  }

  console.log(`every.film sync ${dryRun ? "dry-run " : ""}complete: ${updated} titles updated in ${fileURLToPath(dataUrl)}.`);
}
