import type { Station } from "../types";

export const DEMO_STATIONS: Station[] = [
  {
    id: "demo-1",
    country: "ES",
    name: "Posto Demo Norte",
    address: "Demonstração · dados não reais",
    latitude: 42.255,
    longitude: -8.72,
    prices: [
      { fuel: "gasoline95", price: 1.449, currency: "EUR" },
      { fuel: "diesel", price: 1.389, currency: "EUR" }
    ],
    source: "Modo demo",
    priceBand: 1,
    isDemo: true
  },
  {
    id: "demo-2",
    country: "ES",
    name: "Posto Demo Centro",
    address: "Demonstração · dados não reais",
    latitude: 42.238,
    longitude: -8.714,
    prices: [
      { fuel: "gasoline95", price: 1.529, currency: "EUR" },
      { fuel: "diesel", price: 1.479, currency: "EUR" }
    ],
    source: "Modo demo",
    priceBand: 3,
    isDemo: true
  },
  {
    id: "demo-3",
    country: "ES",
    name: "Posto Demo Sul",
    address: "Demonstração · dados não reais",
    latitude: 42.218,
    longitude: -8.735,
    prices: [
      { fuel: "gasoline95", price: 1.619, currency: "EUR" },
      { fuel: "diesel", price: 1.559, currency: "EUR" }
    ],
    source: "Modo demo",
    priceBand: 5,
    isDemo: true
  }
];
