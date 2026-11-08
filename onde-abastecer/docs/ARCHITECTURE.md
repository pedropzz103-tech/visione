# Architecture and launch boundaries

The existing Expo app and Workers adapter interface are retained. `shared/` holds the station contract, pure normalization, geographical proximity, filter/cluster logic and savings. API country adapters translate official formats; mobile never knows their raw schemas.

## Trust boundary

A query includes country, exact centre, radius and fuel. Required coordinates/ranges/methods are validated before upstream calls. Source failures return 502; unavailable countries 501; throttled requests 429. No upstream body, secret or exception text is exposed. Adapters preserve product labels, timestamps, currencies, litre units and known service mode. E5/SP95 and E10 are not merged. Italian octane is never inferred from generic premium labels.

`live` in the adapter registry means enabled with a dated successful source probe, not a deployed production API or guaranteed availability. Italy is unverified and disabled. `/v1/categories` reserves category boundaries while groceries/charging/pharmacy/electronics/home remain planned.

## Transport, cache and limits

- Official reads: 45-second timeout for headers and body, one retry on transient HTTP/network failure with bounded jitter, no retry on permanent errors, maximum 25 MiB downloaded payload. French XML entry max 40 MiB before decompression.
- Cache: one coalesced country snapshot per warm Worker isolate for 5 minutes; Portugal one snapshot per fuel for 15 minutes, max six known fuels. Cloudflare upstream cache hints reduce downloads where applicable. This is **not durable persistence** or a globally shared source scheduler; each cold isolate may fetch again.
- Configured free rate-limit binding: approximate 30 station requests per 60 seconds per hashed client IP, enforced per Cloudflare location. It is not an exact global quota; no location/IP history is stored by app code. No custom analytics or app telemetry. Normal provider operational logs remain governed by provider configuration.
- ES cold source read measured ~31 seconds here. Snapshot parsing is substantial, particularly ES/FR; the free Worker CPU/memory budget has not been validated in production. Dry bundle success does not prove budget fitness. A production launch is blocked on profiling and, if needed, a free scheduled ingestion/spatial snapshot design. Do not solve this by enabling paid overages.
- Mobile saves only the last exact-query snapshot (max 1,000 stations, expires after 7 days). Offline is explicit and does not advance source timestamps. Unsupported/malformed/configuration failures do not become success. No offline tiles.
- Favourites are country-qualified IDs (max 200). Preferences and last search remain local and can be erased in the vehicle panel. No accounts, advertising identifiers or server-side personal movement history.

## Savings

Choose a real reference station, then a candidate. Manual litres or tank-capacity/remaining percentage determine volume. The user supplies actual additional road distance: dedicated trip doubles one-way distance; on-route mode uses only incremental distance. Driving fuel is conservatively valued at the reference price. The result excludes time, tolls and other costs; all assumptions are visible. Both prices must have comparable currency/fuel/unit/service mode and a known publication within 72 hours; offline comparison is disabled. ES dates describe feed publication, not station-level price changes, explicitly labelled.

Gallon conversion uses exact US (3.785411784 L) and imperial (4.54609 L) definitions. No live FX service is configured; mixed-currency savings are refused. Cross-border ES/PT comparisons can use a reference from one country and a candidate from the other, but require user-supplied additional road distance; no cross-border route is invented.

## Independent category modules

Do not make fuel depend on future datasets. A future category adapter must expose source/terms/attribution, geographic query, publication time, health state and category-specific offers:

- Groceries: product identity + brand + net quantity + quantity unit + pack count + store location; normalize to comparable quantity without treating unlike products as equivalents.
- EV: location + connector standard + kW + tariff components/currency (kWh, minute, session, idle fee) + separately timestamped verified availability. Unknown availability stays unknown.
- Pharmacy/electronics/home: independent product identity/equivalence rules and applicable source restrictions.

## History and free alerts — design only

Before persistence, check each source permits retention and redistribution. A proposed price-event key is source + country + station + product + service mode + publication time, with integer monetary precision and the original value retained. A free scheduled ingestion job could generate bounded snapshots and permitted history without storing driver locations. This is not enabled or deployed.

For an initial no-server alert, a user explicitly saves a station/product/threshold locally; evaluate only on an app refresh against a fresh verified observation, deduplicate against the previous alerted publication, and show an in-app notice. Closed-app delivery is not guaranteed. Background push/notifications need a separate native feasibility and free-budget check. No alert or history service is advertised as implemented.

Privacy deletion invalidates active network/location operations and serializes cache/pref/favourite writes before erasing keys; late responses cannot recreate the erased cache. Snapshot cache writes are also fenced so an aborted old query cannot overwrite a newer one. Browser/reverse-geocoder failure uses the explicitly selected country with a visible notice, never an invented country identification. Opening 24h alone never establishes automatic service.
