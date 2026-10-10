import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

import { distanceKm } from "../lib/geo";
import type { CountryAdapter, FuelPrice, FuelType, Station } from "../types";

const ENDPOINT = "https://donnees.roulez-eco.fr/opendata/instantane";

type AnyRecord = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object") {
    const raw = (value as AnyRecord)["#text"];
    if (typeof raw === "string" || typeof raw === "number") return String(raw).trim();
  }
  return "";
}

function parseCoordinate(value: unknown): number | undefined {
  const parsed = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(parsed)) return undefined;
  return parsed / 100000;
}

function normalizeFuel(name: string): FuelType | undefined {
  const fuel = name.trim().toUpperCase();
  if (fuel === "GAZOLE") return "diesel";
  if (fuel === "SP95" || fuel === "E10") return "gasoline95";
  if (fuel === "SP98") return "gasoline98";
  if (fuel === "GPLC") return "lpg";
  return undefined;
}

function choosePrices(rawPrices: AnyRecord[]): FuelPrice[] {
  const byFuel = new Map<FuelType, FuelPrice>();

  for (const raw of rawPrices) {
    const fuel = normalizeFuel(String(raw.nom ?? ""));
    if (!fuel) continue;

    const price = Number(String(raw.valeur ?? "").replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) continue;

    const candidate: FuelPrice = {
      fuel,
      price,
      currency: "EUR",
      updatedAt: String(raw.maj ?? "").trim() || undefined
    };

    const current = byFuel.get(fuel);
    if (!current) {
      byFuel.set(fuel, candidate);
      continue;
    }

    // Para gasolina 95, o feed francês pode ter SP95 e E10.
    // Mantemos o menor preço disponível da família para o MVP.
    if (candidate.price < current.price) byFuel.set(fuel, candidate);
  }

  return [...byFuel.values()];
}

export const franceAdapter: CountryAdapter = {
  code: "FR",
  status: "live",
  sourceName: "Prix des carburants · Open Data France",
  sourceUrl: ENDPOINT,

  async listStations(query) {
    const response = await fetch(ENDPOINT, {
      headers: { accept: "application/zip, application/octet-stream" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });

    if (!response.ok) throw new Error(`France source returned ${response.status}`);

    const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const xmlEntry = Object.entries(archive).find(([name]) => name.toLowerCase().endsWith(".xml"));
    if (!xmlEntry) throw new Error("France feed did not contain XML");

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "#text",
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true
    });

    const parsed = parser.parse(new TextDecoder().decode(xmlEntry[1])) as AnyRecord;
    const list = (parsed.pdv_liste ?? {}) as AnyRecord;
    const rows = asArray(list.pdv as AnyRecord | AnyRecord[] | undefined);

    return rows.flatMap((raw): Station[] => {
      const latitude = parseCoordinate(raw.latitude);
      const longitude = parseCoordinate(raw.longitude);
      if (latitude == null || longitude == null) return [];

      const km = distanceKm(
        { latitude: query.latitude, longitude: query.longitude },
        { latitude, longitude }
      );
      if (km > query.radiusKm) return [];

      const prices = choosePrices(asArray(raw.prix as AnyRecord | AnyRecord[] | undefined));
      if (!prices.some((price) => price.fuel === query.fuel)) return [];

      const address = textValue(raw.adresse);
      const city = textValue(raw.ville);
      const postalCode = String(raw.cp ?? "").trim();
      const fullAddress = [address, postalCode, city].filter(Boolean).join(", ");

      return [{
        id: String(raw.id ?? `${latitude},${longitude}`),
        country: "FR",
        name: city ? `Station-service · ${city}` : "Station-service",
        address: fullAddress,
        latitude,
        longitude,
        prices,
        openingHours: undefined,
        source: "Prix des carburants · Open Data France",
        sourceUpdatedAt: prices
          .map((price) => price.updatedAt)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1)
      }];
    });
  }
};
