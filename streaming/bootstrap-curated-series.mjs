import { readFile, writeFile } from "node:fs/promises";
import { fetchTvmazeShow, findTvmazeShow, mapTvmazeShow } from "./adapters/tvmaze.mjs";
import { normalizeTitle } from "./schema.mjs";

const titlesUrl = new URL("./data/titles.json", import.meta.url);
const seedsUrl = new URL("./data/curated-series-seeds.json", import.meta.url);
const dryRun = process.argv.includes("--dry-run");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const titles = JSON.parse(await readFile(titlesUrl, "utf8"));
const seeds = JSON.parse(await readFile(seedsUrl, "utf8"));

function identity(name, year) {
  return `${String(name ?? "").trim().toLowerCase()}|${Number(year) || 0}`;
}

const GENRE_LABELS = Object.freeze({
  Drama: { es: "drama", pt: "drama", br: "drama" },
  Comedy: { es: "comedia", pt: "comédia", br: "comédia" },
  "Science-Fiction": { es: "ciencia ficción", pt: "ficção científica", br: "ficção científica" },
  Thriller: { es: "suspense", pt: "suspense", br: "suspense" },
  Mystery: { es: "misterio", pt: "mistério", br: "mistério" },
  Crime: { es: "crimen", pt: "crime", br: "crime" },
  Action: { es: "acción", pt: "ação", br: "ação" },
  Adventure: { es: "aventura", pt: "aventura", br: "aventura" },
  Fantasy: { es: "fantasía", pt: "fantasia", br: "fantasia" },
  Horror: { es: "terror", pt: "terror", br: "terror" },
  Romance: { es: "romance", pt: "romance", br: "romance" }
});

function localizedGenres(title, locale) {
  const values = (title.genres ?? []).slice(0, 3).map((genre) => GENRE_LABELS[genre]?.[locale] ?? String(genre).toLowerCase());
  if (!values.length) return "";
  return values.join(", ");
}

function factualOverview(title) {
  const name = title.original_title || title.titles?.es || title.slug;
  const year = title.year || "";
  const cast = Array.isArray(title.credits?.cast) ? title.credits.cast.slice(0, 3).filter(Boolean) : [];
  const castEs = cast.length ? ` Entre los nombres destacados del reparto están ${cast.join(", ")}.` : "";
  const castPt = cast.length ? ` Entre os nomes de destaque do elenco estão ${cast.join(", ")}.` : "";
  const genreEs = localizedGenres(title, "es");
  const genrePt = localizedGenres(title, "pt");
  const genreBr = localizedGenres(title, "br");
  return {
    es: `${name} es una serie estrenada en ${year}${genreEs ? `, con géneros como ${genreEs}` : ""}.${castEs} VISIONE muestra su disponibilidad legal verificada por mercado.`,
    pt: `${name} é uma série estreada em ${year}${genrePt ? `, com géneros como ${genrePt}` : ""}.${castPt} A VISIONE mostra a disponibilidade legal verificada por mercado.`,
    br: `${name} é uma série lançada em ${year}${genreBr ? `, com gêneros como ${genreBr}` : ""}.${castPt} A VISIONE mostra a disponibilidade legal verificada por mercado.`
  };
}

function prepareCuratedSeries(raw) {
  const title = normalizeTitle(raw);
  const overview = Object.values(title.overview ?? {}).every((value) => String(value).trim().length >= 40)
    ? title.overview
    : factualOverview(title);
  const tvmazeArtwork = title.source?.metadata === "TVmaze" || Number.isInteger(Number(title.source?.tvmaze_id));
  return normalizeTitle({
    ...title,
    overview,
    ...(tvmazeArtwork ? {
      poster: null,
      artwork: {
        kind: "editorial-cover",
        source: "VISIONE",
        license: null,
        credit: "VISIONE editorial cover",
        source_url: null
      }
    } : {})
  });
}

const seedKeys = new Set(seeds.map((seed) => identity(seed.name, seed.year)));
const preparedTitles = titles.map((raw) => {
  const keySet = new Set([
    identity(raw.original_title, raw.year),
    identity(raw.titles?.es, raw.year),
    identity(raw.titles?.pt, raw.year),
    identity(raw.titles?.br, raw.year)
  ]);
  return raw.type === "series" && [...keySet].some((key) => seedKeys.has(key)) ? prepareCuratedSeries(raw) : raw;
});

const existingTvmazeIds = new Set(preparedTitles.map((title) => Number(title.source?.tvmaze_id)).filter((id) => Number.isInteger(id) && id > 0));
const existingIdentity = new Set(preparedTitles.flatMap((title) => [
  identity(title.original_title, title.year),
  identity(title.titles?.es, title.year),
  identity(title.titles?.pt, title.year),
  identity(title.titles?.br, title.year)
]));
const slugs = new Set(preparedTitles.map((title) => title.slug));
const additions = [];
const now = new Date().toISOString();

for (const seed of seeds) {
  const key = identity(seed.name, seed.year);
  if (existingIdentity.has(key)) continue;
  try {
    const candidate = await findTvmazeShow({ name: seed.name, year: seed.year });
    if (!candidate?.id || existingTvmazeIds.has(Number(candidate.id))) continue;
    const show = await fetchTvmazeShow(candidate.id);
    if (!show?.id) continue;
    const mapped = prepareCuratedSeries(mapTvmazeShow(show, { fetchedAt: now, discoveredAt: now }));
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

const output = [...preparedTitles, ...additions];
const changed = JSON.stringify(output) !== JSON.stringify(titles);
if (!dryRun && changed) {
  await writeFile(titlesUrl, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}
console.log(`Curated TVmaze bootstrap ${dryRun ? "dry-run " : ""}complete: ${additions.length} new series; ${changed ? "catalog normalized" : "no catalog changes"}.`);
