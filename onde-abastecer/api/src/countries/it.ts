import { distanceKm } from "../lib/geo";
import type { CountryAdapter, FuelPrice, FuelType, Station } from "../types";

const DATASET_PAGE =
  "https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti";

type Row = Record<string, string>;

function decode(bytes: ArrayBuffer): string {
  return new TextDecoder().decode(bytes);
}

function cleanHref(value: string) {
  return value.replaceAll("&amp;", "&").replaceAll("&#38;", "&");
}

async function resolveCsvLinks() {
  const page = await fetch(DATASET_PAGE, {
    headers: { accept: "text/html" },
    cf: { cacheTtl: 21600, cacheEverything: true }
  });
  if (!page.ok) throw new Error(`MIMIT dataset page returned ${page.status}`);

  const html = await page.text();
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => cleanHref(match[1]));

  const registryHref = hrefs.find((href) =>
    /anagrafica[^"'?]*impianti[^"'?]*attivi|anagrafica_impianti_attivi/i.test(href)
  );
  const pricesHref = hrefs.find((href) =>
    /prezzo[^"'?]*alle[^"'?]*8|prezzo_alle_8/i.test(href)
  );

  if (!registryHref || !pricesHref) {
    throw new Error("Could not resolve MIMIT CSV download links");
  }

  return {
    registryUrl: new URL(registryHref, DATASET_PAGE).toString(),
    pricesUrl: new URL(pricesHref, DATASET_PAGE).toString()
  };
}

function parseDelimited(text: string): { extractionDate?: string; rows: Row[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length);
  const extractionDate = lines[0]?.match(/(\d{4}-\d{2}-\d{2})/)?.[1];

  const headerIndex = lines.findIndex((line) => /id\s*impianto/i.test(line));
  if (headerIndex < 0) throw new Error("MIMIT CSV header not found");

  const headers = lines[headerIndex].split("|").map((value) => value.trim());

  const rows = lines.slice(headerIndex + 1).map((line) => {
    const values = line.split("|");
    const row: Row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? "").trim();
    });
    return row;
  });

  return { extractionDate, rows };
}

function get(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(row).find(
      (candidate) => candidate.replace(/\s+/g, "").toLowerCase() === key.replace(/\s+/g, "").toLowerCase()
    );
    if (found) return row[found] ?? "";
  }
  return "";
}

function number(value: string): number | undefined {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeFuel(description: string): FuelType | undefined {
  const value = description.trim().toLowerCase();

  if (value.includes("gasolio")) {
    if (value.includes("premium") || value.includes("special")) return "dieselPremium";
    return "diesel";
  }

  if (value.includes("benzina")) {
    if (value.includes("98") || value.includes("premium") || value.includes("special")) return "gasoline98";
    return "gasoline95";
  }

  if (value === "gpl" || value.includes(" gpl")) return "lpg";
  return undefined;
}

export const italyAdapter: CountryAdapter = {
  code: "IT",
  status: "live",
  sourceName: "MIMIT · Osservaprezzi carburanti",
  sourceUrl: DATASET_PAGE,

  async listStations(query) {
    const { registryUrl, pricesUrl } = await resolveCsvLinks();

    const [registryResponse, pricesResponse] = await Promise.all([
      fetch(registryUrl, { cf: { cacheTtl: 21600, cacheEverything: true } }),
      fetch(pricesUrl, { cf: { cacheTtl: 21600, cacheEverything: true } })
    ]);

    if (!registryResponse.ok) {
      throw new Error(`MIMIT registry returned ${registryResponse.status}`);
    }
    if (!pricesResponse.ok) {
      throw new Error(`MIMIT prices returned ${pricesResponse.status}`);
    }

    const registry = parseDelimited(decode(await registryResponse.arrayBuffer()));
    const prices = parseDelimited(decode(await pricesResponse.arrayBuffer()));

    const nearby = new Map<string, Station>();

    for (const raw of registry.rows) {
      const id = get(raw, "idImpianto", "idimpianto");
      const latitude = number(get(raw, "Latitudine"));
      const longitude = number(get(raw, "Longitudine"));
      if (!id || latitude == null || longitude == null) continue;

      const km = distanceKm(
        { latitude: query.latitude, longitude: query.longitude },
        { latitude, longitude }
      );
      if (km > query.radiusKm) continue;

      const brand = get(raw, "Bandiera") || undefined;
      const name = get(raw, "Nome Impianto", "NomeImpianto") || brand || "Distributore";
      const street = get(raw, "Indirizzo");
      const city = get(raw, "Comune");
      const province = get(raw, "Provincia");

      nearby.set(id, {
        id,
        country: "IT",
        name,
        brand,
        address: [street, city, province].filter(Boolean).join(", "),
        latitude,
        longitude,
        prices: [],
        source: "MIMIT · Osservaprezzi carburanti",
        sourceUpdatedAt: prices.extractionDate ?? registry.extractionDate
      });
    }

    type Candidate = FuelPrice & { selfService: boolean };
    const candidates = new Map<string, Map<FuelType, Candidate>>();

    for (const raw of prices.rows) {
      const id = get(raw, "idImpianto", "idimpianto");
      if (!nearby.has(id)) continue;

      const fuel = normalizeFuel(get(raw, "descCarburante"));
      if (!fuel) continue;

      const value = number(get(raw, "prezzo"));
      if (value == null || value <= 0) continue;

      const selfService = get(raw, "isSelf").trim() === "1";
      const candidate: Candidate = {
        fuel,
        price: value,
        currency: "EUR",
        updatedAt: get(raw, "dtComu") || prices.extractionDate,
        selfService
      };

      const byFuel = candidates.get(id) ?? new Map<FuelType, Candidate>();
      const current = byFuel.get(fuel);

      // Preferimos self-service; dentro da mesma modalidade, o menor preço.
      if (
        !current ||
        (candidate.selfService && !current.selfService) ||
        (candidate.selfService === current.selfService && candidate.price < current.price)
      ) {
        byFuel.set(fuel, candidate);
      }

      candidates.set(id, byFuel);
    }

    return [...nearby.values()].flatMap((station): Station[] => {
      const stationCandidates = candidates.get(station.id);
      if (!stationCandidates) return [];

      station.prices = [...stationCandidates.values()].map(({ selfService: _self, ...price }) => price);
      if (!station.prices.some((price) => price.fuel === query.fuel)) return [];
      return [station];
    });
  }
};
