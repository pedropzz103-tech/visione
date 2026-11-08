import assert from 'node:assert/strict';
import { test } from 'node:test';
const domain = await import('../shared/economy').catch(() => ({}));
const normalization = await import('../shared/normalization').catch(() => ({}));
const now = Date.parse('2026-11-07T12:00:00Z');
const price = { fuel: 'gasoline95', price: 1.8, currency: 'EUR', unit: 'L', updatedAt: '2026-11-07T10:00:00Z' };
const input = { reference: price, candidate: { ...price, price: 1.6 }, liters: 40, consumptionLitersPer100Km: 6, detour: { mode: 'route', additionalKm: 10 }, now };

test('net savings subtracts additional driving priced at the reference pump', () => {
  assert.equal(typeof domain.calculateSavings, 'function');
  const result = domain.calculateSavings(input);
  assert.equal(result.status, 'ok');
  assert.equal(result.gross, 8);
  assert.equal(result.travelCost, 1.08);
  assert.equal(result.net, 6.92);
});
test('return trip doubles one-way road distance and preserves negative savings', () => {
  assert.equal(typeof domain.calculateSavings, 'function');
  const r = domain.calculateSavings({ ...input, detour: { mode: 'return', oneWayKm: 50 } });
  assert.equal(r.additionalKm, 100);
  assert.equal(r.net, -2.8);
});
test('missing route, stale or unknown date, mixed currency/fuel and invalid numbers cannot claim savings', () => {
  assert.equal(typeof domain.calculateSavings, 'function');
  for (const patch of [
    { detour: undefined }, { liters: 0 }, { liters: NaN }, { consumptionLitersPer100Km: -1 },
    { candidate: { ...price, currency: 'GBP' } }, { candidate: { ...price, fuel: 'diesel' } },
    { candidate: { ...price, updatedAt: undefined } }, { candidate: { ...price, updatedAt: '2026-01-01' } },
    { candidate: { ...price, updatedAt: '2026-11-10T00:00:00Z' } }, { candidate: { ...price, unit: 'kg' } },
    { reference: { ...price, serviceMode: 'self' }, candidate: { ...price, serviceMode: 'attended' } }
  ]) assert.equal(domain.calculateSavings({ ...input, ...patch }).status, 'insufficient');
});
test('tank volume is calculated from capacity and actual remaining percentage', () => {
  assert.equal(typeof domain.fillVolume, 'function');
  assert.equal(domain.fillVolume(50, 20, 100), 40);
  assert.equal(domain.fillVolume(50, 60, 40), undefined);
});
test('volume units convert using exact gallon definitions and reject unrelated units', () => {
  assert.equal(typeof domain.pricePerLiter, 'function');
  assert.equal(domain.pricePerLiter(3.785411784, 'US_gal'), 1);
  assert.equal(domain.pricePerLiter(4.54609, 'Imperial_gal'), 1);
  assert.equal(domain.pricePerLiter(1, 'kg'), undefined);
});
test('numeric normalization accepts signed coordinates but rejects missing, infinite, malformed prices', () => {
  assert.equal(typeof normalization.decimal, 'function');
  assert.equal(normalization.decimal('-8,7207'), -8.7207);
  for (const v of ['', null, 'NaN', '1.2.3', Infinity]) assert.equal(normalization.decimal(v), undefined);
});
test('source-local timestamps respect winter and summer offsets and reject invalid dates', () => {
  assert.equal(typeof normalization.sourceTimestamp, 'function');
  assert.equal(normalization.sourceTimestamp('07/11/2026 11:00:00', 'Europe/Madrid'), '2026-11-07T10:00:00.000Z');
  assert.equal(normalization.sourceTimestamp('2026-07-01 11:00:00', 'Europe/Paris'), '2026-07-01T09:00:00.000Z');
  assert.equal(normalization.sourceTimestamp('2026-11-07 11:00', 'Europe/Lisbon'), '2026-11-07T11:00:00.000Z');
  for (const v of ['', '2026-02-31 10:00:00', '2026-03-29 02:30:00']) assert.equal(normalization.sourceTimestamp(v, 'Europe/Paris'), undefined);
});

test('ISO timestamps reject impossible calendar dates and clock rollover', () => {
  for (const value of ['2026-02-31T10:00:00Z', '2026-11-07T24:00:00Z', '2026-02-29T10:00:00+01:00']) {
    assert.equal(normalization.sourceTimestamp(value, 'Europe/Paris'), undefined);
    assert.equal(normalization.priceFreshness({ ...price, updatedAt: value }, now), 'unknown');
  }
});
