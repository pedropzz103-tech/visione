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
  isDemo?: boolean;
}
