import assert from 'node:assert/strict';
import { test } from 'node:test';
const mod = await import('../mobile/src/api/client');
const query = { country: 'ES', fuel: 'diesel', latitude: 42, longitude: -8, radiusKm: 30 };
const station = { id: 'test', country: 'ES', name: 'Fixture', address: 'Test', latitude: 42, longitude: -8, source: 'Synthetic fixture', prices: [{ fuel: 'diesel', price: 1.7, currency: 'EUR', unit: 'L', updatedAt: '2026-11-07T10:00:00Z' }] };
const payload = { country: 'ES', fuel: 'diesel', stations: [station], retrievedAt: '2026-11-07T11:00:00Z' };
function memory() { const entries = new Map<string, string>(); return { async getItem(k: string) { return entries.get(k) ?? null; }, async removeItem(k: string) { entries.delete(k); }, async setItem(k: string, v: string) { entries.set(k, v); } }; }

test('unconfigured client reports configuration error without generating stations', async () => {
  assert.equal(typeof mod.createStationClient, 'function');
  const client = mod.createStationClient({ baseUrl: '' });
  await assert.rejects(client(query), { code: 'api_not_configured' });
});
test('malformed and cross-country responses are rejected', async () => {
  assert.equal(typeof mod.createStationClient, 'function');
  for (const bad of [{ ...payload, stations: [{ ...station, latitude: 999 }] }, { ...payload, country: 'FR' }, { stations: [] }]) {
    const client = mod.createStationClient({ baseUrl: 'https://api.test', fetcher: async () => new Response(JSON.stringify(bad)) });
    await assert.rejects(client(query), { code: 'invalid_response' });
  }
});
test('offline fallback matches exact query and is explicitly labelled with original fetch time', async () => {
  assert.equal(typeof mod.createStationClient, 'function');
  const storage = memory(); let online = true;
  const client = mod.createStationClient({ baseUrl: 'https://api.test', storage, fetcher: async () => { if (!online) throw Error('offline'); return new Response(JSON.stringify(payload)); } });
  assert.equal((await client(query)).cache, 'network'); online = false;
  const cached = await client(query);
  assert.equal(cached.cache, 'offline');
  assert.equal(cached.retrievedAt, payload.retrievedAt);
  await assert.rejects(client({ ...query, fuel: 'lpg' }), { code: 'network_error' });
});
test('unsupported country never reuses an offline success', async () => {
  assert.equal(typeof mod.createStationClient, 'function');
  const storage = memory(); let status = 200;
  const client = mod.createStationClient({ baseUrl: 'https://api.test', storage, fetcher: async () => new Response(JSON.stringify(status === 200 ? payload : { error: 'country_not_live_yet' }), { status }) });
  await client(query); status = 501;
  await assert.rejects(client(query), { code: 'country_not_live_yet' });
});

test('invalid JSON cannot revive cached prices as a successful search', async () => {
  const storage = memory(); let valid = true;
  const client = mod.createStationClient({ baseUrl: 'https://api.test', storage, fetcher: async () => new Response(valid ? JSON.stringify(payload) : '<html>bad gateway</html>') });
  await client(query); valid = false;
  await assert.rejects(client(query), { code: 'invalid_response' });
});

test('optional rendering metadata is validated before it can reach React', async () => {
  for (const changed of [
    { ...station, services: [{}] }, { ...station, brand: {} }, { ...station, openingHours: {} },
    { ...station, prices: [{ ...station.prices[0], label: {} }] },
    { ...station, prices: [{ ...station.prices[0], reportedAt: {} }] },
    { ...station, priceBand: 9 }, { ...station, automated24h: 'yes' }
  ]) {
    const client = mod.createStationClient({ baseUrl: 'https://api.test', fetcher: async () => new Response(JSON.stringify({ ...payload, stations: [changed] })) });
    await assert.rejects(client(query), { code: 'invalid_response' });
  }
});
test('clearing cache fences a network request that has not returned yet', async () => {
  const storage = memory();
  let deliver;
  const client = mod.createStationClient({ baseUrl: 'https://api.test', storage, fetcher: () => new Promise(resolve => { deliver = resolve; }) });
  assert.equal(typeof client.clearCache, 'function');
  const request = client(query);
  await client.clearCache();
  deliver(new Response(JSON.stringify(payload)));
  await assert.rejects(request, { code: 'cancelled' });
  assert.equal((await storage.getItem('oa:lastSearch:v1')) || null, null);
});
test('an aborted slow cache write cannot overwrite the latest successful search', async () => {
  const store = memory(); let first = true, releaseFirst, firstStarted, secondBodyRead;
  const started = new Promise(resolve => { firstStarted = resolve; });
  const secondRead = new Promise(resolve => { secondBodyRead = resolve; });
  const storage = { ...store, async setItem(k, v) {
    if (first) { first = false; firstStarted(); await new Promise(resolve => { releaseFirst = resolve; }); }
    await store.setItem(k, v);
  } };
  const client = mod.createStationClient({ baseUrl: 'https://api.test', storage, fetcher: async url => {
    const response = new Response(JSON.stringify(payload));
    const json = response.json.bind(response);
    response.json = async () => { const body = await json(); if (String(url).includes('lat=43')) secondBodyRead(); return body; };
    return response;
  } });
  const controller = new AbortController();
  const old = client(query, controller.signal).catch(error => error);
  await started; controller.abort();
  const current = client({ ...query, latitude: 43 });
  await secondRead; await new Promise(resolve => setImmediate(resolve)); releaseFirst();
  await Promise.all([old, current]);
  assert.equal(JSON.parse(await storage.getItem('oa:lastSearch:v1')).key, '["ES","diesel",43,-8,30]');
});
test('clearing waits for an already-started storage write before deleting it', async () => {
  const store = memory(); let release, began;
  const started = new Promise(resolve => { began = resolve; });
  const storage = { ...store, async setItem(k, v) { began(); await new Promise(resolve => { release = resolve; }); await store.setItem(k, v); } };
  const client = mod.createStationClient({ baseUrl: 'https://api.test', storage, fetcher: async () => new Response(JSON.stringify(payload)) });
  assert.equal(typeof client.clearCache, 'function');
  const request = client(query).catch(error => error);
  await started;
  const clearing = client.clearCache(); release();
  await Promise.all([request, clearing]);
  assert.equal((await storage.getItem('oa:lastSearch:v1')) || null, null);
});

test('offline cache from a different configured server cannot become a successful search', async () => {
  const storage = memory();
  const first = mod.createStationClient({ baseUrl: 'https://api.first.test', storage, fetcher: async () => new Response(JSON.stringify(payload)) });
  await first(query);
  const second = mod.createStationClient({ baseUrl: 'https://api.second.test', storage, fetcher: async () => { throw Error('offline'); } });
  await assert.rejects(second(query), { code: 'network_error' });
});
