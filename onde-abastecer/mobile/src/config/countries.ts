import type { CountryCode, FuelType } from "../types";

export const LAUNCH_COUNTRIES: Array<{ code: CountryCode; name: string; flag: string }> = [
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "DE", name: "Deutschland", flag: "🇩🇪" },
  { code: "AT", name: "Österreich", flag: "🇦🇹" },
  { code: "IT", name: "Italia", flag: "🇮🇹" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "GR", name: "Ελλάδα", flag: "🇬🇷" },
  { code: "SI", name: "Slovenija", flag: "🇸🇮" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" }
];

export const FUEL_LABELS: Record<FuelType, string> = {
  gasoline95: "Gasolina 95",
  gasoline98: "Gasolina 98",
  diesel: "Diesel",
  dieselPremium: "Diesel +",
  lpg: "GLP"
};

export const FUEL_TYPES = Object.keys(FUEL_LABELS) as FuelType[];
