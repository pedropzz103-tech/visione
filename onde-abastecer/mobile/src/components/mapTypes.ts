import type { FuelType, Station } from '../types';
export interface MapRegion { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }
export interface StationMapProps { center: MapRegion; stations: Station[]; fuel: FuelType; onSelect: (station: Station) => void; onRegionChange: (region: MapRegion) => void; locationGranted: boolean }
