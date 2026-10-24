import { spainAdapter } from "./es";
import { franceAdapter } from "./fr";
import { italyAdapter } from "./it";
import type { CountryAdapter, CountryCode } from "../types";

function planned(
  code: CountryCode,
  status: CountryAdapter["status"],
  sourceName: string,
  sourceUrl: string
): CountryAdapter {
  return {
    code,
    status,
    sourceName,
    sourceUrl,
    async listStations() {
      throw new Error(`Adapter ${code} not enabled yet`);
    }
  };
}

export const adapters: Record<CountryCode, CountryAdapter> = {
  ES: spainAdapter,
  FR: franceAdapter,
  IT: italyAdapter,
  DE: planned("DE", "approval_required", "Bundeskartellamt · MTS-K", "https://www.bundeskartellamt.de/"),
  AT: planned("AT", "planned", "E-Control · Spritpreisrechner", "https://www.spritpreisrechner.at/"),
  PT: planned("PT", "licensing_review", "DGEG · Preços dos combustíveis", "https://precoscombustiveis.dgeg.gov.pt/"),
  GR: planned("GR", "planned", "Fuel Prices Observatory", "https://www.fuelprices.gr/"),
  SI: planned("SI", "planned", "Goriva.si", "https://www.goriva.si/"),
  GB: planned("GB", "planned", "UK Fuel Finder", "https://www.gov.uk/government/collections/fuel-finder")
};
