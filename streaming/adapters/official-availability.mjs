import { normalizeTitle } from "../schema.mjs";

const ALLOWED_COUNTRIES = new Set(["ES", "PT", "BR"]);
const PROVIDER_HOSTS = Object.freeze({
  "disney-plus": new Set(["disneyplus.com", "www.disneyplus.com"]),
  "prime-video": new Set(["primevideo.com", "www.primevideo.com"]),
  netflix: new Set(["netflix.com", "www.netflix.com"]),
  max: new Set(["max.com", "www.max.com", "help.max.com"])
});

function normalizeText(value = "") {
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedName(value = "") {
  return normalizeText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function makeOffer({ provider, monetization, price = null, currency = null, url, attribution }) {
  return {
    provider,
    monetization,
    price,
    currency,
    url,
    quality: null,
    affiliate_url: null,
    is_affiliate: false,
    sponsored: false,
    attribution: [attribution]
  };
}

function hasNegativeAvailabilityEvidence(text) {
  const patterns = [
    /isn['’]?t available to watch in your country/i,
    /not available to watch in your country/i,
    /currently isn['’]?t available/i,
    /ya no est[aá] disponible/i,
    /no est[aá] disponible (?:en|para)/i,
    /j[aá] n[aã]o est[aá] dispon[ií]vel/i,
    /n[aã]o est[aá] dispon[ií]vel (?:na|no|para)/i,
    /indispon[ií]vel na sua regi[aã]o/i
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function detectCurrency(raw) {
  const value = String(raw ?? "");
  if (/€|\bEUR\b/i.test(value)) return "EUR";
  if (/\bUSD\b|US\$|\$/.test(value)) return "USD";
  if (/R\$|\bBRL\b/i.test(value)) return "BRL";
  return null;
}

function parseNumber(raw) {
  const value = String(raw ?? "").replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function priceAfterLabel(text, labels) {
  for (const label of labels) {
    const expression = new RegExp(`${label}[^0-9€$R]{0,30}(?:(EUR|USD|BRL|US\\$|R\\$|€|\\$)\\s*)?(\\d{1,4}(?:[.,]\\d{2})?)(?:\\s*(EUR|USD|BRL|US\\$|R\\$|€|\\$))?`, "i");
    const match = text.match(expression);
    if (!match) continue;
    const price = parseNumber(match[2]);
    const currency = detectCurrency(`${match[1] ?? ""} ${match[3] ?? ""}`);
    if (price != null && currency) return { price, currency };
  }
  return null;
}

function validateSource(provider, country, url) {
  if (!PROVIDER_HOSTS[provider]) throw new Error(`Unsupported official provider: ${provider}`);
  if (!ALLOWED_COUNTRIES.has(country)) throw new Error(`Unsupported country: ${country}`);
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Official provider evidence must use HTTPS");
  if (!PROVIDER_HOSTS[provider].has(parsed.hostname.toLowerCase())) {
    throw new Error(`Unexpected host for ${provider}: ${parsed.hostname}`);
  }
}

function parseDisneyPlus({ country, url, text }) {
  const positive = /(CONSEGUIR|GET|ASSINAR|ADERIR(?: AO)?|SUBSCRIBE TO)\s+(?:O\s+)?DISNEY\+/i.test(text);
  if (!positive) return { status: "unknown", offers: [], reason: "ambiguous-page-evidence" };
  return {
    status: "available",
    offers: [makeOffer({
      provider: "disney-plus",
      monetization: "subscription",
      url,
      attribution: `Availability evidence: official Disney+ public page (${country})`
    })],
    reason: null
  };
}

function parsePrimeVideo({ country, url, text }) {
  const offers = [];
  const attribution = `Availability evidence: official Prime Video public page (${country})`;
  const rent = priceAfterLabel(text, ["Alquilar(?:\\s+en)?(?:\\s+UHD|\\s+HD)?", "Alugar(?:\\s+em)?(?:\\s+UHD|\\s+HD)?", "Rent(?:\\s+UHD|\\s+HD)?"]);
  const buy = priceAfterLabel(text, ["Comprar(?:\\s+em)?(?:\\s+UHD|\\s+HD)?", "Buy(?:\\s+UHD|\\s+HD)?"]);

  if (rent) offers.push(makeOffer({ provider: "prime-video", monetization: "rent", ...rent, url, attribution }));
  if (buy) offers.push(makeOffer({ provider: "prime-video", monetization: "buy", ...buy, url, attribution }));

  const subscription = /(Suscr[ií]bete a Prime|Aderir ao Prime|Subscreva Prime|Assine (?:o )?Prime|Subscribe to Prime)/i.test(text);
  if (subscription) offers.unshift(makeOffer({ provider: "prime-video", monetization: "subscription", url, attribution }));

  return offers.length
    ? { status: "available", offers, reason: null }
    : { status: "unknown", offers: [], reason: "ambiguous-page-evidence" };
}

export function parseOfficialProviderPage({ provider, country, url, expectedTitle, text }) {
  validateSource(provider, country, url);
  const clean = normalizeText(text);
  const expected = normalizedName(expectedTitle);
  if (!expected) throw new Error("Expected title is required for official availability evidence");
  if (!normalizedName(clean).includes(expected)) {
    return { status: "unknown", offers: [], reason: "identity-not-confirmed" };
  }

  if (hasNegativeAvailabilityEvidence(clean)) {
    return { status: "unknown", offers: [], reason: "negative-or-unavailable-page-evidence" };
  }

  if (provider === "disney-plus") return parseDisneyPlus({ country, url, text: clean });
  if (provider === "prime-video") return parsePrimeVideo({ country, url, text: clean });

  // Netflix title pages may remain public even when a title is unavailable, and
  // Max help/marketing pages are not a reliable current catalog feed. Until an
  // authorized machine-readable source exists, do not promote those pages to
  // verified availability automatically.
  return { status: "unknown", offers: [], reason: "provider-not-safe-for-automatic-positive-inference" };
}

export function mergeOfficialAvailabilityEvidence(existingRaw, evidenceEntries = []) {
  const existing = normalizeTitle(existingRaw);
  const acceptedTitles = new Set([
    existing.original_title,
    existing.titles?.es,
    existing.titles?.pt,
    existing.titles?.br
  ].map(normalizedName).filter(Boolean));
  const offers = Object.fromEntries(Object.entries(existing.offers).map(([country, values]) => [country, [...values]]));
  const availabilityStatus = { ...existing.availability_status };
  let newestPositiveCheck = existing.availability_updated_at;
  let accepted = 0;

  for (const entry of evidenceEntries) {
    const checkedAt = String(entry?.checked_at ?? "").trim();
    if (!checkedAt || Number.isNaN(Date.parse(checkedAt))) {
      throw new Error("Official availability evidence requires a valid checked_at timestamp");
    }

    const expectedTitle = normalizedName(entry?.expectedTitle);
    if (!expectedTitle || !acceptedTitles.has(expectedTitle)) {
      throw new Error(`Official availability evidence title mismatch for ${existing.slug}`);
    }

    const parsed = parseOfficialProviderPage(entry);
    if (parsed.status !== "available" || parsed.offers.length === 0) continue;

    const country = entry.country;
    const provider = entry.provider;
    offers[country] = (offers[country] ?? []).filter((offer) => offer.provider !== provider);
    offers[country].push(...parsed.offers);
    availabilityStatus[country] = "available";
    accepted += 1;

    if (!newestPositiveCheck || Date.parse(checkedAt) > Date.parse(newestPositiveCheck)) {
      newestPositiveCheck = checkedAt;
    }
  }

  if (!accepted) return existing;

  return normalizeTitle({
    ...existing,
    offers,
    availability_status: availabilityStatus,
    availability_updated_at: newestPositiveCheck,
    source: {
      ...existing.source,
      availability: existing.source?.availability && existing.source.availability !== "unconfigured"
        ? `${existing.source.availability}+official-provider-evidence`
        : "official-provider-evidence"
    }
  });
}
