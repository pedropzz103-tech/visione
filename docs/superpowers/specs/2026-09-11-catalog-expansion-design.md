# VISIONE Catalog Expansion Design

## Goal

Transform the current 10-title prototype into a real discovery catalogue with at least 100 titles in the first import, automatic ongoing growth, honest source attribution, useful collections, and no fake release cards.

## Product outcome

The first production rollout must contain at least 100 unique catalogue titles: at least 60 series and at least 40 films. The homepage must stop recycling the same 10 records across sections. Every collection must be derived from real catalogue records. The hard-coded “Brevemente nos cinemas” and “Brevemente no streaming” placeholder cards are removed until VISIONE has title-level release data from an authorized source.

The catalogue remains a legal discovery product. Metadata and artwork may be populated independently from provider availability. Missing availability must remain `unknown`; discovery or metadata ingestion must never imply Netflix/Prime/Disney+/Max availability.

## Constraints

- Keep Spain, Portugal, and Brazil as launch markets (`ES`, `PT`, `BR`).
- Preserve `/news/` as VISIONE Wire.
- Do not modify `tablet.visione.one`, SDKPOS, Cloudflare Tunnel, tablet DNS, or tablet infrastructure.
- Do not use TMDB, Watchmode, or any other non-commercial free tier in production.
- Do not scrape provider services that prohibit automated extraction.
- Do not publish third-party artwork unless the current integration/source permits that use or the individual asset has an acceptable free license.
- Do not invent streaming availability, release dates, prices, ratings, or popularity claims.
- Preserve the current build → validate → test gate before catalogue changes are committed.
- All discovery and sync code must be idempotent. A run with unchanged upstream facts must not create a new commit merely because the clock advanced.

## Architecture

The catalogue pipeline is split into four independent responsibilities:

1. **Discovery** finds candidate titles from free/open sources.
2. **Enrichment** fetches full metadata for known source IDs and merges it without touching availability.
3. **Artwork policy** accepts source artwork only when permitted and otherwise produces a VISIONE editorial card fallback.
4. **Presentation** builds deterministic, real catalogue collections from the complete dataset.

Each responsibility has a narrow interface so changing a metadata source later does not require changing rendering or provider-availability logic.

## Source strategy

### Series: TVmaze

TVmaze remains the primary series source. Existing source attribution remains visible.

A new TVmaze discovery job uses the public web schedule for a bounded rolling window to find currently active streaming series. The bootstrap scans 30 days backward and 14 days forward from the run date, deduplicates shows by TVmaze ID, fetches candidate show metadata, then imports the highest-ranked candidates until the catalogue contains at least 60 unique series.

Daily scheduled runs scan 7 days backward and 7 days forward and add at most 10 previously unseen series per run. Discovery does not claim that the show is available in ES/PT/BR; the web schedule is only a discovery signal.

The series discovery score is deterministic:

```text
score = tvmaze_weight
      + (tvmaze_rating * 10)
      + recency_bonus
      + artwork_bonus
      + metadata_bonus

recency_bonus = 30 when premiere year >= current year - 2
              = 15 when premiere year >= current year - 5
              = 0 otherwise
artwork_bonus = 15 when a TVmaze image exists, otherwise 0
metadata_bonus = 10 when genres are non-empty and runtime or season count exists, otherwise 0
```

Missing `weight` or rating contributes zero. Ties are broken by newer premiere year and then ascending TVmaze ID so repeated runs produce the same order.

For every accepted TVmaze show, VISIONE stores:

- `source.tvmaze_id`
- title and localized AKA values where TVmaze provides them
- premiere year
- runtime
- season count
- genres
- rating with `source: "TVmaze"`
- cast/creator credits
- permitted TVmaze image URL where available
- source URL and attribution

### Films: Wikidata + WDQS

Wikidata is the primary film metadata source. WDQS is the film discovery source.

The discovery query selects items identified as films, requires a release date and IMDb ID, and reads Wikimedia sitelink count as a deterministic broad-notability signal. The bootstrap builds two pools:

