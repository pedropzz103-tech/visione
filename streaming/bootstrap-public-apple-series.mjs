import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { fetchTvmazeShow, findTvmazeShow, mapTvmazeShow, mergeTvmazeIntoTitle } from "./adapters/tvmaze.mjs";
import { mergeOfficialAvailabilityEvidence } from "./adapters/official-availability.mjs";
import { isPublicAnywhere } from "./publication.mjs";
import { normalizeTitle } from "./schema.mjs";

const titlesUrl = new URL("./data/titles.json", import.meta.url);
const seedsUrl = new URL("./data/curated-public-apple-series.json", import.meta.url);
const dryRun = process.argv.includes("--dry-run");

function normalizedName(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function existingSeriesIndex(titles, seed) {
  const target = normalizedName(seed.name);
  const year = Number(seed.year);
  return titles.findIndex((title) => {
    if (title.type !== "series" || Number(title.year) !== year) return false;
    const names = [title.original_title, title.titles?.es, title.titles?.pt, title.titles?.br]
      .map(normalizedName)
      .filter(Boolean);
    return names.includes(target);
  });
}

function localizedOverview(title, locale) {
  const name = title.titles?.[locale] || title.original_title;
  const genres = (title.genres ?? []).slice(0, 3).join(", ");
  const cast = (title.credits?.cast ?? []).slice(0, 3).join(", ");
  if (locale === "es") {
    return `${name} es una serie estrenada en ${title.year}${genres ? `, con géneros como ${genres}` : ""}.${cast ? ` Entre los nombres destacados del reparto están ${cast}.` : ""} VISIONE muestra su disponibilidad legal verificada por mercado.`;
  }
  if (locale === "br") {
    return `${name} é uma série lançada em ${title.year}${genres ? `, com gêneros como ${genres}` : ""}.${cast ? ` Entre os nomes de destaque do elenco estão ${cast}.` : ""} A VISIONE mostra sua disponibilidade legal verificada por mercado.`;
  }
  return `${name} é uma série estreada em ${title.year}${genres ? `, com géneros como ${genres}` : ""}.${cast ? ` Entre os nomes de destaque do elenco estão ${cast}.` : ""} A VISIONE mostra a sua disponibilidade legal verificada por mercado.`;
}

function ensureUsefulOverview(raw) {
  const title = normalizeTitle(raw);
  const current = title.overview ?? {};
  if (current.es && current.pt && current.br) return title;
  return normalizeTitle({
    ...title,
    overview: {
      es: current.es || localizedOverview(title, "es"),
      pt: current.pt || localizedOverview(title, "pt"),
      br: current.br || localizedOverview(title, "br")
    }
  });
}

function availabilityEvidence(seed, title) {
  return {
    provider: "apple-tv",
    country: seed.country || "ES",
    url: seed.url,
    expectedTitle: title.original_title,
    text: `${title.original_title} ${title.year}. ${seed.availability_text}`,
    checked_at: seed.checked_at
  };
}

const titles = JSON.parse(await readFile(titlesUrl, "utf8"));
const seeds = JSON.parse(await readFile(seedsUrl, "utf8"));
let added = 0;
let updated = 0;
let skipped = 0;

for (const seed of seeds) {
  const index = existingSeriesIndex(titles, seed);
  const existing = index >= 0 ? titles[index] : null;
  let show = null;

  const knownId = Number(existing?.source?.tvmaze_id);
  if (Number.isInteger(knownId) && knownId > 0) {
    show = await fetchTvmazeShow(knownId);
  } else {
    const candidate = await findTvmazeShow({ name: seed.name, year: seed.year });
    if (candidate?.id) show = await fetchTvmazeShow(candidate.id);
  }

  if (!show?.image?.original && !show?.image?.medium) {
    console.warn(`Public Apple seed skipped: no unique TVmaze match with poster for ${seed.name} (${seed.year})`);
    skipped += 1;
    continue;
  }

  const mapped = mapTvmazeShow(show, {
    discoveredAt: seed.checked_at,
    discoveryScore: 220
  });
  let record = existing ? mergeTvmazeIntoTitle(existing, mapped) : mapped;
  record = ensureUsefulOverview(record);
  record = normalizeTitle({
    ...record,
    discovery: {
      ...record.discovery,
      source: "curated-verified-apple-tv",
      discovered_at: record.discovery?.discovered_at || seed.checked_at,
      score: Math.max(220, Number(record.discovery?.score) || 0)
    }
  });

  record = mergeOfficialAvailabilityEvidence(record, [availabilityEvidence(seed, record)]);

  if (!isPublicAnywhere(record)) {
    console.warn(`Public Apple seed skipped: publication gate did not pass for ${seed.name} (${seed.year})`);
    skipped += 1;
    continue;
  }

  if (index >= 0) {
    titles[index] = record;
    updated += 1;
  } else {
    titles.push(record);
    added += 1;
  }
  console.log(`Public Apple seed: ${record.slug} <- TVmaze ${show.id} + Apple TV ${seed.country || "ES"}`);
}

const publicCount = titles.filter(isPublicAnywhere).length;
if (!dryRun) {
  await writeFile(titlesUrl, `${JSON.stringify(titles, null, 2)}\n`, "utf8");
}

console.log(`Verified Apple TV bootstrap ${dryRun ? "dry-run " : ""}complete: ${added} added, ${updated} refreshed, ${skipped} skipped; ${publicCount} public titles in ${fileURLToPath(titlesUrl)}.`);
