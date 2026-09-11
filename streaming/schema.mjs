import { getLocale, SUPPORTED_LOCALES } from "./config.mjs";

const VALID_TYPES = new Set(["movie", "series"]);
const VALID_MONETIZATION = new Set(["subscription", "free", "rent", "buy"]);
const OFFER_PRIORITY = Object.freeze({ subscription: 0, free: 1, rent: 2, buy: 3 });

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeTextMap(value) {
  const map = asObject(value);
  return Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, String(map[locale] ?? "").trim()]));
}

function normalizeTimestamp(value, label) {
  const timestamp = String(value ?? "").trim();
  if (!timestamp) return null;
  if (Number.isNaN(Date.parse(timestamp))) throw new Error(`Invalid ${label}: ${timestamp}`);
  return timestamp;
}

function normalizeOffer(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Offer must be an object");
  const provider = String(raw.provider ?? "").trim();
  const monetization = String(raw.monetization ?? "").trim();
  if (!provider) throw new Error("Offer provider is required");
  if (!VALID_MONETIZATION.has(monetization)) throw new Error(`Unsupported monetization: ${monetization}`);

  let price = null;
  if (raw.price !== null && raw.price !== undefined && raw.price !== "") {
    price = Number(raw.price);
    if (!Number.isFinite(price) || price < 0) throw new Error("Offer price must be a non-negative number");
  }

  return {
    provider,
    monetization,
    price,
    currency: raw.currency ? String(raw.currency).toUpperCase() : null,
    url: raw.url ? String(raw.url) : null,
    quality: raw.quality ? String(raw.quality) : null,
    affiliate_url: raw.affiliate_url ? String(raw.affiliate_url) : null,
    is_affiliate: Boolean(raw.is_affiliate),
    sponsored: Boolean(raw.sponsored),
    attribution: Array.isArray(raw.attribution) ? raw.attribution.map(String) : [],
    evidence_url: raw.evidence_url ? String(raw.evidence_url) : null,
    verified_at: normalizeTimestamp(raw.verified_at, "offer.verified_at")
  };
}

function normalizeArtwork(raw, poster) {
  const artwork = asObject(raw);
  const kind = String(artwork.kind ?? (poster ? "source-image" : "none")).trim();
  const allowedKinds = new Set(["source-image", "editorial-cover", "none"]);
  return {
    kind: allowedKinds.has(kind) ? kind : "none",
    source: artwork.source ? String(artwork.source) : (poster ? "legacy" : null),
    license: artwork.license ? String(artwork.license) : null,
    credit: artwork.credit ? String(artwork.credit) : null,
    source_url: artwork.source_url ? String(artwork.source_url) : null
  };
}

function normalizeDiscovery(raw) {
  const discovery = asObject(raw);
  const score = Number(discovery.score);
  const sitelinks = Number(discovery.sitelinks);
  return {
    source: discovery.source ? String(discovery.source) : null,
    discovered_at: normalizeTimestamp(discovery.discovered_at, "discovery.discovered_at"),
    score: Number.isFinite(score) ? score : 0,
    sitelinks: Number.isFinite(sitelinks) && sitelinks >= 0 ? sitelinks : 0
  };
}

