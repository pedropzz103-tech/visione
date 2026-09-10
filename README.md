# VISIONE

VISIONE is a static streaming-discovery site for Spain, Portugal and Brazil, with VISIONE Wire preserved under `/news/`.

## Local build

Requires Node.js 22+ and no npm dependencies.

```bash
node streaming/build.mjs
node streaming/validate.mjs
node --test tests/*.test.mjs
```

The build reads normalized cached data from `streaming/data/` and generates:

- `/es/`, `/pt/`, `/br/` locale landing pages;
- localized movie/series pages;
- `data/search-index.json` for client-side search, including title and credited-person search terms;
- streaming XML sitemaps.

Ordinary page views do not call an entertainment API. The committed discovery pages link to `/data-credits/`, which explains metadata, availability, licensing and attribution rules to users and crawlers.

## Free TV series metadata with TVmaze

`streaming/adapters/tvmaze.mjs` integrates the free public TVmaze API for **series metadata only**. No API key is required.

It can ingest show identity, premiere year, runtime, genres, poster, seasons, cast, creators and external IDs. Existing VISIONE ES/PT/BR titles and summaries are preserved during a merge because TVmaze does not provide equivalent localized copy for every market. TVmaze metadata never changes `offers`, `availability_status` or `availability_updated_at`.

```bash
node streaming/sync-tvmaze.mjs --all-series
node streaming/sync-tvmaze.mjs --slug=the-last-of-us
```

Add `--dry-run` to test matching without writing `streaming/data/titles.json`. On the first sync, VISIONE searches TVmaze and only accepts a unique exact match whose normalized name and premiere year agree. The resulting TVmaze ID is cached in `source.tvmaze_id`.

The client uses a descriptive User-Agent and backs off/retries HTTP 429 responses. TVmaze API data is CC BY-SA, so visible attribution and ShareAlike compliance must remain in place. TVmaze's web/streaming schedule is not treated as a country-by-country legal availability feed.

## Free movie metadata with Wikidata

`streaming/adapters/wikidata.mjs` integrates Wikidata as an **open metadata source for movies**. No API key or account is required. Wikidata structured data is CC0.

The adapter uses the MediaWiki Action API to search entities and `Special:EntityData` to retrieve the selected entity. It can enrich movie identity, localized labels when available, release year, runtime, genres, director, cast and IMDb ID. Linked entity labels are resolved in batches through `wbgetentities`.

```bash
node streaming/sync-wikidata.mjs --all-movies
node streaming/sync-wikidata.mjs --slug=interstellar
```

Add `--dry-run` to verify matching without writing the catalog. The first sync only accepts a unique exact normalized title + release-year match and then caches the QID in `source.wikidata_id` for later direct refreshes.

Wikidata descriptions are not treated as plot summaries, and the integration does not import artwork. Existing VISIONE ES/PT/BR titles, curated summaries, posters/backdrops and all `offers`, `availability_status` and `availability_updated_at` values are preserved during merge. Wikidata is metadata only and is never interpreted as evidence that a title is available on a streaming provider.

The client follows Wikimedia access etiquette with an identifiable User-Agent, `Accept-Encoding`, `maxlag=5` for Action API calls and retry/backoff for HTTP 429.

## Bulk movie discovery with Wikidata Query Service

`streaming/adapters/wikidata-query.mjs` adds bounded SPARQL discovery through the public Wikidata Query Service. This is for finding candidate films in manageable year windows, not for fuzzy full-text search or downloading a large fraction of Wikidata.

```bash
node streaming/discover-wikidata.mjs --year=2026 --limit=50
node streaming/discover-wikidata.mjs --from-year=2025 --to-year=2026 --limit=100 --offset=0
node streaming/discover-wikidata.mjs --year=2026 --output=./wikidata-2026.json
```

Queries are bounded to at most 100 rows per call, use film/release-date properties directly instead of `REGEX`, send an identifiable User-Agent and `Accept-Encoding`, apply a timeout, and back off on HTTP 429/503. Discovery results are candidates only; they are not automatically promoted to public VISIONE pages.

## Supplemental metadata with every.film

`streaming/adapters/everyfilm.mjs` uses the public read API at every.film. Reads require no API key. The integration deliberately treats every.film as **supplemental metadata**, not as the authority for streaming availability.