- **20 recent films:** release year >= current year - 5, ordered by sitelink count descending, then release year descending, then QID ascending.
- **20 established films:** release year < current year - 5, ordered by sitelink count descending, then release year descending, then QID ascending.

Already-known QIDs are excluded. If one pool cannot fill its 20 slots, the other pool may fill the remainder so the bootstrap still reaches at least 40 films.

Daily scheduled runs add at most 5 previously unseen films, preferring the recent pool before the established pool. The query is bounded, paginated, and avoids fuzzy regex scans. Imported records store their QID and IMDb ID so future refreshes use direct entity fetches instead of repeated name matching.

Wikidata enrichment may populate factual metadata such as:

- localized labels
- original title where available
- release year
- runtime
- genres
- director(s)
- cast
- IMDb ID
- discovery-time sitelink count

Wikidata descriptions are not used as plot summaries.

### every.film

every.film remains an optional enrichment source only for records with a verified `every_film_id`. It may enrich safe structured metadata according to the existing adapter. It must not be treated as the authority for artwork or streaming availability merely because its record contains upstream fields from third-party databases.

## Movie artwork policy

Movie artwork is intentionally separated from metadata.

For Wikidata films with `P18`, a Wikimedia Commons adapter resolves the file through the Commons API and reads image metadata/license information. VISIONE accepts an asset only when the normalized reported license is one of:

- `CC0`
- `Public domain`
- `CC BY 2.0`, `CC BY 2.5`, `CC BY 3.0`, `CC BY 4.0`
- `CC BY-SA 2.0`, `CC BY-SA 2.5`, `CC BY-SA 3.0`, `CC BY-SA 4.0`

Unknown, missing, non-commercial-only, no-derivatives, or otherwise non-free licenses are rejected. The stored record includes source URL, license label, author/credit when available, and attribution text.

If no accepted free image exists, the card does not fall back to a giant initial letter. Instead, rendering produces a **VISIONE editorial cover** using CSS and factual catalogue fields: full localized title, year, media type, and one primary genre. The cover uses the existing VISIONE dark/blue visual language, contains a small `VISIONE EDITORIAL` mark, and never uses a copyrighted film logo or copied poster composition.

No TMDB/IMDb poster URL is copied into the catalogue without an independent permitted source/license.

## Catalogue record changes

The normalized title record may gain:

```json
{
  "discovery": {
    "source": "tvmaze-web-schedule | wikidata-wdqs | manual",
    "discovered_at": "ISO timestamp",
    "score": 0,
    "sitelinks": 0
  },
  "artwork": {
    "kind": "source-image | editorial-cover | none",
    "source": "TVmaze | Wikimedia Commons | VISIONE",
    "license": "CC BY-SA | CC BY | CC0 | Public Domain | null",
    "credit": "string or null",
    "source_url": "URL or null"
  }
}
```

`discovery.sitelinks` is meaningful for Wikidata-discovered films and may be `0` for other sources. `poster` remains the resolved renderable image URL when there is an accepted source image. An editorial cover does not require a generated bitmap and is rendered from `artwork.kind === "editorial-cover"` plus title facts.

Existing `offers`, `availability_status`, and `availability_updated_at` remain under the separate availability authority and are never modified by catalogue discovery/enrichment.

## Merge semantics and idempotency

Every source adapter produces normalized source data. Merge functions compare meaningful factual fields before changing a record.

`updated_at` changes only when at least one metadata field actually changes. The compared fields are runtime, seasons, genres, rating, credits, accepted poster/backdrop, artwork metadata, source IDs, original title, and source metadata. `discovered_at` is written only on first import. A refresh that returns the same meaningful fields leaves both timestamps untouched.

An imported candidate is rejected when source identity is ambiguous. TVmaze imports are keyed by TVmaze ID after schedule discovery. Wikidata imports are keyed by QID after WDQS discovery.

## Presentation and collections

The global homepage stops using array positions such as `titles.slice(0, 10)` and hard-coded index lists.

