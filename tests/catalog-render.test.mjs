import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTitle } from "../streaming/schema.mjs";
import { renderGlobalHome, renderTitleCard } from "../streaming/render.mjs";

function movie(overrides = {}) {
  return normalizeTitle({
    id: "movie:test",
    type: "movie",
    slug: "a-long-film-title",
    titles: { es: "Un título completo", pt: "Um título completo", br: "Um título completo" },
    original_title: "A Full Title",
    year: 2024,
    runtime: 120,
    overview: { es: "Película factual de prueba con texto suficiente para una página útil.", pt: "Filme factual de teste com texto suficiente para uma página útil.", br: "Filme factual de teste com texto suficiente para uma página útil." },
    genres: ["Drama"],
    poster: null,
    artwork: { kind: "editorial-cover", source: "VISIONE" },
    credits: { director: "Example Director", cast: ["Example Actor"] },
    offers: { ES: [{ provider: "prime-video", monetization: "rent", url: "https://www.primevideo.com/example" }], PT: [], BR: [] },
    availability_status: { ES: "available", PT: "unknown", BR: "unknown" },
    updated_at: "2026-09-11T08:00:00Z",
    availability_updated_at: "2026-09-11T08:00:00Z",
    ...overrides
  });
}

test("editorial cover renders full factual identity instead of a one-letter placeholder", () => {
  const html = renderTitleCard(movie(), "pt");
  assert.match(html, /VISIONE EDITORIAL/);
  assert.match(html, /Um título completo/);
  assert.match(html, /2024/);
  assert.match(html, /Drama/);
  assert.doesNotMatch(html, /poster-fallback[^>]*>[\s\S]*?<span>U<\/span>/);
});

test("global homepage no longer renders fake coming-soon inventory", () => {
  const html = renderGlobalHome([movie()]);
  assert.doesNotMatch(html, /BREVEMENTE/i);
  assert.doesNotMatch(html, /PRÓXIMAMENTE/i);
  assert.doesNotMatch(html, /Brevemente nos cinemas/i);
  assert.doesNotMatch(html, /Brevemente no streaming/i);
  assert.doesNotMatch(html, /data-status="awaiting-source"/);
});
