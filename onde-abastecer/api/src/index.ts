import { adapters } from './countries/registry';
import { addRelativePriceBands } from './lib/pricing';
import { FUELS, type CountryCode, type FuelType } from '../../shared/types';
import { deduplicate, validCoordinates } from '../../shared/normalization';
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
function numberParam(url: URL, key: string, fallback?: number) {
  const raw = url.searchParams.get(key);
  if (raw == null) return fallback;
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
interface Env { STATION_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> } }
export default {
  async fetch(request: Request, env: Env = {}): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': 'content-type' } });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, service: 'onde-abastecer-api', version: '0.3.0' });
    if (url.pathname === '/v1/categories') return json({ categories: ['fuel', 'groceries', 'charging', 'pharmacy', 'electronics', 'home'].map(category => ({ category, status: category === 'fuel' ? 'enabled' : 'planned' })) });
    if (url.pathname === '/v1/countries') return json({ countries: Object.values(adapters).map(({ code, status, sourceName, sourceUrl, licence, termsUrl, lastVerifiedAt }) => ({ code, status, sourceName, sourceUrl, licence, termsUrl, lastVerifiedAt })) });
    if (url.pathname !== '/v1/stations') return json({ error: 'not_found' }, 404);
    const country = (url.searchParams.get('country') ?? 'ES').toUpperCase() as CountryCode;
    if (!Object.hasOwn(adapters, country)) return json({ error: 'unsupported_country' }, 400);
    const latitude = numberParam(url, 'lat'), longitude = numberParam(url, 'lng'), radiusKm = numberParam(url, 'radiusKm', 25);
    const fuel = (url.searchParams.get('fuel') ?? 'gasoline95') as FuelType;
    if (latitude == null || longitude == null || !validCoordinates(latitude, longitude)) return json({ error: 'invalid_coordinates' }, 400);
    if (radiusKm == null || radiusKm < 1 || radiusKm > 100) return json({ error: 'invalid_radius' }, 400);
    if (!FUELS.includes(fuel)) return json({ error: 'invalid_fuel' }, 400);
    if (env.STATION_RATE_LIMITER) {
      const ip = request.headers.get('cf-connecting-ip') ?? 'local';
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
      const key = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
      const result = await env.STATION_RATE_LIMITER.limit({ key });
      if (!result.success) {
        const response = json({ error: 'rate_limited' }, 429);
        response.headers.set('retry-after', '60');
        return response;
      }
    }
    const adapter = adapters[country];
    if (adapter.status !== 'live') return json({ error: 'country_not_live_yet', country, status: adapter.status }, 501);
    try {
      const stations = deduplicate(await adapter.listStations({ latitude, longitude, radiusKm, fuel }));
      const ranked = addRelativePriceBands(stations, fuel);
      return json({ country, fuel, radiusKm, count: ranked.length, retrievedAt: new Date().toISOString(), source: { name: adapter.sourceName, url: adapter.sourceUrl, licence: adapter.licence, termsUrl: adapter.termsUrl }, stations: ranked });
    } catch {
      return json({ error: 'source_unavailable', country }, 502);
    }
  }
};
