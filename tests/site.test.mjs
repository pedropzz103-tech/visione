// VISIONE canonical-domain and editorial-quality gate.
import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [home, robots, sitemap, ads, newsIndex, feed, newsSitemap, canonicalSpec] = await Promise.all([
  read("index.html"),
  read("robots.txt"),
  read("sitemap.xml"),
  read("ads.txt"),
  read("news/index.html"),
  read("news/feed.xml"),
  read("news/news-sitemap.xml"),
  read("docs/superpowers/specs/2026-09-07-visione-wire-main-domain-quality-design.md"),
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

// Explicit editorial allowlist. Everything else remains online as archive material,
// but must not be indexed, syndicated or monetized until it receives editorial approval.
const indexableArticles = [
  "alibaba-hk80-billion-share-placement-ai-investment-2026.html",
  "anthropic-claude-unauthorized-actions-security-overhaul-september-1-2026.html",
  "brazil-ai-supercomputer-23-billion-us-china.html",
  "broadcom-60-billion-ai-debt-deal-credit-markets.html",
  "dell-q2-fy2027-ai-server-orders-95-billion-backlog-september-2-2026.html",
  "europe-lumi-ai-supercomputer-387-8-million-amd-mi430x-2027.html",
  "gartner-ai-security-market-4-8-billion-2027.html",
  "google-marvell-12-billion-ai-chip-deal.html",
  "judge-blocks-pentagon-anthropic-blacklisting-august-28-2026.html",
  "liquid-network-320-million-bitcoin-withdrawal-security-incident-september-7-2026.html",
  "nasa-roman-space-telescope-launch-august-30-2026.html",
  "nvidia-ai-server-price-hike-memory-costs-2027.html",
  "nvidia-q2-fy2027-earnings-august-26-ai-market-test.html",
  "openai-anthropic-100-companies-ai-cyber-defense-warning-august-27-2026.html",
  "openai-astra-critical-cyber-safety-controls.html",
  "openai-automated-research-intern-research-acceleration-september-6-2026.html",
  "openai-chatgpt-ads-1-billion-run-rate-europe-india-august-31-2026.html",
  "openai-cursor-model-access-ends-november-12-spacex-2026.html",
  "openai-gpt-5-6-sol-price-cut-august-2026.html",
  "openai-jalapeno-chip-benchmarks-inference-august-25-2026.html",
  "opera-loses-eu-court-challenge-microsoft-edge-dma-september-2-2026.html",
  "salesforce-claudeforce-anthropic-37-skills-ai-crm-2026.html",
  "stability-ai-76-million-series-b-entertainment-investors-august-25-2026.html",
  "tencent-hy4-preview-770b-open-source-ai-coding-research-august-28-2026.html",
  "thomson-reuters-thomson-proprietary-ai-model-40-million.html",
  "us-g20-carolina-principles-ai-regulation-september-1-2026.html",
  "us-government-backs-openai-nyt-copyright-ai-training-fair-use-september-2-2026.html",
];

const corporateLegacyPages = [
  "projects/ivi/index.html",
  "projects/sdkpos/index.html",
  "projects/visione-social/index.html",
];

const adsenseScript = /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/;

test("serves VISIONE as the canonical root publication", () => {
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
  assert.doesNotMatch(newsIndex, adsenseScript);
});

test("uses the main domain in robots, RSS and sitemaps", () => {
  assert.match(robots, /Sitemap: https:\/\/visione\.one\/sitemap\.xml/);
  assert.match(robots, /Sitemap: https:\/\/visione\.one\/news\/news-sitemap\.xml/);
  assert.match(feed, /<link>https:\/\/visione\.one\/<\/link>/);
  assert.doesNotMatch(feed, /wire\.visione\.one/);
  assert.doesNotMatch(sitemap, /wire\.visione\.one/);
  assert.doesNotMatch(newsSitemap, /wire\.visione\.one/);
});

test("does not carry infrastructure for the retired wire subdomain", async () => {
  await assert.rejects(access(new URL("cloudflare/wire-worker.js", root)), { code: "ENOENT" });
  await assert.rejects(access(new URL("cloudflare/wrangler.toml", root)), { code: "ENOENT" });
  await assert.rejects(access(new URL(".github/workflows/deploy-wire-worker.yml", root)), { code: "ENOENT" });
});

test("removes stale plans that could reintroduce the retired subdomain", async () => {
  assert.doesNotMatch(canonicalSpec, /wire\.visione\.one/);
  await assert.rejects(access(new URL("docs/superpowers/plans/2026-09-02-visione-institutional-redesign.md", root)), { code: "ENOENT" });
  await assert.rejects(access(new URL("docs/superpowers/specs/2026-09-02-visione-institutional-redesign-design.md", root)), { code: "ENOENT" });
});

test("keeps trust pages indexable but free of ad code", async () => {
  for (const page of [...trustPages, "author-pedro.html"]) {
    const content = await read(`news/${page}`);
    assert.match(content, /name="robots" content="index,follow/);
    assert.doesNotMatch(content, adsenseScript, `${page} should not carry AdSense code`);
    assert.match(sitemap, new RegExp(`<loc>https:\\/\\/visione\\.one\\/news\\/${page.replaceAll(".", "\\.")}</loc>`));
  }
});

test("limits the index and monetization inventory to explicitly approved reporting", async () => {
  const entries = await readdir(new URL("news/", root), { withFileTypes: true });
  const articleFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => entry.name)
    .filter((name) => !["index.html", ...trustPages, "author-pedro.html"].includes(name));

  assert.ok(indexableArticles.length >= 20, "Keep a substantial focused editorial inventory");

  for (const file of articleFiles) {
    const article = await read(`news/${file}`);
    const loc = `<loc>https://visione.one/news/${file}</loc>`;

    if (indexableArticles.includes(file)) {
      assert.ok(sitemap.includes(loc), `Approved article missing from sitemap: ${file}`);
      assert.match(article, /name="robots" content="index,follow/);
      assert.match(article, /class="byline"/);
      assert.match(article, /<section class="sources">/);
      assert.match(article, /"author":\{"@type":"Person","name":"Pedro"/);
      assert.match(article, /href="\/news\/author-pedro\.html"/);
      assert.match(article, adsenseScript, `Approved article missing AdSense code: ${file}`);
    } else {
      assert.ok(!sitemap.includes(loc), `Archive article must not be in sitemap: ${file}`);
      assert.match(article, /name="robots" content="noindex,follow"/);
      assert.doesNotMatch(article, adsenseScript, `Archive article must not carry AdSense code: ${file}`);
    }
  }
});

test("keeps the Google News sitemap limited to approved genuinely recent stories", () => {
  for (const match of newsSitemap.matchAll(/<loc>https:\/\/visione\.one\/news\/([^<]+)<\/loc>/g)) {
    assert.ok(indexableArticles.includes(match[1]), `Unapproved article in Google News sitemap: ${match[1]}`);
  }
  assert.match(newsSitemap, /liquid-network-320-million-bitcoin-withdrawal-security-incident-september-7-2026\.html/);
  assert.match(newsSitemap, /openai-automated-research-intern-research-acceleration-september-6-2026\.html/);
  assert.doesNotMatch(newsSitemap, /september-2-2026\.html/);
  assert.doesNotMatch(newsSitemap, /august-31-2026\.html/);
});

test("keeps retired corporate presentation pages out of the searchable publication", async () => {
  for (const path of corporateLegacyPages) {
    const page = await read(path);
    assert.match(page, /name="robots" content="noindex,follow"/);
    assert.doesNotMatch(page, adsenseScript);
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
