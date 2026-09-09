import { MEDIA_TYPES, OFFER_TYPES } from "./config.mjs";

const emptyOffers = () => ({ ES: [], PT: [], BR: [] });
const emptyAvailability = () => ({ ES: "unknown", PT: "unknown", BR: "unknown" });

export function normalizeTitle(raw = {}) {
  return {
    id: raw.id ?? null,
    type: raw.type ?? null,
    slug: raw.slug ?? null,
    titles: { ...(raw.titles ?? {}) },
    original_title: raw.original_title ?? null,
    overview: { ...(raw.overview ?? {}) },
    year: raw.year ?? null,
    release_dates: { ...(raw.release_dates ?? {}) },
    runtime_minutes: raw.runtime_minutes ?? null,
    certification: { ...(raw.certification ?? {}) },
    genres: [...(raw.genres ?? [])],
    countries: [...(raw.countries ?? [])],
    keywords: [...(raw.keywords ?? [])],
    rating: raw.rating ?? null,
    poster: raw.poster ?? null,
    backdrop: raw.backdrop ?? null,
    credits: {
      directors: [...(raw.credits?.directors ?? [])],
      creators: [...(raw.credits?.creators ?? [])],
      cast: [...(raw.credits?.cast ?? [])],
    },
    seasons: [...(raw.seasons ?? [])],
    episodes: [...(raw.episodes ?? [])],
    trailers: [...(raw.trailers ?? [])],
    recommendations: [...(raw.recommendations ?? [])],
    offers: { ...emptyOffers(), ...(raw.offers ?? {}) },
    availability_status: { ...emptyAvailability(), ...(raw.availability_status ?? {}) },
    source: raw.source ? { ...raw.source } : null,
    updated_at: raw.updated_at ?? null,
  };
}

export function validateTitle(input) {
  const title = normalizeTitle(input);
  if (!title.id || !title.slug) throw new Error("Title id and slug are required");
  if (!MEDIA_TYPES.includes(title.type)) throw new Error(`Unsupported media type: ${title.type}`);

  for (const [country, offers] of Object.entries(title.offers)) {
    if (!Array.isArray(offers)) throw new Error(`Offers for ${country} must be an array`);
    for (const offer of offers) {
      if (!OFFER_TYPES.includes(offer.type)) throw new Error(`Unsupported offer type: ${offer.type}`);
      if (!offer.provider_id || !offer.url || !offer.source_url || !offer.verified_at) {
        throw new Error(`Offer in ${country} is missing provider, destination, source, or verification time`);
      }
      if (offer.price != null && (!Number.isFinite(offer.price) || !offer.currency)) {
        throw new Error(`Priced offer in ${country} requires a numeric price and currency`);
      }
    }
  }
  return title;
}

export function rankOffers(offers = []) {
  const typeRank = new Map(OFFER_TYPES.map((type, index) => [type, index]));
  const currencyOrder = new Map();
  for (const offer of offers) {
    if (offer.currency && !currencyOrder.has(offer.currency)) currencyOrder.set(offer.currency, currencyOrder.size);
  }

  return offers.map((offer, index) => ({ offer, index })).sort((left, right) => {
    const byType = (typeRank.get(left.offer.type) ?? 99) - (typeRank.get(right.offer.type) ?? 99);
    if (byType) return byType;
    if (left.offer.currency !== right.offer.currency) {
      return (currencyOrder.get(left.offer.currency) ?? 99) - (currencyOrder.get(right.offer.currency) ?? 99);
    }
    const leftPrice = left.offer.price ?? Number.POSITIVE_INFINITY;
    const rightPrice = right.offer.price ?? Number.POSITIVE_INFINITY;
    return leftPrice - rightPrice || left.index - right.index;
  }).map(({ offer }) => ({ ...offer }));
}

export function evaluateTitleQuality(input, locale) {
  const title = normalizeTitle(input);
  const countryByLocale = { es: "ES", pt: "PT", br: "BR" };
  const country = countryByLocale[locale];
  if (!country) throw new Error(`Unsupported locale for quality gate: ${locale}`);

  const reasons = [];
  if (!title.id || !title.slug || !MEDIA_TYPES.includes(title.type)) reasons.push("missing title identity");
  if (!title.titles[locale]?.trim()) reasons.push("missing localized title");
  if (!title.overview[locale] || title.overview[locale].trim().length < 60) reasons.push("missing useful localized overview");
  if (!Number.isInteger(title.year) || title.year < 1888) reasons.push("missing factual year metadata");
  if (!title.source?.name || !title.source?.url) reasons.push("missing source attribution");
  if (!title.updated_at || Number.isNaN(Date.parse(title.updated_at))) reasons.push("missing freshness timestamp");

  const status = title.availability_status[country];
  const offers = title.offers[country] ?? [];
  if (status === "confirmed" && offers.length === 0) reasons.push("confirmed availability has no offers");
  if (status !== "confirmed" && status !== "no_offers") reasons.push("availability is not currently sourced");

  return { indexable: reasons.length === 0, reasons };
}
