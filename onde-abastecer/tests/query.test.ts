import assert from 'node:assert/strict';
import { test } from 'node:test';
const mod = await import('../shared/query').catch(() => ({}));
const origin = { latitude: 42, longitude: -8 };
const stations = [
  { id: 'a', country: 'ES', name: 'A', brand: 'One', latitude: 42, longitude: -8, automated24h: true, services: ['Wash'], prices: [{ fuel: 'diesel', price: 1.8, currency: 'EUR', unit: 'L' }] },
  { id: 'b', country: 'ES', name: 'B', brand: 'Two', latitude: 42.01, longitude: -8, prices: [{ fuel: 'diesel', price: 1.6, currency: 'EUR', unit: 'L' }] }
];
test('filters operate only on supplied brand, price, hours and services', () => {
  assert.equal(typeof mod.selectStations, 'function');
  assert.deepEqual(mod.selectStations(stations, 'diesel', { maxPrice: 1.7 }, origin, 'price').map(s => s.id), ['b']);
  assert.deepEqual(mod.selectStations(stations, 'diesel', { only24h: true, service: 'Wash' }, origin, 'price').map(s => s.id), ['a']);
  assert.deepEqual(mod.selectStations(stations, 'diesel', { brand: 'Missing' }, origin, 'price'), []);
});
test('price and distance sorting use different explicit measurements', () => {
  assert.equal(typeof mod.selectStations, 'function');
  assert.deepEqual(mod.selectStations(stations, 'diesel', {}, origin, 'price').map(s => s.id), ['b', 'a']);
  assert.deepEqual(mod.selectStations(stations, 'diesel', {}, origin, 'distance').map(s => s.id), ['a', 'b']);
});
test('clusters group nearby real stations and preserve count without creating prices', () => {
  assert.equal(typeof mod.clusterStations, 'function');
  const clusters = mod.clusterStations(stations, { ...origin, latitudeDelta: 1, longitudeDelta: 1 });
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].stations.length, 2);
  assert.equal(clusters[0].price, undefined);
});
