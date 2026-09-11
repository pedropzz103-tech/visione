# VISIONE Gated Catalog Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand VISIONE's internal catalogue while publishing only market-specific titles that have a complete cover and verified provider availability.

**Architecture:** Keep `titles.json` as the internal catalogue. Add a pure market publication gate used by build/search/render/validation, add deterministic catalogue collections, and extend scheduled discovery separately from availability evidence. Artwork and affiliate links remain independent authorities from provider evidence.

**Tech Stack:** Node.js ES modules, static HTML generation, GitHub Actions, TVmaze, Wikidata/WDQS, Wikimedia Commons, existing official-evidence pipeline.

**Spec:** `docs/superpowers/specs/2026-09-11-catalog-expansion-availability-gate-design.md`

## Global Constraints

- Public title requires a complete cover and at least one verified positive offer for that market.
- One-letter poster fallbacks are forbidden publicly.
- ES/PT/BR remain separate market gates.
- Metadata discovery never changes availability.
- Affiliate tracking is only applied for explicitly approved provider/market configurations.
- Preserve `/news/`, `tablet.visione.one`, SDKPOS, Cloudflare Tunnel and tablet infrastructure.
- Do not use non-commercial API tiers for monetized production.

---

### Task 1: Publication eligibility contract

**Files:**
- Create: `streaming/publication.mjs`
- Create: `tests/publication.test.mjs`
- Modify: `streaming/schema.mjs`

**Interfaces:**
- Produces: `hasCompleteCover(title) -> boolean`
- Produces: `verifiedOffersForMarket(title, market) -> Offer[]`
- Produces: `isPublicInMarket(title, market) -> boolean`
- Produces: `publicMarkets(title) -> string[]`

- [ ] Write failing tests for source poster, editorial cover, lone/missing artwork, positive offers, unknown/error states and per-market separation.
- [ ] Run `node --test tests/publication.test.mjs` and verify failure.
- [ ] Implement the pure publication helpers without mutating records.
- [ ] Run the focused test and the complete suite.
- [ ] Commit.

### Task 2: Complete cover rendering and remove fake inventory

**Files:**
- Modify: `streaming/render.mjs`
- Modify: `assets/streaming.css`
- Create: `tests/catalog-render.test.mjs`

**Interfaces:**
- Consumes: `hasCompleteCover`, `isPublicInMarket`
- Produces: complete VISIONE editorial cover HTML for `artwork.kind === "editorial-cover"`.

- [ ] Add tests proving no one-letter fallback and no `BREVEMENTE/PRÓXIMAMENTE` hard-coded inventory is rendered.
- [ ] Verify tests fail on current renderer.
- [ ] Replace one-letter fallback with factual editorial cover and delete `pendingReleaseCards` sections.
- [ ] Run focused and full tests.
- [ ] Commit.

### Task 3: Market-filtered build and search

**Files:**
- Modify: `streaming/build.mjs`
- Modify: `streaming/render.mjs`
- Modify: `streaming/validate.mjs`
- Modify: `tests/streaming.test.mjs`
- Create: `tests/public-build.test.mjs`

**Interfaces:**
- Consumes: `isPublicInMarket`, `publicMarkets`
- Produces: locale pages/search indexes containing only eligible titles; global home containing titles public in at least one launch market.

- [ ] Write tests proving private internal titles do not appear in locale home/search/title output.
- [ ] Verify red state.
- [ ] Filter build inputs by market; skip locale title-page generation when gate fails.
- [ ] Add validator invariant: every generated public title has complete cover + verified offer.
- [ ] Run build, validate and tests.
- [ ] Commit.

### Task 4: Deterministic real catalogue collections

**Files:**
- Create: `streaming/catalog-selection.mjs`
- Create: `tests/catalog-selection.test.mjs`
- Modify: `streaming/render.mjs`

**Interfaces:**
- Produces: `buildCollections(titles, { locale, date }) -> collection[]`

- [ ] Write tests for deterministic top/daily/weekly selections, genre rails, minimum inventory and duplicate budget.
- [ ] Verify failure.
- [ ] Implement pure selection/scoring and replace positional `slice(0,10)`/index arrays.
- [ ] Run focused/full tests.
- [ ] Commit.

