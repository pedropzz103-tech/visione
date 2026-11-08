import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { distanceKm } from '../lib/geo';
import { fetchSource, snapshotCache } from '../lib/source';
import { decimal, deduplicate, sourceTimestamp, validCoordinates } from '../../../shared/normalization';
import type { CountryAdapter, FuelPrice, FuelType, Station } from '../types';
export const FR_ENDPOINT = 'https://donnees.roulez-eco.fr/opendata/instantane';
type Row = Record<string, unknown>;
const SOURCE = 'Prix des carburants · Open Data France';
function array<T>(value: T | T[] | undefined): T[] { return value == null ? [] : Array.isArray(value) ? value : [value]; }
function text(value: unknown): string { return value && typeof value === 'object' ? String((value as Row)['#text'] ?? '').trim() : String(value ?? '').trim(); }
const FUELS: Record<string, FuelType> = { Gazole: 'diesel', SP95: 'gasoline95', E10: 'gasoline95e10', SP98: 'gasoline98', GPLc: 'lpg' };
export function parseFrance(bytes: Uint8Array): Station[] {
  const archive = unzipSync(bytes, { filter: file => file.name.toLowerCase().endsWith('.xml') && file.originalSize <= 40 * 1024 * 1024 });
  const entry = Object.values(archive)[0];
  if (!entry) throw new Error('invalid_source_archive');
  const prefix = new TextDecoder().decode(entry.slice(0, 100));
  const xml = new TextDecoder(/ISO-8859-1/i.test(prefix) ? 'iso-8859-1' : 'utf-8').decode(entry);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', textNodeName: '#text', parseTagValue: false, parseAttributeValue: false, trimValues: true, processEntities: false });
  const parsed = parser.parse(xml);
  if (!parsed.pdv_liste) throw new Error('invalid_source_schema');
  return deduplicate(array(parsed.pdv_liste.pdv as Row | Row[]).flatMap((raw): Station[] => {
    const closure = raw.fermeture as Row | undefined;
    if (closure?.type === 'D') return [];
    const lat = decimal(raw.latitude), lng = decimal(raw.longitude);
    if (lat == null || lng == null) return [];
    const latitude = lat / 100000, longitude = lng / 100000;
    if (!validCoordinates(latitude, longitude) || (latitude === 0 && longitude === 0)) return [];
    const prices: FuelPrice[] = [];
    const disruptions = array(raw.rupture as Row | Row[] | undefined);
    for (const p of array(raw.prix as Row | Row[] | undefined)) {
      const fuel = FUELS[String(p.nom)], price = decimal(p.valeur);
      // A fuel with an unclosed outage must not be advertised as available.
      if (disruptions.some(r => String(r.id) === String(p.id) && !r.fin)) continue;
      if (fuel && price != null && price > 0) prices.push({ fuel, price, currency: 'EUR', unit: 'L', updatedAt: sourceTimestamp(p.maj, 'Europe/Paris'), reportedAt: text(p.maj), timestampKind: 'price' });
    }
    const city = text(raw.ville);
    const hours = raw.horaires as Row | undefined;
    const services = raw.services as Row | undefined;
    return [{ id: String(raw.id ?? `${latitude},${longitude}`), country: 'FR', name: city ? `Station-service · ${city}` : 'Station-service', address: [text(raw.adresse), text(raw.cp), city].filter(Boolean).join(', '), latitude, longitude, prices, automated24h: hours?.['automate-24-24'] === '1' ? true : undefined, openingHours: hours?.['automate-24-24'] === '1' ? 'Automate 24/24' : undefined, services: array(services?.service as string | string[] | undefined).map(text), source: SOURCE, sourceUrl: FR_ENDPOINT, sourceUpdatedAt: prices.map(p => p.updatedAt).filter((v): v is string => !!v).sort().at(-1) }];
  }));
}
const snapshot = snapshotCache(async () => parseFrance(new Uint8Array(await (await fetchSource(FR_ENDPOINT)).arrayBuffer())));
export const franceAdapter: CountryAdapter = {
  code: 'FR', status: 'live', sourceName: SOURCE, sourceUrl: FR_ENDPOINT,
  licence: 'Licence Ouverte / Open Licence 2.0', termsUrl: 'https://www.prix-carburants.gouv.fr/rubrique/opendata/', lastVerifiedAt: '2026-11-07T11:20:13Z',
  async listStations(query) { return (await snapshot()).filter(s => distanceKm(query, s) <= query.radiusKm && s.prices.some(p => p.fuel === query.fuel)); }
};
