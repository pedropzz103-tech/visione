import assert from "node:assert/strict";
import test from "node:test";
import { parseOfficialProviderPage } from "../streaming/adapters/official-availability.mjs";

test("official Apple TV evidence recognizes Portugal subscription availability", () => {
  const result = parseOfficialProviderPage({
    provider: "apple-tv",
    country: "PT",
    url: "https://tv.apple.com/pt/show/o-silo/umc.cmc.3yksgc857px0k0rqe5zd4jice",
    expectedTitle: "Silo",
    text: "Silo 2023. 7 dias grátis e depois 9,99 €/mês. Aceitar período grátis.",
    checked_at: "2026-09-11T09:45:00Z"
  });
  assert.equal(result.status, "available");
  assert.equal(result.offers[0].provider, "apple-tv");
  assert.equal(result.offers[0].verified_at, "2026-09-11T09:45:00Z");
});

test("official Apple TV evidence recognizes Brazil subscription availability", () => {
  const result = parseOfficialProviderPage({
    provider: "apple-tv",
    country: "BR",
    url: "https://tv.apple.com/br/show/ted-lasso/umc.cmc.vtoh0mn0xn7t3c643xqonfzy",
    expectedTitle: "Ted Lasso",
    text: "Ted Lasso 2020. 7 dias grátis, depois R$ 29,90/mês. Aceite o período grátis.",
    checked_at: "2026-09-11T09:45:00Z"
  });
  assert.equal(result.status, "available");
  assert.equal(result.offers[0].monetization, "subscription");
  assert.equal(result.offers[0].evidence_url, "https://tv.apple.com/br/show/ted-lasso/umc.cmc.vtoh0mn0xn7t3c643xqonfzy");
});
