import { distanceKm } from '../lib/geo';
import { fetchSource, snapshotCache } from '../lib/source';
import { decimal, deduplicate, sourceTimestamp, validCoordinates } from '../../../shared/normalization';
import type { CountryAdapter, FuelPrice, FuelType, Station } from '../types';
export const ES_ENDPOINT = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
const SOURCE = 'Ministerio · Geoportal de gasolineras';
const FUEL_KEYS: Record<FuelType, string> = { gasoline95: 'Precio Gasolina 95 E5', gasoline95e10: 'Precio Gasolina 95 E10', gasoline98: 'Precio Gasolina 98 E5', diesel: 'Precio Gasoleo A', dieselPremium: 'Precio Gasoleo Premium', lpg: 'Precio Gases licuados del petróleo' };
export function parseSpain(payload: { Fecha?: string; ResultadoConsulta?: unknown; Errores?: unknown; ListaEESSPrecio?: Array<Record<string, unknown>> }): Station[] {
  if ((payload.ResultadoConsulta != null && String(payload.ResultadoConsulta).trim().toUpperCase() !== 'OK') || (payload.Errores != null && (!Array.isArray(payload.Errores) || payload.Errores.length > 0))) throw new Error('source_declared_error');
  if (!Array.isArray(payload.ListaEESSPrecio)) throw new Error('invalid_source_schema');
  const sourceUpdatedAt = sourceTimestamp(payload.Fecha, 'Europe/Madrid');
  const stations = deduplicate(payload.ListaEESSPrecio.flatMap((raw): Station[] => {
    if (raw['Tipo Venta'] === 'R') return [];
    const latitude = decimal(raw.Latitud);
    const longitude = decimal(raw['Longitud (WGS84)']);
    if (latitude == null || longitude == null || !validCoordinates(latitude, longitude)) return [];
    const prices: FuelPrice[] = [];
    for (const [fuel, key] of Object.entries(FUEL_KEYS) as [FuelType, string][]) {
      const price = decimal(raw[key]);
      if (price != null && price > 0) prices.push({ fuel, price, currency: 'EUR', unit: 'L', updatedAt: sourceUpdatedAt, reportedAt: payload.Fecha, timestampKind: 'feed' });
    }
    const brand = String(raw['Rótulo'] ?? '').trim() || undefined;
    const openingHours = String(raw.Horario ?? '').trim() || undefined;
    return [{ id: String(raw.IDEESS ?? `${latitude},${longitude}`), country: 'ES', name: brand ?? 'Estación de servicio', brand, address: [raw['Dirección'], raw.Municipio, raw.Provincia].filter(Boolean).join(', '), latitude, longitude, prices, openingHours, source: SOURCE, sourceUrl: ES_ENDPOINT, sourceUpdatedAt }];
  }));
  if (payload.ListaEESSPrecio.some(raw => raw['Tipo Venta'] !== 'R') && stations.length === 0) throw new Error('invalid_source_records');
  return stations;
}
const snapshot = snapshotCache(async () => parseSpain(await (await fetchSource(ES_ENDPOINT, { headers: { accept: 'application/json' } })).json()));
export const spainAdapter: CountryAdapter = {
  code: 'ES', status: 'live', sourceName: SOURCE, sourceUrl: ES_ENDPOINT,
  termsUrl: 'https://www.miteco.gob.es/es/atencion-al-ciudadano/aviso-legal.html', licence: 'Official reuse notice; attribution, metadata and no endorsement', lastVerifiedAt: '2026-11-07T11:20:08Z',
  async listStations(query) { return (await snapshot()).filter(s => distanceKm(query, s) <= query.radiusKm && s.prices.some(p => p.fuel === query.fuel)); }
};
