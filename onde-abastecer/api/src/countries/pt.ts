import { distanceKm } from '../lib/geo';
import { fetchSource, snapshotCache } from '../lib/source';
import { decimal, deduplicate, sourceTimestamp, validCoordinates } from '../../../shared/normalization';
import type { CountryAdapter, FuelType, Station } from '../types';
const ENDPOINT = 'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/PesquisarPostos';
const SOURCE = 'DGEG · Preços dos combustíveis';
const FUEL_IDS: Partial<Record<FuelType, number>> = { gasoline95: 3201, gasoline98: 3400, diesel: 2101, dieselPremium: 2105, lpg: 1120 };
interface Payload { status: boolean; resultado: Array<Record<string, unknown>> }
export function parsePortugal(payload: Payload, fuel: FuelType): Station[] {
  if (payload.status !== true || !Array.isArray(payload.resultado)) throw new Error('invalid_source_schema');
  return deduplicate(payload.resultado.flatMap((raw): Station[] => {
    const latitude = decimal(raw.Latitude), longitude = decimal(raw.Longitude);
    const price = decimal(String(raw.Preco ?? '').replace(/\s*€\s*$/, ''));
    if (latitude == null || longitude == null || !validCoordinates(latitude, longitude) || price == null || price <= 0 || raw.Id == null) return [];
    const updatedAt = sourceTimestamp(raw.DataAtualizacao, 'Europe/Lisbon');
    return [{ id: String(raw.Id), country: 'PT', name: String(raw.Nome ?? 'Posto'), brand: String(raw.Marca ?? '') || undefined, address: [raw.Morada, raw.CodPostal, raw.Localidade, raw.Municipio].filter(Boolean).join(', '), latitude, longitude, prices: [{ fuel, label: String(raw.Combustivel ?? ''), price, currency: 'EUR', unit: 'L', updatedAt, reportedAt: String(raw.DataAtualizacao ?? ''), timestampKind: 'price' }], source: SOURCE, sourceUrl: 'https://precoscombustiveis.dgeg.gov.pt/', sourceUpdatedAt: updatedAt }];
  }));
}
const snapshots = new Map<FuelType, () => Promise<Station[]>>();
async function load(fuel: FuelType): Promise<Station[]> {
  const id = FUEL_IDS[fuel];
  if (!id) return [];
  // Same bulk export parameters used by DGEG's public export button, bounded to 5000.
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({ idsTiposComb: String(id), qtdPorPagina: '5000', pagina: '1' }).toString();
  const payload = await (await fetchSource(url.toString())).json() as Payload;
  if (!Array.isArray(payload.resultado) || payload.status !== true) throw new Error('invalid_source_schema');
  const total = Number(payload.resultado[0]?.Quantidade ?? 0);
  if (!Number.isInteger(total) || total < 0 || total > 5000 || payload.resultado.length !== total) throw new Error('source_incomplete');
  return parsePortugal(payload, fuel);
}
export const portugalAdapter: CountryAdapter = {
  code: 'PT', status: 'live', sourceName: SOURCE, sourceUrl: 'https://precoscombustiveis.dgeg.gov.pt/',
  licence: 'DGEG reuse notice: attribution, last update and faithful reproduction', termsUrl: 'https://precoscombustiveis.dgeg.gov.pt/', lastVerifiedAt: '2026-11-07T11:20:15Z',
  async listStations(query) {
    if (!snapshots.has(query.fuel)) snapshots.set(query.fuel, snapshotCache(() => load(query.fuel), 900000));
    return (await snapshots.get(query.fuel)!()).filter(s => distanceKm(query, s) <= query.radiusKm);
  }
};
