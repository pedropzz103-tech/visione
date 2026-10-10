import type { PriceBand } from "../types";

const BAND_COLORS: Record<PriceBand, string> = {
  1: "#16A34A",
  2: "#65A30D",
  3: "#EAB308",
  4: "#EA580C",
  5: "#DC2626"
};

export function colorForBand(band: PriceBand | undefined): string {
  return BAND_COLORS[band ?? 3];
}

export function formatPrice(price: number, currency: "EUR" | "GBP"): string {
  return currency === "GBP" ? `£${price.toFixed(3)}` : `${price.toFixed(3)} €`;
}

export function estimateNetSavings(params: {
  currentPricePerLiter: number;
  candidatePricePerLiter: number;
  liters: number;
  detourKm: number;
  consumptionLitersPer100Km: number;
}): number {
  const gross = (params.currentPricePerLiter - params.candidatePricePerLiter) * params.liters;
  const detourFuel = (params.detourKm / 100) * params.consumptionLitersPer100Km;
  return gross - detourFuel * params.candidatePricePerLiter;
}
