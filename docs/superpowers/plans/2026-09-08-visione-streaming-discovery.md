# VISIONE Streaming Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-buildable static MVP that turns VISIONE into a localized, search-first legal streaming-discovery product while preserving every existing `/news` URL.

**Architecture:** Keep the repository statically deployable. Node.js build modules ingest or read normalized snapshots, apply an explicit quality gate, and generate HTML-first locale, title, provider, credits, search-index, and sitemap assets; browser JavaScript only enhances local search, country preference, and watchlist/favorites stored on-device. External APIs are build-time adapters, never visitor-time dependencies.

**Tech Stack:** HTML5, CSS, vanilla JavaScript ES modules, Node.js 22 built-in APIs and test runner, GitHub Actions, static hosting.

**Spec:** `docs/superpowers/specs/2026-09-08-visione-streaming-discovery-design.md`

## Global Constraints

- Public brand remains `VISIONE`; never imply that VISIONE hosts or plays copyrighted content.
- Stable markets are Spain `/es/`, Portugal `/pt/`, and Brazil `/br/`; the root never redirects by IP or browser language.
- Title routes are `/es/donde-ver/<slug>/`, `/pt/onde-ver/<slug>/`, and `/br/onde-assistir/<slug>/`.
- Preserve all existing `/news/...` paths, feeds, trust pages, indexability rules, and editorial quality tests.
- `tablet.visione.one` is out of scope and must not be touched.
- Do not scrape JustWatch or use private/undocumented endpoints.
- Never commit API tokens; optional TMDB ingestion uses environment variables and required attribution.
- Do not invent availability, prices, ratings, reviews, cast, or descriptions.
- Ordinary page views make no paid external API requests.
- Thin pages are `noindex,follow` and excluded from `sitemap.xml`.
- No accounts or runtime database are part of this MVP.
- Ads appear only on pages that pass the content-quality gate; provider results appear before advertising.

---

## File Structure

- `package.json` / `package-lock.json` — dependency-free Node scripts and reproducible CI install contract.
- `.env.example` — placeholders and documented ingestion settings only.
- `data/catalog.seed.json` — clearly sourced representative normalized catalog used when no licensed API credential exists.
- `data/catalog.json` — generated normalized snapshot consumed by the build.
- `data/search-index.json` — compact generated browser-search document.
- `data/providers.json` — provider identity and future country-specific affiliate configuration without affiliate claims.
- `scripts/lib/config.mjs` — locale, route, freshness, provider, and path configuration.
- `scripts/lib/catalog.mjs` — schema validation, normalization, source/offer status, and quality gate.
- `scripts/lib/search.mjs` — accent-insensitive tokenization, typo-tolerant scoring, and compact-index generation.
- `scripts/lib/seo.mjs` — canonical, hreflang, metadata, schema, and sitemap helpers.
- `scripts/lib/render.mjs` — focused HTML templates for global, locale, title, provider, and credits pages.
- `scripts/adapters/tmdb.mjs` — optional documented build-time TMDB adapter with cache and normalized output.
- `scripts/ingest.mjs` — selects licensed API input when configured or the transparent seed snapshot otherwise.
- `scripts/build.mjs` — generates the static site without deleting unrelated legacy paths.
- `scripts/validate.mjs` — validates syntax, links, canonical uniqueness, schema, attribution, and noindex/sitemap consistency.
- `assets/discovery.css` — responsive dark cinematic design system.
- `assets/discovery-search.js` — progressively enhanced local search and explicit locale preference.
- `assets/library.js` — local-only favorites/watchlist controls and calendar export UI.
- `tests/catalog.test.mjs` — domain, normalization, ranking, cache, and quality-gate tests.
- `tests/search.test.mjs` — tokenization, translated title, and typo tolerance tests.
- `tests/build.test.mjs` — generated routes, SEO, structured data, and sitemap validation.
- `tests/site.test.mjs` — preserved editorial assertions updated for the streaming root.
- `.github/workflows/site-quality.yml` — install, lint, typecheck, tests, build, and validation.
- `.github/workflows/catalog-refresh.yml` — optional scheduled/dispatch build-time ingestion using repository secrets.
- `README.md` — operating, data licensing, build, environment, deployment, and verification guide.

