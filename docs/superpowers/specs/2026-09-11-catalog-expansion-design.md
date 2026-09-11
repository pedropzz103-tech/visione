# VISIONE Catalog Expansion Design

## Goal

Transform the current 10-title prototype into a real discovery catalogue with at least 100 titles in the first import, automatic ongoing growth, honest source attribution, useful collections, and no fake release cards.

## Product outcome

The first production rollout must contain at least 100 unique catalogue titles, targeting roughly 60+ series and 40+ films. The homepage must stop recycling the same 10 records across sections. Every collection must be derived from real catalogue records. The hard-coded “Brevemente nos cinemas” and “Brevemente no streaming” placeholder cards are removed until VISIONE has title-level release data from an authorized source.

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

A new TVmaze discovery job uses the public web schedule for a bounded rolling window to find currently active streaming series. The initial bootstrap scans 30 days backward and 14 days forward, deduplicates shows by TVmaze ID, then ranks candidates using TVmaze-provided `weight`, rating, premiere year, and whether the show has usable artwork. It imports enough candidates to bring the series catalogue to at least 60 unique records.

Daily scheduled runs use a smaller rolling window and add a bounded number of new series so the catalogue grows without large daily diffs. Discovery does not claim that the show is available in ES/PT/BR; the web schedule is only a discovery signal.

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

The discovery query selects items identified as films, requires a release date and IMDb ID, and uses Wikimedia sitelink count as a deterministic broad-notability signal. The initial import chooses at least 40 unique films across recent and established titles rather than simply taking the newest 40 records.

The query is bounded, paginated, and avoids fuzzy regex scans. Imported records store their QID and IMDb ID so future refreshes use direct entity fetches instead of repeated name matching.

Wikidata enrichment may populate factual metadata such as:

- localized labels
- original title where available
- release year
- runtime
- genres
- director(s)
- cast
- IMDb ID

Wikidata descriptions are not used as plot summaries.

### every.film

every.film remains an optional enrichment source only for records with a verified `every_film_id`. It may enrich safe structured metadata according to the existing adapter. It must not be treated as the authority for artwork or streaming availability merely because its record contains upstream fields from third-party databases.

## Movie artwork policy

Movie artwork is intentionally separated from metadata.

For Wikidata films with `P18`, a Wikimedia Commons adapter resolves the file through the Commons API and reads image metadata/license information. VISIONE accepts only assets whose reported license is in an explicit allowlist such as CC0, Public Domain, CC BY, or CC BY-SA. The stored record includes source URL, license label, author/credit when available, and attribution text.

If no accepted free image exists, the card does not fall back to a giant initial letter. Instead, rendering produces a **VISIONE editorial cover** using CSS and factual catalogue fields: title, year, media type, and one primary genre. It must be visually complete but clearly branded as VISIONE rather than impersonating an official film poster.

No TMDB/IMDb poster URL is copied into the catalogue without an independent permitted source/license.

## Catalogue record changes

The normalized title record may gain:

