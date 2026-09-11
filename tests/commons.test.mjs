import assert from "node:assert/strict";
import test from "node:test";
import { fetchCommonsArtwork, isReusableCommonsLicense, mapCommonsImageInfo } from "../streaming/adapters/commons.mjs";

function payload(license = "CC0 1.0") {
  return {
    query: {
      pages: {
        123: {
          imageinfo: [{
            url: "https://upload.wikimedia.org/full.jpg",
            thumburl: "https://upload.wikimedia.org/thumb.jpg",
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
            extmetadata: {
              LicenseShortName: { value: license },
              Artist: { value: "<a href='https://example.test'>Example Author</a>" }
            }
          }]
        }
      }
    }
  };
}

test("Commons artwork accepts attribution-free reusable licenses", () => {
  const result = mapCommonsImageInfo(payload(), "Example.jpg");
  assert.equal(result.url, "https://upload.wikimedia.org/thumb.jpg");
  assert.equal(result.license, "CC0 1.0");
  assert.equal(result.credit, "Example Author");
  assert.match(result.source_url, /commons\.wikimedia\.org/);
});

test("Commons artwork rejects licenses that need per-image attribution until UI supports it", () => {
  assert.equal(mapCommonsImageInfo(payload("CC BY-SA 4.0"), "Example.jpg"), null);
  assert.equal(mapCommonsImageInfo(payload("All Rights Reserved"), "Example.jpg"), null);
  assert.equal(isReusableCommonsLicense("CC0 1.0"), true);
  assert.equal(isReusableCommonsLicense("Public domain"), true);
  assert.equal(isReusableCommonsLicense("CC BY 4.0"), false);
});

test("Commons fetch helper requests image metadata without an API key", async () => {
  const calls = [];
  const result = await fetchCommonsArtwork("Example.jpg", {
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return { ok: true, status: 200, json: async () => payload() };
    }
  });
  assert.equal(result.license, "CC0 1.0");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /action=query/);
  assert.match(calls[0].url, /iiprop=url%7Cextmetadata/);
  assert.match(calls[0].options.headers["User-Agent"], /VISIONE/);
});
