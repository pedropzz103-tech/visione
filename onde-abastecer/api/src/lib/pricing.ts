import type { FuelType, PriceBand, Station } from "../types";

export function addRelativePriceBands(stations: Station[], fuel: FuelType): Station[] {
  const priced = stations
    .map((station) => station.prices.find((price) => price.fuel === fuel)?.price)
    .filter((price): price is number => typeof price === "number" && Number.isFinite(price))
    .sort((a, b) => a - b);

  if (!priced.length) return stations;

  function bandFor(price: number): PriceBand {
    if (priced.length === 1) return 3;
    const rank = priced.filter((item) => item <= price).length / priced.length;
    if (rank <= 0.2) return 1;
    if (rank <= 0.4) return 2;
    if (rank <= 0.6) return 3;
    if (rank <= 0.8) return 4;
    return 5;
  }

  return stations.map((station) => {
    const price = station.prices.find((item) => item.fuel === fuel)?.price;
    return { ...station, priceBand: price == null ? undefined : bandFor(price) };
  });
}
