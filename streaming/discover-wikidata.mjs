import { writeFile } from "node:fs/promises";
import { discoverWikidataFilms } from "./adapters/wikidata-query.mjs";

function valueArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : null;
}

const currentYear = new Date().getUTCFullYear();
const year = valueArg("year");
const fromYear = Number(year ?? valueArg("from-year") ?? currentYear);
const toYear = Number(year ?? valueArg("to-year") ?? fromYear);
const limit = Number(valueArg("limit") ?? 50);
const offset = Number(valueArg("offset") ?? 0);
const output = valueArg("output");

const candidates = await discoverWikidataFilms({ fromYear, toYear, limit, offset });
const json = `${JSON.stringify(candidates, null, 2)}\n`;

if (output) {
  await writeFile(output, json, "utf8");
  console.error(`Wikidata discovery wrote ${candidates.length} candidates to ${output}.`);
} else {
  process.stdout.write(json);
}
