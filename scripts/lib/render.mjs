import { evaluateTitleQuality, rankOffers } from "./catalog.mjs";
import { LOCALES, SITE_URL, localePath, providerPath, titlePath } from "./config.mjs";
import { breadcrumbSchema, faqSchema, hreflangForLocales, hreflangForTitle, titleSchema } from "./seo.mjs";

const COPY = {
  es: {
    promise: "Encuentra dónde ver películas y series.", search: "Busca una película, serie, actor o franquicia", searchButton: "Buscar",
    primaryNav: "Principal", languageNav: "Idioma", catalog: "Catálogo", dataSources: "Datos y fuentes",
    trending: "Selección actual", providers: "Explora por plataforma", news: "Noticias y análisis", movie: "Película", series: "Serie",
    where: "Dónde ver", updated: "Actualizado", priceMissing: "Precio no facilitado por la fuente", visit: "Abrir en el proveedor",
    seasons: "Temporadas y episodios", source: "Fuentes y transparencia", watchlist: "Añadir a pendientes", favorite: "Favorito",
    skip: "Saltar al contenido", footerBlurb: "Descubrimiento de opciones legales. VISIONE no aloja películas ni series.", information: "Información",
    credits: "Datos y créditos", privacy: "Privacidad", contact: "Contacto", localeLead: "Búsqueda local, páginas rápidas y disponibilidad mostrada solo cuando la fuente la confirma.",
    discovery: "DESCUBRIMIENTO", sourcedTitles: "títulos con fuentes visibles y actualización fechada.", reporting: "Reportajes y análisis siguen disponibles en las rutas editoriales existentes.", openWire: "Abrir Wire",
    offers: { subscription: "Incluido en la suscripción", free: "Gratis legalmente", rent: "Alquiler", buy: "Compra" },
    unavailable: "Datos de disponibilidad temporalmente no disponibles.", unavailableBody: "No concluimos que el título esté ausente: simplemente no existe confirmación actual suficiente para este mercado.",
    availabilityNow: "Opciones confirmadas ahora.", availabilityNote: "La disponibilidad puede cambiar. Confirma siempre con el proveedor antes de suscribirte, alquilar o comprar.",
    cast: "REPARTO Y CREACIÓN", castHeading: "Quién da forma a esta historia.", missingInfo: "Información no facilitada por la fuente.", episodes: "episodios",
    faq: "PREGUNTAS FRECUENTES", faqHeading: "Respuestas directas.", whereQuestion: "¿Dónde ver", inMarket: "en", sourceConfirms: "La fuente confirma", snapshotUpdated: "en la instantánea actualizada el", noConfirmation: "VISIONE aún no dispone de confirmación actual suficiente para este mercado.",
    streamsQuestion: "¿VISIONE transmite", noStreaming: "No. VISIONE organiza información y dirige a opciones legales confirmadas; no aloja ni reproduce el título.",
    sourceHeading: "Datos trazables.", sourceVerification: "Detalles del título y disponibilidad verificados con", availabilitySource: "Fuente de disponibilidad",
    providerIntro: "Una vista clara de los títulos actualmente confirmados en esta plataforma para el mercado seleccionado. Los resultados muestran fuente y fecha; VISIONE no vende suscripciones ni reproduce el contenido.",
    confirmed: "DISPONIBILIDAD CONFIRMADA", filmsSeries: "Películas y series.", snapshot: "en la instantánea actual.", providerEmpty: "A la espera de una fuente con licencia para este mercado.", providerEmptyBody: "La página existe para navegar, pero permanece fuera del índice hasta que tenga contenido suficiente.",
    descriptionSuffix: "Búsqueda rápida con disponibilidad legal y fuentes visibles.", calendar: "Añadir estreno al calendario",
  },
  pt: {
    promise: "Descobre onde ver filmes e séries.", search: "Pesquisa um filme, série, ator ou saga", searchButton: "Pesquisar",
    primaryNav: "Principal", languageNav: "Idioma", catalog: "Catálogo", dataSources: "Dados e fontes",
    trending: "Seleção atual", providers: "Explora por plataforma", news: "Notícias e análise", movie: "Filme", series: "Série",
    where: "Onde ver", updated: "Atualizado", priceMissing: "Preço não fornecido pela fonte", visit: "Abrir no fornecedor",
    seasons: "Temporadas e episódios", source: "Fontes e transparência", watchlist: "Adicionar à watchlist", favorite: "Favorito",
    skip: "Saltar para o conteúdo", footerBlurb: "Descoberta de opções legais. A VISIONE não hospeda filmes ou séries.", information: "Informação",
    credits: "Dados e créditos", privacy: "Privacidade", contact: "Contacto", localeLead: "Pesquisa local, páginas rápidas e disponibilidade apresentada apenas quando a fonte a confirma.",
    discovery: "DESCOBERTA", sourcedTitles: "títulos com fontes visíveis e atualização datada.", reporting: "Reportagens e análises continuam acessíveis nas rotas editoriais existentes.", openWire: "Abrir Wire",
    offers: { subscription: "Incluído na subscrição", free: "Grátis legalmente", rent: "Aluguer", buy: "Compra" },
    unavailable: "Dados de disponibilidade temporariamente indisponíveis.", unavailableBody: "Não concluímos que o título esteja ausente: apenas não existe confirmação atual suficiente para este mercado.",
    availabilityNow: "Opções confirmadas agora.", availabilityNote: "A disponibilidade pode mudar. Confirma sempre no fornecedor antes de subscrever, alugar ou comprar.",
    cast: "ELENCO E CRIAÇÃO", castHeading: "Quem dá forma a esta história.", missingInfo: "Informação não fornecida pela fonte.", episodes: "episódios",
    faq: "PERGUNTAS FREQUENTES", faqHeading: "Respostas diretas.", inMarket: "em", sourceConfirms: "A fonte confirma", snapshotUpdated: "no snapshot atualizado em", noConfirmation: "A VISIONE ainda não possui confirmação atual suficiente para este mercado.",
    streamsQuestion: "A VISIONE transmite", noStreaming: "Não. A VISIONE organiza informação e encaminha para opções legais confirmadas; não hospeda nem reproduz o título.",
    sourceHeading: "Dados rastreáveis.", sourceVerification: "Detalhes do título e disponibilidade verificados com", availabilitySource: "Fonte de disponibilidade",
    providerIntro: "Uma visão clara dos títulos atualmente confirmados nesta plataforma para o mercado selecionado. Os resultados exibem fonte e data; a VISIONE não vende subscrições nem reproduz o conteúdo.",
    confirmed: "DISPONIBILIDADE CONFIRMADA", filmsSeries: "Filmes e séries.", snapshot: "no snapshot atual.", providerEmpty: "Aguardando uma fonte licenciada para este mercado.", providerEmptyBody: "A página existe para navegação, mas permanece fora do índice enquanto não houver conteúdo suficiente.",
    descriptionSuffix: "Pesquisa rápida com disponibilidade legal e fontes visíveis.", calendar: "Adicionar estreia ao calendário",
  },
  br: {
    promise: "Descubra onde assistir filmes e séries.", search: "Busque um filme, série, ator ou franquia", searchButton: "Buscar",
    primaryNav: "Principal", languageNav: "Idioma", catalog: "Catálogo", dataSources: "Dados e fontes",
    trending: "Seleção atual", providers: "Explore por plataforma", news: "Notícias e análises", movie: "Filme", series: "Série",
    where: "Onde assistir", updated: "Atualizado", priceMissing: "Preço não fornecido pela fonte", visit: "Abrir no provedor",
    seasons: "Temporadas e episódios", source: "Fontes e transparência", watchlist: "Adicionar à lista", favorite: "Favorito",
    skip: "Pular para o conteúdo", footerBlurb: "Descoberta de opções legais. A VISIONE não hospeda filmes nem séries.", information: "Informações",
    credits: "Dados e créditos", privacy: "Privacidade", contact: "Contato", localeLead: "Busca local, páginas rápidas e disponibilidade exibida somente quando a fonte confirma.",
    discovery: "DESCOBERTA", sourcedTitles: "títulos com fontes visíveis e atualização datada.", reporting: "Reportagens e análises continuam disponíveis nas rotas editoriais existentes.", openWire: "Abrir Wire",
    offers: { subscription: "Incluído na assinatura", free: "Grátis legalmente", rent: "Aluguel", buy: "Compra" },
    unavailable: "Dados de disponibilidade temporariamente indisponíveis.", unavailableBody: "Não concluímos que o título esteja ausente: apenas não há confirmação atual suficiente para este mercado.",
    availabilityNow: "Opções confirmadas agora.", availabilityNote: "A disponibilidade pode mudar. Confirme sempre no provedor antes de assinar, alugar ou comprar.",
    cast: "ELENCO E CRIAÇÃO", castHeading: "Quem dá forma a esta história.", missingInfo: "Informação não fornecida pela fonte.", episodes: "episódios",
    faq: "PERGUNTAS FREQUENTES", faqHeading: "Respostas diretas.", inMarket: "no", sourceConfirms: "A fonte confirma", snapshotUpdated: "na atualização de", noConfirmation: "A VISIONE ainda não tem confirmação atual suficiente para este mercado.",
    streamsQuestion: "A VISIONE transmite", noStreaming: "Não. A VISIONE organiza informações e direciona para opções legais confirmadas; não hospeda nem reproduz o título.",
    sourceHeading: "Dados rastreáveis.", sourceVerification: "Detalhes do título e disponibilidade verificados com", availabilitySource: "Fonte de disponibilidade",
    providerIntro: "Uma visão clara dos títulos atualmente confirmados nesta plataforma para o mercado selecionado. Os resultados mostram fonte e data; a VISIONE não vende assinaturas nem reproduz o conteúdo.",
    confirmed: "DISPONIBILIDADE CONFIRMADA", filmsSeries: "Filmes e séries.", snapshot: "na atualização atual.", providerEmpty: "Aguardando uma fonte licenciada para este mercado.", providerEmptyBody: "A página existe para navegação, mas fica fora do índice enquanto não houver conteúdo suficiente.",
    descriptionSuffix: "Busca rápida com disponibilidade legal e fontes visíveis.", calendar: "Adicionar estreia ao calendário",
  },
};

