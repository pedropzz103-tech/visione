import { absoluteUrl, getLocale, localePath, providerPath, SUPPORTED_LOCALES, titlePath } from "./config.mjs";
import { copyFor, localizedName } from "./i18n.mjs";
import { rankOffers } from "./schema.mjs";

function esc(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function jsonLd(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function switcher(active) {
  return `<div class="locale-switcher" aria-label="Languages">${SUPPORTED_LOCALES.map((code) => `<a href="${localePath(code)}"${active === code ? ' aria-current="page"' : ""}>${code.toUpperCase()}</a>`).join("")}</div>`;
}

function search(locale) {
  const cfg = getLocale(locale);
  const c = copyFor(locale);
  return `<div class="search-module search-compact" data-visione-search data-locale="${locale}"><form role="search" action="${localePath(locale)}" class="search-form"><label class="sr-only" for="search-${locale}">${esc(cfg.searchPlaceholder)}</label><span class="search-icon" aria-hidden="true">⌕</span><input id="search-${locale}" data-search-input type="search" autocomplete="off" placeholder="${esc(cfg.searchPlaceholder)}"><button type="submit">${esc(c.search)}</button></form><div class="search-results" data-search-results hidden></div></div>`;
}

function header(locale) {
  const c = copyFor(locale);
  return `<header class="stream-header"><div class="stream-header-inner"><a class="visione-brand" href="${localePath(locale)}" aria-label="VISIONE"><img src="/visione-logo.webp" alt="" width="44" height="44"><span>VISIONE</span></a><div class="header-search">${search(locale)}</div><div class="stream-header-actions"><nav aria-label="Navigation"><a href="#movies">${esc(c.movies)}</a><a href="#series">${esc(c.series)}</a><a href="/news/">Wire</a></nav>${switcher(locale)}</div></div></header>`;
}

function footer(locale) {
  const descriptions = {
    en: "VISIONE helps you find verified legal places to watch movies and series. It does not host or stream audiovisual works.",
    fr: "VISIONE vous aide à trouver des options légales vérifiées pour regarder des films et des séries. VISIONE n’héberge ni ne diffuse les œuvres.",
    ru: "VISIONE помогает находить проверенные легальные варианты просмотра фильмов и сериалов. VISIONE не размещает и не транслирует видео.",
    uk: "VISIONE допомагає знаходити перевірені легальні варіанти перегляду фільмів і серіалів. VISIONE не зберігає та не транслює відео."
  };
  return `<footer class="stream-footer"><div><a class="visione-brand" href="${localePath(locale)}"><img src="/visione-logo.webp" alt="" width="44" height="44"><span>VISIONE</span></a><p>${esc(descriptions[locale])}</p></div><nav><a href="/data-credits/">Data & sources</a><a href="/news/privacy.html">Privacy</a><a href="/news/contact.html">Contact</a><a href="/news/">Wire</a></nav><p class="footer-note">© 2026 VISIONE.</p></footer>`;
}

function pageHead(locale, { title, description, canonical, robots = "index,follow,max-image-preview:large", structuredData = null }) {
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${robots}"><meta name="theme-color" content="#08090c"><link rel="canonical" href="${canonical}"><link rel="icon" href="/visione-logo.webp"><link rel="stylesheet" href="/assets/streaming.css"><link rel="stylesheet" href="/assets/editorial-cover.css"><link rel="stylesheet" href="/assets/streaming-layout.css?v=4">${SUPPORTED_LOCALES.map((code) => `<link rel="alternate" hreflang="${getLocale(code).lang}" href="${absoluteUrl(localePath(code))}">`).join("")}${structuredData ? `<script type="application/ld+json">${jsonLd(structuredData)}</script>` : ""}<script src="/assets/streaming.js" defer></script><script type="module" src="/assets/catalog-rails.mjs?v=2"></script>`;
}

function mediaLabel(title, locale) {
  const c = copyFor(locale);
  return title.type === "series" ? c.mediaSeries : c.mediaMovie;
}

function artwork(title, locale) {
  const name = localizedName(title, locale);
  if (title.poster) return `<img src="${esc(title.poster)}" alt="${esc(name)}" loading="lazy">`;
  return `<div class="editorial-cover" role="img" aria-label="VISIONE cover for ${esc(name)}"><span class="editorial-mark">VISIONE EDITORIAL</span><strong>${esc(name)}</strong><span class="editorial-meta"><span>${esc(title.year)}</span><span>${esc(mediaLabel(title, locale))}</span><span>${esc(title.genres?.[0] || "")}</span></span></div>`;
}

function card(title, locale, rank = null) {
  const name = localizedName(title, locale);
  return `<article class="title-card${rank ? " ranked-title-card" : ""}"${rank ? ` data-rank="${rank}"` : ""}>${rank ? `<span class="rank-number" aria-hidden="true">${rank}</span>` : ""}<a href="${titlePath(locale, title.slug)}">${artwork(title, locale)}<div class="card-copy"><strong>${esc(name)}</strong><span>${esc(title.year)} · ${esc(mediaLabel(title, locale))}</span></div></a></article>`;
}

function rail(locale, { id, eyebrow, title, titles, ranked = false }) {
  if (!titles.length) return "";
  const cards = titles.map((item, index) => card(item, locale, ranked ? index + 1 : null)).join("");
  return `<section id="${esc(id)}" class="content-section catalog-section${ranked ? " discovery-section top-ten-section" : ""}" data-catalog-section><div class="section-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2></div><div class="rail-controls"><button type="button" class="rail-view-button" data-rail-view data-open-label="Mosaic" data-close-label="Close" aria-expanded="false">Mosaic</button></div></div><div class="rail-stage"><button type="button" class="rail-edge rail-edge-prev" data-rail-prev aria-label="Previous"><span aria-hidden="true">‹</span></button><div class="title-rail cinematic-title-rail" data-catalog-rail tabindex="0">${cards}</div><button type="button" class="rail-edge rail-edge-next" data-rail-next aria-label="Next"><span aria-hidden="true">›</span></button></div></section>`;
}

function providersGrid(providers = []) {
  return `<div class="provider-chips">${providers.map((provider) => `<span class="provider-chip provider-tile" data-provider="${esc(provider.id)}"><img class="provider-logo" src="${esc(provider.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="provider-name">${esc(provider.name)}</span></span>`).join("")}</div>`;
}

export function renderExtraLocaleHome(locale, titles, providers) {
  const cfg = getLocale(locale);
  const c = copyFor(locale);
  const ranked = titles.slice(0, 10);
  const recommended = titles.slice(3, 19);
  const movies = titles.filter((item) => item.type === "movie").slice(0, 16);
  const series = titles.filter((item) => item.type === "series").slice(0, 16);
  return `<!doctype html><html lang="${cfg.lang}"><head>${pageHead(locale, { title: `VISIONE | ${cfg.promise}`, description: `${cfg.promise} ${c.marketNote}.`, canonical: absoluteUrl(localePath(locale)) })}</head><body class="stream-body discovery-home">${header(locale)}<main><section class="locale-hero cinematic-hero"><div class="cinematic-backdrop" aria-hidden="true"><img src="/assets/visione-cinematic-hero-v2.png" alt="" fetchpriority="high"></div><div class="cinematic-overlay" aria-hidden="true"></div><div class="hero-content"><p class="eyebrow">${esc(c.heroEyebrow)}</p><h1>${esc(c.heroTitle)}</h1><p class="hero-lead">${esc(c.heroLead)}</p><p class="hero-note">${esc(c.marketNote)}</p></div></section>${rail(locale, { id: "catalog", eyebrow: c.verified, title: c.top, titles: ranked, ranked: true })}${rail(locale, { id: "recommended", eyebrow: "VISIONE", title: c.recommended, titles: recommended })}${rail(locale, { id: "movies", eyebrow: c.movies, title: c.moviesTitle, titles: movies })}${rail(locale, { id: "series", eyebrow: c.series, title: c.seriesTitle, titles: series })}<section class="content-section provider-section"><div class="section-heading"><div><p class="eyebrow">${esc(c.verified)}</p><h2>${esc(c.where)}</h2></div></div>${providersGrid(providers)}</section></main>${footer(locale)}</body></html>`;
}

function offerLabel(offer, locale) {
  const c = copyFor(locale);
  if (offer.monetization === "subscription") return c.subscription;
  if (offer.monetization === "free") return c.free;
  if (offer.monetization === "rent") return c.rent;
  return c.buy;
}

export function renderExtraTitlePage(title, locale, providers) {
  const cfg = getLocale(locale);
  const c = copyFor(locale);
  const name = localizedName(title, locale);
  const overview = title.overview?.[locale] || "";
  const canonical = absoluteUrl(titlePath(locale, title.slug));
  const offers = rankOffers(title.offers?.[cfg.country] ?? []);
  const providerMap = new Map(providers.map((provider) => [provider.id, provider]));
  const offerHtml = offers.map((offer) => {
    const p = providerMap.get(offer.provider);
    const href = offer.affiliate_url || offer.url;
    return `<div class="offer-row"><div><strong>${esc(p?.name || offer.provider)}</strong></div><div><span class="offer-type">${esc(offerLabel(offer, locale))}</span>${href ? `<a class="offer-link" href="${esc(href)}" rel="${offer.is_affiliate || offer.sponsored ? "nofollow sponsored" : "nofollow"}">${esc(c.viewOffer)}</a>` : ""}</div></div>`;
  }).join("");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": title.type === "series" ? "TVSeries" : "Movie",
    name,
    url: canonical,
    ...(title.year ? { datePublished: String(title.year) } : {}),
    ...(overview ? { description: overview } : {}),
    ...(title.poster ? { image: title.poster } : {})
  };
  return `<!doctype html><html lang="${cfg.lang}"><head>${pageHead(locale, { title: `${name} | VISIONE`, description: overview, canonical, structuredData })}</head><body class="stream-body">${header(locale)}<main class="title-shell"><section class="title-hero"><div class="title-poster">${artwork(title, locale)}</div><div class="title-copy"><p class="eyebrow">${esc(mediaLabel(title, locale))} · ${esc(title.year)}</p><h1>${esc(name)}</h1><p>${esc(overview)}</p><p class="collection-note">${esc(c.marketNote)}</p></div></section><section class="content-section"><p class="eyebrow">${esc(c.where)}</p><h2>${esc(c.verified)}</h2><div class="offer-list">${offerHtml}</div>${title.availability_updated_at ? `<p class="freshness" data-availability-freshness datetime="${esc(title.availability_updated_at)}">${esc(c.lastChecked)}: ${esc(title.availability_updated_at.slice(0, 10))}</p>` : ""}</section></main>${footer(locale)}</body></html>`;
}

export function renderExtraProviderPage(provider, locale, titles) {
  const cfg = getLocale(locale);
  const c = copyFor(locale);
  const cards = titles.map((title) => card(title, locale)).join("");
  return `<!doctype html><html lang="${cfg.lang}"><head>${pageHead(locale, { title: `${provider.name} | VISIONE`, description: `${c.providerTitles}: ${provider.name}. ${c.marketNote}.`, canonical: absoluteUrl(providerPath(locale, provider.id)) })}</head><body class="stream-body">${header(locale)}<main><section class="content-section" style="padding-top:140px"><p class="eyebrow">${esc(c.verified)}</p><h1>${esc(provider.name)}</h1><p>${esc(c.marketNote)}</p><div class="title-grid">${cards}</div></section></main>${footer(locale)}</body></html>`;
}
