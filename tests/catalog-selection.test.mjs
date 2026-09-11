import assert from "node:assert/strict";
import test from "node:test";
import { buildCollections } from "../streaming/catalog-selection.mjs";

function title(i, type = i % 2 ? "series" : "movie", genres = [i % 3 ? "Drama" : "Science Fiction"]) {
  return {
    id: `${type}:${i}`,
    slug: `title-${i}`,
    type,
    year: 2010 + (i % 16),
    genres,
    rating: { value: 6 + (i % 4), source: "test" },
    discovery: { score: 20 + i, sitelinks: i * 3 },
    titles: { es: `Título ${i}`, pt: `Título ${i}`, br: `Título ${i}` }
  };
}

const inventory = Array.from({ length: 40 }, (_, i) => title(i));

test("catalog collections are deterministic for the same date", () => {
  const a = buildCollections(inventory, { date: "2026-09-11", minSize: 4 });
  const b = buildCollections(inventory, { date: "2026-09-11", minSize: 4 });
  assert.deepEqual(a.map((c) => [c.id, c.titles.map((t) => t.slug)]), b.map((c) => [c.id, c.titles.map((t) => t.slug)]));
});

test("daily rotation changes on a different day without changing Top 10 semantics", () => {
  const a = buildCollections(inventory, { date: "2026-09-11", minSize: 4 });
  const b = buildCollections(inventory, { date: "2026-09-12", minSize: 4 });
  assert.deepEqual(a.find((c) => c.id === "top-10").titles.map((t) => t.slug), b.find((c) => c.id === "top-10").titles.map((t) => t.slug));
  assert.notDeepEqual(a.find((c) => c.id === "recommended").titles.map((t) => t.slug), b.find((c) => c.id === "recommended").titles.map((t) => t.slug));
});

test("weak genre rails are suppressed instead of padded with placeholders", () => {
  const sparse = [title(1, "series", ["Comedy"]), title(2, "movie", ["Comedy"]), title(3, "series", ["Drama"]), title(4, "movie", ["Drama"])];
  const collections = buildCollections(sparse, { date: "2026-09-11", minSize: 3 });
  assert.equal(collections.some((c) => c.id === "sci-fi-fantasy"), false);
  assert.equal(collections.some((c) => c.id === "crime-thriller"), false);
});

test("collection sizes are bounded and no collection contains duplicates", () => {
  const collections = buildCollections(inventory, { date: "2026-09-11", minSize: 4, maxSize: 12 });
  for (const collection of collections) {
    assert.ok(collection.titles.length <= (collection.id === "top-10" ? 10 : 12));
    assert.equal(new Set(collection.titles.map((t) => t.slug)).size, collection.titles.length);
  }
});