For the first pairing, supply the numeric every.film media ID for a known VISIONE slug. The ID is then cached in `source.every_film_id` and can be refreshed later without guessing an undocumented search endpoint.

```bash
node streaming/sync-everyfilm.mjs --slug=interstellar --id=70523 --dry-run
node streaming/sync-everyfilm.mjs --all-known
```

The adapter consumes the documented `/api/v1/media/<id>/detail` read endpoint, sends a descriptive User-Agent, honors HTTP 429/Retry-After, and preserves VISIONE titles, localized summaries, artwork, credits, genres and every provider offer. It currently imports only safe supplemental fields such as the fused rating, completeness/contributor metadata and source provenance.

every.film metadata is published under CC BY-SA 4.0, so visible attribution and ShareAlike obligations must be preserved for adapted data. The service also warns that upstream sources such as TMDB, IMDb and Douban may retain rights in some material, especially artwork; this integration therefore does not assume that upstream images or other restricted material become freely reusable merely because they are surfaced by every.film.

## Official availability evidence, without a provider scraper

`streaming/adapters/official-availability.mjs` and `streaming/ingest-official-availability.mjs` provide a conservative path for country-specific availability evidence.

The repository **does not directly crawl Disney+, Netflix, Prime Video or Max**. Provider terms and technical behavior differ, and public title-page existence is not enough to prove current availability. Evidence must first be obtained through a method that is authorized for that source, then stored in `streaming/data/official-availability-evidence.json` with the VISIONE slug, provider, country, official HTTPS URL, expected title, captured text and a `checked_at` timestamp.

```bash
node streaming/ingest-official-availability.mjs --dry-run
node streaming/ingest-official-availability.mjs --slug=interstellar --dry-run
node streaming/ingest-official-availability.mjs
```

The importer itself performs **no network fetches**. It only parses supplied evidence. Positive evidence can add or replace offers for that provider/country and advance `availability_updated_at`. Negative, ambiguous or identity-mismatched evidence never becomes a verified `unavailable` state and never deletes another provider's offer. Evidence whose expected title does not belong to the target VISIONE record is rejected.

`streaming/data/official-availability-candidates.json` is a review queue for leads discovered from public sources. Candidate records are not used by the build and cannot make a page indexable. `streaming/data/official-availability-evidence.json` starts empty on purpose: promotion requires an authorized and sufficiently fresh verification path.

## Data, freshness and credentials

The committed catalog contains factual metadata and may contain explicitly verified provider evidence. It does **not** invent current streaming availability or prices. Until a permitted availability source verifies a market, the relevant title page remains `noindex,follow` and explains that provider data is pending.

Metadata freshness (`updated_at`) and provider-availability freshness (`availability_updated_at`) are separate. A page cannot become indexable from an available/unavailable provider state unless the availability check has its own valid timestamp. Failed ingestion is rendered as a temporary data failure, never as proof that no legal offer exists.

A current-schema TMDB adapter lives at `streaming/adapters/tmdb.mjs`. It maps TMDB watch-provider results into VISIONE's provider-neutral schema and carries visible `JustWatch via TMDB` availability attribution. It is optional and is not called by visitor page views.

If that adapter is enabled, provide its token only at runtime through:

```bash
export TMDB_READ_ACCESS_TOKEN="..."
```

Never commit API keys, bearer tokens or commercial credentials. TMDB, JustWatch or any replacement provider must only be enabled under terms that permit VISIONE's commercial use case, and all required attribution must remain visible in generated pages. Having an API token is not, by itself, proof of commercial licensing.

## Repository boundaries

- Preserve existing `/news/...` URLs and editorial quality controls.
- Do not modify `tablet.visione.one`, SDKPOS, Cloudflare Tunnel or tablet-related DNS/infrastructure as part of the streaming product.
- `ads.txt` remains the existing Google publisher declaration; streaming ad placement is gated separately from editorial pages.

## Architecture

The data layer is provider-neutral:

`licensed/open source -> ingestion/cache -> normalized JSON -> static build -> HTML/JSON -> visitor`

The editorial inventory sync also keeps the committed streaming navigation/sitemap surface in sync without overwriting the new product root.

See `docs/superpowers/specs/2026-09-08-visione-streaming-discovery-design.md` for the product specification and `docs/superpowers/plans/2026-09-08-visione-streaming-discovery.md` for the implementation plan.
