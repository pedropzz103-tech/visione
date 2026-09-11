# VISIONE Catalog Expansion + Publication Gate Design

## Goal

Turn the current prototype catalogue into a real discovery product while enforcing two product rules requested by the owner: **a public title must always have a cover** and **a public title must have verified provider availability for the market being viewed**.

## Publication model

VISIONE keeps an internal catalogue and a public catalogue.

A normalized title may exist internally with metadata from TVmaze/Wikidata/every.film, but it is eligible for public rendering in a market only when both conditions are true:

1. **Cover gate:** `poster` is a permitted source image, or the renderer can produce a complete VISIONE editorial cover from structured facts. One-letter placeholders are forbidden.
2. **Availability gate:** the market has at least one positive, verified availability offer from the official-evidence pipeline. `unknown`, `error`, an empty offer array, or an unverified candidate does not pass.

The gate is evaluated per market (`ES`, `PT`, `BR`). A title can therefore be public in Spain while remaining hidden from Portugal and Brazil until those markets have verified evidence.

The global `/` homepage may only use titles public in at least one launch market. Locale pages (`/es/`, `/pt/`, `/br/`) only use titles public in their own market.

## Catalogue target

The first expansion aims for at least 100 internally enriched titles, with at least 60 series and 40 films. The public count may initially be lower because cover + availability evidence is mandatory. The site must never pad public inventory with unpublished/internal titles, fake release cards, or empty placeholders.

The daily workflow may add at most 10 new series and 5 new films internally. Public inventory grows only when verification gates pass.

## Metadata sources

### Series

TVmaze remains the primary series metadata and artwork source. New series discovery uses bounded TVmaze schedule/search data only as a discovery signal. It never implies ES/PT/BR availability.

A series imported from TVmaze must have a real TVmaze image to pass the cover gate. If TVmaze has no usable image, the record stays internal until a permitted cover source is available.

### Films

Wikidata/WDQS remain the primary film discovery and factual metadata sources. every.film remains optional enrichment only.

For film artwork, VISIONE first tries Wikimedia Commons through Wikidata `P18`. A Commons image is accepted only when the license metadata is explicitly in the free allowlist: CC0, Public Domain, CC BY 2.0/2.5/3.0/4.0, or CC BY-SA 2.0/2.5/3.0/4.0.

If no permitted source image exists, VISIONE may render a **full editorial cover** from structured facts. This is a designed VISIONE cover containing the localized title, year, media type and genre. It is considered a valid cover because it is complete artwork rather than a placeholder. The site never displays a lone initial.

No TMDB/IMDb poster URL is copied into production without an independently valid commercial/free-use basis.

## Availability evidence

Provider availability remains separate from metadata and artwork.

A positive evidence record must include:

- `slug`
- `market` (`ES`, `PT`, `BR`)
- `provider`
- `monetization` (`subscription`, `free`, `rent`, `buy`)
- official or authorized destination URL
- `verified_at`
- evidence source URL
- expected title identity
- optional price/currency only when explicitly shown by the evidence

An availability candidate is not an offer. Only verified positive evidence may update `offers`, `availability_status`, and `availability_updated_at`.

Negative, ambiguous, blocked, unavailable-to-check, or mismatched evidence never becomes `unavailable`; it remains `unknown` and keeps the title private for that market.

## Availability research strategy

VISIONE may research public official pages and authorized affiliate/feed sources. It must not automate extraction from services whose terms prohibit bots or database-building.

Priority sources are:

1. Approved affiliate networks/data feeds and deep links (Awin, Amazon Associates, Impact, Apple Performance Partners) when available.
2. Official provider title/detail/store pages that are publicly accessible and whose usage does not prohibit the intended verification method.
3. Manually reviewed public evidence queued in `official-availability-evidence.json`.

The system must support affiliate URLs separately from evidence URLs. An offer can keep the official evidence URL for provenance while using an approved affiliate deep link as `affiliate_url`.

## Affiliate handling

Affiliate configuration is provider/market specific and must never be fabricated.

The code supports these states:

- `none`: normal legal provider link, `rel=nofollow`
- `approved`: use tracked deep link, `rel=nofollow sponsored`
- `pending`: retain normal provider link until program approval

Initial target networks:

- SkyShowtime ES/PT via Awin
- Amazon/Prime Video ES and BR via Amazon Associates
- Paramount+ and Disney Streaming/Disney+ via Impact where the publisher account/market is approved
- Apple TV via Apple Services Performance Partners where approved

No commission is claimed in UI or metadata until the relevant program has actually approved VISIONE.

## Presentation

Remove all hard-coded `Brevemente` cards.

The homepage is generated from public eligible titles only. Real-title collections include:

- Top 10 VISIONE
- Recomendados hoje
- Escolhas da semana
- Filmes em destaque
- Séries em destaque
- Sci-fi/fantasy
- Drama
- Crime/thriller
- Animação when enough eligible titles exist

A rail is omitted when inventory is insufficient. The same title may not dominate consecutive editorial rails.

Locale pages and search indexes are market-filtered. Search must never return a title that is private for the active market.

## Internal vs public build

`streaming/data/titles.json` remains the internal normalized catalogue.

The build derives public eligibility at runtime. It does not delete internal records that fail a gate. Generated locale pages, locale search indexes and homepage rails contain only eligible titles.

Individual title pages are generated for a locale only when that title passes the market gate. This prevents thin, unavailable pages from being published merely because metadata exists.

## Idempotency

Metadata refreshes change `updated_at` only when meaningful facts actually change. Availability freshness changes only when positive verified evidence changes or is reconfirmed by the evidence pipeline.

A no-op scheduled run must not create a metadata-only commit.

## Workflow

Scheduled/manual catalogue workflow:

1. Discover bounded TVmaze series candidates.
2. Discover bounded Wikidata film candidates.
3. Enrich known TVmaze/Wikidata/every.film records.
4. Resolve permitted film artwork / editorial-cover eligibility.
5. Ingest verified availability evidence.
6. Apply approved affiliate link configuration without changing evidence provenance.
7. Build public pages from the market publication gate.
8. Validate that every rendered public title has a cover and at least one verified market offer.
9. Run all tests.
10. Commit only meaningful changes.

## Failure rules

- Missing cover: internal only.
- Missing availability: internal only for that market.
- Provider research failure: keep previous verified data, never infer unavailable.
- Ambiguous identity: reject evidence.
- Affiliate program pending/rejected: use non-affiliate official link if a verified availability offer exists.
- Upstream metadata failure: preserve existing catalogue data.

## Acceptance criteria

1. No public title card uses the one-letter fallback.
2. Every public title in `/es/`, `/pt/`, `/br/` has at least one verified positive offer for that market.
3. Search results obey the same market gate.
4. Individual locale title pages are only generated for market-eligible titles.
5. Hard-coded `Brevemente` sections are removed.
6. The internal catalogue expands toward 100+ titles without forcing unverified records public.
7. TVmaze series with permitted images keep their real covers.
8. Films without a permitted source image use a complete VISIONE editorial cover, never a lone initial.
9. Metadata discovery never creates provider offers.
10. Affiliate URLs are used only for approved provider/market configurations and are marked sponsored.
11. Build, validation and tests fail if a rendered public title violates either publication gate.
12. `/news/`, `tablet.visione.one`, SDKPOS, Cloudflare Tunnel and tablet infrastructure remain untouched.
