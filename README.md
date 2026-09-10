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

Ordinary page views do not call a paid entertainment API. The committed discovery pages link to `/data-credits/`, which explains metadata, availability, licensing and attribution rules to users and crawlers.

## Data, freshness and credentials

The committed seed catalog contains factual metadata only. It does **not** invent current streaming availability or prices. Until a licensed/authorized availability feed is configured, title pages are generated as `noindex,follow` and explain that provider data is pending.

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

`licensed source -> ingestion/cache -> normalized JSON -> static build -> HTML/JSON -> visitor`

The editorial inventory sync also keeps the committed streaming navigation/sitemap surface in sync without overwriting the new product root.

See `docs/superpowers/specs/2026-09-08-visione-streaming-discovery-design.md` for the product specification and `docs/superpowers/plans/2026-09-08-visione-streaming-discovery.md` for the implementation plan.
