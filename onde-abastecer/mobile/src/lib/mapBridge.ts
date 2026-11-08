import { validCoordinates } from '../../../shared/normalization';
import type { MapRegion } from '../components/mapTypes';
export type MapMessage = { type: 'ready' } | { type: 'select'; key: string } | ({ type: 'region' } & MapRegion);
export function parseMapMessage(raw: string): MapMessage | undefined {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') return undefined;
    if (value.type === 'ready') return { type: 'ready' };
    if (value.type === 'select' && typeof value.key === 'string' && value.key.length <= 200) return { type: 'select', key: value.key };
    if (value.type === 'region' && validCoordinates(value.latitude, value.longitude) && Number.isFinite(value.latitudeDelta) && value.latitudeDelta > 0 && value.latitudeDelta <= 180 && Number.isFinite(value.longitudeDelta) && value.longitudeDelta > 0 && value.longitudeDelta <= 360) {
      return { type: 'region', latitude: value.latitude, longitude: value.longitude, latitudeDelta: value.latitudeDelta, longitudeDelta: value.longitudeDelta };
    }
  } catch { /* The embedded document cannot send arbitrary objects into native UI. */ }
  return undefined;
}
