# VISIONE Streaming Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot `visione.one` into a static, localized streaming-discovery product for Spain, Portugal, and Brazil while preserving the existing `/news` archive and leaving `tablet.visione.one` untouched.

**Architecture:** Keep the repository as a static site. Add Node.js ESM build modules that normalize cached/seed title data into provider-neutral records, generate locale landing pages/title/provider pages/search indexes/sitemaps, and validate SEO/indexing invariants. Runtime page views read only generated HTML/JSON; external entertainment APIs are optional ingestion adapters and never required per visitor request.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node.js 22 built-ins, JSON snapshots, GitHub Actions, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-08-visione-streaming-discovery-design.md`

## Global Constraints

- Preserve every existing `/news/...` URL and the current editorial archive.
- Do not touch `tablet.visione.one`, Cloudflare Tunnel, SDKPOS, or tablet DNS/infrastructure.
- Public brand is `VISIONE`, not `VISIONE Play`.
- Initial locales: Spain `/es/`, Portugal `/pt/`, Brazil `/br/`.
- Title URL families: `/es/donde-ver/<slug>/`, `/pt/onde-ver/<slug>/`, `/br/onde-assistir/<slug>/`.
- No API keys, tokens, or paid credentials in the repository.
- No scraping or undocumented private APIs for production.
- Ordinary page views must not scale upstream API usage linearly.
- Incomplete/thin generated pages are `noindex,follow` and excluded from streaming sitemaps.
- Existing `ads.txt` publisher declaration remains intact.
- AdSense appears only on pages that satisfy the content-quality gate.
- Static delivery remains the deployment model; no runtime database is introduced.

---

## File Structure

- `streaming/config.mjs` — locale/provider configuration and URL helpers.
- `streaming/schema.mjs` — provider-neutral normalization and quality-gate functions.
- `streaming/render.mjs` — HTML helpers and templates.
- `streaming/build.mjs` — orchestrates generation of pages/search/sitemaps.
- `streaming/validate.mjs` — build-time validation for canonicals, hreflang, sitemap/noindex consistency, attribution, and links.
- `streaming/data/titles.json` — small factual/manual seed catalog with no invented availability/prices.
- `streaming/data/providers.json` — provider metadata used by seed records and templates.
- `assets/streaming.css` — dark cinematic UI system.
- `assets/streaming.js` — locale preference and local search UI.
- `data/search-index.json` — generated compact search index.
- `es/index.html`, `pt/index.html`, `br/index.html` — generated locale discovery pages.
- locale title/provider directories — generated HTML.
- `streaming-sitemap-es.xml`, `streaming-sitemap-pt.xml`, `streaming-sitemap-br.xml` — generated locale sitemaps.
- `streaming-sitemap-index.xml` — streaming sitemap index.
- `sitemap.xml` — updated root sitemap index/list preserving editorial entries and adding streaming families.
- `index.html` — new global VISIONE discovery entry page.
- `robots.txt` — preserve editorial sitemap declarations and add streaming sitemap index.
- `tests/streaming.test.mjs` — streaming schema/build/SEO tests.
- `tests/site.test.mjs` — update root-site expectations while keeping editorial-preservation assertions.
- `.github/workflows/site-quality.yml` — run streaming build/validation before tests on PRs and supported branches.
- `README.md` — build/test commands and credential policy.

---

### Task 1: Add normalized streaming schema and quality gate

**Files:**
- Create: `streaming/config.mjs`
- Create: `streaming/schema.mjs`
- Create: `streaming/data/providers.json`
- Create: `streaming/data/titles.json`
- Test: `tests/streaming.test.mjs`

**Interfaces:**
- Produces: `LOCALES`, `localePath(locale)`, `titlePath(locale, slug)`, `providerPath(locale, slug)`.
- Produces: `normalizeTitle(raw)`, `evaluateIndexability(title, locale)`, `rankOffers(offers)`.

- [ ] **Step 1: Write failing schema tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTitle, evaluateIndexability, rankOffers } from '../streaming/schema.mjs';

const raw = {
  id: 'movie:157336', type: 'movie', slug: 'interstellar', year: 2014,
  titles: { es: 'Interstellar', pt: 'Interstellar', br: 'Interestelar' },
  overview: { es: 'Viaje interestelar.', pt: 'Viagem interestelar.', br: 'Viagem interestelar.' },
  genres: ['Drama', 'Science Fiction'], updated_at: '2026-09-08T00:00:00Z',
  offers: { ES: [], PT: [], BR: [] }
};

test('normalizes a title into all supported markets', () => {
  const title = normalizeTitle(raw);
  assert.equal(title.id, 'movie:157336');
  assert.equal(title.titles.br, 'Interestelar');
});

test('keeps a useful unavailable state indexable when metadata is sufficient', () => {
  const title = normalizeTitle(raw);
  assert.equal(evaluateIndexability(title, 'es').indexable, true);
});

test('ranks free before rental and purchase', () => {
  const offers = rankOffers([
    { monetization: 'buy', price: 9.99, currency: 'EUR', provider: 'apple-tv' },
    { monetization: 'free', provider: 'pluto-tv' },
    { monetization: 'rent', price: 3.99, currency: 'EUR', provider: 'rakuten-tv' }
  ]);
  assert.equal(offers[0].monetization, 'free');
  assert.equal(offers[1].monetization, 'rent');
});
```