const GENRES = {
  es: { "Ação": "Acción", "Comédia": "Comedia", "Ficção científica": "Ciencia ficción" },
  pt: {},
  br: {},
};

const esc = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const absolute = (path) => `${SITE_URL}${path}`;
const ASSET_VERSION = "20260909-1";
const asset = (path) => `${path}?v=${ASSET_VERSION}`;

function localeLinks(current = null) {
  return Object.entries(LOCALES).map(([locale, config]) => `<a ${current === locale ? 'aria-current="page"' : ""} href="${localePath(locale)}">${config.country}</a>`).join("");
}

function shell({ locale = "pt", path = "/", title, description, body, robots = "index,follow,max-image-preview:large", schemas = [], alternates = [], pageClass = "" }) {
  const language = LOCALES[locale]?.hreflang ?? "pt-PT";
  const canonical = absolute(path);
  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="${robots}">
  <meta name="theme-color" content="#080a0f">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" href="/visione-logo.webp">
  <link rel="stylesheet" href="${asset("/assets/discovery.css")}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary_large_image">
${alternates.map((alternate) => `  <link rel="alternate" hreflang="${esc(alternate.hreflang)}" href="${esc(alternate.href)}">`).join("\n")}
${schemas.filter(Boolean).map((schema) => `  <script type="application/ld+json">${json(schema)}</script>`).join("\n")}
</head>
<body class="${pageClass}">
  <a class="skip-link" href="#content">${esc((COPY[locale] ?? COPY.pt).skip)}</a>
  ${body}
  <script type="module" src="${asset("/assets/library.js")}"></script>
</body>
</html>\n`;
}

function header(locale = "pt") {
  const copy = COPY[locale] ?? COPY.pt;
  return `<header class="site-header"><a class="brand" href="/" aria-label="VISIONE home"><img src="/visione-logo.webp" alt="VISIONE"></a><div class="header-actions"><nav class="primary-nav" aria-label="${esc(copy.primaryNav)}"><a href="${localePath(locale)}">${esc(copy.catalog)}</a><a href="/credits/">${esc(copy.dataSources)}</a><a href="/news/">Wire</a></nav><nav class="locale-nav" aria-label="${esc(copy.languageNav)}">${localeLinks(locale)}</nav></div></header>`;
}

function footer(locale = "pt") {
  const copy = COPY[locale] ?? COPY.pt;
  return `<footer><a class="footer-brand" href="/"><img src="/visione-logo.webp" alt="VISIONE"></a><p>${esc(copy.footerBlurb)}</p><nav aria-label="${esc(copy.information)}"><a href="/credits/">${esc(copy.credits)}</a><a href="/news/privacy.html">${esc(copy.privacy)}</a><a href="/news/contact.html">${esc(copy.contact)}</a><a href="/news/">Wire</a></nav></footer>`;
}

function search(locale, compact = false) {
  const copy = COPY[locale] ?? COPY.pt;
  return `<div class="search-shell ${compact ? "is-compact" : ""}" data-search-root data-locale="${locale}" role="search"><label for="search-${locale}">${esc(copy.search)}</label><div class="search-control"><input id="search-${locale}" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(copy.search)}" aria-controls="results-${locale}" aria-autocomplete="list"><button type="button">${esc(copy.searchButton)}</button></div><div id="results-${locale}" class="search-results" role="listbox" aria-live="polite" hidden></div></div>`;
}

