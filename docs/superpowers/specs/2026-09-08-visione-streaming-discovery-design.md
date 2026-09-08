# VISIONE Streaming Discovery Design

## Goal

Transform `visione.one` from a technology-news homepage into a fast, search-first streaming discovery product that helps users in Spain, Portugal, and Brazil find where a movie or series is legally available to stream, rent, or buy.

The product must preserve the existing `/news` archive and its indexed URLs while making the root domain a streaming-discovery experience. `tablet.visione.one` is explicitly out of scope and must not be touched.

## Product Positioning

The public brand remains **VISIONE**. The product is not positioned as a streaming service and must never imply that VISIONE hosts or plays copyrighted movies or series.

Primary promise by market:

- Spain: `Encuentra dónde ver películas y series.`
- Portugal: `Descobre onde ver filmes e séries.`
- Brazil: `Descubra onde assistir filmes e séries.`

The homepage centers the search interaction rather than editorial news. Users should be able to search by movie, series, actor, or franchise and quickly reach a country-specific title page.

## Initial Markets and URL Model

The initial locale structure is:

- Spain: `/es/`
- Portugal: `/pt/`
- Brazil: `/br/`

Country-specific title URLs use localized search-intent phrasing:

- Spain: `/es/donde-ver/<slug>/`
- Portugal: `/pt/onde-ver/<slug>/`
- Brazil: `/br/onde-assistir/<slug>/`

The root `/` acts as the global VISIONE entry page. It should detect neither IP nor language automatically for indexing purposes. Instead, it presents a visible country selector and stable links to each locale. Locale preference may be remembered client-side after explicit user selection.

## Homepage Experience

The root and locale landing pages use a cinematic dark visual system with strong VISIONE branding, large artwork, high contrast, generous spacing, and a search-first layout.

Homepage hierarchy:

1. VISIONE brand header.
2. Large search field with localized placeholder text.
3. Explicit market selector for Spain, Portugal, and Brazil.
4. `Trending now` title rail.
5. `New on streaming` title rail.
6. `Leaving soon` rail when reliable expiry data exists.
7. `Watch free` rail when free/ad-supported availability data exists.
8. Provider discovery section for services such as Netflix, Prime Video, Disney+, Max, Apple TV, Rakuten TV, and other market-relevant services.
9. Trust/attribution/footer links.

The homepage must remain useful even if live provider data is temporarily unavailable. Cached content and a graceful stale-data notice are preferable to an empty interface.

## Title Page Experience

Each indexable title page should contain meaningful information beyond a copied metadata card.

Required title-page content:

- localized title and original title when different;
- poster and backdrop where licensed/authorized data permits;
- release year and media type;
- runtime or episode/season context when available;
- genres;
- synopsis;
- rating source attribution;
- streaming, rental, and purchase availability for the selected country;
- provider logos/names;
- price when the licensed provider supplies price data;
- `best current option` summary derived from available offers;
- data freshness timestamp;
- cast and director/creator links when available;
- related titles or editorially useful recommendations;
- FAQ/search-intent copy that is generated from structured facts rather than generic filler;
- explicit attribution required by upstream data providers.

If price data is unavailable, the UI must say so rather than inventing or estimating a price.

## Search

Search should be progressively enhanced:

- static HTML remains usable without JavaScript;
- JavaScript provides instant local search over a generated compact index;
- results distinguish movies, series, and people;
- result links resolve to the selected locale;
- no request to a paid external API should be required for every keystroke.

For the first production version, a generated local JSON search index is preferred over a hosted search SaaS.

## Data Architecture

The site uses build-time generation plus cached snapshots. External entertainment-data APIs are ingestion sources, not runtime dependencies for ordinary page views.

Core data pipeline:

1. Fetch metadata and availability from licensed/authorized sources.
2. Normalize them into a provider-neutral VISIONE schema.
3. Store generated JSON snapshots in the repository or build artifacts.
4. Generate localized static HTML pages from those snapshots.
5. Generate search indexes, sitemaps, provider pages, and structured data.
6. Serve the resulting files statically through the current deployment path.

The provider layer must be pluggable. No template should depend directly on one vendor's raw response shape.

The normalized title record should support at least:

