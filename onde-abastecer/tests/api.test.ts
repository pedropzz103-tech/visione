import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import worker from '../api/src/index';
import { addRelativePriceBands } from '../api/src/lib/pricing';

beforeEach(t => { t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ ListaEESSPrecio: [] }))); });

test('API requires coordinates rather than accepting missing parameters as zero', async () => {
  const response = await worker.fetch(new Request('https://test/v1/stations?country=ES'));
  assert.equal(response.status, 400);
});

test('API rejects invalid coordinate ranges and nonnumeric radius without contacting source', async () => {
  for (const params of ['lat=91&lng=2', 'lat=42&lng=181', 'lat=&lng=', 'lat=42&lng=2&radiusKm=no']) {
    const response = await worker.fetch(new Request(`https://test/v1/stations?country=ES&${params}`));
    assert.equal(response.status, 400);
  }
});

test('API rejects POST instead of exposing a GET source fetch', async () => {
  const response = await worker.fetch(new Request('https://test/health', { method: 'POST' }));
  assert.equal(response.status, 405);
});

test('prototype property is not a supported country', async () => {
  const response = await worker.fetch(new Request('https://test/v1/stations?country=constructor&lat=1&lng=2'));
  assert.equal(response.status, 400);
});

test('equal prices receive a neutral relative band', () => {
  const stations = [1, 2].map(id => ({ id: String(id), prices: [{ fuel: 'diesel', price: 1.8, currency: 'EUR' }] }));
  assert.deepEqual(addRelativePriceBands(stations as never, 'diesel').map(s => s.priceBand), [3, 3]);
});

test('rate limit blocks source work without returning raw IP or upstream details', async () => {
  const response = await worker.fetch(new Request('https://test/v1/stations?country=ES&lat=42&lng=-8', { headers: { 'cf-connecting-ip': '192.0.2.1' } }), { STATION_RATE_LIMITER: { async limit() { return { success: false }; } } });
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: 'rate_limited' });
  assert.equal(response.headers.get('retry-after'), '60');
});
test('country registry distinguishes tested sources from an unverified Italian connector', async () => {
  const response = await worker.fetch(new Request('https://test/v1/countries'));
  const payload = await response.json();
  assert.equal(payload.countries.find(c => c.code === 'IT').status, 'unverified');
  assert.equal(payload.countries.find(c => c.code === 'PT').licence.includes('DGEG'), true);
});
test('source failure is reported as failure and does not leak error messages', async t => {
  const { adapters } = await import('../api/src/countries/registry');
  t.mock.method(adapters.ES, 'listStations', async () => { throw Error('private upstream request information'); });
  const response = await worker.fetch(new Request('https://test/v1/stations?country=ES&lat=42&lng=-8'));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'source_unavailable', country: 'ES' });
});

test('explicit ES source-level errors result in 502 rather than a successful empty list', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ ResultadoConsulta: 'Error', Errores: ['Temporary failure'], ListaEESSPrecio: [] })));
  const response = await worker.fetch(new Request('https://test/v1/stations?country=ES&lat=42&lng=-8'));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'source_unavailable', country: 'ES' });
});