function titleCard(title, locale) {
  const name = title.titles[locale] ?? title.original_title;
  const type = COPY[locale][title.type];
  const genres = title.genres.slice(0, 2).map((genre) => GENRES[locale]?.[genre] ?? genre);
  return `<a class="title-card" href="${titlePath(locale, title.slug)}"><span class="poster-fallback" aria-hidden="true">${esc(name.slice(0, 2).toUpperCase())}</span><span class="card-copy"><span class="eyebrow">${esc(type)} · ${esc(title.year)}</span><strong>${esc(name)}</strong><span>${esc(genres.join(" · "))}</span></span></a>`;
}

function providerBadge(provider, locale, count = null) {
  return `<a class="provider-card" href="${providerPath(locale, provider.id)}" style="--provider:${esc(provider.accent)}"><span aria-hidden="true">${esc(provider.short_name)}</span><strong>${esc(provider.name)}</strong>${count == null ? "" : `<small>${count} título${count === 1 ? "" : "s"}</small>`}</a>`;
}

export function renderGlobalPage() {
  const path = "/";
  const body = `${header()}
<main id="content"><section class="global-hero"><p class="eyebrow">FILMES · SÉRIES · ONDE VER</p><h1>Encontra a próxima história.<br><em>E onde vê-la legalmente.</em></h1><p>Pesquisa o catálogo e segue diretamente para uma opção legal verificada. A busca permanece local e rápida.</p>${search("pt")}<p class="trust-note">Dados com fonte e data. Sem streams, torrents ou disponibilidade inventada.</p></section><section class="wire-strip"><div><p class="eyebrow">VISIONE WIRE</p><h2>Contexto além do catálogo.</h2><p>A área editorial continua disponível com notícias, análise e padrões de publicação transparentes.</p></div><a href="/news/">Abrir notícias →</a></section></main>${footer("pt")}<script type="module" src="${asset("/assets/discovery-search.js")}"></script>`;
  return shell({ locale: "pt", path, title: "VISIONE | Onde ver filmes e séries", description: "Descobre onde ver filmes e séries legalmente em Espanha, Portugal e Brasil.", body, alternates: hreflangForLocales(), pageClass: "global-page" });
}

