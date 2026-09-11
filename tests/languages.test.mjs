import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LOCALES, SUPPORTED_LOCALES, titlePath } from "../streaming/config.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const EXTRA = ["en", "fr", "ru", "uk"];

test("supports English French Russian and Ukrainian as discovery languages", () => {
  for (const locale of EXTRA) assert.ok(SUPPORTED_LOCALES.includes(locale), `${locale} should be supported`);
  assert.equal(LOCALES.en.lang, "en");
  assert.equal(LOCALES.fr.lang, "fr-FR");
  assert.equal(LOCALES.ru.lang, "ru-RU");
  assert.equal(LOCALES.uk.lang, "uk-UA");
  assert.equal(LOCALES.en.country, "ES");
  assert.equal(LOCALES.fr.country, "ES");
  assert.equal(LOCALES.ru.country, "ES");
  assert.equal(LOCALES.uk.country, "ES");
  assert.equal(titlePath("en", "silo"), "/en/where-to-watch/silo/");
  assert.equal(titlePath("fr", "silo"), "/fr/ou-regarder/silo/");
  assert.equal(titlePath("ru", "silo"), "/ru/gde-smotret/silo/");
  assert.equal(titlePath("uk", "silo"), "/uk/de-dyvytysia/silo/");
});

test("build materializes localized discovery homes and language switch links", async () => {
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

test("new language pages retain the full seven-language switcher", async () => {
  const pages = await Promise.all(EXTRA.map((code) => read(`${code}/index.html`)));
  for (const page of pages) {
    for (const code of ["es", "pt", "br", "en", "fr", "ru", "uk"]) {
      assert.match(page, new RegExp(`href="/${code}/"`));
    }
  }
});
