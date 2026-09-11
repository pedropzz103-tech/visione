import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isPublicAnywhere } from "../streaming/publication.mjs";

const titles = JSON.parse(await readFile(new URL("../streaming/data/titles.json", import.meta.url), "utf8"));

test("production catalogue exposes at least 100 titles with complete cover and verified availability", () => {
  const publicTitles = titles.filter(isPublicAnywhere);
  assert.ok(
    publicTitles.length >= 100,
    `expected at least 100 public titles, found ${publicTitles.length}`
  );
});
