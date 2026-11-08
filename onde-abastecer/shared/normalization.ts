import { FUELS, type FuelPrice, type Station } from './types';
export function decimal(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const text = String(value).trim().replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}
export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
    typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}
function explicitTimestamp(text: string): string | undefined {
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/);
  if (!match) return undefined;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number) as [number, number, number, number, number, number];
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (year < 2000 || calendar.getUTCFullYear() !== year || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return undefined;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}
const timestampCache = new Map<string, string | undefined>();
const formatters = new Map<string, Intl.DateTimeFormat>();
export function sourceTimestamp(raw: unknown, timeZone: string): string | undefined {
  const key = `${timeZone}:${String(raw)}`;
  if (timestampCache.has(key)) return timestampCache.get(key);
  const value = parseTimestamp(raw, timeZone);
  if (timestampCache.size >= 5000) timestampCache.clear();
  timestampCache.set(key, value);
  return value;
}
function parseTimestamp(raw: unknown, timeZone: string): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const text = raw.trim();
  if (text.includes('T')) return explicitTimestamp(text);
  const es = text.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  const parts = es ? [es[3], es[2], es[1], es[4], es[5], es[6] ?? '00'] : iso?.slice(1).map(v => v ?? '00');
  if (!parts) return undefined;
  const [year, month, day, hour, minute, second] = parts.map(Number) as [number, number, number, number, number, number];
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(naive);
  if (year < 2000 || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return undefined;
  if (!formatters.has(timeZone)) formatters.set(timeZone, new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }));
  const formatter = formatters.get(timeZone)!;
  const target = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  // Enumerate plausible offsets: reject nonexistent and ambiguous wall-clock times.
  const matches: number[] = [];
  for (const offset of [-60, 0, 60, 120]) {
    const ms = naive - offset * 60000;
    if (formatter.format(ms) === target) matches.push(ms);
  }
  return matches.length === 1 ? new Date(matches[0]!).toISOString() : undefined;
}
export function priceFreshness(price: FuelPrice, now = Date.now()): 'fresh' | 'stale' | 'unknown' {
  const normalized = price.updatedAt ? explicitTimestamp(price.updatedAt) : undefined;
  const ms = normalized ? Date.parse(normalized) : NaN;
  if (!Number.isFinite(ms) || ms > now + 5 * 60000) return 'unknown';
  return now - ms <= 72 * 3600000 ? 'fresh' : 'stale';
}
function optionalString(value: unknown): boolean { return value === undefined || typeof value === 'string'; }
export function validPrice(value: unknown): value is FuelPrice {
  if (!value || typeof value !== 'object') return false;
  const p = value as FuelPrice;
  return FUELS.includes(p.fuel) && typeof p.price === 'number' && Number.isFinite(p.price) && p.price > 0 &&
    ['EUR', 'GBP', 'USD', 'CAD', 'AUD', 'BRL'].includes(p.currency) && p.unit === 'L' &&
    [p.label, p.reportedAt, p.updatedAt].every(optionalString) && (p.updatedAt == null || explicitTimestamp(p.updatedAt) != null) &&
    (p.serviceMode == null || ['self', 'attended', 'unknown'].includes(p.serviceMode)) &&
    (p.timestampKind == null || ['price', 'feed'].includes(p.timestampKind));
}
export function validStation(value: unknown): value is Station {
  if (!value || typeof value !== 'object') return false;
  const s = value as Station;
  return typeof s.id === 'string' && s.id.length > 0 && typeof s.name === 'string' && typeof s.address === 'string' &&
    typeof s.source === 'string' && [s.brand, s.openingHours, s.sourceUrl, s.sourceUpdatedAt].every(optionalString) &&
    ['ES', 'FR', 'IT', 'PT', 'DE', 'AT', 'GB', 'GR', 'SI'].includes(s.country) &&
    (s.services === undefined || (Array.isArray(s.services) && s.services.every(v => typeof v === 'string'))) &&
    (s.automated24h === undefined || typeof s.automated24h === 'boolean') &&
    (s.priceBand === undefined || [1, 2, 3, 4, 5].includes(s.priceBand)) && validCoordinates(s.latitude, s.longitude) && Array.isArray(s.prices) && s.prices.length > 0 && s.prices.every(validPrice);
}
export function deduplicate(stations: Station[]): Station[] {
  const unique = new Map<string, Station>();
  for (const station of stations) if (validStation(station)) unique.set(`${station.country}:${station.id}`, station);
  return [...unique.values()];
}
