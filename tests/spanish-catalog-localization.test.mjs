import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

async function htmlFiles(path) {
  const directory = new URL(path, root);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relative = `${path}${entry.name}${entry.isDirectory() ? "/" : ""}`;
    if (entry.isDirectory()) return htmlFiles(relative);
    return entry.name.endsWith(".html") ? [relative] : [];
  }));
  return nested.flat();
}

test("Spanish navigation uses dedicated movie and series catalog pages", async () => {
  const [home, movies, series] = await Promise.all([
    read("es/index.html"),
    read("es/peliculas/index.html"),
    read("es/series/index.html")
  ]);

  assert.match(home, /href="\/es\/peliculas\/"[^>]*>Películas<\/a>/);
  assert.match(home, /href="\/es\/series\/"[^>]*>Series<\/a>/);
  assert.match(movies, /data-catalog-type="movie"/);
  assert.match(series, /data-catalog-type="series"/);
  assert.doesNotMatch(movies, /data-media-type="series"/);
  assert.doesNotMatch(series, /data-media-type="movie"/);
  assert.match(movies, /<link rel="canonical" href="https:\/\/visione\.one\/es\/peliculas\/">/);
  assert.match(series, /<link rel="canonical" href="https:\/\/visione\.one\/es\/series\/">/);
});

test("generated Spanish discovery pages do not leak Portuguese UI copy", async () => {
  const paths = await htmlFiles("es/");
  assert.ok(paths.length > 2, "expected generated Spanish pages");

  const forbidden = [
    /Dados & fontes/i,
    /Incluído na assinatura/i,
    /Grátis \/ com anúncios/i,
    /Não hospeda/i,
    /Privacidade/i,
    /Publicidade/i,
    /Contato/i,
    /Pôster de/i,
    /Selecionar idioma/i,
    /quando os dados verificados estiverem disponíveis/i,
    /Títulos verificados disponibles em /i,
    / em España \| VISIONE/i
  ];

  for (const path of paths) {
    const html = await read(path);
    for (const pattern of forbidden) {
      assert.doesNotMatch(html, pattern, `${path} leaked Portuguese copy: ${pattern}`);
    }
  }

  const home = await read("es/index.html");
  assert.match(home, /Datos y fuentes/);
  assert.match(home, /VISIONE indica dónde encontrar películas y series legalmente\./);
  assert.match(home, /aria-label="Seleccionar idioma"/);
});
