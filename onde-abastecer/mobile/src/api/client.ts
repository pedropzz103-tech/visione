import { DEMO_STATIONS } from "../data/demoStations";
import type { CountryCode, FuelType, Station } from "../types";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === "1" || !API_URL;

export async function getStations(params: {
  country: CountryCode;
  latitude: number;
  longitude: number;
  radiusKm: number;
  fuel: FuelType;
}): Promise<{ stations: Station[]; demo: boolean; message?: string }> {
  if (DEMO_MODE) {
    return {
      stations: DEMO_STATIONS,
      demo: true,
      message: "Modo demo: configure EXPO_PUBLIC_API_URL para dados ao vivo."
    };
  }

  const search = new URLSearchParams({
    country: params.country,
    lat: String(params.latitude),
    lng: String(params.longitude),
    radiusKm: String(params.radiusKm),
    fuel: params.fuel
  });

  const response = await fetch(`${API_URL}/v1/stations?${search.toString()}`);
  const payload = await response.json() as {
    stations?: Station[];
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    return {
      stations: [],
      demo: false,
      message: payload.message ?? payload.error ?? "Não foi possível carregar preços."
    };
  }

  return { stations: payload.stations ?? [], demo: false, message: payload.message };
}
