# Audit and execution ledger — 2026-11-07

## Repository evidence

- Public repo: https://github.com/pedropzz103-tech/visione. Default main observed `f94538f8a6be61217fbb277772d6eb1a1adc92dd`.
- PR #23: open, draft, mergeable at inspection; head `feature/onde-abastecer-mvp` at `e5aadaf5f901bc187af08814f73dbbb8b05966c8`. 34 historical commits, 24 added files, 1567 lines. Historical API/mobile/site runs reported success on that head.
- No `feature/onde-abastecer` branch returned by branch inspection. No AGENTS.md, package locks, lint or unit/integration tests in the fuel module.
- Current main is a multi-product/static VISIONE repo and does not contain Onde Abastecer. Imported MVP using a merge on a new branch from current main: historical code and all unrelated main work preserved.
- Reused: Expo 57, RN 0.86.3, React 19.2.3, native maps, location/navigation flow, country registry, ES JSON, FR ZIP/XML, IT CSV adapters, relative pricing and existing workflows.

## Baseline commands/results

Environment: Linux, Node 24.22.1, npm 11.9.0. Installed existing API and mobile dependencies successfully with `npm install --ignore-scripts` (49 / 474 packages). Generated locks.

- API `npm run typecheck`: PASS.
- API `npm exec wrangler deploy -- --dry-run --outdir /workspace/scratch/onde-api-baseline`: PASS; 176.49 KiB, no bindings, no deployment.
- Mobile `npm run typecheck`: PASS.
- `npm exec expo-doctor@latest`: 19/21 checks pass; two remote checks fail (Expo schema connection refused; React Native Directory unexpected response). No claim of native device validation.
- No baseline lint, test or mobile build scripts existed. Added checks will be reported separately.

## Defects found by tracing code

P0: ES shares a positive-only decimal parser between prices and coordinates, dropping most western stations. Missing lat/lng becomes Number(null)=0. Latitude/longitude range and methods are not validated. Missing API URL silently activates hardcoded demo prices. FR XML is ISO-8859-1 but is decoded as UTF-8; E10 is silently merged with SP95 and cheaper prices hide compatibility. IT premium marketing names imply octane incorrectly and self/served distinctions disappear. Raw upstream errors are returned publicly. No timeout, snapshot dedup, fixture tests, offline signalling or request race control. Equal prices rank as expensive. Old workflow can deploy on push.

P1: map exists but no list/search/manual coordinates/clusters/preferences/favourites/accessible control roles; timestamp/unit missing in detail; location requested at launch; savings function is not connected to UI and trusts unvalidated detour/currency assumptions.

## Independent source probes (not CI fixtures)

At approximately 10:39–10:41 UTC:
- ES official REST: HTTP 200, 12,202,256 bytes, 11,477 rows; `Fecha=07/11/2026 11:39:46` (source local time). Negative longitudes confirmed in real rows.
- FR official instantane ZIP: HTTP 200, 981,541 bytes; contains ISO-8859-1 XML, decimal EUR/L values and source-local timestamps. Official open-data page explicitly says Open Licence and <10-minute feed refresh; station price ages vary.
- IT dataset page and both historical direct CSV URLs: HTTP 503. Adapter implementation is not evidence of current coverage.
- PT homepage: HTTP 200. Explicit notice permits free reuse with DGEG attribution, last-price-update datetime and faithful reproduction; generic copyright footer must not be mistaken for the specific data notice. Search endpoint HTTP 200 with coordinates/currency/update fields. Initial pagination parameters returned 50 rows despite requested 10: needs exact client parameter verification before enabling.
- ES initial notice URL redirected to a 404 page despite HTTP 200; corrected official notice URL retrieved and requires attribution, no implied endorsement and metadata preservation.

## Execution decisions

- Preserve independent app package installs; add a small check runner under onde-abastecer rather than restructure VISIONE.
- No deployment/merge. New feature branch and draft PR only; PR #23 retained.
- Source outages are explicit and do not trigger fabricated data. Implemented adapters and source probes are reported separately from deployment and native QA.
- Additional categories remain unavailable until permitted datasets exist. No paid service or required OpenAI API.

Further test results, review and remaining blockers are appended as work progresses.

## Final local verification and review

