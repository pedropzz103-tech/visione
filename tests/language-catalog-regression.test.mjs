import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { getLocale, SUPPORTED_LOCALES } from "../streaming/config.mjs";
import { isPublicAnywhere, isPublicInMarket } from "../streaming/publication.mjs";
import { normalizeTitle } from "../streaming/schema.mjs";

const titles = JSON.parse(await readFile(new URL("../streaming/data/titles.json", import.meta.url), "utf8")).map(normalizeTitle);
const globalTitles = titles.filter(isPublicAnywhere);

test("changing language keeps globally public catalog titles visible and linkable", async () => {
  let checkedLocales = 0;

  for (const locale of SUPPORTED_LOCALES) {
    const config = getLocale(locale);
    const crossMarketTitle = globalTitles.find((title) => !isPublicInMarket(title, config.country));
    if (!crossMarketTitle) continue;

    checkedLocales += 1;
    const home = await readFile(new URL(`../${locale}/index.html`, import.meta.url), "utf8");
    const href = `/${locale}/${config.titleSegment}/${crossMarketTitle.slug}/`;

    assert.ok(home.includes(href), `${locale} home should keep ${crossMarketTitle.slug} in the catalog after a language switch`);
    await access(new URL(`../${locale}/${config.titleSegment}/${crossMarketTitle.slug}/index.html`, import.meta.url));
  }

  assert.ok(checkedLocales > 0, "fixture should include at least one title that is public globally but not verified in a locale market");
});