- [ ] **Step 2: Run the test and verify it fails before modules exist**

Run: `node --test tests/streaming.test.mjs`

Expected: FAIL with module-not-found for `streaming/schema.mjs`.

- [ ] **Step 3: Implement locale helpers, schema normalization, offer ranking, and indexability rules**

Quality gate must require localized title, year/type, meaningful localized overview, freshness timestamp, and either offers or a clearly represented supported-market unavailable state. It must return both `indexable` and `reasons`.

- [ ] **Step 4: Add a small factual seed catalog**

Use only stable metadata. Do not invent current streaming availability or prices. Availability arrays may be empty and rendered as a factual `not currently listed in the seed dataset`/data-unavailable state until licensed ingestion is configured.

- [ ] **Step 5: Run schema tests**

Run: `node --test tests/streaming.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add streaming tests/streaming.test.mjs
git commit -m "feat: add streaming data schema and quality gate"
```

### Task 2: Build cinematic shared UI and global/locale landing pages

**Files:**
- Create: `assets/streaming.css`
- Create: `assets/streaming.js`
- Create: `streaming/render.mjs`
- Modify: `index.html`
- Generate: `es/index.html`, `pt/index.html`, `br/index.html`
- Test: `tests/streaming.test.mjs`

**Interfaces:**
- Consumes normalized records and locale helpers from Task 1.
- Produces: `renderGlobalHome(data)`, `renderLocaleHome(locale, titles, providers)`, `renderTitleCard(title, locale)`.

- [ ] **Step 1: Add failing tests for the new root and locale homes**

Assert the root contains the VISIONE streaming-discovery positioning, stable links to `/es/`, `/pt/`, `/br/`, no automatic IP redirect, and a search UI. Assert locale pages have localized promise text and no dependency on client-side rendering for their main title rails.

- [ ] **Step 2: Run tests and verify failure against the current Wire homepage**

Run: `node --test tests/streaming.test.mjs`

Expected: FAIL because the root is still VISIONE Wire and locale pages do not exist.

- [ ] **Step 3: Implement the visual system**

Create a near-black cinematic layout, responsive poster rails, accessible focus states, search component, provider badges, mobile-first spacing, and no fake play buttons.

- [ ] **Step 4: Implement static global and localized landing templates**

Global root must present VISIONE, a large search, explicit country selector, and title/provider discovery. Locale homes must use localized copy from the spec.

- [ ] **Step 5: Add lightweight client-side locale preference and search interaction hooks**

Use `localStorage` only after explicit country selection. Do not auto-redirect crawlers or first-time visitors.

- [ ] **Step 6: Run tests**

Run: `node --test tests/streaming.test.mjs`

Expected: PASS for home/locale assertions.

- [ ] **Step 7: Commit**

```bash
git add index.html assets streaming tests/streaming.test.mjs es pt br
git commit -m "feat: redesign VISIONE for streaming discovery"
```

### Task 3: Generate localized title pages, provider pages, and local search index

**Files:**
- Modify: `streaming/render.mjs`
- Create: `streaming/build.mjs`
- Generate: locale title directories
- Generate: locale provider directories
- Generate: `data/search-index.json`
- Test: `tests/streaming.test.mjs`

**Interfaces:**
- Produces: `buildSite()` and generated page inventory.
- Produces search records shaped as `{id,type,title,alternateTitles,year,poster,url,locale}`.

- [ ] **Step 1: Add failing generation tests**

