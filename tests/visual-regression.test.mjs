import assert from "node:assert/strict";
import test from "node:test";
import { mapTvmazeShow, mergeTvmazeIntoTitle } from "../streaming/adapters/tvmaze.mjs";
import { hasCompleteCover } from "../streaming/publication.mjs";
import { renderTitleCard } from "../streaming/render.mjs";

function tvmazeFixture() {
  return {
    id: 58323,
    name: "Shrinking",
    premiered: "2023-01-27",
    averageRuntime: 33,
    genres: ["Comedy", "Drama"],
    image: {
      medium: "https://static.tvmaze.com/uploads/images/medium_portrait/example.jpg",
      original: "https://static.tvmaze.com/uploads/images/original_untouched/example.jpg"
    },
    externals: { imdb: "tt15677150", thetvdb: 411846 },
    url: "https://www.tvmaze.com/shows/58323/shrinking",
    _embedded: { seasons: [], cast: [], crew: [], akas: [] }
  };
}

test("TVmaze poster replaces the editorial fallback when the API provides a real series image", () => {
  const mapped = mapTvmazeShow(tvmazeFixture(), { fetchedAt: "2026-09-11T12:00:00Z" });
  const existing = structuredClone(mapped);
  existing.poster = null;
  existing.artwork = {
    kind: "editorial-cover",
    source: "VISIONE",
    license: null,
    credit: "VISIONE editorial cover",
    source_url: null
  };

  const merged = mergeTvmazeIntoTitle(existing, mapped);

  assert.equal(merged.poster, tvmazeFixture().image.original);
  assert.equal(merged.artwork.kind, "source-image");
  assert.equal(merged.artwork.source, "TVmaze");
  assert.equal(merged.artwork.license, "CC BY-SA");
});

test("TVmaze CC BY-SA series artwork satisfies the public cover gate", () => {
  const mapped = mapTvmazeShow(tvmazeFixture(), { fetchedAt: "2026-09-11T12:00:00Z" });
  assert.equal(hasCompleteCover(mapped), true);
});

test("restored TVmaze artwork renders a real poster instead of a VISIONE editorial card", () => {
  const mapped = mapTvmazeShow(tvmazeFixture(), { fetchedAt: "2026-09-11T12:00:00Z" });
  mapped.offers.PT = [{
    provider: "apple-tv",
    monetization: "subscription",
    price: null,
    currency: null,
    url: "https://tv.apple.com/pt/",
    attribution: ["Availability evidence: official Apple TV public page (PT)"]
  }];
  mapped.availability_status.PT = "available";
  mapped.availability_updated_at = "2026-09-11T12:00:00Z";

  const html = renderTitleCard(mapped, "pt");
  assert.match(html, /static\.tvmaze\.com\/uploads\/images\/original_untouched\/example\.jpg/);
  assert.doesNotMatch(html, /VISIONE EDITORIAL/);
});
