import { distanceKm } from './geo';
import type { FuelType, Station } from './types';
export interface Filters { brand?: string; maxPrice?: number; only24h?: boolean; service?: string; favorites?: string[]; onlyFavorites?: boolean }
export type SortOrder = 'price' | 'distance';
export function stationKey(station: Pick<Station, 'country' | 'id'>): string { return `${station.country}:${station.id}`; }
export function selectStations(stations: Station[], fuel: FuelType, filters: Filters, origin: { latitude: number; longitude: number }, sort: SortOrder): (Station & { distanceKm: number })[] {
  return stations.filter(s => {
    const p = s.prices.find(p => p.fuel === fuel);
    return !!p && (!filters.brand || s.brand === filters.brand) &&
      (filters.maxPrice == null || p.price <= filters.maxPrice) &&
      (!filters.only24h || s.automated24h === true) && (!filters.service || s.services?.includes(filters.service)) &&
      (!filters.onlyFavorites || filters.favorites?.includes(stationKey(s)));
  }).map(s => ({ ...s, distanceKm: distanceKm(origin, s) })).sort((a, b) => {
    const diff = sort === 'distance' ? a.distanceKm - b.distanceKm : a.prices.find(p => p.fuel === fuel)!.price - b.prices.find(p => p.fuel === fuel)!.price;
    return diff || a.distanceKm - b.distanceKm || a.id.localeCompare(b.id);
  });
}
export interface StationCluster { key: string; latitude: number; longitude: number; stations: Station[] }
export function clusterStations(stations: Station[], region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }): StationCluster[] {
  const groups = new Map<string, Station[]>();
  const latCell = Math.max(region.latitudeDelta / 7, 0.00001), lngCell = Math.max(region.longitudeDelta / 7, 0.00001);
  for (const s of stations) {
    const key = region.latitudeDelta < 0.035 ? stationKey(s) : `${Math.floor(s.latitude / latCell)}:${Math.floor(s.longitude / lngCell)}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups].map(([key, stations]) => ({ key, latitude: stations.reduce((sum, s) => sum + s.latitude, 0) / stations.length, longitude: stations.reduce((sum, s) => sum + s.longitude, 0) / stations.length, stations }));
}
