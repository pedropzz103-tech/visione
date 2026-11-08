import type { Currency, FuelPrice, PriceUnit } from './types';
import { priceFreshness } from './normalization';
export type Detour = { mode: 'return'; oneWayKm: number } | { mode: 'route'; additionalKm: number };
export interface SavingsInput { reference: FuelPrice; candidate: FuelPrice; liters: number; consumptionLitersPer100Km: number; detour?: Detour; now?: number }
export type SavingsResult = { status: 'insufficient'; reason: string } | { status: 'ok'; currency: Currency; liters: number; gross: number; travelCost: number; net: number; additionalKm: number; candidateCost: number; referenceCost: number };
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function pricePerLiter(price: number, unit: PriceUnit): number | undefined {
  if (!Number.isFinite(price) || price <= 0) return undefined;
  if (unit === 'L') return price;
  if (unit === 'US_gal') return price / 3.785411784;
  if (unit === 'Imperial_gal') return price / 4.54609;
  return undefined;
}
export function fillVolume(capacity: number, remainingPercent: number, targetPercent = 100): number | undefined {
  if (![capacity, remainingPercent, targetPercent].every(Number.isFinite) || capacity <= 0 || remainingPercent < 0 || targetPercent > 100 || targetPercent <= remainingPercent) return undefined;
  return capacity * (targetPercent - remainingPercent) / 100;
}
export function calculateSavings(input: SavingsInput): SavingsResult {
  const { reference, candidate, liters, consumptionLitersPer100Km: consumption, detour, now } = input;
  const insufficient = (reason: string): SavingsResult => ({ status: 'insufficient', reason });
  if (!reference || !candidate || reference.currency !== candidate.currency) return insufficient('currency');
  if (reference.fuel !== candidate.fuel) return insufficient('fuel');
  if ((reference.serviceMode ?? 'unknown') !== (candidate.serviceMode ?? 'unknown')) return insufficient('service_mode');
  const basePrice = pricePerLiter(reference.price, reference.unit);
  const candidatePrice = pricePerLiter(candidate.price, candidate.unit);
  if (basePrice == null || candidatePrice == null) return insufficient('unit_or_price');
  if (priceFreshness(reference, now) !== 'fresh' || priceFreshness(candidate, now) !== 'fresh') return insufficient('timestamp');
  if (![liters, consumption].every(Number.isFinite) || liters <= 0 || consumption <= 0) return insufficient('vehicle');
  if (!detour) return insufficient('road_distance');
  const additionalKm = detour.mode === 'return' ? detour.oneWayKm * 2 : detour.additionalKm;
  if (!Number.isFinite(additionalKm) || additionalKm < 0) return insufficient('road_distance');
  const referenceCost = basePrice * liters;
  const candidateCost = candidatePrice * liters;
  const gross = referenceCost - candidateCost;
  // Conservatively value driving fuel at the known reference price; never infer routing.
  const travelCost = additionalKm / 100 * consumption * basePrice;
  return { status: 'ok', currency: reference.currency, liters, additionalKm, referenceCost: round(referenceCost), candidateCost: round(candidateCost), gross: round(gross), travelCost: round(travelCost), net: round(gross - travelCost) };
}
