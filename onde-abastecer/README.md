# Onde Abastecer · VISIONE

Incremental continuation of [PR #23](https://github.com/pedropzz103-tech/visione/pull/23): Expo/React Native app and Cloudflare Worker, with shared TypeScript comparison logic. Real published prices only; no demo fallback, required accounts, paid service or OpenAI API.

**Enabled, source-probed adapters:** Spain, France, Portugal. **Italy is disabled/unverified** after HTTP 503 during this audit. DE/AT/GB/GR/SI are unavailable/planned or require authorization. See [COUNTRY_COVERAGE.md](COUNTRY_COVERAGE.md) for precise source, reuse and verification evidence. No production deployment or Android/iOS store publication was performed.

Delivery report in Portuguese: [RELATORIO_ENTREGA.md](RELATORIO_ENTREGA.md).

APK Android de teste gerado em 08/11/2026: veja [ANDROID_APK.md](docs/ANDROID_APK.md) para instalação, checksum, configuração da API e build local.

## Setup and run

Requirements: Node **22.13+** (Node 24 recommended for proxy environments), npm, and a device/emulator for native QA. Run from the repository root:

```bash
cd onde-abastecer
npm ci
npm run install:apps
```

Terminal 1, normal Cloudflare development runtime:

```bash
cd onde-abastecer/api
npm run dev -- --port 8787
```

Terminal 2:

```bash
cd onde-abastecer/mobile
cp .env.example .env
npm start
```

Use the displayed Expo instructions for Android/iOS. The example URL is `http://127.0.0.1:8787`; on a physical phone, set `EXPO_PUBLIC_API_URL` to your development machine's reachable LAN IP and bind the API to that interface (`npm run dev -- --ip 0.0.0.0 --port 8787`). Use a trusted development network. Android emulator usually reaches the host at `http://10.0.2.2:8787`. Restart Expo after changing public environment values.

Browser: `npm run web` from `mobile`. Native address search uses the operating system geocoder; browser search currently accepts `latitude, longitude` (decimal points, e.g. `42.2406, -8.7207`). Select the country explicitly. GPS permission is requested only after pressing “Minha localização”, or Android's address search, which requires that permission for its system geocoder. Denial preserves manual coordinates.

### Proxy / local workerd DNS fallback

In this workspace, `workerd` cannot resolve upstream DNS although Node can read sources through the configured proxy. This is an explicit local-runtime limitation, not evidence of successful Worker deployment. Reuse the exact same handlers/adapters with the **development-only** Node server:

```bash
# Terminal 1, repository root:
cd onde-abastecer
NODE_USE_ENV_PROXY=1 npm run dev:api
# http://127.0.0.1:8788 ; omit NODE_USE_ENV_PROXY if no proxy is needed

# Terminal 2, repository root:
cd onde-abastecer/mobile
EXPO_PUBLIC_API_URL=http://127.0.0.1:8788 npm run web -- --port 8082
```

`NODE_USE_ENV_PROXY` requires a Node version that supports it (verified here on 24.22.1). For a physical phone, the development server also supports `HOST=0.0.0.0 PORT=8788`. This Node fallback does not provide the Cloudflare rate-limit binding and must not be deployed as a production server.

## Use

- Choose a country and fuel; E10 is distinct from 95 E5/blend-not-supplied.
- Search manually, use GPS, or pan and press “Buscar nesta área”. Switching country recentres its search area; unintegrated countries display a coverage error.
- Map markers show real prices/currency per litre, or cluster counts when zoomed out. Colours are relative to the current search; equal prices are neutral. On smaller screens switch between map and list; larger screens show both.
- Filter by price/radius/brand/favourites. 24h automatic service and service filters appear only when the source supplies those fields. No inferred “open now” filter.
- List sorts by price or straight-line proximity. Distances are labelled and are not road distances. Station details show source link, price/feed publication, age, source product label and known hours/service mode.
- Save a reference station, then open a candidate. Choose litres or tank capacity/remaining percentage, consumption, and **known additional road distance**. Dedicated return-trip mode doubles the one-way road distance; on-route mode uses the actual incremental distance entered. Selecting another candidate clears the distance.
- Savings exclude tolls/time and require comparable currency/unit/fuel/service mode plus a known recent publication (72h threshold). No positive-net claim from proximity alone; offline or insufficient data yields an explicit refusal. No FX rate provider is configured, so mixed currencies are refused. ES/PT references can be compared across country changes with these same constraints; routes are not computed.
- Favourites, vehicle preferences and the last exact search are local. The last-search cache is bounded (1,000 stations, 7 days), always labelled offline when used, and does not change source dates. Use the vehicle panel to erase local data.
- PT/EN interface and accessible labels/44px controls. Operating system maps/OSM attribution remains visible. Shared navigation uses a system map URL; the app handles an unavailable map app.

## Reproduce checks

From `onde-abastecer` after setup:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
npm audit --prefix api
npm audit --prefix mobile
```

Run Expo Doctor from its project directory for unambiguous project detection:

```bash
cd mobile
npx expo-doctor@1.21.6
```

On Linux with Chromium already installed:

```bash
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

`npm run build` performs a **Worker dry bundle** and **Expo web/Android/iOS JS/Hermes exports**. It neither deploys nor creates signed APK/AAB/IPA packages. Tests use explicitly synthetic HTTP fixtures only, never data served by the app. Playwright intercepts API responses only in its own test browser; normal app code has no fixture mode.

Optional live source probe (network dependent, deliberately separate from fixture CI):

```bash
npm run smoke:sources
# Proxy environment on supported Node:
NODE_USE_ENV_PROXY=1 npm run smoke:sources
```

The probe reports count, source, time and failures and exits nonzero if an enabled source fails. It does not claim a production SLA. See [AUDIT.md](AUDIT.md) for recorded results and known limitations.

## API

- `GET /health`
- `GET /v1/countries` — integration state, source, terms, last verification.
- `GET /v1/categories` — fuel enabled, future categories planned.
- `GET /v1/stations?country=ES&lat=42.2406&lng=-8.7207&radiusKm=30&fuel=gasoline95`
- `GET /v1/stations?country=FR&lat=48.8566&lng=2.3522&radiusKm=20&fuel=diesel`
- `GET /v1/stations?country=PT&lat=38.7223&lng=-9.1393&radiusKm=30&fuel=gasoline95`

Required valid coordinates; radius 1–100 km; only registered fuels. 400 invalid query, 405 method, 429 throttled, 501 country not enabled, 502 source unavailable. Empty successful results mean no matching published prices, not inferred national coverage. `retrievedAt` is API response time; price `updatedAt` is normalized UTC source publication. Original `reportedAt` and `timestampKind` retain source semantics.

## CI and publication

The two scoped GitHub Actions workflows install locked dependencies, run lint/typecheck/fixtures/security checks, and export the possible bundles; mobile CI runs browser flows. No deployment on push/PR. Production Worker deployment is gated by explicit manual `workflow_dispatch`, `deploy=true`, `main` and the `onde-abastecer-production` environment. Configure environment reviewers before enabling it. Cloudflare credentials, if ever authorized, belong only in GitHub secrets. Never place secrets in `EXPO_PUBLIC_*` values.

No production publication is authorized by this branch. Before release:

1. Profile upstream parsing against the actual free Worker CPU/memory and traffic limits; ES cold download was ~31s here. See [ARCHITECTURE.md](docs/ARCHITECTURE.md). Do not enable paid overages.
2. Recheck licences, quotas, map provider/OSM tile rules and source reachability from deployment region.
3. Validate on real Android and iOS devices: map rendering, safe areas, permission denial/allow, address search, navigation, share, offline, accessibility and slow network. No Android SDK/emulator or macOS/Xcode was available here.
4. Android now uses bundled Leaflet in a native WebView with OSM tiles/attribution and no Google key; iOS retains its native map. Review provider policies and validate on actual devices. The test APK is documented separately; bundle/build success does not certify native runtime behaviour.
5. Use local native tooling only when available: `npx expo prebuild --platform android` then Gradle from the generated Android directory; iOS requires macOS/Xcode. Prebuild generates ignored native directories and may require additional SDK setup. Do not purchase EAS/store subscriptions or publish without approval. Distribution accounts/fees are not included in the current zero-cost development setup.

## Cost and scope

Current session incurred no purchased service/subscription/API or store fee. No production infrastructure was provisioned. Runtime use must remain within current provider free limits; unlimited global traffic is not claimed. GitHub public-repo CI, local storage, system geocoding and permitted public feeds are used; upstream availability and map policies still apply. Expo fingerprint and lint-tool transitive `glob`/`minimatch` overrides pin patched versions; revalidate Expo Doctor and exports when changing them.

History, alerts, live routing/FX and grocery/EV data are not implemented; interfaces and a free-budget approach are documented, not advertised as working features. Monetization remains a proposal, with organic ranking separate from any future sponsorship. See [ROADMAP.md](ROADMAP.md), [architecture](docs/ARCHITECTURE.md), [plan](docs/IMPLEMENTATION_PLAN.md) and root [AGENTS.md](../AGENTS.md).