```json
{
  "id": "movie:157336",
  "type": "movie",
  "slug": "interstellar",
  "titles": {
    "es": "Interstellar",
    "pt": "Interstellar",
    "br": "Interestelar"
  },
  "year": 2014,
  "overview": {},
  "genres": [],
  "poster": null,
  "backdrop": null,
  "credits": {},
  "offers": {
    "ES": [],
    "PT": [],
    "BR": []
  },
  "updated_at": "ISO-8601"
}
```

## Provider and Licensing Rules

The implementation must not scrape or use undocumented private APIs for commercial production.

TMDB currently exposes movie and TV watch-provider endpoints backed by JustWatch data, and its documentation requires JustWatch attribution for those results. TMDB also states that its developer API is free for non-commercial use, while commercial projects require contacting its sales team for a commercial arrangement. Therefore:

- the codebase may support a TMDB adapter;
- production monetization must use data under terms that permit the commercial VISIONE use case;
- JustWatch attribution must be shown wherever required by the selected data source;
- API keys/tokens must never be committed to the repository;
- the site must remain operable with seeded/cached data while commercial credentials are not configured.

The architecture must make it possible to replace TMDB/JustWatch-backed availability with another licensed provider without rewriting templates.

## Cache and Request Economics

API requests happen during ingestion/builds rather than on every page view.

Rules:

- metadata and availability are cached in normalized snapshots;
- freshness policy is configurable by data type;
- availability should normally refresh at most once per title/market per configured freshness window;
- a failed refresh may use the last known good snapshot with a visible freshness timestamp;
- ordinary visitor traffic must not scale external API usage linearly.

This preserves the business model in which a single cached availability fetch can support many page views and ad impressions.

## SEO Architecture

The site is designed around useful programmatic SEO, not mass publication of thin pages.

Indexable page families may include:

- localized title pages;
- provider catalog pages;
- genre pages;
- actor/director pages when enough unique supporting content exists;
- franchise/collection pages;
- `new on <provider>` pages;
- `leaving soon` pages only where expiry data is reliable;
- `watch free` pages where the offer data can prove free/ad-supported availability.

Indexing quality gate:

A page receives `index,follow` only when it contains enough structured and unique value. A title page should normally require at least the title identity, synopsis/metadata, current-country availability or an explicitly useful `not currently available` state, freshness information, and supporting contextual content. Incomplete generated pages use `noindex,follow` and stay out of XML sitemaps.

SEO requirements:

- self-referencing canonical URLs;
- locale-specific `hreflang` where equivalent pages exist;
- unique localized `<title>` and meta description;
- JSON-LD using appropriate `Movie`, `TVSeries`, `Person`, `BreadcrumbList`, and `FAQPage` only when the visible content supports the markup;
- HTML-first content accessible to crawlers without requiring client-side rendering;
- XML sitemap indexes split by locale/page family if scale requires it;
- image alt text based on factual titles rather than keyword stuffing;
- no doorway pages that differ only by replacing a country/provider name.

## Existing News Preservation

The existing `/news` content remains available at its current URLs. Existing indexed news URLs must not be mass-deleted or redirected to unrelated streaming pages.

The main navigation may link to the archive as `Wire` or `News`, but streaming discovery becomes the primary root-domain product.

Existing news sitemaps may remain separate from the new streaming sitemaps. The root sitemap index should include both valid editorial and streaming sitemap families.

Old institutional/project pages that are unrelated to the streaming product should be reviewed individually. Pages with no search value may be kept accessible but `noindex`, or redirected only when a genuinely equivalent destination exists.

## Advertising and Monetization

Primary monetization layers:

1. display advertising on eligible content pages;
2. affiliate/deep-link commission where a provider or commerce partner permits it;
3. sponsored provider placements clearly labeled as sponsored;
4. future B2B/API/data products derived only from data VISIONE is licensed to redistribute.

Ads must not overpower the `where to watch` answer. The first useful availability result must appear before intrusive ad density.

Ad code should only be present on templates/pages that satisfy the content-quality gate. `ads.txt` should remain valid for configured advertising partners.

Affiliate/sponsored ordering must never silently override the factual `best option`. Paid placements are visually labeled and kept separate from objective availability ranking.

## Ranking Logic

The `best current option` is deterministic and explainable.

Default order:

1. included with an existing subscription category;
2. free/ad-supported legal option;
3. rental sorted by price when comparable price data exists;
4. purchase sorted by price when comparable price data exists.

