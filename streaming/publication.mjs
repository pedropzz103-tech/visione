import { getLocale, SUPPORTED_LOCALES } from "./config.mjs";

const LAUNCH_MARKETS = Object.freeze(SUPPORTED_LOCALES.map((locale) => getLocale(locale).country));

function validTimestamp(value) {
  return Boolean(value) && !Number.isNaN(Date.parse(String(value)));
}

export function hasCompleteCover(title) {
  const kind = String(title?.artwork?.kind ?? "").trim();
  if (kind === "editorial-cover") return true;
  if (kind === "source-image" && String(title?.poster ?? "").trim()) return true;
  // Backward compatibility for already-synced TVmaze records while artwork
  // metadata is gradually backfilled.
  if (String(title?.poster ?? "").trim()) return true;
  return false;
}

export function verifiedOffersForMarket(title, market) {
  const country = String(market ?? "").toUpperCase();
  if (!LAUNCH_MARKETS.includes(country)) return [];
  if (title?.availability_status?.[country] !== "available") return [];
  if (!validTimestamp(title?.availability_updated_at)) return [];
  const offers = Array.isArray(title?.offers?.[country]) ? title.offers[country] : [];
  return offers.filter((offer) => {
    if (!offer?.provider || !offer?.monetization) return false;
    const destination = String(offer.affiliate_url || offer.url || "").trim();
    return /^https?:\/\//i.test(destination);
  });
}

export function isPublicInMarket(title, market) {
  return hasCompleteCover(title) && verifiedOffersForMarket(title, market).length > 0;
}

export function publicMarkets(title) {
  return LAUNCH_MARKETS.filter((market) => isPublicInMarket(title, market));
}

export function isPublicAnywhere(title) {
  return publicMarkets(title).length > 0;
}
