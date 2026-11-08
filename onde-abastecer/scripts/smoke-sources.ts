import { adapters } from '../api/src/countries/registry';
const queries = [
  { country: 'ES', latitude: 42.2406, longitude: -8.7207, radiusKm: 30, fuel: 'gasoline95' },
  { country: 'FR', latitude: 48.8566, longitude: 2.3522, radiusKm: 20, fuel: 'diesel' },
  { country: 'PT', latitude: 38.7223, longitude: -9.1393, radiusKm: 30, fuel: 'gasoline95' }
] as const;
let failed = false;
for (const query of queries) {
  const start = Date.now();
  try {
    const stations = await adapters[query.country].listStations(query);
    const allValid = stations.length > 0 && stations.every(s => s.country === query.country && s.prices.every(p => p.price > 0 && p.unit === 'L'));
    console.log(JSON.stringify({ country: query.country, checkedAt: new Date().toISOString(), count: stations.length, allValid, elapsedMs: Date.now() - start, source: adapters[query.country].sourceUrl, sampleTimestamp: stations[0]?.prices[0]?.updatedAt }));
    if (!allValid) failed = true;
  } catch {
    failed = true;
    console.log(JSON.stringify({ country: query.country, checkedAt: new Date().toISOString(), error: 'source_unavailable', elapsedMs: Date.now() - start }));
  }
}
process.exitCode = failed ? 1 : 0;
