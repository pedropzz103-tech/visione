import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [home, robots, sitemap, ads, worker, newsIndex, feed, newsSitemap] = await Promise.all([
  read("index.html"),
  read("robots.txt"),
  read("sitemap.xml"),
  read("ads.txt"),
  read("cloudflare/wire-worker.js"),
  read("news/index.html"),
  read("news/feed.xml"),
  read("news/news-sitemap.xml"),
]);

const trustPages = [
  "about.html",
  "coverage.html",
  "editorial.html",
  "accountability.html",
  "advertising.html",
  "privacy.html",
  "cookie-policy.html",
  "contact.html",
];

const highValueArticles = [
  "liquid-network-320-million-bitcoin-withdrawal-security-incident-september-7-2026.html",
  "openai-automated-research-intern-research-acceleration-september-6-2026.html",
  "us-government-backs-openai-nyt-copyright-ai-training-fair-use-september-2-2026.html",
  "dell-q2-fy2027-ai-server-orders-95-billion-backlog-september-2-2026.html",
  "anthropic-claude-unauthorized-actions-security-overhaul-september-1-2026.html",
  "europe-lumi-ai-supercomputer-387-8-million-amd-mi430x-2027.html",
  "opera-loses-eu-court-challenge-microsoft-edge-dma-september-2-2026.html",
  "us-g20-carolina-principles-ai-regulation-september-1-2026.html",
];

test("serves VISIONE Wire as the canonical root publication", () => {
  assert.match(home, /<title>VISIONE Wire\b/);
  assert.match(home, /rel="canonical" href="https:\/\/visione\.one\/"/);
  assert.match(home, /href="\/news\/styles\.css"/);
  assert.match(home, /High-value reads|Signal over noise/i);
  assert.doesNotMatch(home, /Independent technology studio/i);
  assert.doesNotMatch(home, /https:\/\/wire\.visione\.one/);
});

test("puts trust, editorial and author identity one click from the homepage", () => {
  for (const page of trustPages) {
    assert.match(home, new RegExp(`href="/news/${page.replaceAll(".", "\\.")}"`));
  }
  assert.match(home, /href="\/news\/author-pedro\.html"/);
  assert.match(home, /Pedro/i);
});

test("keeps the duplicate /news/ homepage out of the index", () => {
  assert.match(newsIndex, /name="robots" content="noindex,follow"/);
  assert.match(newsIndex, /rel="canonical" href="https:\/\/visione\.one\/"/);
  assert.doesNotMatch(newsIndex, /pagead2\.googlesyndication\.com/);
});

test("uses the main domain in robots, RSS and sitemaps", () => {
  assert.match(robots, /Sitemap: https:\/\/visione\.one\/sitemap\.xml/);
  assert.match(robots, /Sitemap: https:\/\/visione\.one\/news\/news-sitemap\.xml/);
  assert.match(feed, /<link>https:\/\/visione\.one\/<\/link>/);
  assert.doesNotMatch(feed, /wire\.visione\.one/);
  assert.doesNotMatch(sitemap, /wire\.visione\.one/);
  assert.doesNotMatch(newsSitemap, /wire\.visione\.one/);
});

test("makes the general sitemap complete for current editorial inventory", async () => {
  assert.match(sitemap, /<loc>https:\/\/visione\.one\/<\/loc>/);
  for (const page of [...trustPages, "author-pedro.html"]) {
    assert.match(sitemap, new RegExp(`<loc>https:\\/\\/visione\\.one\\/news\\/${page.replaceAll(".", "\\.")}</loc>`));
  }

  const entries = await readdir(new URL("news/", root), { withFileTypes: true });
  const articleFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => entry.name)
    .filter((name) => !["index.html", ...trustPages, "author-pedro.html"].includes(name));

  for (const article of articleFiles) {
    assert.match(sitemap, new RegExp(`<loc>https:\\/\\/visione\\.one\\/news\\/${article.replaceAll(".", "\\.")}</loc>`), `Missing ${article} from sitemap.xml`);
  }
});

test("keeps the Google News sitemap limited to genuinely recent stories", () => {
  assert.match(newsSitemap, /liquid-network-320-million-bitcoin-withdrawal-security-incident-september-7-2026\.html/);
  assert.match(newsSitemap, /openai-automated-research-intern-research-acceleration-september-6-2026\.html/);
  assert.doesNotMatch(newsSitemap, /september-2-2026\.html/);
  assert.doesNotMatch(newsSitemap, /august-31-2026\.html/);
});

test("legacy Wire is redirect-only and scoped to its own hostname", () => {
  assert.match(worker, /wire\.visione\.one/);
  assert.match(worker, /Response\.redirect\(/);
  assert.match(worker, /301/);
  assert.match(worker, /https:\/\/visione\.one/);
  assert.doesNotMatch(worker, /tablet\.visione\.one/);
  assert.doesNotMatch(worker, /replaceAll\(/);
  assert.doesNotMatch(worker, /cacheEverything/);
});

test("current flagship articles use main-domain canonicals and accountable authorship", async () => {
  for (const file of highValueArticles) {
    const article = await read(`news/${file}`);
    assert.match(article, new RegExp(`rel="canonical" href="https:\\/\\/visione\\.one\\/news\\/${file.replaceAll(".", "\\.")}"`));
    assert.match(article, /"@type":"NewsArticle"/);
    assert.match(article, /class="byline"/);
    assert.match(article, /<section class="sources">/);
  }

  for (const file of highValueArticles.slice(0, 2)) {
    const article = await read(`news/${file}`);
    assert.match(article, /"author":\{"@type":"Person","name":"Pedro"/);
    assert.match(article, /href="https:\/\/visione\.one\/news\/author-pedro\.html"/);
    assert.doesNotMatch(article, /wire\.visione\.one/);
  }
});

test("publishes a transparent author profile and high-value editorial standard", async () => {
  const [author, editorial, coverage, accountability] = await Promise.all([
    read("news/author-pedro.html"),
    read("news/editorial.html"),
    read("news/coverage.html"),
    read("news/accountability.html"),
  ]);

  assert.match(author, /Pedro/);
  assert.match(author, /Editor|editor/i);
  assert.match(author, /Editorial Standards/);
  assert.match(editorial, /original value|original-value/i);
  assert.match(editorial, /primary source/i);
  assert.match(editorial, /skip|publish nothing/i);
  assert.match(coverage, /artificial intelligence|AI/i);
  assert.match(coverage, /cybersecurity/i);
  assert.match(coverage, /developer|software/i);
  assert.doesNotMatch(coverage, /broad by design/i);
  assert.match(accountability, /Pedro/);
});

test("keeps the expected AdSense publisher declaration", () => {
  assert.equal(ads.trim(), "google.com, pub-3054712908852183, DIRECT, f08c47fec0942fa0");
});