Check that representative titles generate at `/es/donde-ver/.../`, `/pt/onde-ver/.../`, `/br/onde-assistir/.../`; provider pages generate only for providers represented in configured data; and the search index contains localized URLs.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/streaming.test.mjs`

Expected: FAIL because `buildSite()` and generated pages/index do not exist.

- [ ] **Step 3: Implement title templates**

Include poster/backdrop fallbacks, localized/current-country offer sections, deterministic best-option summary, freshness timestamp, metadata, credits links where present, related titles, visible factual FAQ, upstream attribution, and no invented price/availability.

- [ ] **Step 4: Implement provider templates**

Provider pages must add useful context and only list titles actually represented in current data. Empty providers are not generated/indexed.

- [ ] **Step 5: Implement compact local search index generation**

Search must include localized and alternate titles and require no paid API call per keystroke.

- [ ] **Step 6: Run build and tests**

Run: `node streaming/build.mjs && node --test tests/streaming.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add streaming data es pt br tests/streaming.test.mjs
git commit -m "feat: generate localized streaming pages and search"
```

### Task 4: Implement SEO, hreflang, structured data, sitemaps, and validation

**Files:**
- Modify: `streaming/render.mjs`
- Modify: `streaming/build.mjs`
- Create: `streaming/validate.mjs`
- Generate: `streaming-sitemap-es.xml`, `streaming-sitemap-pt.xml`, `streaming-sitemap-br.xml`, `streaming-sitemap-index.xml`
- Modify: `sitemap.xml`
- Modify: `robots.txt`
- Test: `tests/streaming.test.mjs`

**Interfaces:**
- Produces: `validateBuild()` returning validation errors and throwing on invariant violations.

- [ ] **Step 1: Add failing SEO tests**

Assert self-canonical URLs, reciprocal `hreflang`, appropriate `Movie`/`TVSeries` plus `BreadcrumbList`, visible-FAQ-backed `FAQPage` only when rendered, unique canonical set, no `noindex` page in streaming sitemaps, and required attribution.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/streaming.test.mjs`

Expected: FAIL until SEO metadata and sitemaps exist.

- [ ] **Step 3: Implement SEO metadata/JSON-LD in templates**

Use localized title/meta description and visible facts only. Do not add fabricated review schema.

- [ ] **Step 4: Generate locale sitemaps and streaming sitemap index**

Only quality-gate-passing pages enter streaming sitemaps.

- [ ] **Step 5: Update root sitemap/robots without removing news sitemap declarations**

Keep the editorial sitemap references and add the streaming sitemap index.

- [ ] **Step 6: Implement build validator**

Reject duplicate canonicals, missing attribution, invalid locale URLs, `noindex` pages in sitemaps, broken generated internal links, or malformed normalized data.

- [ ] **Step 7: Run validation and tests**

Run: `node streaming/build.mjs && node streaming/validate.mjs && node --test tests/streaming.test.mjs`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add streaming sitemap.xml robots.txt streaming-sitemap-*.xml es pt br tests/streaming.test.mjs
git commit -m "feat: add streaming SEO and sitemap quality gates"
```

### Task 5: Preserve VISIONE Wire and adapt existing site quality tests

**Files:**
- Modify: `tests/site.test.mjs`
- Preserve: `news/**`
- Preserve: `ads.txt`

**Interfaces:**
- Existing editorial allowlist and trust-page tests remain authoritative for `/news`.

- [ ] **Step 1: Replace only root-home assumptions in existing tests**

The root test should now assert streaming-discovery content, while separate assertions continue to require `/news/index.html`, trust pages, approved article allowlist, author identity, news sitemap, AdSense rules, and no retired `wire.visione.one` infrastructure.

- [ ] **Step 2: Add explicit preservation tests**

Ensure representative indexed article URLs still exist and canonicalize to themselves, and that `ads.txt` remains exactly `google.com, pub-3054712908852183, DIRECT, f08c47fec0942fa0`.

- [ ] **Step 3: Run both suites**

Run: `node --test tests/site.test.mjs tests/streaming.test.mjs`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/site.test.mjs
git commit -m "test: preserve Wire during streaming pivot"
```

### Task 6: Add build/validation CI and documentation

**Files:**
- Modify: `.github/workflows/site-quality.yml`
- Modify: `README.md`

**Interfaces:**
- CI command sequence: build, validate, Node tests.

- [ ] **Step 1: Update CI trigger to include the streaming feature branch pattern and run generation/validation**

Use Node 22 and commands:

```bash
node streaming/build.mjs
node streaming/validate.mjs
node --test tests/site.test.mjs tests/streaming.test.mjs
```

- [ ] **Step 2: Document local commands and credential policy**

README must state that provider API credentials are optional for the seed build, must come from environment/GitHub secrets, and commercial data use requires appropriate licensing.

- [ ] **Step 3: Run the complete verification locally or through CI**

Expected: build and all tests pass.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/site-quality.yml README.md
git commit -m "ci: validate VISIONE streaming build"
```

### Task 7: Final regression review and PR

**Files:**
- Review all changed/generated files.

- [ ] **Step 1: Verify no tablet/SDKPOS infrastructure changed**

Compare branch to `main`; fail the review if any tablet/SDKPOS/Cloudflare Tunnel file was modified.

- [ ] **Step 2: Verify `/news` diff is limited to intentional test/navigation compatibility changes**

No article body, canonical, indexed URL, or editorial sitemap entry should disappear accidentally.

- [ ] **Step 3: Run final checks**

```bash
node streaming/build.mjs
node streaming/validate.mjs
node --test tests/site.test.mjs tests/streaming.test.mjs
```

Expected: all PASS.

- [ ] **Step 4: Open a pull request into `main`**

PR summary must include the architecture, generated locales/page families, SEO safeguards, preservation of `/news`, absence of runtime API calls, and any remaining external licensing/credential dependency.