```json
{
  "discovery": {
    "source": "tvmaze-web-schedule | wikidata-wdqs | manual",
    "discovered_at": "ISO timestamp",
    "score": 0
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

`poster` remains the resolved renderable image URL when there is an accepted source image. An editorial cover does not require a generated bitmap and can be rendered from `artwork.kind === "editorial-cover"` plus title facts.

Existing `offers`, `availability_status`, and `availability_updated_at` remain under the separate availability authority and are never modified by catalogue discovery/enrichment.

## Merge semantics and idempotency

Every source adapter produces normalized source data. Merge functions compare meaningful factual fields before changing a record.

`updated_at` changes only when metadata actually changes. A refresh that returns the same runtime, genres, credits, artwork, source IDs, and rating leaves the existing timestamp untouched. This prevents scheduled refreshes from manufacturing freshness and prevents workflow commit loops.

An imported candidate is rejected when source identity is ambiguous. TVmaze matches require a unique source ID/canonical match. Wikidata imports are keyed by QID after discovery.

## Presentation and collections

The global homepage stops using array positions such as `titles.slice(0, 10)` and hard-coded index lists.

A catalogue selection module builds collections from normalized data. The initial homepage contains only real-title rails:

- **Top 10 VISIONE**: deterministic editorial score, explicitly not audience ranking.
- **Recomendados hoje**: deterministic daily rotation from eligible titles.
- **Escolhas da semana**: deterministic weekly rotation.
- **Filmes em destaque**.
- **Séries em destaque**.
- **Ficção científica e fantasia**.
- **Drama**.
- **Crime e thriller**.
- **Animação** when enough qualifying titles exist.

A rail renders only when it has enough actual titles to be useful. Sections do not render placeholder cards to simulate inventory.

A title may appear in genre-specific rails, but the selector applies a homepage appearance budget so the same title does not dominate consecutive editorial sections. Global editorial rails target 12–20 cards each when inventory allows.

Locale pages continue to expose film and series sections, now backed by the full catalogue rather than the seed set.

## Deterministic scoring

Scoring is source-transparent and must not be labeled as real-world popularity unless a source explicitly supplies that meaning.

Series score may use TVmaze rating, TVmaze `weight`, recency, metadata completeness, and artwork presence. Film score may use Wikidata sitelink count captured at discovery time, recency, metadata completeness, and accepted artwork presence.

The UI labels the global ranking as “Curadoria VISIONE” and keeps the disclaimer that it does not represent streaming-platform audience data.

Daily and weekly rotations are deterministic from a date/week seed so a rebuild on the same day produces the same order.

## Search

`data/search-index.json` continues to be generated statically, but it indexes the entire expanded catalogue. Search terms include localized titles, original title, cast, director/creator, and genres.

Search must not depend on TVmaze/Wikidata at browser runtime.

## Title page fallback copy

Newly discovered titles may not have curated ES/PT/BR plot summaries. The renderer therefore provides a short localized factual fallback generated from known structured facts, for example media type, year, genre, creator/director, and season/runtime information.

This fallback must not invent plot details. Curated overview text always wins when present.

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

To prevent self-triggering commit loops, automated catalogue-data commits do not trigger another catalogue-sync run. Source-code changes can still trigger the workflow, and the site-quality workflow remains independent.

## Failure behavior

Upstream failure must never delete working catalogue data.

- TVmaze/WDQS/Commons timeout: keep existing data and continue where safe; fail the job when the integrity of a newly generated catalogue cannot be guaranteed.
- Ambiguous title identity: skip candidate and log the reason.
- Missing artwork: use VISIONE editorial cover.
- Missing localized overview: use factual fallback copy.
- Missing provider availability: remain `unknown`.
- Negative/ambiguous provider evidence: never convert to verified unavailable.

## Testing

All new behavior is developed test-first.

Required coverage includes:

- TVmaze discovery deduplication, bounded windows, ranking, and import limit.
- WDQS discovery query boundaries, QID/IMDb identity, ranking, and import limit.
- Commons license allowlist and rejection of unknown/non-free licenses.
- Editorial-cover fallback when no accepted image exists.
- Merge idempotency and timestamp stability.
- No mutation of provider offers/availability during metadata discovery.
- Deterministic daily/weekly collections.
- Collection minimum-size suppression and homepage appearance budget.
- Removal of hard-coded pending-release cards.
- Search index containing newly imported records and people/genre terms.
- Build/validation across ES/PT/BR.
- Workflow recursion prevention.

## Performance bounds

The static site remains the serving architecture. External APIs are called only during catalogue workflows, never during normal page loads.

Discovery calls are bounded by explicit day windows, page limits, candidate limits, and source rate limits. The first bootstrap may take longer than daily refreshes but must fit comfortably within a 12-minute GitHub Actions job.

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

1. Production catalogue has at least 100 unique titles with at least 60 series and 40 films unless an upstream outage prevents the bootstrap, in which case the deployment must not silently claim success.
2. The four already-integrated TVmaze series retain real artwork.
3. Film cards with approved Commons artwork display it; all other film cards use a professional VISIONE editorial cover instead of a one-letter placeholder.
4. The global homepage contains no hard-coded “Brevemente” inventory placeholders.
5. At least five real-title catalogue rails render from data, with 12+ cards per rail whenever the qualifying inventory supports it.
6. Search covers the complete imported catalogue.
7. Metadata discovery never changes offers or availability status.
8. A second sync with unchanged upstream facts produces no metadata-only commit.
9. Build, validation, and all tests pass before catalogue output is committed.
10. GitHub Pages deploys the resulting `main` commit successfully.