A new pure catalogue selection module builds collections from normalized data. The initial homepage contains only real-title rails:

- **Top 10 VISIONE**: 10 titles, deterministic editorial score, explicitly not audience ranking.
- **Recomendados hoje**: 12–20 titles, deterministic daily rotation.
- **Escolhas da semana**: 12–20 titles, deterministic weekly rotation.
- **Filmes em destaque**: 12–20 films.
- **Séries em destaque**: 12–20 series.
- **Ficção científica e fantasia**: 12–20 qualifying titles when at least 6 exist.
- **Drama**: 12–20 qualifying titles when at least 6 exist.
- **Crime e thriller**: 12–20 qualifying titles when at least 6 exist.
- **Animação**: 12–20 qualifying titles when at least 6 exist.

Editorial rails other than Top 10 are suppressed when fewer than 10 eligible titles exist. Genre rails are suppressed when fewer than 6 qualifying titles exist. No section renders placeholder cards to simulate inventory.

A homepage title may appear at most twice across `Top 10`, `Recomendados hoje`, `Escolhas da semana`, `Filmes em destaque`, and `Séries em destaque`. Genre rails do not count against that editorial appearance budget because they are explicit browsing categories. Adjacent editorial rails must not start with the same title.

Locale pages continue to expose film and series sections, now backed by the full catalogue rather than the seed set.

## Deterministic scoring

The homepage editorial score is source-transparent and must not be labeled as real-world popularity.

For series:

```text
editorial_score = discovery.score
                + metadata_completeness * 20
```

For films:

```text
editorial_score = min(discovery.sitelinks, 500)
                + recency_bonus
                + artwork_bonus
                + metadata_completeness * 20

recency_bonus = 60 when year >= current year - 2
              = 30 when year >= current year - 5
              = 0 otherwise
artwork_bonus = 20 for accepted source artwork
              = 5 for editorial cover
              = 0 otherwise
```

`metadata_completeness` is a value from `0` to `1` based on presence of year, runtime/seasons, at least one genre, at least one director/creator, and at least one cast member. Each of the five checks contributes `0.2`.

The UI labels the ranking as “Curadoria VISIONE” and keeps the disclaimer that it does not represent streaming-platform audience data.

Daily rotation uses a stable hash of `YYYY-MM-DD + title.id`; weekly rotation uses ISO year/week plus `title.id`. A rebuild with unchanged data on the same day/week produces the same order.

## Search

`data/search-index.json` continues to be generated statically, but it indexes the entire expanded catalogue. Search terms include localized titles, original title, cast, director/creator, and genres.

Search must not depend on TVmaze/Wikidata at browser runtime.

## Title page fallback copy

Newly discovered titles may not have curated ES/PT/BR plot summaries. The renderer therefore generates a localized factual fallback from structured fields only.

Templates:

- ES movie: `Película de {genre} estrenada en {year}, dirigida por {director}. Duración: {runtime} min.`
- PT movie: `Filme de {genre} estreado em {year}, realizado por {director}. Duração: {runtime} min.`
- BR movie: `Filme de {genre} lançado em {year}, dirigido por {director}. Duração: {runtime} min.`
- ES series: `Serie de {genre} estrenada en {year}{creator clause}{season clause}.`
- PT series: `Série de {genre} estreada em {year}{creator clause}{season clause}.`
- BR series: `Série de {genre} lançada em {year}{creator clause}{season clause}.`

Missing facts are omitted grammatically rather than replaced with invented values. Curated overview text always wins when present.

Indexability remains conservative. Catalogue growth does not automatically make provider-availability pages indexable; existing availability freshness/indexability rules continue to apply.

## Workflow

The scheduled catalogue workflow becomes:

1. Discover bounded new TVmaze series.
2. Discover bounded new Wikidata films.
3. Refresh known TVmaze records.
4. Refresh known Wikidata records.
5. Refresh already-paired every.film records.
6. Resolve Wikimedia Commons artwork for eligible films.
7. Build all static pages and the search index.
8. Validate.
9. Run the complete test suite.
10. Commit only when meaningful catalogue/generated output changed.

