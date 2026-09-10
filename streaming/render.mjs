import { absoluteUrl, getLocale, localePath, providerPath, SUPPORTED_LOCALES, titlePath } from "./config.mjs";
import { bestOfferSummary, evaluateIndexability, rankOffers } from "./schema.mjs";

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jsonLd(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function localeSwitcher(active = null) {
  return `<div class="locale-switcher" aria-label="Idiomas">${SUPPORTED_LOCALES.map((locale) => {
    return `<a href="${localePath(locale)}" data-market="${locale}"${active === locale ? ' aria-current="page"' : ""}>${locale.toUpperCase()}</a>`;
  }).join("")}</div>`;
}

function brand(activeLocale = null) {
  const home = activeLocale ? localePath(activeLocale) : "/";
  return `<a class="visione-brand" href="${home}" aria-label="VISIONE"><img src="/visione-logo.webp" alt="" width="44" height="44"><span>VISIONE</span></a>`;
}

function header(locale = null) {
  const movies = locale ? `${localePath(locale)}#filmes` : "/#discover";
  const series = locale ? `${localePath(locale)}#series` : "/#discover";
  return `<header class="stream-header"><div class="stream-header-inner">${brand(locale)}<div class="header-search">${search(locale || "pt", true)}</div><div class="stream-header-actions"><nav aria-label="Principal"><a href="${movies}">${locale === "es" ? "Películas" : "Filmes"}</a><a href="${series}">${locale === "es" ? "Series" : "Séries"}</a><a href="/news/">Wire</a></nav>${localeSwitcher(locale)}</div></div></header>`;
}

function footer(locale = null) {
  return `<footer class="stream-footer"><div>${brand(locale)}<p>VISIONE indica onde encontrar filmes e séries legalmente. Não hospeda nem transmite obras audiovisuais.</p></div><nav><a href="/news/about.html">Sobre</a><a href="/news/privacy.html">Privacidade</a><a href="/news/cookie-policy.html">Cookies</a><a href="/news/advertising.html">Publicidade</a><a href="/news/contact.html">Contato</a><a href="/news/">Wire</a></nav><p class="footer-note">© 2026 VISIONE.</p></footer>`;
}

function search(locale = "es", compact = false) {
  const config = getLocale(locale);
  return `<div class="search-module${compact ? " search-compact" : ""}" data-visione-search data-locale="${locale}"><form role="search" action="${localePath(locale)}" class="search-form"><label class="sr-only" for="search-${locale}">${escapeHtml(config.searchPlaceholder)}</label><span class="search-icon" aria-hidden="true">⌕</span><input id="search-${locale}" data-search-input type="search" autocomplete="off" placeholder="${escapeHtml(config.searchPlaceholder)}"><button type="submit">${locale === "es" ? "Buscar" : "Buscar"}</button></form><div class="search-results" data-search-results hidden></div></div>`;
}

function poster(title, locale) {
  const localized = title.titles[locale];
  if (title.poster) return `<img src="${escapeHtml(title.poster)}" alt="Pôster de ${escapeHtml(localized)}" loading="lazy">`;
  return `<div class="poster-fallback" aria-hidden="true"><span>${escapeHtml(localized.slice(0, 1))}</span><small>VISIONE</small></div>`;
}

export function renderTitleCard(title, locale, { rank = null } = {}) {
  const mediaLabel = title.type === "series" ? (locale === "es" ? "Serie" : "Série") : (locale === "es" ? "Película" : "Filme");
  return `<article class="title-card${rank ? " ranked-title-card" : ""}"${rank ? ` data-rank="${rank}"` : ""}>${rank ? `<span class="rank-number" aria-hidden="true">${rank}</span>` : ""}<a href="${titlePath(locale, title.slug)}">${poster(title, locale)}<div class="card-copy"><strong>${escapeHtml(title.titles[locale])}</strong><span>${title.year} · ${mediaLabel}</span></div></a></article>`;
}

function catalogSection({ id, eyebrow, title, cards, note = "", locale = "pt", className = "" }) {
  const labels = locale === "es"
    ? { open: "Ver mosaico", close: "Cerrar mosaico", previous: "Anterior", next: "Siguiente" }
    : { open: "Ver mosaico", close: "Fechar mosaico", previous: "Anterior", next: "Seguinte" };
  return `<section id="${id}" class="content-section catalog-section ${className}" data-catalog-section><div class="section-heading"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2>${note ? `<p class="collection-note">${escapeHtml(note)}</p>` : ""}</div><div class="rail-controls"><button type="button" class="rail-view-button" data-rail-view data-open-label="${labels.open}" data-close-label="${labels.close}" aria-expanded="false">${labels.open}</button></div></div><div class="rail-stage"><button type="button" class="rail-edge rail-edge-prev" data-rail-prev aria-label="${labels.previous}"><span aria-hidden="true">‹</span></button><div class="title-rail cinematic-title-rail" data-catalog-rail tabindex="0">${cards}</div><button type="button" class="rail-edge rail-edge-next" data-rail-next aria-label="${labels.next}"><span aria-hidden="true">›</span></button></div></section>`;
}

function pendingReleaseCards(locale, kind) {
  const cinema = locale === "es"
    ? ["Grandes estrenos", "Cine independiente", "Animación", "Documentales", "Cine europeo", "Para toda la familia"]
    : ["Grandes estreias", "Cinema independente", "Animação", "Documentários", "Cinema europeu", "Para toda a família"];
  const streaming = locale === "es"
    ? ["Nuevas películas", "Nuevas series", "Nuevas temporadas", "Documentales", "Animación", "Producciones locales"]
    : ["Novos filmes", "Novas séries", "Novas temporadas", "Documentários", "Animação", "Produções locais"];
  const status = locale === "es" ? "Las fechas esperan una fuente oficial" : "Dados de estreia aguardam fonte oficial";
  return (kind === "cinema" ? cinema : streaming).map((label) => `<article class="release-card" data-status="awaiting-source"><div class="release-card-visual"><span>${locale === "es" ? "PRÓXIMAMENTE" : "BREVEMENTE"}</span><strong>${escapeHtml(label)}</strong></div><p>${status}</p></article>`).join("");
}

function offerPrice(offer, locale) {
  if (offer.price == null) return "";
  try {
    return new Intl.NumberFormat(getLocale(locale).lang, { style: "currency", currency: offer.currency || (locale === "br" ? "BRL" : "EUR") }).format(offer.price);
  } catch {
    return `${offer.price} ${offer.currency ?? ""}`.trim();
  }
}

function offerGroup(title, locale, providers, monetization, heading) {
  const country = getLocale(locale).country;
  const offers = rankOffers(title.offers[country] ?? []).filter((offer) => offer.monetization === monetization);
  if (!offers.length) return "";
  return `<section class="offer-group"><h3>${heading}</h3><div class="offer-list">${offers.map((offer) => {
    const provider = providers.get(offer.provider);
    const label = provider?.name ?? offer.provider;
    const href = offer.affiliate_url || offer.url;
    const price = offerPrice(offer, locale);
    return `<div class="offer-row"><div><span class="provider-badge">${escapeHtml(label.slice(0, 2).toUpperCase())}</span><strong>${escapeHtml(label)}</strong>${offer.sponsored ? '<small class="sponsored">Patrocinado</small>' : ""}</div><div>${price ? `<span class="offer-price">${escapeHtml(price)}</span>` : `<span class="offer-type">${monetization === "subscription" ? "Incluído na assinatura" : monetization === "free" ? "Grátis / com anúncios" : heading}</span>`}${href ? `<a class="offer-link" href="${escapeHtml(href)}" rel="nofollow sponsored">Ver oferta</a>` : ""}</div></div>`;
  }).join("")}</div></section>`;
}

function bestOffer(title, locale, providers) {
  const summary = bestOfferSummary(title, locale);
  if (!summary) return "";
  const provider = providers.get(summary.offer.provider)?.name ?? summary.offer.provider;
  const labels = {
    subscription: locale === "es" ? "Incluido con suscripción" : "Incluído com assinatura",
    free: locale === "es" ? "Opción legal gratuita" : "Opção legal gratuita",
    "lowest-rental": locale === "es" ? "Menor precio de alquiler listado" : "Menor preço de aluguel listado",
    "lowest-purchase": locale === "es" ? "Menor precio de compra listado" : "Menor preço de compra listado"
  };
  return `<div class="best-option"><span>${labels[summary.kind]}</span><strong>${escapeHtml(provider)}${summary.offer.price != null ? ` · ${escapeHtml(offerPrice(summary.offer, locale))}` : ""}</strong></div>`;
}

function providerChips(providers, locale) {
  const country = getLocale(locale).country;
  return `<div class="provider-chips">${providers.filter((provider) => provider.markets.includes(country)).map((provider) => `<span class="provider-chip provider-tile" data-provider="${escapeHtml(provider.id)}"><img class="provider-logo" src="${escapeHtml(provider.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="provider-name">${escapeHtml(provider.name)}</span></span>`).join("")}</div>`;
}

function pageHead({ title, description, canonical, robots = "index,follow,max-image-preview:large", lang = "pt-BR", hreflang = [], json = [] }) {
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${robots}"><meta name="theme-color" content="#08090c"><link rel="canonical" href="${canonical}"><link rel="icon" href="/visione-logo.webp"><link rel="stylesheet" href="/assets/streaming.css"><link rel="stylesheet" href="/assets/streaming-layout.css?v=4"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}">${hreflang.map((entry) => `<link rel="alternate" hreflang="${entry.lang}" href="${entry.href}">`).join("")}${json.map((entry) => `<script type="application/ld+json">${jsonLd(entry)}</script>`).join("")}<script src="/assets/streaming.js" defer></script><script type="module" src="/assets/catalog-rails.mjs?v=2"></script>`;
}

export function renderGlobalHome(titles) {
  const selected = titles.slice(0, 10);
  const topTen = selected.map((title, index) => renderTitleCard(title, "pt", { rank: index + 1 })).join("");
  const today = [2, 5, 8, 0, 7, 3].map((index) => selected[index]).filter(Boolean).map((title) => renderTitleCard(title, "pt")).join("");
  const week = [6, 1, 9, 4, 2, 8].map((index) => selected[index]).filter(Boolean).map((title) => renderTitleCard(title, "pt")).join("");
  return `<!doctype html><html lang="pt-BR"><head>${pageHead({ title: "VISIONE | Onde assistir filmes e séries", description: "Descubra em qual serviço assistir filmes e séries na Espanha, Portugal e Brasil.", canonical: absoluteUrl("/") })}</head><body class="stream-body discovery-home">${header()}<main><section class="global-hero cinematic-hero"><div class="cinematic-backdrop" aria-hidden="true"><img src="/assets/visione-cinematic-hero-v2.png" alt="" fetchpriority="high"></div><div class="cinematic-overlay" aria-hidden="true"></div><div class="hero-content"><p class="eyebrow">FILMES · SÉRIES · ONDE VER</p><h1>Descubra.<br><em>Encontre. Assista.</em></h1><p class="hero-lead">Explore histórias, compare opções legais e descubra a plataforma certa.</p><p class="hero-note">Busca sempre disponível no topo da página.</p></div></section>${catalogSection({ id: "discover", eyebrow: "CURADORIA VISIONE · ATUALIZADA HOJE", title: "Top 10 hoje", cards: topTen, note: "Seleção editorial VISIONE; não representa audiência das plataformas.", className: "discovery-section top-ten-section" })}${catalogSection({ id: "recomendados-hoje", eyebrow: "PARA COMEÇAR AGORA", title: "Recomendados hoje", cards: today, note: "Curadoria VISIONE" })}${catalogSection({ id: "escolhas-semana", eyebrow: "DESTAQUES EDITORIAIS", title: "Escolhas da semana", cards: week, note: "Curadoria VISIONE" })}${catalogSection({ id: "brevemente-cinemas", eyebrow: "CALENDÁRIO", title: "Brevemente nos cinemas", cards: pendingReleaseCards("pt", "cinema"), note: "Só publicamos datas confirmadas por fonte oficial." })}${catalogSection({ id: "brevemente-streaming", eyebrow: "PRÓXIMOS LANÇAMENTOS", title: "Brevemente no streaming", cards: pendingReleaseCards("pt", "streaming"), note: "Só publicamos datas confirmadas por fonte oficial." })}<section class="content-section provider-section"><div class="section-heading"><div><p class="eyebrow">TODAS AS SUAS TELAS</p><h2>Uma busca. Várias plataformas.</h2></div></div>${providerChips([], "pt")}</section></main>${footer()} </body></html>`;
}

export function renderLocaleHome(locale, titles, providers) {
  const config = getLocale(locale);
  const movieCards = titles.filter((title) => title.type === "movie").map((title) => renderTitleCard(title, locale)).join("");
  const seriesCards = titles.filter((title) => title.type === "series").map((title) => renderTitleCard(title, locale)).join("");
  const localProviders = providers.filter((provider) => provider.markets.includes(config.country));
  const title = `VISIONE ${config.label} | ${config.promise}`;
  const heroTitle = locale === "es" ? "Descubre. Encuentra. Mira." : locale === "br" ? "Descubra. Encontre. Assista." : "Descobre. Encontra. Vê.";
  const heroLead = locale === "es" ? "Tu atajo para encontrar películas y series y llegar a la plataforma correcta." : locale === "br" ? "Seu atalho para encontrar filmes e séries e seguir direto para a plataforma certa." : "O teu atalho para encontrar filmes e séries e seguir diretamente para a plataforma certa.";
  return `<!doctype html><html lang="${config.lang}"><head>${pageHead({ title, description: `${config.promise} Compara streaming, aluguer/alquiler e compra quando os dados verificados estiverem disponíveis.`, canonical: absoluteUrl(localePath(locale)), hreflang: SUPPORTED_LOCALES.map((code) => ({ lang: getLocale(code).lang, href: absoluteUrl(localePath(code)) })) })}</head><body class="stream-body discovery-home">${header(locale)}<main><section class="locale-hero cinematic-hero"><div class="cinematic-backdrop" aria-hidden="true"><img src="/assets/visione-cinematic-hero-v2.png" alt="" fetchpriority="high"></div><div class="cinematic-overlay" aria-hidden="true"></div><div class="hero-content"><p class="eyebrow">${locale === "es" ? "PELÍCULAS · SERIES · DÓNDE VER" : locale === "br" ? "FILMES · SÉRIES · ONDE ASSISTIR" : "FILMES · SÉRIES · ONDE VER"}</p><h1>${escapeHtml(heroTitle)}</h1><p class="hero-lead">${escapeHtml(heroLead)}</p><p class="hero-note">${locale === "es" ? "Búsqueda siempre disponible en la cabecera." : "Busca sempre disponível no cabeçalho."}</p></div></section>${catalogSection({ id: "filmes", eyebrow: locale === "es" ? "PELÍCULAS" : "FILMES", title: locale === "es" ? "Historias para tu lista." : "Histórias para a tua lista.", cards: movieCards, locale, className: "discovery-section" })}${catalogSection({ id: "series", eyebrow: locale === "es" ? "SERIES" : "SÉRIES", title: locale === "es" ? "Tu próxima obsesión." : "A tua próxima obsessão.", cards: seriesCards || `<p class="empty-state">${locale === "es" ? "Más series llegarán con la primera ingestión de datos." : "Mais séries entram com a primeira ingestão de dados."}</p>`, locale })}<section class="content-section provider-section"><div class="section-heading"><div><p class="eyebrow">STREAMING</p><h2>${locale === "es" ? "Una búsqueda. Varias plataformas." : "Uma busca. Várias plataformas."}</h2></div></div>${providerChips(localProviders, locale)}</section></main>${footer(locale)}</body></html>`;
}

export function renderTitlePage(title, locale, providers) {
  const config = getLocale(locale);
  const providersMap = new Map(providers.map((provider) => [provider.id, provider]));
  const quality = evaluateIndexability(title, locale);
  const canonicalPath = titlePath(locale, title.slug);
  const canonical = absoluteUrl(canonicalPath);
  const name = title.titles[locale];
  const typeLabel = title.type === "series" ? (locale === "es" ? "serie" : "série") : (locale === "es" ? "película" : "filme");
  const countryOffers = title.offers[config.country] ?? [];
  const state = title.availability_status[config.country] ?? "unknown";
  const freshness = title.updated_at ? new Intl.DateTimeFormat(config.lang, { dateStyle: "long", timeZone: "UTC" }).format(new Date(title.updated_at)) : null;
  const description = `${name} (${title.year}): ${locale === "es" ? "dónde verla legalmente en España" : locale === "pt" ? "onde ver legalmente em Portugal" : "onde assistir legalmente no Brasil"}.`;
  const hreflang = SUPPORTED_LOCALES.map((code) => ({ lang: getLocale(code).lang, href: absoluteUrl(titlePath(code, title.slug)) }));
  const mediaSchema = {
    "@context": "https://schema.org",
    "@type": title.type === "series" ? "TVSeries" : "Movie",
    name,
    alternateName: title.original_title || undefined,
    genre: title.genres,
    url: canonical,
    director: title.credits?.director ? { "@type": "Person", name: title.credits.director } : undefined,
    actor: Array.isArray(title.credits?.cast) ? title.credits.cast.map((actor) => ({ "@type": "Person", name: actor })) : undefined
  };
  const breadcrumbSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "VISIONE", item: absoluteUrl(localePath(locale)) },
    { "@type": "ListItem", position: 2, name, item: canonical }
  ] };
  const faq = state === "unknown" ? [
    { q: locale === "es" ? `¿Dónde ver ${name} en ${config.label}?` : `Onde ver ${name} em ${config.label}?`, a: config.dataPendingLabel },
    { q: locale === "es" ? "¿Cuándo se actualizarán las plataformas?" : "Quando as plataformas serão atualizadas?", a: locale === "es" ? "VISIONE solo publica disponibilidad cuando existe una fuente verificable y autorizada." : "A VISIONE só publica disponibilidade quando existe uma fonte verificável e autorizada." }
  ] : [
    { q: locale === "es" ? `¿Dónde ver ${name}?` : `Onde ver ${name}?`, a: countryOffers.length ? (locale === "es" ? "Consulta las opciones verificadas listadas arriba." : "Consulta as opções verificadas listadas acima.") : config.unavailableLabel }
  ];
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };
  const groups = [
    offerGroup(title, locale, providersMap, "subscription", locale === "es" ? "Streaming por suscripción" : "Streaming por assinatura"),
    offerGroup(title, locale, providersMap, "free", locale === "es" ? "Gratis / con anuncios" : "Grátis / com anúncios"),
    offerGroup(title, locale, providersMap, "rent", locale === "es" ? "Alquiler" : locale === "pt" ? "Aluguer" : "Aluguel"),
    offerGroup(title, locale, providersMap, "buy", locale === "es" ? "Compra" : "Compra")
  ].filter(Boolean).join("");
  const availabilityBlock = countryOffers.length ? `${bestOffer(title, locale, providersMap)}${groups}` : `<div class="availability-empty ${state === "unknown" ? "pending" : ""}"><span aria-hidden="true">${state === "unknown" ? "◌" : "✓"}</span><div><strong>${state === "unknown" ? (locale === "es" ? "Datos pendientes de fuente comercial" : "Dados aguardando fonte comercial") : (locale === "es" ? "Sin oferta verificada" : "Sem oferta verificada")}</strong><p>${escapeHtml(state === "unknown" ? config.dataPendingLabel : config.unavailableLabel)}</p></div></div>`;
  const credits = title.credits?.director ? `<p><span>${locale === "es" ? "Dirección" : "Direção"}</span><strong>${escapeHtml(title.credits.director)}</strong></p>` : title.credits?.creators ? `<p><span>${locale === "es" ? "Creación" : "Criação"}</span><strong>${escapeHtml(title.credits.creators.join(", "))}</strong></p>` : "";
  return `<!doctype html><html lang="${config.lang}"><head>${pageHead({ title: `${name} (${title.year}): ${locale === "es" ? "dónde ver" : "onde assistir"} | VISIONE`, description, canonical, robots: quality.indexable ? "index,follow,max-image-preview:large" : "noindex,follow,max-image-preview:large", hreflang, json: [mediaSchema, breadcrumbSchema, faqSchema] })}</head><body class="stream-body title-page">${header(locale)}<main><section class="title-hero"><div class="title-backdrop"><div class="backdrop-fallback"></div></div><div class="title-hero-grid"><div class="title-poster">${poster(title, locale)}</div><div class="title-primary"><p class="eyebrow">${escapeHtml(typeLabel.toUpperCase())} · ${title.year}</p><h1>${escapeHtml(name)}</h1>${title.original_title && title.original_title !== name ? `<p class="original-title">${escapeHtml(title.original_title)}</p>` : ""}<div class="title-facts"><span>${title.runtime ? `${title.runtime} min` : title.seasons ? `${title.seasons} ${locale === "es" ? "temporadas" : "temporadas"}` : ""}</span>${title.genres.map((genre) => `<span>${escapeHtml(genre)}</span>`).join("")}</div><p class="title-overview">${escapeHtml(title.overview[locale])}</p>${credits}</div></div></section><section class="availability-shell"><div class="availability-head"><div><p class="eyebrow">${locale === "es" ? "DISPONIBILIDAD" : "DISPONIBILIDADE"}</p><h2>${locale === "es" ? `Dónde ver ${escapeHtml(name)} en ${config.label}` : `Onde ver ${escapeHtml(name)} em ${config.label}`}</h2></div>${freshness ? `<p>${escapeHtml(config.updatedLabel)}<strong>${escapeHtml(freshness)}</strong></p>` : ""}</div>${availabilityBlock}<p class="data-note">${locale === "es" ? "VISIONE no aloja el vídeo. Los enlaces llevan al servicio legal correspondiente." : "A VISIONE não hospeda o vídeo. Os links levam ao serviço legal correspondente."}</p></section><section class="detail-grid"><article><p class="eyebrow">${locale === "es" ? "SOBRE" : "SOBRE"}</p><h2>${escapeHtml(name)}</h2><p>${escapeHtml(title.overview[locale])}</p></article><article class="faq"><p class="eyebrow">FAQ</p>${faq.map((item) => `<details><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`).join("")}</article></section></main>${footer(locale)}</body></html>`;
}

