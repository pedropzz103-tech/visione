import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { fetchTvmazeShow, fetchTvmazeWebSchedule, mapTvmazeShow, selectTvmazeDiscoveryCandidates } from "./adapters/tvmaze.mjs";

const dataUrl = new URL("./data/titles.json", import.meta.url);
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const bootstrap = args.includes("--bootstrap");
const valueArg = (name, fallback) => {
  const prefix = `--${name}=`;
  const raw = args.find((arg) => arg.startsWith(prefix));
  return raw ? Number(raw.slice(prefix.length)) : fallback;
};
const targetSeries = Math.max(1, Math.min(250, valueArg("target-series", 60)));
const dailyMax = Math.max(0, Math.min(25, valueArg("max-new", 10)));
const backwardDays = Math.max(1, Math.min(45, valueArg("backward-days", 30)));
const forwardDays = Math.max(0, Math.min(21, valueArg("forward-days", 14)));
const todayArg = args.find((arg) => arg.startsWith("--today="));
const today = todayArg ? new Date(`${todayArg.slice(8)}T12:00:00Z`) : new Date();
if (Number.isNaN(today.getTime())) throw new Error("Invalid --today date");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isoDate = (date) => date.toISOString().slice(0, 10);
const shift = (date, days) => new Date(date.getTime() + days * 86400000);

const raw = JSON.parse(await readFile(dataUrl, "utf8"));
const existingSeries = raw.filter((title) => title.type === "series");
const existingIds = new Set(existingSeries.map((title) => Number(title.source?.tvmaze_id)).filter((id) => Number.isInteger(id) && id > 0));
const slugSet = new Set(raw.map((title) => title.slug));
const needed = Math.max(0, targetSeries - existingSeries.length);
const importLimit = bootstrap ? needed : Math.min(needed || dailyMax, dailyMax);

if (importLimit === 0) {
  console.log(`TVmaze discovery: target already satisfied (${existingSeries.length}/${targetSeries} series).`);
  process.exit(0);
}

const scheduleRows = [];
for (let offset = -backwardDays; offset <= forwardDays; offset += 1) {
  const date = isoDate(shift(today, offset));
  try {
    scheduleRows.push(...await fetchTvmazeWebSchedule(date));
  } catch (error) {
    console.warn(`TVmaze discovery: schedule ${date} failed: ${error.message}`);
  }
  await sleep(260);
}

const candidates = selectTvmazeDiscoveryCandidates(scheduleRows, {
  existingIds,
  limit: Math.min(100, Math.max(importLimit * 3, importLimit))
});

const additions = [];
const discoveredAt = today.toISOString();
for (const candidate of candidates) {
  if (additions.length >= importLimit) break;
  try {
    const show = await fetchTvmazeShow(candidate.id);
    if (!show?.id || !(show.image?.original || show.image?.medium)) continue;
    const mapped = mapTvmazeShow(show, { discoveredAt });
    if (slugSet.has(mapped.slug)) continue;
    slugSet.add(mapped.slug);
    additions.push(mapped);
    console.log(`TVmaze discovery: + ${mapped.slug} <- show ${show.id}`);
  } catch (error) {
    console.warn(`TVmaze discovery: show ${candidate.id} skipped: ${error.message}`);
  }
  await sleep(260);
}

if (additions.length < importLimit) {
  console.warn(`TVmaze discovery: only ${additions.length}/${importLimit} requested new series were found in the bounded window.`);
}

if (!dryRun && additions.length) {
  await writeFile(dataUrl, `${JSON.stringify([...raw, ...additions], null, 2)}\n`, "utf8");
}

console.log(`TVmaze discovery ${dryRun ? "dry-run " : ""}complete: ${additions.length} new series; catalogue would contain ${existingSeries.length + additions.length} series in ${fileURLToPath(dataUrl)}.`);
