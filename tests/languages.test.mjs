import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LOCALES, SUPPORTED_LOCALES, titlePath } from "../streaming/config.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const EXTRA = ["en", "fr", "ru", "uk"];

test("supports English French Russian and Ukrainian as discovery languages", () => {
  assert.deepEqual(Object.keys(LOCALES), ["es", "pt", "br"]);
  for (const locale of EXTRA) assert.ok(SUPPORTED_LOCALES.includes(locale), `${locale} should be supported`);
  assert.equal(titlePath("en", "silo"), "/en/where-to-watch/silo/");
  assert.equal(titlePath("fr", "silo"), "/fr/ou-regarder/silo/");
  assert.equal(titlePath("ru", "silo"), "/ru/gde-smotret/silo/");
  assert.equal(titlePath("uk", "silo"), "/uk/de-dyvytysia/silo/");
});

test("build materializes localized discovery homes", async () => {
  const [home, en, fr, ru, uk] = await Promise.all([
    read("index.html"), read("en/index.html"), read("fr/index.html"), read("ru/index.html"), read("uk/index.html")
  ]);
  for (const code of EXTRA) assert.match(home, new RegExp(`href="/${code}/"`));
  assert.match(en, /Discover\. Find\. Watch\./);
  assert.match(fr, /Découvrez\. Trouvez\. Regardez\./);
  assert.match(ru, /Откройте\. Найдите\. Смотрите\./);
  assert.match(uk, /Відкривайте\. Знаходьте\. Дивіться\./);
  assert.match(en, /Availability shown for Spain/);
  assert.match(fr, /Disponibilité affichée pour l’Espagne/);
  assert.match(ru, /Доступность указана для Испании/);
  assert.match(uk, /Доступність вказана для Іспанії/);
});

test("new language pages expose all seven language routes", async () => {
  const pages = await Promise.all(EXTRA.map((code) => read(`${code}/index.html`)));
  for (const page of pages) {
    for (const code of ["es", "pt", "br", "en", "fr", "ru", "uk"]) assert.match(page, new RegExp(`href="/${code}/"`));
  }
});

test("new localized title pages include media JSON-LD and visible availability freshness", async () => {
  const pages = await Promise.all([
    read("en/where-to-watch/silo/index.html"),
    read("fr/ou-regarder/silo/index.html"),
    read("ru/gde-smotret/silo/index.html"),
    read("uk/de-dyvytysia/silo/index.html")
  ]);
  for (const page of pages) {
    assert.match(page, /<script type="application\/ld\+json">/);
    assert.match(page, /"@type":"TVSeries"/);
    assert.match(page, /data-availability-freshness/);
  }
});
