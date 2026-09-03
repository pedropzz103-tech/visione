import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

const projectCases = [
  {
    slug: "ivi",
    name: "Ivi",
    image: "ivi-hero.webp",
    next: "../sdkpos/",
  },
  {
    slug: "sdkpos",
    name: "SDKPOS",
    image: "sdkpos-hero.webp",
    next: "../visione-social/",
  },
  {
    slug: "visione-social",
    name: "VISIONE Social",
    image: "visione-social-hero.webp",
    next: "../ivi/",
  },
];

function cssColorForSelector(stylesheet, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = stylesheet.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1];
  const color = rule?.match(/(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i)?.[1];

  assert.ok(color, `Expected a six-digit text color for ${selector}`);
  return color;
}

function relativeLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );

  return (lighter + 0.05) / (darker + 0.05);
}

test("presents VISIONE as a technology company", () => {
  assert.match(html, /<title>VISIONE — Digital Products & Technology<\/title>/);
  assert.match(html, /id="services"/);
  assert.match(html, /id="projects"/);
  assert.match(html, /id="studio"/);
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

test("showcases VISIONE projects with honest development stages", () => {
  assert.match(html, /id="projects"/);
  assert.match(html, />Ivi</);
  assert.match(html, />SDKPOS</);
  assert.match(html, /VISIONE Social/);
  assert.doesNotMatch(html, /A Cana Chegou/i);
  assert.match(html, /In development/);
  assert.match(html, /Concept stage/);
});

test("uses the approved editorial case-study composition", () => {
  assert.match(html, /class="case case-ivi"/);
  assert.match(html, /class="case case-sdkpos"/);
  assert.match(html, /class="case case-social"/);
  assert.match(html, /class="capability-row"/);
  assert.match(html, /class="product-ui/);
  assert.doesNotMatch(html, /hero-system|service-card|project-card|orbit-one/);
});

test("links every selected project to its own case-study route", () => {
  for (const { slug } of projectCases) {
    assert.match(html, new RegExp(`href="projects/${slug}/"`));
  }
});

test("publishes a complete, image-led page for every selected project", async () => {
  for (const { slug, name, image, next } of projectCases) {
    const pageUrl = new URL(`../projects/${slug}/index.html`, import.meta.url);
    const page = await readFile(pageUrl, "utf8");

    assert.match(page, new RegExp(`<title>${name.replace(" ", "\\s+")} — VISIONE<\\/title>`));
    assert.match(page, /class="project-hero"/);
    assert.match(page, /class="project-gallery"/);
    assert.match(page, new RegExp(`src="../assets/${image}"`));
    assert.match(page, /alt="[^"]+"/);
    assert.match(page, /href="\.\.\/\.\.\/#projects"/);
    assert.match(page, new RegExp(`href="${next.replaceAll("/", "\\/")}"`));

    await access(new URL(`../projects/assets/${image}`, import.meta.url));
  }
});

test("keeps project-page navigation and galleries responsive", async () => {
  const projectCss = await readFile(
    new URL("../projects/project.css", import.meta.url),
    "utf8",
  );

  assert.match(projectCss, /\.project-gallery\s*\{/);
  assert.match(projectCss, /@media\s*\(max-width:\s*760px\)/i);
  assert.match(projectCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
  assert.doesNotMatch(projectCss, /\byellow\b|#ffd700\b|#facc15\b|#ffcc00\b/i);
});

test("makes every project case study discoverable in the sitemap", async () => {
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");

  for (const { slug } of projectCases) {
    assert.match(sitemap, new RegExp(`<loc>https:\\/\\/visione\\.one\\/projects\\/${slug}\\/</loc>`));
  }
});

test("gives the long SDKPOS hero title an intentional mobile break", async () => {
  const sdkposPage = await readFile(
    new URL("../projects/sdkpos/index.html", import.meta.url),
    "utf8",
  );
  const heading = sdkposPage.match(
    /<h1 id="project-title">([\s\S]*?)<\/h1>/,
  )?.[1];

  assert.match(
    heading ?? "",
    /SDK<br class="mobile-title-break"\s*\/?>\s*<em>POS\.<\/em>/,
  );
});

test("keeps small project-page labels at WCAG AA contrast", async () => {
  const projectCss = await readFile(
    new URL("../projects/project.css", import.meta.url),
    "utf8",
  );
  const labelSurfaces = [
    [".project-meta span", "#f7f9ff"],
    [".project-story > p:first-child", "#ffffff"],
    [".progress-list span", "#f0f3f9"],
    [".progress-list em", "#f0f3f9"],
    [".memory-canvas > span", "#0b0e15"],
    [".memory-cards span", "#121722"],
    [".social-discovery .ui-window-head", "#f9f7ff"],
    [".social-profile-copy p", "#ffffff"],
    [".next-project span", "#315cff"],
    [".next-project span", "#4268f4"],
    [".next-project span", "#7354df"],
  ];

  for (const [selector, background] of labelSurfaces) {
    const foreground = cssColorForSelector(projectCss, selector);
    const ratio = contrastRatio(foreground, background);

    assert.ok(
      ratio >= 4.5,
      `${selector} contrast was ${ratio.toFixed(2)}:1; expected at least 4.5:1`,
    );
  }
});
