# VISIONE

VISIONE is a static streaming-discovery site for Spain, Portugal and Brazil, with VISIONE Wire preserved under `/news/`.

## Local build

Requires Node.js 22+ and no npm dependencies.

```bash
node streaming/build.mjs
node streaming/validate.mjs
node --test tests/site.test.mjs tests/streaming.test.mjs
```

The build reads normalized cached data from `streaming/data/` and generates:

- `/es/`, `/pt/`, `/br/` locale landing pages;
- localized movie/series pages;
- `data/search-index.json` for client-side search;
- streaming XML sitemaps.

Ordinary page views do not call a paid entertainment API.

## Data and credentials

The committed seed catalog contains factual metadata only. It does **not** invent current streaming availability or prices. Until a licensed/authorized availability feed is configured, title pages are generated as `noindex,follow` and explain that provider data is pending.

Future provider credentials must be supplied through environment variables or GitHub Actions secrets. Never commit API keys, bearer tokens or commercial credentials.

TMDB, JustWatch or any replacement provider must only be enabled under terms that permit VISIONE's commercial use case, and all required attribution must remain visible in generated pages.

## Repository boundaries

- Preserve existing `/news/...` URLs and editorial quality controls.
- Do not modify `tablet.visione.one`, SDKPOS, Cloudflare Tunnel or tablet-related DNS/infrastructure as part of the streaming product.
- `ads.txt` remains the existing Google publisher declaration; streaming ad placement is gated separately from editorial pages.

## Architecture

The data layer is provider-neutral:

`licensed source -> ingestion/cache -> normalized JSON -> static build -> HTML/JSON -> visitor`

See `docs/superpowers/specs/2026-09-08-visione-streaming-discovery-design.md` for the product specification and `docs/superpowers/plans/2026-09-08-visione-streaming-discovery.md` for the implementation plan.