---

### Task 1: Dependency-free build contract and domain primitives ✅

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `scripts/lib/config.mjs`
- Create: `scripts/lib/catalog.mjs`
- Create: `tests/catalog.test.mjs`

**Interfaces:**
- Produces: `LOCALES`, `localePath(locale)`, `titlePath(locale, slug)`, `normalizeTitle(raw)`, `validateTitle(title)`, `rankOffers(offers)`, `evaluateTitleQuality(title, locale)`.
- Consumers: ingestion, render, SEO, search, and validation modules.

- [ ] **Step 1: Write failing domain tests**

```js
test("uses stable localized title routes", () => {
  assert.equal(titlePath("es", "interstellar"), "/es/donde-ver/interstellar/");
  assert.equal(titlePath("pt", "interstellar"), "/pt/onde-ver/interstellar/");
  assert.equal(titlePath("br", "interestelar"), "/br/onde-assistir/interestelar/");
});

test("ranks factual offers without inventing prices", () => {
  const ranked = rankOffers([{ type: "buy", price: null }, { type: "subscription", price: null }]);
  assert.equal(ranked[0].type, "subscription");
  assert.equal(ranked[0].price, null);
});

test("quality gate rejects unsupported or unsourced title pages", () => {
  assert.equal(evaluateTitleQuality({ titles: { pt: "X" }, offers: { PT: [] } }, "pt").indexable, false);
});
```

- [ ] **Step 2: Run `node --test tests/catalog.test.mjs`**

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement immutable locale configuration and normalization**

`normalizeTitle(raw)` returns a provider-neutral record with `id`, `type`, `slug`, localized titles/overviews, factual metadata, `credits`, `seasons`, `episodes`, `keywords`, `offers`, `source`, `updated_at`, and `availability_status`. Reject unknown media and offer types.

- [ ] **Step 4: Implement deterministic offer ranking and quality gate**

Order offers by `subscription`, `free`, `rent`, then `buy`; only compare numeric prices within the same currency/type. Require localized identity, meaningful overview/metadata, freshness, visible source attribution, and either confirmed offers or an explicitly sourced current no-offer state for indexability.

- [ ] **Step 5: Add package commands and environment placeholders**

```json
{
  "scripts": {
    "ingest": "node scripts/ingest.mjs",
    "build": "node scripts/build.mjs",
    "lint": "node scripts/validate.mjs --syntax",
    "typecheck": "node scripts/validate.mjs --interfaces",
    "test": "node --test tests/*.test.mjs carluxiii-preview/tests/*.test.mjs",
    "check": "npm run lint && npm run typecheck && npm test && npm run build && node scripts/validate.mjs"
  }
}
```

- [ ] **Step 6: Re-run the focused tests**

Expected: all Task 1 tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json .env.example scripts/lib/config.mjs scripts/lib/catalog.mjs tests/catalog.test.mjs
git commit -m "feat: define streaming discovery domain"
```

---

### Task 2: Sourced seed catalog and optional TMDB ingestion ✅

**Files:**
- Create: `data/catalog.seed.json`
- Create: `data/providers.json`
- Create: `scripts/adapters/tmdb.mjs`
- Create: `scripts/ingest.mjs`
- Modify: `tests/catalog.test.mjs`
- Create: `tests/fixtures/tmdb-title.json`

**Interfaces:**
- Consumes: `TMDB_READ_ACCESS_TOKEN`, `TMDB_API_BASE_URL`, `CATALOG_MAX_AGE_HOURS`.
- Produces: `mapTmdbTitle(detail, watchProviders, locale)`, `isFresh(snapshot, now, maxAgeHours)`, and `data/catalog.json`.

- [ ] **Step 1: Add failing adapter/cache tests**

```js
test("maps raw provider responses into country offers", () => {
  const title = mapTmdbTitle(detailFixture, providerFixture, "pt-PT");
  assert.equal(title.type, "movie");
  assert.ok(Array.isArray(title.offers.PT));
  assert.ok(title.source.attribution.includes("TMDB"));
});