### Task 5: TVmaze series discovery

**Files:**
- Modify: `streaming/adapters/tvmaze.mjs`
- Create: `streaming/discover-tvmaze.mjs`
- Create: `tests/tvmaze-discovery.test.mjs`

**Interfaces:**
- Produces: bounded schedule discovery, deterministic ranking and import of previously unseen TVmaze IDs.
- Imported series without a TVmaze image stay internal and fail the publication gate.

- [ ] Add fixture-driven tests for dedupe, scoring, limits and no offer mutation.
- [ ] Implement schedule fetch/ranking/import with retry handling.
- [ ] Run tests.
- [ ] Commit.

### Task 6: WDQS film discovery and Commons artwork

**Files:**
- Modify: `streaming/adapters/wikidata-query.mjs`
- Modify: `streaming/adapters/wikidata.mjs`
- Create: `streaming/adapters/commons.mjs`
- Modify: `streaming/discover-wikidata.mjs`
- Create: `streaming/sync-commons-artwork.mjs`
- Create: `tests/commons-artwork.test.mjs`
- Modify: `tests/wikidata-query.test.mjs`

**Interfaces:**
- Produces: QID-based film candidates with P18 filename/sitelink signal.
- Produces: Commons license resolver with explicit allowlist.
- No accepted image -> `artwork.kind="editorial-cover"`, not a one-letter placeholder.

- [ ] Add failing tests for recent/established candidate pools and license allowlist.
- [ ] Implement bounded discovery and Commons metadata lookup.
- [ ] Preserve metadata/availability authority separation.
- [ ] Run tests.
- [ ] Commit.

### Task 7: Availability evidence and affiliate overlay

**Files:**
- Modify: `streaming/adapters/official-availability.mjs`
- Modify: `streaming/ingest-official-availability.mjs`
- Create: `streaming/affiliate.mjs`
- Create: `streaming/data/affiliate-config.json`
- Create: `tests/affiliate.test.mjs`
- Modify: `tests/official-availability.test.mjs`

**Interfaces:**
- Evidence controls whether an offer exists.
- Affiliate overlay may only replace `affiliate_url` for an already-verified offer and approved provider/market config.

- [ ] Write tests proving pending/no affiliate never manufactures availability and approved config adds sponsored deep link only.
- [ ] Implement affiliate overlay and provenance-preserving evidence fields.
- [ ] Seed all affiliate states as `pending`/`none` until real account approvals are supplied.
- [ ] Run tests.
- [ ] Commit.

### Task 8: Initial availability research batch

**Files:**
- Modify: `streaming/data/official-availability-evidence.json`
- Modify: `streaming/data/official-availability-candidates.json` when useful.

**Interfaces:**
- Only official/authorized positive evidence with exact title identity is committed.

- [ ] Research a first batch of high-confidence ES/PT/BR title pages on official provider/store domains.
- [ ] Add only evidence that meets the adapter contract; leave ambiguous cases private.
- [ ] Run ingest, build, validation and tests through CI.
- [ ] Commit.

### Task 9: Workflow bootstrap and recursion guard

**Files:**
- Modify: `.github/workflows/adsense-sync.yml`
- Modify: `.github/workflows/site-quality.yml` only if needed
- Modify: `README.md`

**Interfaces:**
- Scheduled/manual runs perform discovery -> enrichment -> artwork -> evidence -> build -> validate -> tests -> commit.

- [ ] Add workflow tests/assertions for discovery commands and no self-triggering data paths.
- [ ] Implement workflow sequence with bounded bootstrap/daily modes.
- [ ] Run CI on feature branch and inspect logs/counts.
- [ ] Commit.

### Task 10: Finish and publish

- [ ] Confirm internal catalogue expansion metrics and public eligible counts per ES/PT/BR.
- [ ] Run `node streaming/build.mjs`, `node streaming/validate.mjs`, `node --test tests/*.test.mjs` in CI.
- [ ] Open PR with counts, known private inventory and availability-source caveats.
- [ ] Merge only after green CI because the owner explicitly approved publication of this feature.
- [ ] Verify GitHub Pages deployment and live `visione.one` output.
