import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const newsDir = new URL("../news/", import.meta.url);
const entries = await readdir(newsDir, { withFileTypes: true });
const trustFiles = new Set([
  "index.html",
  "about.html",
  "coverage.html",
  "editorial.html",
  "accountability.html",
  "advertising.html",
  "privacy.html",
  "cookie-policy.html",
  "contact.html",
  "author-pedro.html",
]);

const wireTrustPaths = [
  "coverage.html",
  "about.html",
  "editorial.html",
  "accountability.html",
  "advertising.html",
  "privacy.html",
  "cookie-policy.html",
  "contact.html",
  "feed.xml",
];

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

  const fileUrl = new URL(entry.name, newsDir);
  let html = await readFile(fileUrl, "utf8");
  const original = html;

  for (const path of wireTrustPaths) {
    html = html.replaceAll(
      `https://wire.visione.one/${path}`,
      `https://visione.one/news/${path}`,
    );
  }

  html = html.replace(
    /https:\/\/wire\.visione\.one\/([^"'< ]+\.html)/g,
    "https://visione.one/news/$1",
  );
  html = html.replaceAll("https://wire.visione.one/", "https://visione.one/");

  if (!trustFiles.has(entry.name) && html.includes('"@type":"NewsArticle"')) {
    html = html.replace(
      /"author":\{"@type":"Organization","name":"VISIONE Wire","url":"https:\/\/visione\.one\/"\}/g,
      '"author":{"@type":"Person","name":"Pedro","url":"https://visione.one/news/author-pedro.html"}',
    );
    html = html.replace(
      /<div class="byline">By VISIONE Wire ·/g,
      '<div class="byline">By <a href="https://visione.one/news/author-pedro.html">Pedro</a> ·',
    );
  }

  if (html !== original) {
    await writeFile(fileUrl, html);
    console.log(`normalized ${join("news", entry.name)}`);
  }
}