test("fresh snapshots avoid another provider request", () => {
  assert.equal(isFresh({ updated_at: "2026-09-08T10:00:00Z" }, new Date("2026-09-08T12:00:00Z"), 24), true);
});
```

- [ ] **Step 2: Run the focused test and confirm the new assertions fail**

Run: `node --test tests/catalog.test.mjs`

- [ ] **Step 3: Add a small real, source-attributed seed catalog**

Every factual field carries a stable source URL or record-level source list. Offers are included only where an official provider destination or licensed snapshot confirms the selected country; otherwise use `availability_status: "unknown"` and no offer. Prices remain `null` unless supplied by the data source.

- [ ] **Step 4: Implement the adapter and cache policy**

Use documented TMDB `/3/movie/{id}`, `/3/tv/{id}`, and matching `/watch/providers` endpoints with Bearer auth. Write cached normalized JSON only at build time, keep the last-known-good snapshot on fetch failure, expose freshness, and include TMDB plus JustWatch attribution when watch-provider data is present.

- [ ] **Step 5: Implement graceful ingestion selection**

`scripts/ingest.mjs` uses TMDB only when `TMDB_READ_ACCESS_TOKEN` exists; otherwise it validates and copies the transparent seed file to `data/catalog.json` with a visible console notice. No credential value is logged.

- [ ] **Step 6: Re-run catalog tests and execute seed ingestion**

Run: `node --test tests/catalog.test.mjs && node scripts/ingest.mjs`

Expected: tests pass; `data/catalog.json` is valid and no network request occurs without a token.

- [ ] **Step 7: Commit**

```bash
git add data scripts/adapters scripts/ingest.mjs tests
git commit -m "feat: add sourced catalog ingestion"
```

---

### Task 3: Local typo-tolerant search and static discovery pages ✅

**Files:**
- Create: `scripts/lib/search.mjs`
- Create: `tests/search.test.mjs`
- Create: `scripts/lib/render.mjs`
- Create: `scripts/build.mjs`
- Create: `assets/discovery.css`
- Create: `assets/discovery-search.js`
- Create: `assets/library.js`
- Modify: `index.html`
- Generate: `es/index.html`, `pt/index.html`, `br/index.html`
- Generate: localized title/provider pages and `credits/index.html`
- Generate: `data/search-index.json`

**Interfaces:**
- Produces: `normalizeQuery(value)`, `scoreSearch(query, entry)`, `buildSearchIndex(catalog)`, `renderGlobalPage(model)`, `renderLocalePage(model)`, `renderTitlePage(model)`, `renderProviderPage(model)`, `buildSite(catalog)`.
- Browser contract: search index entries contain `id`, `type`, `year`, `titles`, `aliases`, and localized `paths` only.

- [ ] **Step 1: Write failing search tests**

```js
test("search ignores accents and finds translated titles", () => {
  assert.ok(scoreSearch("ficcao", { searchText: "ficção científica" }) > 0);
  assert.ok(scoreSearch("interestelar", { searchText: "Interstellar Interestelar" }) > 0);
});

