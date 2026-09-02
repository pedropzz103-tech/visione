import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("presents VISIONE as a technology company", () => {
  assert.match(html, /<title>VISIONE — Digital Products & Technology<\/title>/);
  assert.match(html, /id="services"/);
  assert.match(html, /id="approach"/);
  assert.match(html, /id="about"/);
  assert.match(html, /id="contact"/);
});

test("preserves the logo and routes editorial visitors to Wire", () => {
  assert.match(html, /(?:src|href)="visione-logo\.webp"/);
  assert.match(html, /href="https:\/\/wire\.visione\.one"/);
  assert.match(html, /href="mailto:contact@visione\.one"/);
});

test("references a logo file that exists in the published root", async () => {
  const logo = await readFile(new URL("../visione-logo.webp", import.meta.url));
  assert.ok(logo.byteLength > 0);
});

test("removes the temporary coming-soon experience", () => {
  assert.doesNotMatch(html, /Coming soon/i);
  assert.doesNotMatch(html, /class="coming-soon"/);
});

test("uses an accessible responsive light visual system", () => {
  assert.match(html, /name="theme-color" content="#f7f9ff"/);
  assert.match(css, /--canvas:\s*#f7f9ff/i);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/i);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
  assert.doesNotMatch(css, /\byellow\b|#ffd700\b|#facc15\b|#ffcc00\b/i);
});
