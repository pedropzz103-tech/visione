export type CountryCode = 'ES' | 'FR' | 'DE' | 'AT' | 'IT' | 'PT' | 'GR' | 'SI' | 'GB';
export const FUELS = ['gasoline95', 'gasoline95e10', 'gasoline98', 'diesel', 'dieselPremium', 'lpg'] as const;
export type FuelType = typeof FUELS[number];
export type Currency = 'EUR' | 'GBP' | 'USD' | 'CAD' | 'AUD' | 'BRL';
export type PriceUnit = 'L' | 'US_gal' | 'Imperial_gal' | 'kg' | 'kWh' | 'session';
export type PriceBand = 1 | 2 | 3 | 4 | 5;
export interface FuelPrice {
  fuel: FuelType;
  price: number;
  label?: string;
  currency: Currency;
  unit: PriceUnit;
  updatedAt?: string;
  reportedAt?: string;
  timestampKind?: 'price' | 'feed';
  serviceMode?: 'self' | 'attended' | 'unknown';
}
export interface Station {
  id: string;
  country: CountryCode;
  name: string;
  brand?: string;
  address: string;
  latitude: number;
  longitude: number;
  prices: FuelPrice[];
  openingHours?: string;
  services?: string[];
  automated24h?: boolean;
  source: string;
  sourceUrl?: string;
  sourceUpdatedAt?: string;
  priceBand?: PriceBand;
}
export interface StationQuery { latitude: number; longitude: number; radiusKm: number; fuel: FuelType }
export interface SearchQuery extends StationQuery { country: CountryCode }
export type Category = 'fuel' | 'groceries' | 'charging' | 'pharmacy' | 'electronics' | 'home';
export interface CategoryAvailability { category: Category; status: 'enabled' | 'planned'; reason?: string }
