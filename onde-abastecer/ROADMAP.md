# Onde Abastecer — roadmap

Audit date: 2026-11-07. Owner: VISIONE. Scope: incremental development of PR #23 on current main; no production publication.

## P0 — trustworthy working fuel product

1. Preserve MVP history; document baseline and dependencies with lockfiles.
2. Fix Spanish signed coordinates, required query validation, feed encoding, timestamps, fuel compatibility and unavailable sources.
3. Remove implicit demo fallback. Add timeout, validated responses, clear unsupported/error/stale states and protection against request races.
4. Fixture integration tests, savings/currency/unit tests, lint/typecheck and Worker/mobile bundle checks in CI; deploy only by explicit manual action.
5. Source and licensing evidence, especially Portugal. Distinguish adapter implementation, successful probe, operational deployment and country selector.

## P1 — useful mobile experience

- Map/list, relative price colours, clusters, manual city/address/coordinates search, permission requested only on action, country centres.
- Fuel/brand/price/radius and verified services/24h filters. Price/distance sorting; savings sorting only with adequate comparison inputs.
- Source, publication timestamp, unit/currency, service mode, freshness and navigation/share in station details.
- Editable vehicle/tank/volume and route-vs-return-trip savings with explicit assumptions.
- Local favourites/preferences, bounded offline cache with age warning. PT/EN strings and accessible controls.
- Retry/backoff, source cache, deduplication; no personal-location logs. Runtime rate limit where a free binding is available.
- Source probes for ES/FR/IT and conditional Portugal adapter only if terms and endpoint semantics are verified.

## P2 — expand after launch gates

- DE MTS-K authorization, AT API terms, GB Fuel Finder registration, GR/SI official access; then global source-by-source expansion.
- FX rates from an authorized dated source; until then reject mixed-currency comparisons. ES/PT comparison only when both adapters are verified.
- Road routing provider with lawful free use and realistic budgets; no synthetic routing.
- Permitted price history and local opt-in price alerts. Background push requires separate feasibility review; never promise delivery while app is closed.
- Independent groceries (unit/quantity/brand/location) and EV (connector/kW/tariff/session/kWh, verified availability) modules. Future pharmacy/electronics/home follow the same provenance contract.
- Privacy-preserving opt-in aggregate metrics, Android/iOS device QA and release/signing documentation.

## Business model (future, no tracking implemented)

Acquire users with trustworthy data and retention first. Later: disclosed affiliate links, explicit station partnerships, optional premium convenience features, clearly labelled unobtrusive sponsored placements separated from organic rankings. A partner must never buy a better organic savings calculation. Review each source's commercial terms before monetizing.

## Release gate

Passing automated checks is necessary, not proof of native usability. A release needs Android/iOS device smoke tests, verified production API availability, licence evidence, resource-budget measurements and explicit publication authorization. Source outages and unavailable device tooling remain recorded blockers, not successful tests.

## Delivery status — this branch

| Priority | Result |
|---|---|
| P0 audit / preservation | Complete: MVP history retained, unrelated VISIONE files unchanged; AGENTS, audit and locks added. |
| P0 data trust | Complete for enabled ES/FR/PT adapters: signed coordinates, schema/source errors, distinct E10, timestamps, valid metadata, source failures, exact-query offline signalling. Italy remains disabled. |
| P0 economy and checks | 42 fixture/domain/client tests and 9 browser scenarios passed locally; lint/types, Worker dry bundle and all Expo exports passed; Expo Doctor 21/21. CI status is tracked on the draft PR. |
| P1 mobile | Implemented map/list, clusters, coordinate search, native address search, explicit GPS, applicable filters, price/proximity sorting, details/navigation/share, savings form, local preferences/favourites/cache, PT/EN and accessible controls. |
| P1 deployment readiness | **Blocked:** no actual Android/iOS device QA; no deployed free Worker CPU/memory measurements. Local workerd DNS fails here; same-handler Node development fallback is verified. |
| P1 remaining | Browser city/address geocoder, per-station road routing and savings sorting, durable scheduled country snapshots, complete global language coverage. No road-data basis is invented to fill these gaps. |
| P2 | Other countries/categories, FX feed, permitted history/alerts, advanced border routing and monetization are planned/documented, not implemented coverage. |

The release gate remains open. No production deployment, merge or store publication has occurred.
