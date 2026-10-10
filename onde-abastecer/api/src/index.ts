import { adapters } from "./countries/registry";
import { addRelativePriceBands } from "./lib/pricing";
import type { CountryCode, FuelType } from "./types";

const FUEL_TYPES = new Set<FuelType>([
  "gasoline95",
  "gasoline98",
  "diesel",
  "dieselPremium",
  "lpg"
]);

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("access-control-allow-origin", "*");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function numberParam(url: URL, key: string, fallback?: number) {
  const raw = url.searchParams.get(key);
  if (raw == null && fallback != null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,OPTIONS",
          "access-control-allow-headers": "content-type"
        }
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "onde-abastecer-api", version: "0.1.0" });
    }

    if (url.pathname === "/v1/countries") {
      return json({
        countries: Object.values(adapters).map(({ code, status, sourceName, sourceUrl }) => ({
          code,
          status,
          sourceName,
          sourceUrl
        }))
      });
    }

    if (url.pathname === "/v1/stations") {
      const country = (url.searchParams.get("country") ?? "ES").toUpperCase() as CountryCode;
      const adapter = adapters[country];
      if (!adapter) return json({ error: "unsupported_country" }, { status: 400 });

      if (adapter.status !== "live") {
        return json({
          error: "country_not_live_yet",
          message: `${country} está no registro de lançamento, mas a integração ainda não está habilitada.`,
          country,
          status: adapter.status
        }, { status: 501 });
      }

      const latitude = numberParam(url, "lat");
      const longitude = numberParam(url, "lng");
      const radiusKm = Math.min(100, Math.max(1, numberParam(url, "radiusKm", 25) ?? 25));
      const fuel = (url.searchParams.get("fuel") ?? "gasoline95") as FuelType;

      if (latitude == null || longitude == null) {
        return json({ error: "lat_and_lng_required" }, { status: 400 });
      }
      if (!FUEL_TYPES.has(fuel)) {
        return json({ error: "invalid_fuel" }, { status: 400 });
      }

      try {
        const stations = await adapter.listStations({ latitude, longitude, radiusKm, fuel });
        const ranked = addRelativePriceBands(stations, fuel);

        return json({
          country,
          fuel,
          radiusKm,
          count: ranked.length,
          source: { name: adapter.sourceName, url: adapter.sourceUrl },
          stations: ranked
        });
      } catch (error) {
        return json({
          error: "source_unavailable",
          message: error instanceof Error ? error.message : "Unknown source error"
        }, { status: 502 });
      }
    }

    return json({ error: "not_found" }, { status: 404 });
  }
};
