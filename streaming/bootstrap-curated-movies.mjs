import { readFile, writeFile } from "node:fs/promises";
import { fetchCommonsArtwork } from "./adapters/commons.mjs";
import { fetchWikidataEntity, fetchWikidataLabels, mapWikidataFilm, searchWikidataEntities } from "./adapters/wikidata.mjs";
import { normalizeTitle } from "./schema.mjs";

const titlesUrl = new URL("./data/titles.json", import.meta.url);
const seedsUrl = new URL("./data/curated-movie-seeds.json", import.meta.url);
const dryRun = process.argv.includes("--dry-run");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const FILM_QID = "Q11424";

function identity(name, year) {
  return `${String(name ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}|${Number(year) || 0}`;
}

function claimValues(entity, property) {
  return (entity?.claims?.[property] ?? []).map((claim) => claim?.mainsnak?.datavalue?.value).filter((value) => value !== undefined && value !== null);
}

function claimEntityIds(entity, property) {
  return [...new Set(claimValues(entity, property).map((value) => value?.id).filter((id) => /^Q\d+$/.test(String(id))))];
}

function firstStringClaim(entity, property) {
  const value = claimValues(entity, property)[0];
  return typeof value === "string" ? value : null;
}

function releaseYear(entity) {
  const years = claimValues(entity, "P577")
    .map((value) => String(value?.time ?? "").match(/^\+?(\d{4})-/)?.[1])
    .map(Number)
    .filter((year) => Number.isInteger(year));
  return years.length ? Math.min(...years) : null;
}

function entityLabels(entity) {
  return ["en", "es", "pt", "pt-br", "mul"]
    .map((lang) => entity?.labels?.[lang]?.value)
    .filter(Boolean);
}

function isDirectFilm(entity) {
  return claimEntityIds(entity, "P31").includes(FILM_QID);
}

async function findExactFilm(seed) {
  const search = await searchWikidataEntities(seed.name, { language: "en", limit: 8 });
  const matches = [];
  for (const candidate of search) {
    if (!/^Q\d+$/.test(String(candidate?.id ?? ""))) continue;
    const entity = await fetchWikidataEntity(candidate.id);
    if (!entity || !isDirectFilm(entity) || releaseYear(entity) !== Number(seed.year)) continue;
    if (!entityLabels(entity).some((label) => identity(label, seed.year) === identity(seed.name, seed.year))) continue;
    matches.push(entity);
    if (matches.length > 1) break;
  }
  return matches.length === 1 ? matches[0] : null;
}

const GENRE_LABELS = Object.freeze({
  drama: { es: "drama", pt: "drama", br: "drama" },
  comedy: { es: "comedia", pt: "comédia", br: "comédia" },
  "science fiction": { es: "ciencia ficción", pt: "ficção científica", br: "ficção científica" },
  thriller: { es: "suspense", pt: "suspense", br: "suspense" },
  crime: { es: "crimen", pt: "crime", br: "crime" },
  action: { es: "acción", pt: "ação", br: "ação" },
  adventure: { es: "aventura", pt: "aventura", br: "aventura" },
  romance: { es: "romance", pt: "romance", br: "romance" },
  fantasy: { es: "fantasía", pt: "fantasia", br: "fantasia" },
  horror: { es: "terror", pt: "terror", br: "terror" },
  animation: { es: "animación", pt: "animação", br: "animação" }
});

function translatedGenre(raw, locale) {
  const key = String(raw ?? "").toLowerCase().replace(/ film$/, "").trim();
  return GENRE_LABELS[key]?.[locale] ?? key;
}

