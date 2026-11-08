import assert from 'node:assert/strict';
import { test } from 'node:test';
const module = await import('../api/src/countries/pt').catch(() => ({}));
test('PT retains DGEG provenance, timestamp, price unit, signed coordinates and product label', () => {
  assert.equal(typeof module.parsePortugal, 'function');
  const result = module.parsePortugal({ status: true, resultado: [{ Id: 42, Nome: 'Synthetic only', Marca: 'Fixture', Preco: '1,769 €', Combustivel: 'Gasolina simples 95', DataAtualizacao: '2026-11-07 10:30', Morada: 'Test', Municipio: 'Test', Latitude: 37.2, Longitude: -7.4, Quantidade: 1 }] }, 'gasoline95');
  assert.equal(result[0].id, '42');
  assert.equal(result[0].prices[0].price, 1.769);
  assert.equal(result[0].prices[0].updatedAt, '2026-11-07T10:30:00.000Z');
  assert.equal(result[0].prices[0].label, 'Gasolina simples 95');
  assert.equal(result[0].source, 'DGEG · Preços dos combustíveis');
});
test('PT fails closed if page count is incomplete instead of presenting national cheapest rows as nearby coverage', async t => {
  assert.equal(typeof module.portugalAdapter, 'object');
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: true, resultado: [{ Id: 42, Quantidade: 6000 }] })));
  await assert.rejects(module.portugalAdapter.listStations({ latitude: 37.2, longitude: -7.4, radiusKm: 20, fuel: 'diesel' }));
});
