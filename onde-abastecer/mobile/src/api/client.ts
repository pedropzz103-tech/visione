import { validStation } from '../../../shared/normalization';
import type { SearchQuery, Station } from '../types';
export interface LocalStore { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>; removeItem?(key: string): Promise<unknown> }
export interface SearchResult { stations: Station[]; retrievedAt: string; cache: 'network' | 'offline' }
export class ApiError extends Error {
  constructor(public code: string) { super(code); this.name = 'ApiError'; }
}
interface Options { baseUrl?: string; fetcher?: typeof fetch; storage?: LocalStore; now?: () => number }
const CACHE_KEY = 'oa:lastSearch:v1';
function validPayload(payload: unknown, query: SearchQuery): payload is SearchResult {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as SearchResult & SearchQuery;
  return p.country === query.country && p.fuel === query.fuel && typeof p.retrievedAt === 'string' && Number.isFinite(Date.parse(p.retrievedAt)) &&
    Array.isArray(p.stations) && p.stations.length <= 15000 && p.stations.every(s => validStation(s) && s.country === query.country && s.prices.some(p => p.fuel === query.fuel));
}
function queryKey(query: SearchQuery): string { return JSON.stringify([query.country, query.fuel, query.latitude, query.longitude, query.radiusKm]); }
export function createStationClient({ baseUrl, fetcher = fetch, storage, now = Date.now }: Options) {
  let generation = 0;
  let latestRequest = 0;
  let cacheQueue: Promise<unknown> = Promise.resolve();
  const search = async (query: SearchQuery, signal?: AbortSignal): Promise<SearchResult> => {
    const requestGeneration = generation;
    const requestId = ++latestRequest;
    const current = () => !signal?.aborted && requestGeneration === generation && requestId === latestRequest;
    if (!baseUrl) throw new ApiError('api_not_configured');
    if (!/^https?:\/\//.test(baseUrl)) throw new ApiError('api_not_configured');
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(() => controller.abort(), 100000);
    const key = queryKey(query);
    try {
      const search = new URLSearchParams({ country: query.country, fuel: query.fuel, lat: String(query.latitude), lng: String(query.longitude), radiusKm: String(query.radiusKm) });
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/v1/stations?${search}`, { signal: controller.signal });
      if (!response.ok) {
        const p = await response.json().catch(() => ({})) as { error?: string };
        const known = ['country_not_live_yet', 'unsupported_country', 'invalid_coordinates', 'invalid_radius', 'invalid_fuel', 'rate_limited'];
        throw new ApiError(known.includes(p.error ?? '') ? p.error! : response.status >= 500 ? 'source_unavailable' : 'request_rejected');
      }
      const payload: unknown = await response.json().catch(() => { throw new ApiError('invalid_response'); });
      if (!validPayload(payload, query)) throw new ApiError('invalid_response');
      if (!current()) throw new ApiError('cancelled');
      const result: SearchResult = { stations: payload.stations, retrievedAt: payload.retrievedAt, cache: 'network' };
      // Only one exact-query snapshot is persisted. Never store GPS history.
      if (storage && payload.stations.length <= 1000) {
        const serialized = JSON.stringify({ key, server: baseUrl, payload: { ...result, country: query.country, fuel: query.fuel }, savedAt: now() });
        cacheQueue = cacheQueue.catch(() => {}).then(async () => { if (current()) await storage.setItem(CACHE_KEY, serialized); });
        try { await cacheQueue; } catch { /* Storage failure must not hide valid network data. */ }
      }
      if (!current()) throw new ApiError('cancelled');
      return result;
    } catch (error) {
      if (!current()) throw new ApiError('cancelled');
      if (error instanceof ApiError && !['source_unavailable'].includes(error.code)) throw error;
      if (storage) try {
        const raw = await storage.getItem(CACHE_KEY);
        const cached = raw ? JSON.parse(raw) : null;
        if (current() && cached?.server === baseUrl && cached?.key === key && typeof cached.savedAt === 'number' && cached.savedAt <= now() && now() - cached.savedAt < 7 * 86400000 && validPayload(cached.payload, query)) {
          return { stations: cached.payload.stations, retrievedAt: cached.payload.retrievedAt, cache: 'offline' };
        }
      } catch { /* Corrupt cache never becomes a successful response. */ }
      throw new ApiError(error instanceof ApiError ? error.code : 'network_error');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); }
  };
  return Object.assign(search, {
    async clearCache(): Promise<void> {
      generation++; latestRequest++;
      cacheQueue = cacheQueue.catch(() => {}).then(async () => {
        if (storage?.removeItem) await storage.removeItem(CACHE_KEY);
        else if (storage) await storage.setItem(CACHE_KEY, '');
      });
      await cacheQueue;
    }
  });
}
