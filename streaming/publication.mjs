import { getLocale, MARKET_LOCALES } from "./config.mjs";

const LAUNCH_MARKETS = Object.freeze([...new Set(MARKET_LOCALES.map((locale) => getLocale(locale).country))]);

function validTimestamp(value) {
  return Boolean(value) && !Number.isNaN(Date.parse(String(value)));
}

function attributionFreeArtworkLicense(value) {
  const license = String(value ?? "").trim().toLowerCase();
  if (!license) return false;
  return /^(?:public domain(?: mark)?|cc0(?: 1\.0)?)$/.test(license);
}

function tvmazeAttributedArtwork(title) {
  const source = String(title?.artwork?.source ?? "").trim().toLowerCase();
  const license = String(title?.artwork?.license ?? "").trim().toLowerCase();
  const sourceUrl = String(title?.source?.tvmaze_url ?? "").trim();
  const poster = String(title?.poster ?? "").trim();
  return source === "tvmaze"
    && /^cc by-sa(?:\s*[0-9.]+)?$/.test(license)
    && /^https:\/\/www\.tvmaze\.com\/shows\//i.test(sourceUrl)
    && /^https:\/\/static\.tvmaze\.com\/uploads\/images\//i.test(poster);
}

export function hasCompleteCover(title) {
  const kind = String(title?.artwork?.kind ?? "").trim();
  if (kind === "editorial-cover") return true;
  if (kind === "source-image" && String(title?.poster ?? "").trim()) {
    if (attributionFreeArtworkLicense(title?.artwork?.license)) return true;
    if (tvmazeAttributedArtwork(title)) return true;
  }
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
