import { expect, test } from '@playwright/test';
// Synthetic test records exist only in this intercepted test response.
const prices = [1.8, 1.6];
const stations = prices.map((price, i) => ({ id: `fixture-${i}`, country: 'ES', name: `Fixture station ${i}`, brand: `Test brand ${i}`, address: 'Synthetic test address', latitude: 42.2406 + i * .01, longitude: -8.7207, prices: [{ fuel: 'gasoline95', price, currency: 'EUR', unit: 'L', updatedAt: new Date().toISOString(), timestampKind: 'price' }], source: 'Synthetic fixture only', priceBand: i ? 1 : 5 }));
test.beforeEach(async ({ page }) => {
  // CI exercises our map/markers without downloading public OSM tiles.
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.route('**/v1/stations?**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('country') === 'IT') return route.fulfill({ status: 501, json: { error: 'country_not_live_yet' } });
    return route.fulfill({ json: { country: url.searchParams.get('country'), fuel: url.searchParams.get('fuel'), stations, retrievedAt: new Date().toISOString() } });
  });
});
test('map opens, list filters and favourites persist with a tested net calculation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.getByRole('button', { name: 'Lista (2)', exact: true }).click();
  const reference = page.getByRole('button', { name: /Fixture station 0/ });
  await reference.click();
  await page.getByRole('button', { name: 'Salvar favorito', exact: true }).click();
  await page.getByRole('button', { name: 'Usar como referência de preço', exact: true }).click();
  await page.getByRole('button', { name: /Fixture station 1/ }).click();
  await page.getByLabel('Distância rodoviária adicional (km)', { exact: true }).fill('10');
  await expect(page.getByText(/Economia líquida estimada:.*6,920/)).toBeVisible();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Filtros', exact: true }).click();
  await page.getByLabel('Preço máximo por litro', { exact: true }).fill('1.7');
  await expect(page.getByRole('button', { name: 'Lista (1)', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Lista (2)', exact: true }).click();
  await page.getByRole('button', { name: /Fixture station 0/ }).click();
  await expect(page.getByRole('button', { name: 'Remover favorito', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('unsupported country displays coverage error and clears previous stations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /IT · em preparação/ }).click();
  await expect(page.getByText('Este país ainda não tem integração habilitada.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lista (0)', exact: true })).toBeVisible();
});

test('manual coordinates issue an exact new search without GPS permission', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
  const request = page.waitForRequest(r => r.url().includes('/v1/stations?') && r.url().includes('lat=42.25') && r.url().includes('lng=-8.73'));
  await page.getByLabel('Cidade, endereço ou latitude, longitude', { exact: true }).fill('42.25, -8.73');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const query = new URL((await request).url()).searchParams;
  expect(query.get('country')).toBe('ES');
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
});
test('late fuel response cannot replace a newer selection', async ({ page }) => {
  await page.route('**/v1/stations?**', async route => {
    const url = new URL(route.request().url()), fuel = url.searchParams.get('fuel');
    if (fuel === 'diesel') await new Promise(resolve => setTimeout(resolve, 400));
    const values = fuel === 'lpg' ? stations.slice(0, 1) : stations;
    await route.fulfill({ json: { country: 'ES', fuel, stations: values.map(s => ({ ...s, prices: s.prices.map(p => ({ ...p, fuel })) })), retrievedAt: new Date().toISOString() } }).catch(() => {});
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Diesel', exact: true }).click();
  await page.getByRole('button', { name: 'LPG / GLP', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lista (1)', exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByRole('button', { name: 'Lista (1)', exact: true })).toBeVisible();
});
test('an offline reload explicitly identifies previously saved data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
  await page.route('**/v1/stations?**', route => route.abort('internetdisconnected'));
  await page.reload();
  await expect(page.getByText(/OFFLINE · últimos dados salvos/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
});

test('granted browser geolocation searches coordinates with the selected country', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 42.25, longitude: -8.73 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
  const request = page.waitForRequest(r => r.url().includes('/v1/stations?') && r.url().includes('lat=42.25'), { timeout: 3000 });
  await page.getByRole('button', { name: /Minha localização/ }).click();
  expect(new URL((await request).url()).searchParams.get('country')).toBe('ES');
});

test('search this area wins over an older pending geolocation', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = success => {
      Object.defineProperty(window, '__resolveLocation', { configurable: true, value: () => success({ coords: { latitude: 43, longitude: -7, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() } as GeolocationPosition) });
    };
  });
  const queries: string[] = [];
  page.on('request', r => { if (r.url().includes('/v1/stations?')) queries.push(r.url()); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Minha localização/ }).click();
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __resolveLocation?: () => void }).__resolveLocation)).toBe('function');
  await page.getByRole('button', { name: 'Buscar nesta área', exact: true }).click();
  await page.evaluate(() => (window as unknown as { __resolveLocation: () => void }).__resolveLocation());
  await page.waitForTimeout(400);
  expect(queries.some(url => new URL(url).searchParams.get('lat') === '43')).toBe(false);
});
test('deleting local data cancels an in-flight search and leaves no cache', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/v1/stations?**', async route => {
    if (new URL(route.request().url()).searchParams.get('lat') === '42.25') await pending;
    await route.fulfill({ json: { ...payloadForSearch(route.request().url()), stations, retrievedAt: new Date().toISOString() } }).catch(() => {});
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
  const requested = page.waitForRequest(r => r.url().includes('lat=42.25'));
  await page.getByLabel('Cidade, endereço ou latitude, longitude', { exact: true }).fill('42.25, -8.73');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await requested;
  await page.getByRole('button', { name: 'Veículo', exact: true }).click();
  await page.getByRole('button', { name: 'Apagar favoritos, preferências e cache', exact: true }).click();
  await expect(page.getByText('Dados locais apagados.', { exact: true })).toBeVisible();
  release(); await page.waitForTimeout(300);
  expect(await page.evaluate(() => localStorage.getItem('oa:lastSearch:v1'))).toBeNull();
  await expect(page.getByRole('button', { name: 'Lista (0)', exact: true })).toBeVisible();
});
function payloadForSearch(url: string) { const params = new URL(url).searchParams; return { country: params.get('country'), fuel: params.get('fuel') }; }

test('fuel compatibility label is translated with the interface', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '95 · E5 / composição não informada', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('button', { name: '95 · E5 / blend unknown', exact: true })).toBeVisible();
});

test('standalone app can configure its API from the device and persist it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Servidor da API', exact: true }).click();
  await page.getByLabel('URL da API', { exact: true }).fill('http://127.0.0.1:9999');
  const request = page.waitForRequest(r => r.url().startsWith('http://127.0.0.1:9999/v1/stations'));
  await page.getByRole('button', { name: 'Salvar servidor', exact: true }).click();
  await request;
  await page.reload();
  await expect(page.getByRole('button', { name: 'Lista (2)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Servidor da API', exact: true }).click();
  await expect(page.getByLabel('URL da API', { exact: true })).toHaveValue('http://127.0.0.1:9999');
});