test("one small typo still returns the intended title", () => {
  assert.ok(scoreSearch("interstelar", { searchText: "interstellar" }) >= 0.6);
});
```

- [ ] **Step 2: Run search tests and verify failure**

Run: `node --test tests/search.test.mjs`

- [ ] **Step 3: Implement compact search scoring**

Normalize Unicode diacritics, tokenize, prioritize exact prefix/word matches, and apply bounded edit distance only to tokens of at least four characters. Cap results, debounce input by 160 ms, and never call an external API from the browser.

- [ ] **Step 4: Implement focused HTML templates**

Global page: brand, dominant search, explicit country choices, product explanation, and News/Wire link. Locale page: search, trending/new/provider rails only when backed by data, useful empty states, provider discovery, and editorial news entry. Title page: factual metadata, watch/rent/buy groups, best-option explanation, freshness, sources/credits, seasons/episodes when present, recommendations, FAQ generated only from visible facts, and local watchlist/favorite controls. Provider page: context, filters, movies/series/new/top sections only where data supports them; thin provider pages are visibly useful but `noindex`.

- [ ] **Step 5: Implement responsive, accessible UI**

Use semantic landmarks, visible skip/focus states, labelled search/listboxes, `aria-live` results, keyboard navigation, responsive poster grids, aspect-ratio placeholders, lazy images, reduced-motion support, and no fake play buttons.

- [ ] **Step 6: Implement local-only library actions**

`assets/library.js` stores favorite/watchlist IDs and explicit market preference in `localStorage`, announces state changes accessibly, and exports known release dates as an `.ics` file. It sends no personal data.

- [ ] **Step 7: Generate the static pages**

Run: `node scripts/ingest.mjs && node scripts/build.mjs`

Expected: root plus all three locale pages, representative movie/series pages, provider pages, credits, and search index exist without altering `news/**`.

- [ ] **Step 8: Re-run focused tests**

Run: `node --test tests/search.test.mjs tests/catalog.test.mjs`

- [ ] **Step 9: Commit**

```bash
git add index.html es pt br credits assets data scripts tests
git commit -m "feat: build localized discovery experience"
```

---

### Task 4: SEO, quality gate, and static validation ✅

**Files:**
- Create: `scripts/lib/seo.mjs`
- Create: `scripts/validate.mjs`
- Create: `tests/build.test.mjs`
- Modify: `scripts/lib/render.mjs`
- Modify: `scripts/build.mjs`
- Modify: `robots.txt`
- Generate: `sitemap.xml`

**Interfaces:**
- Produces: `canonicalFor(path)`, `hreflangLinks(title)`, `titleSchema(title, locale)`, `breadcrumbSchema(items)`, `faqSchema(items)`, `generateSitemap(pages)` and `validateGeneratedSite(root)`.
- Consumes: the `indexable` decision produced by `evaluateTitleQuality()`; templates may not override it.

- [ ] **Step 1: Write failing generated-site tests**

```js
test("all equivalent title pages expose canonical and hreflang", async () => {
  const html = await read("pt/onde-ver/interstellar/index.html");
  assert.match(html, /rel="canonical" href="https:\/\/visione\.one\/pt\/onde-ver\/interstellar\/"/);
  assert.match(html, /hreflang="es-ES"/);
  assert.match(html, /hreflang="pt-PT"/);
  assert.match(html, /hreflang="pt-BR"/);
});

test("noindex pages never enter the sitemap", async () => {
  for (const page of generatedPages) {
    if (/name="robots" content="noindex,follow"/.test(page.html)) {
      assert.ok(!sitemap.includes(`<loc>${page.canonical}</loc>`));
    }
  }
});
```

- [ ] **Step 2: Run build tests and verify they fail**

Run: `node --test tests/build.test.mjs`

- [ ] **Step 3: Implement metadata and schema helpers**

Emit unique localized titles/descriptions, self canonicals, Open Graph, Twitter cards, correct `hreflang` plus `x-default`, `Movie` or `TVSeries`, `BreadcrumbList`, and `FAQPage` only for visible questions. Exclude absent ratings, images, offers, episodes, and reviews from JSON-LD.

- [ ] **Step 4: Generate a single authoritative sitemap**

Parse indexable editorial pages without modifying them, add only quality-approved discovery pages, ensure unique canonical URLs, and keep News sitemap declarations in `robots.txt`.

- [ ] **Step 5: Implement fail-loud validation**

Fail on invalid catalog records, duplicate canonical URLs, missing attribution, mismatched JSON-LD, broken generated internal links, `noindex` URLs in sitemap, indexable pages missing required localized value, secrets-like patterns, or any reference to `tablet.visione.one` outside the explicit safety documentation/tests.

- [ ] **Step 6: Re-run build and validation**

Run: `node scripts/build.mjs && node --test tests/build.test.mjs && node scripts/validate.mjs`

Expected: zero failures.

- [ ] **Step 7: Commit**

```bash
git add scripts tests robots.txt sitemap.xml es pt br credits index.html
git commit -m "feat: enforce discovery SEO quality gate"
```

---

### Task 5: Preserve editorial guarantees and harden CI

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `.github/workflows/site-quality.yml`
- Modify: `.github/workflows/adsense-sync.yml`
- Create: `.github/workflows/catalog-refresh.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `npm run check` and generated static output.
- Produces: CI that fails on install, lint, interface checks, tests, build, or post-build validation errors.

- [x] **Step 1: Update failing editorial/root tests**

Replace only the obsolete assertion that root is `VISIONE Wire`; require the new discovery title, search landmark, locale links, and `/news/` navigation. Keep every allowlist, byline, canonical, AdSense, feed, and archived-page assertion.

- [x] **Step 2: Run the full baseline and confirm only obsolete root expectations fail**

Run: `npm test`

- [x] **Step 3: Harden site-quality CI**

Use Node 22, `npm ci`, then `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `node scripts/validate.mjs`. Set read-only permissions and a 10-minute timeout.

- [x] **Step 4: Keep editorial automation compatible**

After its existing normalization, invoke the discovery build so `sitemap.xml` includes both editorial and quality-approved discovery URLs. Preserve the article allowlist and never reactivate editorial scheduling.

- [x] **Step 5: Add opt-in catalog refresh workflow**

Allow `workflow_dispatch` and a disabled-by-default schedule guard. Validate `TMDB_READ_ACCESS_TOKEN`, run ingestion/build/check, and open a generated commit only when data changes. Never echo the token and document that production commercial use requires suitable licensing.

- [x] **Step 6: Document operation and legal boundaries**

README includes local commands, output paths, data flow, required environment variables, cache/fallback behavior, attribution, API licensing, static deployment, analytics hooks, ad/affiliate configuration, privacy, and explicit `tablet.visione.one` exclusion.

- [x] **Step 7: Run `npm run check`**

Expected: install-independent checks, tests, build, and validation all pass.

- [ ] **Step 8: Commit**

```bash
git add tests .github README.md package-lock.json
git commit -m "ci: verify streaming discovery build"
```

---

### Task 6: Visual, mobile, accessibility, and regression verification

**Files:**
- Modify only files whose verified defect requires a fix.
- Create: `docs/verification/2026-09-08-streaming-discovery.md`

**Interfaces:**
- Consumes: generated site served locally.
- Produces: evidence-backed verification report with commands, results, screenshots/observations, limitations, and remaining credential dependencies.

- [x] **Step 1: Start a local static server**

Run: `npx --yes serve . -l 4173` or an installed equivalent that does not modify the repository.

- [x] **Step 2: Inspect desktop and mobile flows**

Verify `/`, `/es/`, `/pt/`, `/br/`, one movie page, one series page, one provider page, credits, `/news/`, and an existing article at roughly 1440×900 and 390×844. Exercise keyboard-only search, locale selection, empty search, watchlist/favorite, provider link, no-image fallback, and missing-data states.

- [x] **Step 3: Run accessibility and browser console checks**

Confirm one `<h1>`, landmarks, labels, visible focus, sensible tab order, no horizontal overflow, no uncaught errors, and reduced-motion behavior. Fix reproducible defects and add regression tests when practical.

- [x] **Step 4: Run final clean verification**

Run:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
node scripts/validate.mjs
git diff --check
git status --short
```

Expected: every automated check exits 0; only intentional project files are changed.

- [x] **Step 5: Audit secrets and protected infrastructure**

Search tracked files for credential patterns and `tablet.visione.one`. Expected: no credential material; the hostname appears only in explicit documentation or safety assertions and no workflow/DNS configuration targets it.

- [x] **Step 6: Write the verification report**

Record exact command outcomes, representative generated routes, data/credential limitations, browser observations, and any unverified live-provider/device behavior. Do not claim production data freshness without licensed credentials.

- [x] **Step 7: Commit verified fixes and report**

```bash
git add -A
git commit -m "docs: record streaming discovery verification"
```
