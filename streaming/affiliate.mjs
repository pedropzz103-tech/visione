import { normalizeTitle } from "./schema.mjs";

function approvedConfigMap(config = []) {
  const map = new Map();
  for (const entry of config) {
    if (!entry || entry.status !== "approved") continue;
    const provider = String(entry.provider ?? "").trim();
    const market = String(entry.market ?? "").trim().toUpperCase();
    const template = String(entry.template ?? "").trim();
    if (!provider || !market || !template.includes("{url}")) continue;
    map.set(`${market}:${provider}`, { ...entry, provider, market, template });
  }
  return map;
}

function trackedUrl(template, destination) {
  return template.replaceAll("{url}", encodeURIComponent(destination));
}

export function applyAffiliateConfig(rawTitle, config = []) {
  const title = normalizeTitle(rawTitle);
  const approved = approvedConfigMap(config);
  const offers = Object.fromEntries(Object.entries(title.offers).map(([market, values]) => [
    market,
    values.map((offer) => {
      const cfg = approved.get(`${market}:${offer.provider}`);
      if (!cfg) return offer;
      const destination = String(offer.url ?? "").trim();
      if (!/^https?:\/\//i.test(destination)) return offer;
      return {
        ...offer,
        affiliate_url: trackedUrl(cfg.template, destination),
        is_affiliate: true,
        sponsored: true
      };
    })
  ]));

  return normalizeTitle({ ...title, offers });
}

export function applyAffiliateConfigToCatalog(titles = [], config = []) {
  return titles.map((title) => applyAffiliateConfig(title, config));
}
