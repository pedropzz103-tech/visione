export type CountryCode = "ES" | "FR" | "DE" | "AT" | "IT" | "PT" | "GR" | "SI" | "GB";
export type FuelType = "gasoline95" | "gasoline98" | "diesel" | "dieselPremium" | "lpg";
export type PriceBand = 1 | 2 | 3 | 4 | 5;

export interface FuelPrice {
  fuel: FuelType;
  price: number;
  currency: "EUR" | "GBP";
  updatedAt?: string;
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
  source: string;
  sourceUpdatedAt?: string;
  priceBand?: PriceBand;
}

export interface StationQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  fuel: FuelType;
}

export interface CountryAdapter {
  code: CountryCode;
  status: "live" | "planned" | "approval_required" | "licensing_review";
  sourceName: string;
  sourceUrl: string;
  listStations(query: StationQuery): Promise<Station[]>;
}
