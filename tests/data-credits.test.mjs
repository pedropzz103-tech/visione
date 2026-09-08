import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("publishes transparent streaming data credits and licensing boundaries", async () => {
  const page = await read("data-credits/index.html");
  assert.match(page, /<title>[^<]*(Dados|Data|Fuentes)/i);
  assert.match(page, /metadata|metadados|metadatos/i);
  assert.match(page, /disponibilidade|disponibilidad|availability/i);
  assert.match(page, /licen[cs]|commercial|comercial/i);
  assert.match(page, /não hospeda|no aloja|does not host/i);
  assert.match(page, /rel="canonical" href="https:\/\/visione\.one\/data-credits\/"/);
});

test("links the streaming product to its data credits page", async () => {
  const [home, es, pt, br] = await Promise.all([
    read("index.html"), read("es/index.html"), read("pt/index.html"), read("br/index.html")
  ]);
  for (const html of [home, es, pt, br]) assert.match(html, /href="\/data-credits\/"/);
});
