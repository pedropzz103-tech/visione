import assert from "node:assert/strict";
import test from "node:test";

import { buildSearchIndex, normalizeQuery, scoreSearch, searchCatalog } from "../scripts/lib/search.mjs";

const catalog = [
  {
    id: "movie:1",
    type: "movie",
    slug: "interstellar",
    titles: { es: "Interstellar", pt: "Interstellar", br: "Interestelar" },
    original_title: "Interstellar",
    year: 2014,
    genres: ["Ficção científica"],
    credits: { directors: ["Christopher Nolan"], creators: [], cast: ["Matthew McConaughey"] },
  },
  {
    id: "series:2",
    type: "series",
    slug: "stranger-things",
    titles: { es: "Stranger Things", pt: "Stranger Things", br: "Stranger Things" },
    original_title: "Stranger Things",
    year: 2016,
    genres: ["Mistério"],
    credits: { directors: [], creators: ["The Duffer Brothers"], cast: ["Winona Ryder"] },
  },
];

test("normalizes accents and whitespace for local matching", () => {
  assert.equal(normalizeQuery("  Ficção   Científica  "), "ficcao cientifica");
});

test("search finds original and translated titles", () => {
  const index = buildSearchIndex(catalog);
  assert.equal(searchCatalog("interestelar", index)[0].id, "movie:1");
  assert.equal(searchCatalog("interstellar", index)[0].id, "movie:1");
});

test("one small typo still returns the intended title", () => {
  const score = scoreSearch("interstelar", { searchText: "interstellar interestelar" });
  assert.ok(score >= 0.6, `expected a useful fuzzy score, got ${score}`);
});

test("search index contains only compact navigation fields", () => {
  const [entry] = buildSearchIndex(catalog);
  assert.deepEqual(Object.keys(entry).sort(), ["aliases", "id", "paths", "searchText", "titles", "type", "year"]);
  assert.equal(entry.paths.pt, "/pt/onde-ver/interstellar/");
  assert.equal(entry.paths.br, "/br/onde-assistir/interstellar/");
});

test("empty and unrelated queries return no results", () => {
  const index = buildSearchIndex(catalog);
  assert.deepEqual(searchCatalog("", index), []);
  assert.deepEqual(searchCatalog("zzzxxyy", index), []);
});