The workflow keeps `workflow_dispatch` and the existing daily schedule.

To prevent self-triggering commit loops, `streaming/data/*.json` and generated catalogue HTML are removed from the catalogue-sync workflow’s `push.paths`. Catalogue source/adaptor/workflow/test changes may still trigger a sync. Scheduled/manual runs remain the normal data-refresh entry points. The site-quality workflow remains independent and may validate any resulting commit.

## Failure behavior

Upstream failure must never delete working catalogue data.

- TVmaze discovery or refresh timeout: keep existing series data; fail bootstrap if the catalogue cannot reach the required 60-series floor.
- WDQS/Wikidata timeout: keep existing film data; fail bootstrap if the catalogue cannot reach the required 40-film floor.
- Commons timeout or rejected license: keep metadata and use an editorial cover.
- Ambiguous title identity: skip candidate and log the reason.
- Missing localized overview: use factual fallback copy.
- Missing provider availability: remain `unknown`.
- Negative/ambiguous provider evidence: never convert to verified unavailable.

After the 100-title bootstrap floor has been achieved once, a transient discovery-source outage may skip new imports while still allowing refresh/build from existing catalogue data, provided validation and tests pass.

## Testing

All new behavior is developed test-first.

Required coverage includes:

- TVmaze discovery deduplication, 30-back/14-forward bootstrap window, 7-back/7-forward daily window, deterministic scoring, and 10-title daily import cap.
- WDQS discovery query boundaries, QID/IMDb identity, 20 recent + 20 established bootstrap composition, and 5-title daily import cap.
- Commons license allowlist and rejection of unknown/non-free licenses.
- Editorial-cover fallback when no accepted image exists.
- Merge idempotency and timestamp stability.
- No mutation of provider offers/availability during metadata discovery.
- Deterministic daily/weekly collections.
- Collection minimum-size suppression and two-appearance editorial budget.
- Removal of hard-coded pending-release cards.
- Search index containing newly imported records and people/genre terms.
- Localized factual fallback copy.
- Build/validation across ES/PT/BR.
- Workflow recursion prevention by path-trigger configuration.

## Performance bounds

The static site remains the serving architecture. External APIs are called only during catalogue workflows, never during normal page loads.

Discovery calls are bounded by explicit day windows, page limits, candidate limits, and source rate limits. TVmaze HTTP requests continue to honor its existing retry/rate-limit handling. WDQS queries use explicit limits and pagination. The first bootstrap must fit within the existing 12-minute GitHub Actions job.

The first target is 100–150 titles, not an unbounded mirror of upstream databases. The design must support later growth to thousands without changing the normalized record or renderer interfaces.

## Non-goals for this rollout

- Building a Netflix/JustWatch-sized full global catalogue.
- Scraping streaming-provider websites in violation of their terms.
- Claiming cinema release calendars without title-level authorized data.
- Solving commercial provider availability for every title.
- Adding user accounts, watchlists, reviews, or social features.
- Replacing VISIONE Wire.

## Acceptance criteria

The rollout is complete when all of the following are true:

1. Production catalogue has at least 100 unique titles, including at least 60 series and at least 40 films. If an upstream outage prevents the initial bootstrap floor, deployment fails rather than silently claiming success.
2. The four already-integrated TVmaze series retain real artwork.
3. Film cards with approved Commons artwork display it; all other film cards use a professional VISIONE editorial cover instead of a one-letter placeholder.
4. The global homepage contains no hard-coded “Brevemente” inventory placeholders.
5. At least five real-title catalogue rails render from data, with 12+ cards per rail whenever the qualifying inventory supports it.
6. Search covers the complete imported catalogue.
7. Metadata discovery never changes offers or availability status.
8. A second sync with unchanged upstream facts produces no metadata-only commit.
9. Build, validation, and all tests pass before catalogue output is committed.
10. The catalogue-sync workflow does not trigger itself from its own data/generated-page commit.
11. GitHub Pages deploys the resulting `main` commit successfully.
