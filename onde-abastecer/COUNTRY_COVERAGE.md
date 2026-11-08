# Country coverage and source evidence

Verified on 2026-11-07. **Implemented**, **successful source probe**, **deployed API** and **device QA** are separate gates. This branch has not been deployed. A country in the selector is not proof of coverage. Counts below are observations in chosen radii, not national totals or promises of current availability.

| Country | Official source | Reuse / attribution evidence | Publication cadence | Integration / actual status |
|---|---|---|---|---|
| ES | [Ministerio REST / Geoportal](https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/) | [MITECO reuse notice](https://www.miteco.gob.es/es/atencion-al-ciudadano/aviso-legal.html): attribution, retain update/reuse metadata, no implied endorsement; third-party rights excluded. Review any more specific dataset conditions before commercial release. | Official payload says the feed refreshes every half-hour. `Fecha` is publication of dataset, **not station-level price change time**. No real-time guarantee. | Enabled. Successful adapter probe at 11:20:08Z: 150 stations within 30 km of Vigo. Cold download ~31s here; earlier shorter timeouts failed. Supports published E5/E10 separately, 98 E5, diesel/premium and LPG where supplied. |
| FR | [Government instantane ZIP/XML](https://donnees.roulez-eco.fr/opendata/instantane) | [Official open-data notice](https://www.prix-carburants.gouv.fr/rubrique/opendata/) states Licence Ouverte / Open Licence; [Etalab 2.0](https://github.com/etalab/licence-ouverte/blob/master/LO.md). Attribute producer and update date; do not imply endorsement. | Official page states feed refresh <10 minutes. Individual prices may be days old; app shows their dates. | Enabled. Successful adapter probe at 11:20:13Z: 395 diesel stations within 20 km of Paris. XML encoding preserved. SP95 and E10 are distinct products. |
| PT | [DGEG official portal](https://precoscombustiveis.dgeg.gov.pt/) / public `api/PrecoComb/PesquisarPostos` | **Specific review performed:** homepage notice says information is free and may be freely used; reuse must identify DGEG, indicate last-price-update date/time, reproduce faithfully. Retain exact source product label and price publication time. This is the notice's permission, not an inferred CC licence or a guarantee of API SLA. Generic copyright footer does not override the quoted data reuse notice. Recheck notice/terms before commercial release. | No contractual update frequency verified; prices are operator-submitted and carry `DataAtualizacao`. | Enabled for simple 95, 98, simple/special diesel, LPG. Fuel IDs checked against official `GetTiposCombustiveis`. Public JS confirms `qtdPorPagina`/`pagina`. Full 95 export returned 3,037/3,037 rows; pages 1/2 with size 2 returned distinct IDs. Successful Lisbon adapter probe at 11:20:15Z: 387 within 30 km. Responses >5,000 or incomplete fail closed. E10 blend not inferred. |
| IT | [MIMIT dataset](https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti) | Dataset page unavailable during audit. Current dataset-specific reuse conditions **not verified**; do not monetize or enable based on historical claims. | Historical adapter expects daily registry + prices-at-08:00 files; current cadence unverified. | Adapter retained and fixture-tested, **disabled/unverified**. Page and both historical CSV downloads returned HTTP 503. Self/attended mode retained; marketing labels do not imply 98 octane. |
| DE | [Bundeskartellamt MTS-K](https://www.bundeskartellamt.de/) | Provider authorization, contract and attribution require verification. | Unverified. | Approval required. No connector or verified price coverage. |
| AT | [E-Control / Spritpreisrechner](https://www.spritpreisrechner.at/) | API access terms, reuse, quotas and commercial rights unverified. | Unverified. | Planned. No connector or verified price coverage. |
| GB | [Fuel Finder collection](https://www.gov.uk/government/collections/fuel-finder) | Registration, access contract, licensing and API version must be checked. | Unverified. | Planned. No connector or verified price coverage. GBP is a supported type, not evidence of UK data. |
| GR | [Fuel Prices Observatory](https://www.fuelprices.gr/) | Licence and machine-access terms unverified. | Unverified. | Planned. No connector or verified price coverage. |
| SI | [Goriva.si](https://www.goriva.si/) | Official dataset ownership/licence/API terms unverified. | Unverified. | Planned. No connector or verified price coverage. |

Probe command (opt-in live network, not part of fixture CI): `npm run smoke:sources` from this directory. In an environment with a network proxy, Node 24 may need `NODE_USE_ENV_PROXY=1`. Source status can change; failures cause a nonzero exit.

## Preserved source notices

DGEG homepage, read 2026-11-07:

> A informação disponível neste sítio é gratuita, podendo ser utilizada livremente. A reutilização desta informação deverá assegurar a adequada identificação da Direção-Geral de Energia e Geologia enquanto fonte dos dados, bem como a indicação da data-hora da última atualização dos preços e a reprodução fiel de toda a informação.

France open-data page, same date:

> [...] sont fournies sous la "Licence ouverte / Open licence".

These excerpts record what was read; they are not legal advice or a substitute for checking current terms. No signed licence agreement or guaranteed service level is claimed.

## Map and geocoding sources

- Android (2026-11-08): bundled Leaflet in native WebView with OSM tiles and attribution; no Google key required. iOS retains react-native-maps/platform services. Native device behaviour must still be tested; see docs/ANDROID_APK.md.
- Web: Leaflet BSD-2-Clause, adapted CSS licence retained in mobile source. Standard OpenStreetMap tiles with visible attribution. [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/): no bulk/offline tile downloads, retain attribution, respect caching and usage limits; no SLA. This is a development/default provider, not unlimited global production capacity. Production volume needs a suitable permitted provider within budget.
- Address/city geocoding: operating system via expo-location on Android/iOS. Android requires foreground location permission for its geocoder. Coordinates remain usable without GPS. Browser build offers manual coordinates, not an undocumented public geocoding API.

## Global expansion gate

Add a source only after verifying provenance, permitted use (including commercial intent), access/credentials at no charge, units/currency/timestamps, sample records and failure behaviour. Add deterministic fixtures and a dated source probe. No country outside the table currently has verified coverage. Grocery, EV and future categories have no published dataset or availability claims.
