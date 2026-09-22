import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const page = await readFile(new URL("SAFEKRAY/index.html", root), "utf8");

test("presents SAFEKRAY as an independent personal civilian-safety project", () => {
  assert.match(page, /independent personal project/i);
  assert.match(page, /real-time civilian communication/i);
  assert.match(page, /official alerts[^<]*(separate|distinct)|separate[^<]*official alerts/i);
  assert.doesNotMatch(page, />[^<]*VISIONE[^<]*</i);
  assert.doesNotMatch(page, /github\.com|technical repository|view project on github/i);
});

test("explains community validation and location-integrity safeguards", () => {
  assert.match(page, /confirm or challenge/i);
  assert.match(page, /confirmations[^<]*contradict/i);
  assert.match(page, /proximity[^<]*timing|timing[^<]*proximity/i);
  assert.match(page, /anti-VPN/i);
  assert.match(page, /Russian geolocation/i);
  assert.match(page, /location confidence|location trust/i);
  assert.match(page, /Planned: evaluate VPN and proxy signals/i);
  assert.match(page, /This is not yet implemented in the current app/i);
  assert.match(page, /device-side check can be bypassed/i);
  assert.match(page, /Current report score does not yet use location confidence/i);
  assert.match(page, /Concept artwork · Some safeguards shown are planned/i);
});

test("uses the recovered English artwork as the primary hero visual", async () => {
  assert.match(page, /class="hero-art"[^>]*src="\/SAFEKRAY\/safekray-hero\.png"/);
  assert.match(page, /class="brand-logo"/);
  assert.match(page, /<span class="brand-name">SAFEKRAY<\/span>/);

  const image = await readFile(new URL("SAFEKRAY/safekray-hero.png", root));
  assert.ok(image.byteLength > 1_000_000, "Hero artwork should be the full-resolution recovered image");
  assert.deepEqual([...image.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

test("keeps the premium dark black, gold and blue design tokens", () => {
  assert.match(page, /--black:\s*#0[0-9a-f]{5}/i);
  assert.match(page, /--gold:\s*#[0-9a-f]{6}/i);
  assert.match(page, /--blue:\s*#[0-9a-f]{6}/i);
  assert.match(page, /color-scheme:\s*dark/i);
});
