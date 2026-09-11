import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { fetchTvmazeShow, findTvmazeShow, mapTvmazeShow, mergeTvmazeIntoTitle } from "./adapters/tvmaze.mjs";

const dataUrl = new URL("./data/titles.json", import.meta.url);
const args = new Set(process.argv.slice(2));
const allSeries = args.has("--all-series");
const dryRun = args.has("--dry-run");
const slugArg = process.argv.find((arg) => arg.startsWith("--slug="));
const requestedSlug = slugArg ? slugArg.slice("--slug=".length).trim() : null;

if (!allSeries && !requestedSlug) {
  console.error("Usage: node streaming/sync-tvmaze.mjs --all-series [--dry-run] OR --slug=<series-slug> [--dry-run]");
  process.exitCode = 2;
} else {
  const raw = JSON.parse(await readFile(dataUrl, "utf8"));
  const output = [];
  let updated = 0;

  for (const title of raw) {
    if (title.type !== "series" || (!allSeries && title.slug !== requestedSlug)) {
      output.push(title);
      continue;
    }

    let show = null;
    const knownId = Number(title.source?.tvmaze_id);
    if (Number.isInteger(knownId) && knownId > 0) {
      show = await fetchTvmazeShow(knownId);
    } else {
      const candidate = await findTvmazeShow({ name: title.original_title || title.titles?.es || title.slug, year: title.year });
      if (candidate?.id) show = await fetchTvmazeShow(candidate.id);
    }

    if (!show) {
      console.warn(`TVmaze: no unique exact match for ${title.slug} (${title.year ?? "unknown year"})`);
      output.push(title);
      continue;
    }

    const mapped = mapTvmazeShow(show);
    const merged = mergeTvmazeIntoTitle(title, mapped);
    output.push(merged);
    updated += 1;
    console.log(`TVmaze: ${title.slug} <- show ${show.id}`);
  }

  if (requestedSlug && !raw.some((title) => title.type === "series" && title.slug === requestedSlug)) {
    throw new Error(`Series slug not found: ${requestedSlug}`);
  }

  if (!dryRun) {
    await writeFile(dataUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  }

  console.log(`TVmaze sync ${dryRun ? "dry-run " : ""}complete: ${updated} series updated in ${fileURLToPath(dataUrl)}.`);
}