export function renderLocalePage({ locale, titles, providers }) {
  const copy = COPY[locale];
  const body = `${header(locale)}<main id="content"><section class="locale-hero"><p class="eyebrow">VISIONE · ${LOCALES[locale].country}</p><h1>${esc(copy.promise)}</h1><p>${esc(copy.localeLead)}</p>${search(locale)}</section><section class="content-section"><div class="section-heading"><div><p class="eyebrow">${esc(copy.discovery)}</p><h2>${esc(copy.trending)}</h2></div><p>${titles.length} ${esc(copy.sourcedTitles)}</p></div><div class="title-grid">${titles.map((title) => titleCard(title, locale)).join("")}</div></section><section class="content-section providers"><div class="section-heading"><div><p class="eyebrow">CATÁLOGOS</p><h2>${esc(copy.providers)}</h2></div></div><div class="provider-grid">${providers.map((provider) => providerBadge(provider, locale, titles.filter((title) => title.offers[LOCALES[locale].country]?.some((offer) => offer.provider_id === provider.id)).length)).join("")}</div></section><section class="wire-strip"><div><p class="eyebrow">VISIONE WIRE</p><h2>${esc(copy.news)}</h2><p>${esc(copy.reporting)}</p></div><a href="/news/">${esc(copy.openWire)} →</a></section></main>${footer(locale)}<script type="module" src="${asset("/assets/discovery-search.js")}"></script>`;
  return shell({ locale, path: localePath(locale), title: `VISIONE ${LOCALES[locale].country} | ${copy.promise}`, description: `${copy.promise} ${copy.descriptionSuffix}`, body, alternates: hreflangForLocales(), pageClass: "discovery-page" });
}

