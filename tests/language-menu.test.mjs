import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderLanguageMenu } from "../streaming/language-menu.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("language selector renders one compact trigger and keeps all seven languages inside the menu", () => {
  const html = renderLanguageMenu("uk");
  assert.match(html, /<details class="language-menu">/);
  assert.match(html, /<summary[^>]*>[^<]*UK/);
  assert.equal((html.match(/class="language-option/g) ?? []).length, 7);
  assert.match(html, />English</);
  assert.match(html, />Français</);
  assert.match(html, />Русский</);
  assert.match(html, />Українська</);
  assert.match(html, /aria-current="page"[^>]*>Українська</);
});

test("global selector does not dump seven language codes into the visible trigger", () => {
  const html = renderLanguageMenu(null);
  const summary = html.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1] ?? "";
  assert.match(summary, /Idioma/);
  assert.doesNotMatch(summary, /ES|PT|BR|EN|FR|RU|UK/);
  assert.equal((html.match(/class="language-option/g) ?? []).length, 7);
});

test("generated home shows one dropdown trigger while legacy flat locale markup stays hidden", async () => {
  const [home, css] = await Promise.all([read("index.html"), read("assets/language-menu.css")]);
  const header = home.match(/<header class="stream-header">[\s\S]*?<\/header>/)?.[0] ?? "";
  const menu = header.match(/<details class="language-menu">[\s\S]*?<\/details>/)?.[0] ?? "";
  assert.ok(menu);
  assert.equal((menu.match(/class="language-option/g) ?? []).length, 7);
  assert.match(menu, /<summary[^>]*>🌐 Idioma ▾<\/summary>/);
  assert.match(home, /\/assets\/language-menu\.css\?v=1/);
  assert.match(css, /\.locale-switcher\{display:none!important\}/);
});