If the system does not know the user's subscriptions, it must not claim that a subscription option is personally cheapest. It can say `Included with subscription` or `Lowest listed rental price` instead.

## Reliability and Failure States

The site must fail softly.

- If availability is stale, show the last-updated date.
- If no provider is returned, say the title is not currently found on supported services in that country.
- If metadata exists but provider data is unavailable because ingestion failed, do not claim there are no services; show a temporary-data-unavailable state.
- If an image is missing, use a branded fallback rather than broken artwork.
- Build scripts fail loudly for invalid schema, duplicate canonical URLs, missing required attribution, or sitemap entries pointing to `noindex` pages.

## Privacy

The first version requires no user account.

Country preference may be stored locally in the browser. Search analytics and advertising consent must respect applicable consent requirements for users in Spain/Portugal and other covered jurisdictions.

No viewing-history profile should be created unless a future feature explicitly obtains the appropriate consent and provides clear controls.

## Technical Shape

The existing repository is a static-site codebase. The pivot should keep static delivery and add a small build system rather than introduce a full server framework without a demonstrated need.

Preferred implementation shape:

- HTML/CSS/vanilla JavaScript for the frontend;
- Node.js build scripts for ingestion, normalization, page generation, sitemap generation, and validation;
- JSON data snapshots generated at build time;
- GitHub Actions for scheduled refresh/build once provider credentials are available;
- environment secrets for API credentials;
- no runtime database for the first production version.

This keeps hosting cost low, pages fast, and external API traffic bounded by the ingestion schedule rather than visitor traffic.

## Visual System

The new design is dark, cinematic, and premium without resembling an illegal streaming portal.

Visual principles:

- preserve the recognizable VISIONE logo/wordmark;
- near-black surfaces with restrained neutral accents;
- large poster imagery and cinematic backdrops where licensed;
- rounded cards used sparingly;
- provider badges are clean utility elements, not fake playback buttons;
- search is the dominant action;
- mobile layout is first-class;
- typography prioritizes clarity and fast scanning over decorative editorial styling.

The interface must avoid play-button patterns that could imply the film is hosted directly by VISIONE.

## MVP Scope

The first deployable streaming version includes:

- redesigned global root page;
- localized landing pages for ES/PT/BR;
- working client-side search over a generated seed catalog;
- provider-neutral normalized data schema;
- title page generator;
- at least a small representative set of real title pages from licensed or manually seeded factual data;
- provider pages for the major services represented in the seed data;
- locale-specific metadata, canonicals, hreflang, JSON-LD, robots rules, and streaming sitemaps;
- attribution/credits page;
- preservation of `/news` and existing editorial URLs;
- validation tests for generated HTML, canonical uniqueness, noindex/sitemap consistency, and required attribution;
- ad eligibility controlled by the quality gate rather than automatically injected everywhere.

The MVP does not require accounts, personalized subscription tracking, payments, a runtime database, or a proprietary recommendation model.

## Expansion After MVP

After the structure proves indexable and Search Console shows useful query impressions, expansion can add:

- thousands of title pages;
- richer actor/director/franchise pages;
- price history when licensed price feeds exist;
- availability-change alerts;
- `leaving soon` feeds where expiry data is reliable;
- affiliate deep links;
- personalization based on user-selected subscriptions;
- commercial API/data products if licensing permits redistribution.

## Acceptance Criteria

The pivot is considered successful when:

1. `/` presents VISIONE as a streaming-discovery product, not a technology-news homepage.
2. `/es/`, `/pt/`, and `/br/` are usable localized discovery pages.
3. Search works without calling an external API per visitor query.
4. Representative movie/series pages render provider availability from the normalized schema.
5. Indexable title pages include country-specific useful content, canonical URLs, hreflang, structured data, and freshness information.
6. Thin/incomplete pages are automatically `noindex` and excluded from streaming sitemaps.
7. `/news/...` URLs remain accessible and are not redirected to unrelated content.
8. `tablet.visione.one` is untouched.
9. No API secret is committed to GitHub.
10. Upstream attribution rules are represented in both the data pipeline and visible site credits.
11. Static build validation catches duplicate canonicals, invalid schema, noindex pages in sitemaps, and missing required attribution.
12. The site can be served as static files with no runtime database.