- Lint and both API/mobile typechecks: PASS.
- `npm test`: **42/42 PASS**, no skipped tests. Coverage includes official-format synthetic fixtures (ES/FR/IT/PT), active outages/closed stations/restricted sales, explicit source errors, signed/ranged coordinates, metadata/date validation, neutral ties, currency/unit/vehicle/route savings, bounded retries/cache coalescing, configuration failure, offline matching, request cancellation and deletion/write ordering.
- Chromium browser tests: **9/9 PASS**. Map/list/details, favourite persistence, filters, exact coordinate query, delayed fuel response, unsupported country, offline reload, successful browser GPS, map-area search superseding GPS, deletion during search and PT/EN product labels.
- Worker dry bundle and Expo web/Android/iOS JS/Hermes exports: PASS. These are not signed native app packages or production resource-budget tests.
- Expo Doctor 1.21.6: **21/21 PASS** with Node proxy support; earlier remote-check failures are retained above.
- Production and development dependency audits are recorded separately. API/mobile full audits: 0 known vulnerabilities after patched Expo fingerprint glob/minimatch overrides. Lint tooling initially reported 7 moderate transitive minimatch advisories; a scoped patched override was applied and rechecked. No high/critical advisory was ignored.
- Targeted secret-pattern scan of changed files: no matching private keys/GitHub/OpenAI/AWS tokens. `git diff --check`: PASS. This is a scoped scan, not proof that all historical VISIONE commits are secret-free.
- Source smoke after parser corrections, 2026-11-07: ES at 11:20:08Z = 150 stations/30 km Vigo, 31.045s; FR at 11:20:13Z = 395 diesel stations/20 km Paris, 4.177s; PT at 11:20:15Z = 387 stations/30 km Lisbon, 2.528s. All returned positive litre prices. These are observed query results, not national coverage totals or guaranteed future availability.
- Live browser opened the real Spanish query (150 stations), map/list/detail and a 390px viewport without page errors using the Node fallback. Real Node handler HTTP requests for FR/PT also returned 200 (395/387); no fixture mode exists in app code.
- Local workerd run: all real source queries failed 502; diagnostic runtime log reports DNS lookup failure in the network-proxy environment. This is an explicit failed integration check. Node reading the same sources through the proxy succeeds. No Worker deployment was attempted.

### Independent review and fix pass

Read-only reviewer inspected head `8155a6f` and ran all then-existing 34 tests. It found five Important issues: source-level ES errors becoming empty successes; inferred automatic service from 24h opening; pending location overwriting map-area search; browser reverse geocoding rejecting valid GPS; deletion/cache write races. Each was reproduced with a failing test and fixed; the suite grew to 42 tests plus 9 browser scenarios. Impossible ISO calendar dates and unsafe optional rendering metadata were raised from Minor to Important because they affect price trust/app stability and also fixed with regressions. No second independent review is claimed; the fix pass was validated by the complete automated suites.

Decisions: retain selected country when reverse geocoding supplies no country, with notice; preserve unknown service mode instead of inferring automation; serialize/fence local writes and deletion; reject mixed-currency savings until an actual FX source exists; retain original source times and mark ES feed-publication semantics. Cost if these assumptions need changing: local UI/adapters can change without changing unrelated VISIONE products or introducing paid infrastructure.

### Remaining genuine blockers and next cycle

Actual Android/iOS map/device QA and the real free Worker execution budget remain unverified. ES/FR national parsing must be profiled and may require scheduled spatial snapshots before launch. Italy needs restored source access and current licence evidence. Address lookup on web, routed per-station savings sorting, FX, durable history/alerts and additional categories/countries remain open roadmap items. No requirement is represented as complete merely because its interface exists.

## Android APK follow-up — 2026-11-08

User requested an APK. Installed task-local Android SDK/NDK and Gradle; the image exposed Java compiler modules without javac launchers, so task-local launchers were prepared and verified. Early native attempts failed on missing JAVA_COMPILER capability and disk exhaustion; both are recorded in task logs, and a later assembleRelease succeeded (390 tasks, 6m33s). Immutable target libraries/caches were moved to available temporary memory storage to respect disk capacity. No paid service or production deployment. Artifact, checksum, signature/manifest/bundle checks and runtime limits are recorded in docs/ANDROID_APK.md. APK uses test-only .preview identity, no cloud backup, a keyless OSM Android map and local API configuration with server-isolated cache. Independent review reproduced area-search zoom regression; fixed with a failing-then-passing map test. 45 unit/integration tests and 12 browser tests passed; Expo Doctor 21/21. Actual installation/runtime on a physical Android device remains unverified.
