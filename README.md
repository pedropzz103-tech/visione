# VISIONE streaming discovery

Static, privacy-conscious discovery for finding where films and series are available legally in Spain, Portugal, and Brazil. The root experience lives at [visione.one](https://visione.one); the existing editorial publication remains under `/news/`.

## Local operation

Node.js 22 or newer is required. The project has no runtime framework or production database.

```bash
npm ci
npm run ingest
npm run check
```

`npm run ingest` validates and copies the small source-attributed seed catalog when no external credential exists. With `TMDB_READ_ACCESS_TOKEN` configured, it calls the build-time TMDB adapter and retains the last known valid seed if the upstream request fails. `npm run build` generates the root page, localized market pages, title pages, provider pages, the credits page, local search index, and a combined sitemap without rewriting `/news/`.

Representative output:

- `/`, `/es/`, `/pt/`, `/br/`
- `/es/donde-ver/<slug>/`
- `/pt/onde-ver/<slug>/`
- `/br/onde-assistir/<slug>/`
- `/<market>/plataformas/<provider>/`
- `/credits/` and `/data/search-index.json`

Serve the repository root with any static server, for example `python -m http.server 4173`, then open `http://localhost:4173/`.

## Data flow and credentials

The browser never calls a catalog API. `scripts/ingest.mjs` normalizes provider/title data into `data/catalog.json`; `scripts/build.mjs` then produces deployable HTML. Search, favourites, and the watchlist run locally. Favourites are stored only in the visitor's `localStorage`; release reminders are downloaded as `.ics` files.

Copy `.env.example` only for local reference and provide `TMDB_READ_ACCESS_TOKEN` through the process environment or repository secret. Never commit it. The scheduled catalog workflow is disabled by default: set repository variable `ENABLE_CATALOG_REFRESH=true` only after the secret and commercial data rights are ready. Manual dispatch remains available. A changed refresh creates or updates `automation/catalog-refresh` and opens a review PR; it does not merge.

TMDB watch-provider data is powered by JustWatch and requires attribution. The seed catalog links directly to official provider pages and records a checked-at date; it deliberately leaves unknown prices blank. Review TMDB/JustWatch and each provider's current API, trademark, cache, and commercial-use terms before production use. The software does not host streams or torrents.

## Quality and deployment

`npm run check` performs syntax checks, interface/schema validation, all Node tests (including the preserved editorial suite), a deterministic build, and generated-site validation. CI repeats those stages with read-only permissions. The editorial inventory workflow rebuilds the combined sitemap after its existing allowlist normalization.

Deploy the repository root to any static host. No DNS or production cutover is performed by this project. `tablet.visione.one` is explicitly out of scope and must not be changed by these workflows.

Analytics, ads, and affiliate tracking are intentionally absent from discovery pages. If added later, require consent-aware analytics, a documented privacy update, clearly labelled affiliate links, and a reviewed ad surface. Existing AdSense controls apply only to the approved Wire article allowlist.

See [data and attribution details](./credits/) and the [implementation design](./docs/superpowers/specs/2026-09-08-visione-streaming-discovery-design.md).
