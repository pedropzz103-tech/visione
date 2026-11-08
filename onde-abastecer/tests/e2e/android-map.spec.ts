import { expect, test } from '@playwright/test';
import { mapHtml } from '../../mobile/src/generated/mapDocument';
test('bundled Android map loads Leaflet without remote scripts and reports real marker selection', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.evaluate(() => {
    Object.assign(window, { mapMessages: [], ReactNativeWebView: { postMessage(raw: string) { (window as unknown as { mapMessages: unknown[] }).mapMessages.push(JSON.parse(raw)); } } });
  });
  await page.setContent(mapHtml);
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { oaUpdate(value: unknown): void }).oaUpdate({ centerKey: 'test', center: { latitude: 42.24, longitude: -8.72, latitudeDelta: .18, longitudeDelta: .18 }, markers: [{ key: 'ES:fixture', latitude: 42.24, longitude: -8.72, count: 1, color: '#16734B', label: '1.600 EUR/L', title: 'Synthetic fixture only' }] });
  });
  await page.locator('button.pin[aria-label="Synthetic fixture only"]').click();
  expect(await page.evaluate(() => (window as unknown as { mapMessages: unknown[] }).mapMessages)).toContainEqual({ type: 'select', key: 'ES:fixture' });
  await expect(page.getByText('OpenStreetMap', { exact: true })).toBeVisible();
  expect(scripts).toEqual([]);
});

test('searching the reported Android map area preserves its centre and zoom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.evaluate(() => Object.assign(window, { mapMessages: [], ReactNativeWebView: { postMessage(raw: string) { (window as unknown as { mapMessages: unknown[] }).mapMessages.push(JSON.parse(raw)); } } }));
  await page.setContent(mapHtml);
  const result = await page.evaluate(async () => {
    const w = window as unknown as { oaUpdate(value: unknown): void; mapMessages: Array<{ type: string; latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }> };
    w.oaUpdate({ centerKey: 'initial', center: { latitude: 42.24, longitude: -8.72, latitudeDelta: .18, longitudeDelta: .18 }, markers: [] });
    await new Promise(resolve => setTimeout(resolve, 400));
    const before = w.mapMessages.filter(m => m.type === 'region').at(-1)!;
    w.oaUpdate({ centerKey: 'search-here', center: before, markers: [] });
    await new Promise(resolve => setTimeout(resolve, 400));
    const after = w.mapMessages.filter(m => m.type === 'region').at(-1)!;
    return { before, after };
  });
  expect(result.after.longitudeDelta).toBeCloseTo(result.before.longitudeDelta, 6);
  expect(result.after.latitude).toBeCloseTo(result.before.latitude, 6);
  expect(result.after.longitude).toBeCloseTo(result.before.longitude, 6);
});
