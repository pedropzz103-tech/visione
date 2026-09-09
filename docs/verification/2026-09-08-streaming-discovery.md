# VISIONE streaming discovery — verification report

**Date:** 2026-09-09
**Branch:** `codex/visione-streaming-discovery`
**Base:** `origin/main`

## Automated verification

The clean verification gate uses the lockfile and runs each stage separately:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
node scripts/validate.mjs
git diff --check
```

The generated-site validator covers JavaScript/CSS syntax, domain interfaces, canonical and sitemap coherence, `noindex` exclusions, structured data, source attribution, internal links, secret-like patterns, and protected-host workflow references. Workflow YAML was also parsed with an ephemeral Prettier 3.6.2 check; it reported formatting differences, including a pre-existing workflow, but no parse failure.

Final outcomes: `npm ci` found zero vulnerabilities; syntax validation covered 30 JavaScript modules plus discovery CSS; five build interfaces passed; all 52 tests passed; the build generated three titles across three locales; and post-build validation accepted 23 generated HTML pages plus 60 sitemap URLs.

## Browser matrix

The repository root was served locally at `127.0.0.1:4173` and inspected in the Codex in-app Chromium browser at 1440×900 and 390×844.

| Route | Purpose | Desktop | Mobile |
| --- | --- | --- | --- |
| `/` | global search-first entry | pass | pass |
| `/es/` | Spanish market | pass | pass |
| `/pt/` | Portugal market | pass | pass |
| `/br/` | Brazil market | pass | pass |
| `/pt/onde-ver/coda/` | movie detail | pass | pass |
| `/br/onde-assistir/the-boys/` | series detail | pass | pass |
| `/pt/plataformas/netflix/` | provider detail | pass | pass |
| `/credits/` | data and attribution | pass | pass |
| `/news/` and one approved article | preserved editorial routes | pass | pass |

Every representative route had exactly one `h1`, a `main` landmark, the expected document language, and no horizontal overflow. Placeholder title art rendered correctly without remote poster assets. Missing price data appeared explicitly as not supplied by the source.

The 2026-09-09 header and hero refinement was rechecked at 1280×720 and inside a 390×844 responsive frame. The primary navigation and language selector remain grouped at the upper right, the selector contains only `ES`, `PT`, and `BR`, and no flag, country-name card, or market grid remains in the global hero. At 390 px, the rendered document width was 375 px against a 390 px viewport, confirming no horizontal overflow.

## Interaction and accessibility observations

- Local search returned Stranger Things after a 160 ms debounce; Arrow Down + Enter opened the localized title route.
- Empty search produced localized feedback. A stale-browser-cache issue found during this check was fixed by versioning generated CSS/JS asset URLs.
- Spanish pages, results, offer labels, source labels, status messages, and footer copy were verified after correcting Portuguese copy leakage.
- Watchlist and favourite controls exposed pressed state, announced a device-local status, and retained state after reload through `localStorage`.
- The provider destination exposed the official HTTPS URL with `target="_blank"` and `rel="noopener noreferrer"`.
- Keyboard traversal began with the skip link, then logo, catalogue, data sources, Wire, ES/PT/BR languages, search field, and search button. The active control had a clearly visible cyan focus ring.
- Reduced-motion emulation matched `prefers-reduced-motion: reduce` and produced no active CSS animations.
- Browser console inspection returned no warnings or errors after the final localization and cache changes.

## Data and environment boundaries

- The checked-in three-title seed is intentionally small and source-attributed. It is not evidence of comprehensive or permanently current provider coverage.
- No `TMDB_READ_ACCESS_TOKEN` was present, so live TMDB ingestion and licensed provider-data freshness were not verified. The no-token seed fallback was verified instead.
- External provider account, subscription, payment, geo-entitlement, and playback flows were not exercised.
- No deployment, merge, DNS change, production cutover, or `tablet.visione.one` configuration change was performed.
