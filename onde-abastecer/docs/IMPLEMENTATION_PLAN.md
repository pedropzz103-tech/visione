# Reliability and useful mobile comparison — implementation plan

Goal: preserve and repair the existing Expo/Worker MVP, then deliver independently verifiable P1 features.
Architecture: keep country adapters and existing app; share pure domain types, normalization and economy between Worker/mobile. Keep network, storage and map presentation separate. No production deployment.
Spec: user mission and ROADMAP.md. Execution: inline, autonomous, small commits.

## Task 1 — audit and reproducible checks

- Record PR #23, main/MVP SHAs, workflows, baseline checks and real source probes in AUDIT.md.
- Add AGENTS.md, ROADMAP.md, lockfiles, local test/lint runner. Existing app packages remain independently installable.
- Checks: baseline API/mobile typecheck, Worker dry build, Expo doctor. No baseline unit tests or lint existed.

## Task 2 — trustworthy domain and data

Files: shared/{types,normalization,economy}.ts, api/src/countries/{es,fr,it,registry}.ts, api/src/{index,lib/source}.ts; tests/*.test.ts, tests/fixtures/*.
Interfaces: Station and FuelPrice shared; adapters retain listStations(StationQuery): Promise<Station[]>; calculateSavings returns a discriminated valid/insufficient result.
- Write fixture regressions first: negative/zero ES longitude, malformed coordinates, missing query, FR Latin-1, SP95 vs E10, unavailable fuel, IT service mode/premium ambiguity, invalid dates/prices.
- Run tests and observe the existing defects; implement source parsers and normalization; rerun.
- Savings tests: 40 L at 1.80 vs 1.60 => gross 8; 10 km extra at 6 L/100km at 1.80 => cost 1.08, net 6.92; one-way return doubles distance; along-route uses only incremental distance; missing/mixed currencies/fuels/units/stale/invalid numbers refuse a net claim.
- Source transport: bounded retry/timeout, no raw exception leaks, cached snapshots/coalesced requests, dedup; fixtures drive HTTP success/failure tests.
- Commit only after test suite/typecheck passes.

## Task 3 — mobile P1

Files: mobile/App.tsx, src/{api/client,components/StationMap,lib/*,config/*}, shared/query.ts and tests/client/query tests.
- Write tests for no-config no-demo, malformed payload, error-vs-offline fallback, filters/sorting/clusters, stale timestamps and missing route data.
- Preserve native maps and coloured markers in a component; add web map fallback so web can be inspected. Add manual search, country centring, map/list, filters, details, explicit permission request, request race guards.
- Add local favourites/preferences and bounded cache. Show cached age/offline status; no stale savings claim. PT/EN controls and labels.
- Savings screen uses shared calculation with user-provided extra road distance and basis; no route inferred from straight-line distance.
- Checks: tests, lint, typecheck, Expo doctor and platform exports; record native device limitations. Commit.

## Task 4 — CI, review and delivery

- CI: npm ci, lint, typecheck, fixture tests, Worker dry-run and Expo bundles. Deploy is workflow_dispatch-only and explicitly opted in.
- Update README, audit, source matrix, release instructions and P0/P1 status with actual results and remaining limitations.
- Review complete diff for secrets, scope, licensing, stale/race failures, currencies/units; correct findings with regression tests.
- Push only the new feature branch and prepare a descriptive draft PR against main. Preserve PR #23; do not merge or deploy.

## Review focus

- Unsupported country or missing API configuration never produces simulated real coverage.
- Source errors never silently turn into a successful empty result; offline fallback has matching query and clear age.
- E10/premium/service-mode differences remain visible and never silently normalize octane from marketing labels.
- A request finishing late must not overwrite a newer fuel/country/location search.
- No net savings from straight-line distance, unknown FX or old/missing price timestamps.