function factualOverview(title) {
  const name = title.original_title || title.titles?.es || title.slug;
  const year = title.year || "";
  const director = title.credits?.director ? String(title.credits.director) : null;
  const cast = Array.isArray(title.credits?.cast) ? title.credits.cast.slice(0, 3).filter(Boolean) : [];
  const genres = (title.genres ?? []).slice(0, 3);
  const gEs = genres.map((g) => translatedGenre(g, "es")).join(", ");
  const gPt = genres.map((g) => translatedGenre(g, "pt")).join(", ");
  const gBr = genres.map((g) => translatedGenre(g, "br")).join(", ");
  const dirEs = director ? ` Dirigida por ${director}.` : "";
  const dirPt = director ? ` Realizado por ${director}.` : "";
  const dirBr = director ? ` Dirigido por ${director}.` : "";
  const castEs = cast.length ? ` El reparto incluye a ${cast.join(", ")}.` : "";
  const castPt = cast.length ? ` O elenco inclui ${cast.join(", ")}.` : "";
  const castBr = cast.length ? ` O elenco inclui ${cast.join(", ")}.` : "";
  return {
    es: `${name} es una película de ${year}${gEs ? ` con géneros como ${gEs}` : ""}.${dirEs}${castEs} VISIONE publica opciones legales solo cuando la disponibilidad está verificada.`,
    pt: `${name} é um filme de ${year}${gPt ? ` com géneros como ${gPt}` : ""}.${dirPt}${castPt} A VISIONE só publica opções legais quando a disponibilidade está verificada.`,
    br: `${name} é um filme de ${year}${gBr ? ` com gêneros como ${gBr}` : ""}.${dirBr}${castBr} A VISIONE só publica opções legais quando a disponibilidade está verificada.`
  };
}

const titles = JSON.parse(await readFile(titlesUrl, "utf8"));
const seeds = JSON.parse(await readFile(seedsUrl, "utf8"));
const existing = new Set(titles.flatMap((title) => [
  identity(title.original_title, title.year),
  identity(title.titles?.es, title.year),
  identity(title.titles?.pt, title.year),
  identity(title.titles?.br, title.year)
]));
const slugs = new Set(titles.map((title) => title.slug));
const additions = [];
const now = new Date().toISOString();

for (const seed of seeds) {
  if (existing.has(identity(seed.name, seed.year))) continue;
  try {
    const entity = await findExactFilm(seed);
    if (!entity) {
      console.warn(`Curated Wikidata seed skipped without unique exact film: ${seed.name} (${seed.year})`);
      continue;
    }
    const linkedIds = [...new Set([
      ...claimEntityIds(entity, "P57"),
      ...claimEntityIds(entity, "P161"),
      ...claimEntityIds(entity, "P136")
    ])];
    const labels = await fetchWikidataLabels(linkedIds, { language: "en" });
    const mapped = mapWikidataFilm(entity, labels, { fetchedAt: now });
    if (slugs.has(mapped.slug)) {
      console.warn(`Curated Wikidata seed slug collision skipped: ${mapped.slug}`);
      continue;
    }

    const commonsFile = firstStringClaim(entity, "P18");
    let commons = null;
    if (commonsFile) {
      try {
        commons = await fetchCommonsArtwork(commonsFile);
      } catch (error) {
        console.warn(`Commons artwork lookup failed for ${mapped.slug}: ${error.message}`);
      }
    }

    const enriched = normalizeTitle({
      ...mapped,
      overview: factualOverview(mapped),
      poster: commons?.url ?? null,
      artwork: commons ? {
        kind: "source-image",
        source: "Wikimedia Commons",
        license: commons.license,
        credit: commons.credit,
        source_url: commons.source_url
      } : {
        kind: "editorial-cover",
        source: "VISIONE",
        license: null,
        credit: "VISIONE editorial cover",
        source_url: null
      },
      discovery: {
        source: "VISIONE curated Wikidata seed",
        discovered_at: now,
        score: 0,
        sitelinks: 0
      }
    });
    slugs.add(enriched.slug);
    existing.add(identity(seed.name, seed.year));
    additions.push(enriched);
    console.log(`Curated Wikidata: + ${enriched.slug} <- ${entity.id}${commons ? " + Commons artwork" : " + editorial cover"}`);
  } catch (error) {
    console.warn(`Curated Wikidata seed failed for ${seed.name} (${seed.year}): ${error.message}`);
  }
  await pause(220);
}

if (!dryRun && additions.length) {
  await writeFile(titlesUrl, `${JSON.stringify([...titles, ...additions], null, 2)}\n`, "utf8");
}
console.log(`Curated Wikidata movie bootstrap ${dryRun ? "dry-run " : ""}complete: ${additions.length} new films.`);
