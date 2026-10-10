import { distanceKm } from "../lib/geo";
import type { CountryAdapter, FuelPrice, FuelType, Station } from "../types";

const ENDPOINT =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

const FUEL_KEYS: Record<FuelType, string> = {
  gasoline95: "Precio Gasolina 95 E5",
  gasoline98: "Precio Gasolina 98 E5",
  diesel: "Precio Gasoleo A",
  dieselPremium: "Precio Gasoleo Premium",
  lpg: "Precio Gases licuados del petróleo"
};

function decimal(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function fuelPrices(raw: Record<string, unknown>, updatedAt?: string): FuelPrice[] {
  const prices: FuelPrice[] = [];

  for (const [fuel, key] of Object.entries(FUEL_KEYS) as Array<[FuelType, string]>) {
    const price = decimal(raw[key]);
    if (price == null) continue;

    prices.push({
      fuel,
      price,
      currency: "EUR",
      updatedAt
    });
  }

  return prices;
}

export const spainAdapter: CountryAdapter = {
  code: "ES",
  status: "live",
  sourceName: "Ministerio · Geoportal de gasolineras",
  sourceUrl: ENDPOINT,

  async listStations(query) {
    const response = await fetch(ENDPOINT, {
      headers: { accept: "application/json" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });

    if (!response.ok) throw new Error(`Spain source returned ${response.status}`);

    const payload = await response.json() as {
      Fecha?: string;
      ListaEESSPrecio?: Array<Record<string, unknown>>;
    };

    const sourceUpdatedAt = payload.Fecha;
    const rows = payload.ListaEESSPrecio ?? [];

    return rows.flatMap((raw): Station[] => {
      const latitude = decimal(raw["Latitud"]);
      const longitude = decimal(raw["Longitud (WGS84)"]);
      if (latitude == null || longitude == null) return [];

      if (
        distanceKm(
          { latitude: query.latitude, longitude: query.longitude },
          { latitude, longitude }
        ) > query.radiusKm
      ) {
        return [];
      }

      const prices = fuelPrices(raw, sourceUpdatedAt);
      if (!prices.some((price) => price.fuel === query.fuel)) return [];

      const brand = String(raw["Rótulo"] ?? "").trim() || undefined;
      const street = String(raw["Dirección"] ?? "").trim();
      const town = String(raw["Municipio"] ?? "").trim();
      const province = String(raw["Provincia"] ?? "").trim();
      const address = [street, town, province].filter(Boolean).join(", ");

      return [{
        id: String(raw["IDEESS"] ?? `${latitude},${longitude}`),
        country: "ES",
        name: brand ?? "Estación de servicio",
        brand,
        address,
        latitude,
        longitude,
        prices,
        openingHours: String(raw["Horario"] ?? "").trim() || undefined,
        source: "Ministerio · Geoportal de gasolineras",
        sourceUpdatedAt
      }];
    });
  }
};
