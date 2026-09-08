import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildSite } from "../scripts/build.mjs";
import { validateGeneratedSite, validateSyntax } from "../scripts/validate.mjs";

const sourceRoot = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"));
const providers = JSON.parse(await readFile(new URL("../data/providers.json", import.meta.url), "utf8"));

async function fixture() {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "visione-validation-"));
  await buildSite({ sourceRoot, outputRoot, catalog, providers });
  return outputRoot;
}

test("validates the generated static site as one coherent artifact", async () => {
  const root = await fixture();
  try {
    const result = await validateGeneratedSite(root);
    assert.equal(result.duplicateCanonicals, 0);
    assert.ok(result.htmlFiles >= 23);
    assert.ok(result.sitemapUrls >= 23);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails when a noindex page appears in the sitemap", async () => {
  const root = await fixture();
  try {
    const file = path.join(root, "pt", "index.html");
    const html = (await readFile(file, "utf8")).replace("index,follow,max-image-preview:large", "noindex,follow");
    await writeFile(file, html, "utf8");
    await assert.rejects(validateGeneratedSite(root), /noindex page is present in sitemap/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails on duplicate generated canonicals", async () => {
  const root = await fixture();
  try {
    const file = path.join(root, "br", "index.html");
    const html = (await readFile(file, "utf8")).replace("https://visione.one/br/", "https://visione.one/es/");
    await writeFile(file, html, "utf8");
    await assert.rejects(validateGeneratedSite(root), /duplicate canonical/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CSS syntax validation does not misread hexadecimal colors as units", async () => {
  const result = await validateSyntax(fileURLToPath(new URL("../", import.meta.url)));
  assert.ok(result.modules >= 1);
});
