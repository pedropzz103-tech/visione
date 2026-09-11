import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTitle } from "../streaming/schema.mjs";

function record() {
  return normalizeTitle({
    id: "series:severance",
    type: "series",
    slug: "severance",
    titles: { es: "Separación", pt: "Separação", br: "Ruptura" },
    original_title: "Severance",
    year: 2022,
    runtime: 57,
    seasons: 2,
    overview: { es: "Serie de misterio sobre trabajadores con recuerdos separados entre oficina y vida privada.", pt: "Série de mistério sobre trabalhadores com memórias separadas entre escritório e vida privada.", br: "Série de mistério sobre trabalhadores com memórias separadas entre escritório e vida privada." },
    genres: ["Drama", "Mystery"],
    poster: "https://static.tvmaze.com/severance.jpg",
    artwork: { kind: "source-image", source: "TVmaze" },
    credits: { cast: ["Adam Scott"] },
    offers: { ES: [], PT: [], BR: [] },
    availability_status: { ES: "unknown", PT: "unknown", BR: "unknown" },
    updated_at: "2026-09-11T08:00:00Z",
    availability_updated_at: null,
    source: { metadata: "TVmaze", availability: "unconfigured" }
  });
}

test("official Apple TV page with trial CTA creates a subscription offer", async () => {
  const { parseOfficialProviderPage } = await import("../streaming/adapters/official-availability.mjs");
  const result = parseOfficialProviderPage({
    provider: "apple-tv",
    country: "ES",
    url: "https://tv.apple.com/es/show/severance/example",
    expectedTitle: "Severance",
    text: "Severance TV Show Thriller Mystery 2022 57m 7 days free, then 9,99 €/month Accept Free Trial How to Watch"
  });
  assert.equal(result.status, "available");
  assert.equal(result.offers[0].provider, "apple-tv");
  assert.equal(result.offers[0].monetization, "subscription");
});

test("merged official evidence retains evidence URL and verification time on offers", async () => {
  const { mergeOfficialAvailabilityEvidence } = await import("../streaming/adapters/official-availability.mjs");
  const evidenceUrl = "https://tv.apple.com/es/show/severance/example";
  const merged = mergeOfficialAvailabilityEvidence(record(), [{
    provider: "apple-tv",
    country: "ES",
    url: evidenceUrl,
    expectedTitle: "Severance",
    text: "Severance 7 days free, then 9,99 €/month Accept Free Trial How to Watch",
    checked_at: "2026-09-11T08:30:00Z"
  }]);
  assert.equal(merged.offers.ES.length, 1);
  assert.equal(merged.offers.ES[0].evidence_url, evidenceUrl);
  assert.equal(merged.offers.ES[0].verified_at, "2026-09-11T08:30:00Z");
});

test("affiliate overlay only decorates an existing verified offer when config is approved", async () => {
  const { applyAffiliateConfig } = await import("../streaming/affiliate.mjs");
  const base = record();
  base.offers.ES = [{ provider: "apple-tv", monetization: "subscription", url: "https://tv.apple.com/es/show/severance/example", evidence_url: "https://tv.apple.com/es/show/severance/example", verified_at: "2026-09-11T08:30:00Z" }];
  base.availability_status.ES = "available";
  base.availability_updated_at = "2026-09-11T08:30:00Z";

  const pending = applyAffiliateConfig(base, [{ provider: "apple-tv", market: "ES", status: "pending", template: "https://affiliate.test/?u={url}" }]);
  assert.equal(pending.offers.ES[0].affiliate_url, null);
  assert.equal(pending.offers.ES[0].sponsored, false);

  const approved = applyAffiliateConfig(base, [{ provider: "apple-tv", market: "ES", status: "approved", template: "https://affiliate.test/?u={url}" }]);
  assert.match(approved.offers.ES[0].affiliate_url, /^https:\/\/affiliate\.test\/\?u=/);
  assert.equal(approved.offers.ES[0].sponsored, true);
  assert.equal(approved.offers.ES[0].is_affiliate, true);
  assert.equal(approved.offers.ES[0].evidence_url, "https://tv.apple.com/es/show/severance/example");
});

test("affiliate config cannot manufacture provider availability", async () => {
  const { applyAffiliateConfig } = await import("../streaming/affiliate.mjs");
  const base = record();
  const result = applyAffiliateConfig(base, [{ provider: "disney-plus", market: "ES", status: "approved", template: "https://affiliate.test/?u={url}" }]);
  assert.deepEqual(result.offers.ES, []);
  assert.equal(result.availability_status.ES, "unknown");
});
