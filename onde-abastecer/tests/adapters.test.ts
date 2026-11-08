import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { zipSync } from '../api/node_modules/fflate/esm/browser.js';
import { spainAdapter } from '../api/src/countries/es';
import { franceAdapter } from '../api/src/countries/fr';
import { italyAdapter } from '../api/src/countries/it';

const es = readFileSync(new URL('./fixtures/es.json', import.meta.url), 'utf8');
const query = { latitude: 42.2406, longitude: -8.7207, radiusKm: 30, fuel: 'gasoline95' as const };

test('ES retains negative longitudes and normalizes source local date to UTC', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(es));
  const stations = await spainAdapter.listStations(query);
  assert.equal(stations.length, 1);
  assert.equal(stations[0].longitude, -8.7207);
  assert.equal(stations[0].prices[0].unit, 'L');
  assert.equal(stations[0].prices[0].updatedAt, '2026-11-07T10:00:00.000Z');
});

test('ES retains zero longitude without treating empty coordinate as zero', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(es));
  const stations = await spainAdapter.listStations({ ...query, longitude: 0 });
  assert.equal(stations.length, 1);
  assert.equal(stations[0].longitude, 0);
});

test('FR preserves accented text and does not substitute E10 for SP95', async t => {
  // Synthetic fixture, deliberately encoded ISO-8859-1 like the official feed.
  const xml = '<?xml version="1.0" encoding="ISO-8859-1"?><pdv_liste><pdv id="fixture" latitude="4885660" longitude="235220"><adresse>Allée test</adresse><ville>Paris</ville><prix nom="SP95" valeur="1.800" maj="2026-11-07 09:00:00"/><prix nom="E10" valeur="1.600" maj="2026-11-07 09:00:00"/></pdv></pdv_liste>';
  const zip = zipSync({ 'fixture.xml': Uint8Array.from(xml, c => c.charCodeAt(0)) });
  t.mock.method(globalThis, 'fetch', async () => new Response(zip));
  const stations = await franceAdapter.listStations({ ...query, latitude: 48.8566, longitude: 2.3522 });
  assert.equal(stations[0].address, 'Allée test, Paris');
  assert.equal(stations[0].prices.find(p => p.fuel === 'gasoline95')?.price, 1.8);
  assert.equal(stations[0].prices.find(p => p.fuel === 'gasoline95e10')?.price, 1.6);
});

test('IT keeps service mode and does not infer 98 octane from special marketing labels', async t => {
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (!String(url).endsWith('.csv')) return new Response('<a href="https://www.mimit.gov.it/anagrafica_impianti_attivi.csv">a</a><a href="https://www.mimit.gov.it/prezzo_alle_8.csv">p</a>');
    return new Response(String(url).includes('anagrafica')
      ? '2026-11-07\nidImpianto|Bandiera|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine\nfixture|Test|Fixture|Via test|Milano|MI|45.4642|9.1900'
      : '2026-11-07\nidImpianto|descCarburante|prezzo|isSelf|dtComu\nfixture|Benzina|1.6|1|2026-11-07 08:00:00\nfixture|Benzina speciale|1.9|0|2026-11-07 08:00:00');
  });
  const stations = await italyAdapter.listStations({ ...query, latitude: 45.4642, longitude: 9.1900 });
  assert.equal(stations[0].prices.some(p => p.fuel === 'gasoline98'), false);
  assert.equal(stations[0].prices[0].serviceMode, 'self');
});

test('FR excludes a permanently closed station and a fuel with an active outage', async () => {
  const { parseFrance } = await import('../api/src/countries/fr');
  const xml = '<pdv_liste><pdv id="closed" latitude="4885660" longitude="235220"><fermeture type="D" debut="2026-10-01"/><prix nom="Gazole" id="1" valeur="1.5" maj="2026-11-07 09:00:00"/></pdv><pdv id="outage" latitude="4885660" longitude="235220"><rupture id="1" debut="2026-11-06 10:00:00"/><prix nom="Gazole" id="1" valeur="1.6" maj="2026-11-07 09:00:00"/></pdv></pdv_liste>';
  const stations = parseFrance(zipSync({ 'f.xml': new TextEncoder().encode(xml) }));
  assert.deepEqual(stations, []);
});
test('ES does not advertise restricted sale stations as public refuelling options', async () => {
  const { parseSpain } = await import('../api/src/countries/es');
  const fixture = JSON.parse(es); fixture.ListaEESSPrecio[0]['Tipo Venta'] = 'R';
  assert.equal(parseSpain(fixture).some(s => s.id === 'fixture-west'), false);
});

test('ES rejects an explicit source error and an entirely malformed nonempty feed', async () => {
  const { parseSpain } = await import('../api/src/countries/es');
  assert.throws(() => parseSpain({ ResultadoConsulta: 'Error', Errores: ['Temporary failure'], ListaEESSPrecio: [] }));
  assert.throws(() => parseSpain({ ListaEESSPrecio: [{ Latitud: 'broken', 'Longitud (WGS84)': 'broken' }] }));
});
test('ES opening 24 hours does not establish automatic service', async () => {
  const { parseSpain } = await import('../api/src/countries/es');
  const station = parseSpain(JSON.parse(es)).find(s => s.id === 'fixture-west');
  assert.equal(station.openingHours, 'L-D: 24H');
  assert.equal(station.automated24h, undefined);
});