function offerList(title, locale, providers) {
  const copy = COPY[locale];
  const country = LOCALES[locale].country;
  const offers = rankOffers(title.offers[country]);
  if (!offers.length) return `<div class="empty-state"><strong>${esc(copy.unavailable)}</strong><p>${esc(copy.unavailableBody)}</p></div>`;
  return `<div class="offer-list">${offers.map((offer) => {
    const provider = providers.find((entry) => entry.id === offer.provider_id);
    return `<article class="offer"><span class="provider-mark" style="--provider:${esc(provider?.accent ?? "#8ea2ff")}">${esc(provider?.short_name ?? offer.provider_name?.slice(0, 2) ?? "↗")}</span><div><strong>${esc(offer.provider_name ?? provider?.name ?? offer.provider_id)}</strong><span>${esc(copy.offers[offer.type])}</span><small>${offer.price == null ? esc(copy.priceMissing) : `${esc(offer.price)} ${esc(offer.currency)}`}</small></div><a href="${esc(offer.url)}" target="_blank" rel="noopener noreferrer">${esc(copy.visit)} ↗</a></article>`;
  }).join("")}</div>`;
}

export function renderTitlePage({ locale, title, providers }) {
  const copy = COPY[locale];
  const name = title.titles[locale] ?? title.original_title;
  const path = titlePath(locale, title.slug);
  const quality = evaluateTitleQuality(title, locale);
  const country = LOCALES[locale].country;
  const updated = new Intl.DateTimeFormat(LOCALES[locale].hreflang, { dateStyle: "long", timeZone: "UTC" }).format(new Date(title.updated_at));
  const people = [...title.credits.directors, ...title.credits.creators, ...title.credits.cast];
  const releaseDate = title.release_dates[locale];
  const providerNames = [...new Set(title.offers[country].map((offer) => offer.provider_name).filter(Boolean))];
  const faqItems = [
    { question: `${copy.whereQuestion ?? copy.where} ${name} ${copy.inMarket} ${country}?`, answer: providerNames.length ? `${copy.sourceConfirms} ${providerNames.join(", ")} ${copy.snapshotUpdated} ${updated}.` : copy.noConfirmation },
    { question: `${copy.streamsQuestion} ${name}?`, answer: copy.noStreaming },
  ];
  const schemas = [
    titleSchema(title, locale),
    breadcrumbSchema([{ name: `VISIONE ${country}`, path: localePath(locale) }, { name, path }]),
    faqSchema(faqItems),
  ];
  const faq = `<section class="detail-section faq"><p class="eyebrow">${esc(copy.faq)}</p><h2>${esc(copy.faqHeading)}</h2>${faqItems.map((item) => `<details><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join("")}</section>`;
  const seasons = title.seasons.length ? `<section class="detail-section"><p class="eyebrow">${esc(copy.seasons)}</p><div class="season-grid">${title.seasons.map((season) => `<article><strong>${esc(season.name)}</strong><span>${season.episode_count} ${esc(copy.episodes)}</span></article>`).join("")}</div>${title.episodes.length ? `<ol class="episode-list">${title.episodes.map((episode) => `<li><span>S${episode.season} · E${episode.number}</span><strong>${esc(episode.titles[locale] ?? episode.titles.pt ?? "Episódio")}</strong><small>${episode.runtime_minutes ? `${episode.runtime_minutes} min` : ""}</small></li>`).join("")}</ol>` : ""}</section>` : "";
  const localizedGenres = title.genres.map((genre) => GENRES[locale]?.[genre] ?? genre);
  const body = `${header(locale)}<main id="content"><article class="title-page"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${localePath(locale)}">VISIONE ${country}</a><span>/</span><span>${esc(name)}</span></nav><section class="title-hero"><div class="title-art" aria-hidden="true"><span>${esc(name.slice(0, 2).toUpperCase())}</span></div><div class="title-intro"><p class="eyebrow">${esc(copy[title.type])} · ${esc(title.year)}</p><h1>${esc(name)}</h1>${title.original_title && title.original_title !== name ? `<p class="original-title">${esc(title.original_title)}</p>` : ""}<p class="overview">${esc(title.overview[locale])}</p><ul class="facts"><li>${esc(localizedGenres.join(" · "))}</li>${title.runtime_minutes ? `<li>${title.runtime_minutes} min</li>` : ""}<li>${esc(title.countries.join(" · "))}</li></ul><div class="library-actions" data-library-title="${esc(title.id)}"><button type="button" data-library-action="watchlist">＋ ${esc(copy.watchlist)}</button><button type="button" data-library-action="favorite">♡ ${esc(copy.favorite)}</button>${releaseDate ? `<button type="button" data-calendar-date="${esc(releaseDate)}" data-calendar-title="${esc(name)}">${esc(copy.calendar)}</button>` : ""}<span aria-live="polite"></span></div></div></section><section class="availability"><div class="section-heading"><div><p class="eyebrow">${esc(copy.where)} · ${country}</p><h2>${esc(copy.availabilityNow)}</h2></div><p>${esc(copy.updated)} ${esc(updated)}</p></div>${offerList(title, locale, providers)}<p class="availability-note">${esc(copy.availabilityNote)}</p></section><section class="detail-section"><p class="eyebrow">${esc(copy.cast)}</p><h2>${esc(copy.castHeading)}</h2><p>${esc(people.join(" · ") || copy.missingInfo)}</p></section>${seasons}${faq}<section class="detail-section sources-panel"><p class="eyebrow">${esc(copy.source)}</p><h2>${esc(copy.sourceHeading)}</h2><p>${esc(copy.sourceVerification)} ${esc(title.source.name)}.</p><a href="${esc(title.source.url)}" target="_blank" rel="noopener noreferrer">${esc(title.source.name)} ↗</a>${title.offers[country].map((offer) => `<a href="${esc(offer.source_url)}" target="_blank" rel="noopener noreferrer">${esc(copy.availabilitySource)}: ${esc(offer.provider_name)} ↗</a>`).join("")}</section></article></main>${footer(locale)}`;
  return shell({ locale, path, title: `${name} — ${copy.where} | VISIONE`, description: `${title.overview[locale]} ${copy.updated}: ${updated}.`, body, robots: quality.indexable ? "index,follow,max-image-preview:large" : "noindex,follow", schemas, alternates: hreflangForTitle(title), pageClass: "title-body" });
}

export function renderProviderPage({ locale, provider, titles }) {
  const copy = COPY[locale];
  const country = LOCALES[locale].country;
  const available = titles.filter((title) => title.offers[country].some((offer) => offer.provider_id === provider.id));
  const path = providerPath(locale, provider.id);
  const body = `${header(locale)}<main id="content"><section class="provider-hero" style="--provider:${esc(provider.accent)}"><span class="provider-mark">${esc(provider.short_name)}</span><div><p class="eyebrow">PLATAFORMA · ${country}</p><h1>${esc(provider.name)}</h1><p>${esc(copy.providerIntro)}</p></div></section><section class="content-section"><div class="section-heading"><div><p class="eyebrow">${esc(copy.confirmed)}</p><h2>${esc(copy.filmsSeries)}</h2></div><p>${available.length} título${available.length === 1 ? "" : "s"} ${esc(copy.snapshot)}</p></div>${available.length ? `<div class="title-grid">${available.map((title) => titleCard(title, locale)).join("")}</div>` : `<div class="empty-state"><strong>${esc(copy.providerEmpty)}</strong><p>${esc(copy.providerEmptyBody)}</p></div>`}</section></main>${footer(locale)}`;
  return shell({ locale, path, title: `${provider.name} ${copy.inMarket} ${country} | VISIONE`, description: `${copy.promise} ${provider.name} · ${country}.`, body, robots: available.length ? "index,follow,max-image-preview:large" : "noindex,follow", pageClass: "provider-body" });
}

export function renderCreditsPage() {
  const body = `${header()}<main id="content"><article class="info-page"><p class="eyebrow">DADOS E CRÉDITOS</p><h1>Transparência antes de escala.</h1><p>A VISIONE mostra apenas informação rastreável, identifica a data da última verificação e nunca transforma ausência de dados em uma alegação de indisponibilidade.</p><h2>Fontes atuais</h2><p>O catálogo inicial usa páginas oficiais da Netflix, Apple TV e Prime Video, verificadas para criar uma amostra pequena e auditável. Os links levam ao fornecedor; não são marcados como afiliados.</p><h2>Integração preparada</h2><p>A camada opcional da <a href="https://www.themoviedb.org/" rel="noopener noreferrer">The Movie Database (TMDB)</a> funciona apenas durante ingestão/build. Dados de disponibilidade obtidos pelo endpoint de watch providers exigem atribuição à <strong>JustWatch</strong> e só podem ser publicados sob uma licença adequada ao uso comercial.</p><h2>Limites</h2><p>Preços ausentes não são estimados. Avaliações e reviews ausentes não são criados. A disponibilidade pode mudar e deve ser confirmada no serviço de destino.</p></article></main>${footer("pt")}`;
  return shell({ locale: "pt", path: "/credits/", title: "Dados e créditos | VISIONE", description: "Fontes, atribuição, atualizações e limites dos dados de streaming publicados pela VISIONE.", body, pageClass: "info-body" });
}
