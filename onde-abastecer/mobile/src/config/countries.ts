import type { CountryCode, FuelType } from '../types';
export const LAUNCH_COUNTRIES: Array<{ code: CountryCode; name: string; flag: string; latitude: number; longitude: number; available: boolean }> = [
  { code: 'ES', name: 'España', flag: '🇪🇸', latitude: 42.2406, longitude: -8.7207, available: true },
  { code: 'FR', name: 'France', flag: '🇫🇷', latitude: 48.8566, longitude: 2.3522, available: true },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', latitude: 38.7223, longitude: -9.1393, available: true },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', latitude: 45.4642, longitude: 9.19, available: false },
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', latitude: 52.52, longitude: 13.405, available: false },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹', latitude: 48.2082, longitude: 16.3738, available: false },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', latitude: 51.5074, longitude: -0.1278, available: false },
  { code: 'GR', name: 'Ελλάδα', flag: '🇬🇷', latitude: 37.9838, longitude: 23.7275, available: false },
  { code: 'SI', name: 'Slovenija', flag: '🇸🇮', latitude: 46.0569, longitude: 14.5058, available: false }
];
export const FUEL_LABELS: Record<FuelType, string> = { gasoline95: '95 · E5 / blend unknown', gasoline95e10: '95 · E10', gasoline98: '98', diesel: 'Diesel', dieselPremium: 'Diesel +', lpg: 'LPG / GLP' };
export const FUEL_TYPES = Object.keys(FUEL_LABELS) as FuelType[];
