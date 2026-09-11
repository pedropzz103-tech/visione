import assert from "node:assert/strict";
import test from "node:test";
import { renderLanguageMenu } from "../streaming/language-menu.mjs";

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

test("global selector does not dump seven language codes into the header", () => {
  const html = renderLanguageMenu(null);
  assert.match(html, /<summary[^>]*>[^<]*Idioma/);
  assert.doesNotMatch(html, /<summary[^>]*>[\s\S]*ES[\s\S]*PT[\s\S]*BR[\s\S]*EN[\s\S]*FR[\s\S]*RU[\s\S]*UK/);
});