export function renderProviderPage(provider, locale, titles) {
  const config = getLocale(locale);
  const listed = titles.filter((title) => (title.offers[config.country] ?? []).some((offer) => offer.provider === provider.id));
  const canonical = absoluteUrl(providerPath(locale, provider.id));
  const cards = listed.map((title) => renderTitleCard(title, locale)).join("");
  return `<!doctype html><html lang="${config.lang}"><head>${pageHead({ title: `${provider.name} em ${config.label} | VISIONE`, description: `${locale === "es" ? "Títulos verificados disponibles" : "Títulos verificados disponíveis"} em ${provider.name}.`, canonical, robots: listed.length ? "index,follow,max-image-preview:large" : "noindex,follow" })}</head><body class="stream-body">${header(locale)}<main><section class="locale-hero provider-hero"><div><p class="eyebrow">PLATAFORMA · ${config.label.toUpperCase()}</p><h1>${escapeHtml(provider.name)}</h1><p>${locale === "es" ? "Catálogo verificado dentro de la cobertura actual de VISIONE." : "Catálogo verificado dentro da cobertura atual da VISIONE."}</p></div></section><section class="content-section"><div class="title-rail">${cards || `<p class="empty-state">${config.dataPendingLabel}</p>`}</div></section></main>${footer(locale)}</body></html>`;
}