export function normalizeTitle(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Title record must be an object");
  const id = String(raw.id ?? "").trim();
  const type = String(raw.type ?? "").trim();
  const slug = String(raw.slug ?? "").trim();
  if (!id) throw new Error("Title id is required");
  if (!VALID_TYPES.has(type)) throw new Error(`Unsupported title type: ${type}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid title slug: ${slug}`);

  const offers = asObject(raw.offers);
  const availabilityStatus = asObject(raw.availability_status);
  const normalizedOffers = {};
  const normalizedAvailability = {};

  for (const locale of SUPPORTED_LOCALES) {
    const { country } = getLocale(locale);
    normalizedOffers[country] = Array.isArray(offers[country]) ? offers[country].map(normalizeOffer) : [];
    const state = String(availabilityStatus[country] ?? "unknown");
    normalizedAvailability[country] = ["available", "unavailable", "unknown", "error"].includes(state) ? state : "unknown";
  }

  const poster = raw.poster ? String(raw.poster) : null;

  return {
    id,
    type,
    slug,
    titles: normalizeTextMap(raw.titles),
    original_title: raw.original_title ? String(raw.original_title).trim() : null,
    year: Number.isInteger(raw.year) ? raw.year : Number(raw.year) || null,
    runtime: raw.runtime == null ? null : Number(raw.runtime) || null,
    seasons: raw.seasons == null ? null : Number(raw.seasons) || null,
    overview: normalizeTextMap(raw.overview),
    genres: Array.isArray(raw.genres) ? raw.genres.map(String).filter(Boolean) : [],
    poster,
    backdrop: raw.backdrop ? String(raw.backdrop) : null,
    artwork: normalizeArtwork(raw.artwork, poster),
    discovery: normalizeDiscovery(raw.discovery),
    rating: raw.rating && typeof raw.rating === "object" ? { value: Number(raw.rating.value) || null, source: String(raw.rating.source ?? "") } : null,
    credits: asObject(raw.credits),
    related: Array.isArray(raw.related) ? raw.related.map(String) : [],
    offers: normalizedOffers,
    availability_status: normalizedAvailability,
    updated_at: normalizeTimestamp(raw.updated_at, "updated_at"),
    availability_updated_at: normalizeTimestamp(raw.availability_updated_at, "availability_updated_at"),
    source: asObject(raw.source)
  };
}

export function rankOffers(offers = []) {
  return [...offers].sort((a, b) => {
    const pa = OFFER_PRIORITY[a.monetization] ?? 99;
    const pb = OFFER_PRIORITY[b.monetization] ?? 99;
    if (pa !== pb) return pa - pb;
    if (["rent", "buy"].includes(a.monetization)) {
      const aPrice = Number.isFinite(a.price) ? a.price : Number.POSITIVE_INFINITY;
      const bPrice = Number.isFinite(b.price) ? b.price : Number.POSITIVE_INFINITY;
      if (aPrice !== bPrice) return aPrice - bPrice;
    }
    return String(a.provider).localeCompare(String(b.provider));
  });
}

export function evaluateIndexability(title, locale) {
  const config = getLocale(locale);
  const reasons = [];
  const localizedTitle = title.titles?.[locale]?.trim();
  const overview = title.overview?.[locale]?.trim();

  if (!localizedTitle) reasons.push("missing-localized-title");
  if (!VALID_TYPES.has(title.type)) reasons.push("invalid-media-type");
  if (!Number.isInteger(title.year) || title.year < 1888 || title.year > 2100) reasons.push("invalid-year");
  if (!overview || overview.length < 40) reasons.push("insufficient-overview");
  if (!title.updated_at || Number.isNaN(Date.parse(title.updated_at))) reasons.push("missing-freshness");

  const offers = title.offers?.[config.country] ?? [];
  const state = title.availability_status?.[config.country] ?? "unknown";
  const usefulAvailability = offers.length > 0 || state === "unavailable";
  if (!usefulAvailability) {
    reasons.push("availability-not-verified");
  } else if (!title.availability_updated_at || Number.isNaN(Date.parse(title.availability_updated_at))) {
    reasons.push("missing-availability-freshness");
  }

  if (offers.length > 0) {
    for (const offer of offers) {
      if (!offer.provider || !VALID_MONETIZATION.has(offer.monetization)) reasons.push("invalid-offer");
      if ((offer.monetization === "rent" || offer.monetization === "buy") && offer.price != null && !offer.currency) {
        reasons.push("priced-offer-missing-currency");
      }
    }
  }

  return { indexable: reasons.length === 0, reasons };
}

export function bestOfferSummary(title, locale) {
  const { country } = getLocale(locale);
  const ranked = rankOffers(title.offers?.[country] ?? []);
  const first = ranked[0] ?? null;
  if (!first) return null;
  if (first.monetization === "subscription") return { kind: "subscription", offer: first };
  if (first.monetization === "free") return { kind: "free", offer: first };
  if (first.monetization === "rent") return { kind: "lowest-rental", offer: first };
  return { kind: "lowest-purchase", offer: first };
}
