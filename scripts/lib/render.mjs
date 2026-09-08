import { evaluateTitleQuality, rankOffers } from "./catalog.mjs";
import { LOCALES, SITE_URL, localePath, providerPath, titlePath } from "./config.mjs";

const COPY = {
  es: {
    promise: "Encuentra dónde ver películas y series.", search: "Busca una película, serie, actor o franquicia", searchButton: "Buscar",
    trending: "Selección actual", providers: "Explora por plataforma", news: "Noticias y análisis", movie: "Película", series: "Serie",
    where: "Dónde ver", updated: "Actualizado", priceMissing: "Precio no facilitado por la fuente", visit: "Abrir en el proveedor",
    seasons: "Temporadas y episodios", source: "Fuentes y transparencia", watchlist: "Añadir a pendientes", favorite: "Favorito",
  },
  pt: {
    promise: "Descobre onde ver filmes e séries.", search: "Pesquisa um filme, série, ator ou saga", searchButton: "Pesquisar",
    trending: "Seleção atual", providers: "Explora por plataforma", news: "Notícias e análise", movie: "Filme", series: "Série",
    where: "Onde ver", updated: "Atualizado", priceMissing: "Preço não fornecido pela fonte", visit: "Abrir no fornecedor",
    seasons: "Temporadas e episódios", source: "Fontes e transparência", watchlist: "Adicionar à watchlist", favorite: "Favorito",
  },
  br: {
    promise: "Descubra onde assistir filmes e séries.", search: "Busque um filme, série, ator ou franquia", searchButton: "Buscar",
    trending: "Seleção atual", providers: "Explore por plataforma", news: "Notícias e análises", movie: "Filme", series: "Série",
    where: "Onde assistir", updated: "Atualizado", priceMissing: "Preço não fornecido pela fonte", visit: "Abrir no provedor",
    seasons: "Temporadas e episódios", source: "Fontes e transparência", watchlist: "Adicionar à lista", favorite: "Favorito",
  },
};

const esc = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const absolute = (path) => `${SITE_URL}${path}`;

function localeLinks(current = null) {
  return Object.entries(LOCALES).map(([locale, config]) => `<a ${current === locale ? 'aria-current="page"' : ""} href="${localePath(locale)}">${config.country}</a>`).join("");
}

function shell({ locale = "pt", path = "/", title, description, body, robots = "index,follow,max-image-preview:large", schema = null, pageClass = "" }) {
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
  <link rel="stylesheet" href="/assets/discovery.css">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary_large_image">
${schema ? `  <script type="application/ld+json">${json(schema)}</script>\n` : ""}
</head>
<body class="${pageClass}">
  <a class="skip-link" href="#content">Saltar para o conteúdo</a>
  ${body}
  <script type="module" src="/assets/library.js"></script>
</body>
</html>\n`;
}

function header(locale = null) {
  return `<header class="site-header"><a class="brand" href="/" aria-label="VISIONE home"><img src="/visione-logo.webp" alt="VISIONE"></a><nav aria-label="Mercado">${localeLinks(locale)}</nav><a class="wire-link" href="/news/">VISIONE Wire</a></header>`;
}

function footer() {
  return `<footer><a class="footer-brand" href="/"><img src="/visione-logo.webp" alt="VISIONE"></a><p>Descoberta de opções legais. A VISIONE não hospeda filmes ou séries.</p><nav aria-label="Informação"><a href="/credits/">Dados e créditos</a><a href="/news/privacy.html">Privacidade</a><a href="/news/contact.html">Contacto</a><a href="/news/">Wire</a></nav></footer>`;
}

function search(locale, compact = false) {
  const copy = COPY[locale] ?? COPY.pt;
  return `<div class="search-shell ${compact ? "is-compact" : ""}" data-search-root data-locale="${locale}" role="search"><label for="search-${locale}">${esc(copy.search)}</label><div class="search-control"><input id="search-${locale}" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(copy.search)}" aria-controls="results-${locale}" aria-autocomplete="list"><button type="button">${esc(copy.searchButton)}</button></div><div id="results-${locale}" class="search-results" role="listbox" aria-live="polite" hidden></div></div>`;
}

function titleCard(title, locale) {
  const name = title.titles[locale] ?? title.original_title;
  const type = COPY[locale][title.type];
  return `<a class="title-card" href="${titlePath(locale, title.slug)}"><span class="poster-fallback" aria-hidden="true">${esc(name.slice(0, 2).toUpperCase())}</span><span class="card-copy"><span class="eyebrow">${esc(type)} · ${esc(title.year)}</span><strong>${esc(name)}</strong><span>${esc(title.genres.slice(0, 2).join(" · "))}</span></span></a>`;
}

function providerBadge(provider, locale, count = null) {
  return `<a class="provider-card" href="${providerPath(locale, provider.id)}" style="--provider:${esc(provider.accent)}"><span aria-hidden="true">${esc(provider.short_name)}</span><strong>${esc(provider.name)}</strong>${count == null ? "" : `<small>${count} título${count === 1 ? "" : "s"}</small>`}</a>`;
}

export function renderGlobalPage() {
  const path = "/";
  const body = `${header()}
<main id="content"><section class="global-hero"><p class="eyebrow">FILMES · SÉRIES · ONDE VER</p><h1>Encontra a próxima história.<br><em>E onde vê-la legalmente.</em></h1><p>Pesquisa o catálogo local ou escolhe o teu mercado. A busca não chama serviços externos a cada tecla.</p>${search("pt")}<div class="market-grid"><a href="/es/"><span>ES</span><strong>España</strong><small>Encuentra dónde ver</small></a><a href="/pt/"><span>PT</span><strong>Portugal</strong><small>Descobre onde ver</small></a><a href="/br/"><span>BR</span><strong>Brasil</strong><small>Descubra onde assistir</small></a></div><p class="trust-note">Dados com fonte e data. Sem streams, torrents ou disponibilidade inventada.</p></section><section class="wire-strip"><div><p class="eyebrow">VISIONE WIRE</p><h2>Contexto além do catálogo.</h2><p>A área editorial continua disponível com notícias, análise e padrões de publicação transparentes.</p></div><a href="/news/">Abrir notícias →</a></section></main>${footer()}<script type="module" src="/assets/discovery-search.js"></script>`;
  return shell({ locale: "pt", path, title: "VISIONE | Onde ver filmes e séries", description: "Descobre onde ver filmes e séries legalmente em Espanha, Portugal e Brasil.", body, pageClass: "global-page" });
}

export function renderLocalePage({ locale, titles, providers }) {
  const copy = COPY[locale];
  const body = `${header(locale)}<main id="content"><section class="locale-hero"><p class="eyebrow">VISIONE · ${LOCALES[locale].country}</p><h1>${esc(copy.promise)}</h1><p>Pesquisa local, páginas rápidas e disponibilidade apresentada apenas quando a fonte a confirma.</p>${search(locale)}</section><section class="content-section"><div class="section-heading"><div><p class="eyebrow">DESCOBERTA</p><h2>${esc(copy.trending)}</h2></div><p>${titles.length} títulos com fontes visíveis e atualização datada.</p></div><div class="title-grid">${titles.map((title) => titleCard(title, locale)).join("")}</div></section><section class="content-section providers"><div class="section-heading"><div><p class="eyebrow">CATÁLOGOS</p><h2>${esc(copy.providers)}</h2></div></div><div class="provider-grid">${providers.map((provider) => providerBadge(provider, locale, titles.filter((title) => title.offers[LOCALES[locale].country]?.some((offer) => offer.provider_id === provider.id)).length)).join("")}</div></section><section class="wire-strip"><div><p class="eyebrow">VISIONE WIRE</p><h2>${esc(copy.news)}</h2><p>Reportagens e análises continuam acessíveis nas rotas editoriais existentes.</p></div><a href="/news/">Abrir Wire →</a></section></main>${footer()}<script type="module" src="/assets/discovery-search.js"></script>`;
  return shell({ locale, path: localePath(locale), title: `VISIONE ${LOCALES[locale].country} | ${copy.promise}`, description: `${copy.promise} Pesquisa rápida com disponibilidade legal e fontes visíveis.`, body, pageClass: "discovery-page" });
}

function offerList(title, locale, providers) {
  const copy = COPY[locale];
  const country = LOCALES[locale].country;
  const offers = rankOffers(title.offers[country]);
  if (!offers.length) return `<div class="empty-state"><strong>Dados de disponibilidade temporariamente indisponíveis.</strong><p>Não concluímos que o título esteja ausente: apenas não existe confirmação atual suficiente para este mercado.</p></div>`;
  return `<div class="offer-list">${offers.map((offer) => {
    const provider = providers.find((entry) => entry.id === offer.provider_id);
    return `<article class="offer"><span class="provider-mark" style="--provider:${esc(provider?.accent ?? "#8ea2ff")}">${esc(provider?.short_name ?? offer.provider_name?.slice(0, 2) ?? "↗")}</span><div><strong>${esc(offer.provider_name ?? provider?.name ?? offer.provider_id)}</strong><span>${esc({ subscription: "Incluído na subscrição", free: "Grátis legalmente", rent: "Aluguer", buy: "Compra" }[offer.type])}</span><small>${offer.price == null ? esc(copy.priceMissing) : `${esc(offer.price)} ${esc(offer.currency)}`}</small></div><a href="${esc(offer.url)}" target="_blank" rel="noopener noreferrer">${esc(copy.visit)} ↗</a></article>`;
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
  const schema = { "@context": "https://schema.org", "@type": title.type === "movie" ? "Movie" : "TVSeries", name, alternateName: title.original_title || undefined, dateCreated: title.year ? String(title.year) : undefined, genre: title.genres, description: title.overview[locale], director: title.credits.directors.map((person) => ({ "@type": "Person", name: person })), actor: title.credits.cast.map((person) => ({ "@type": "Person", name: person })), url: absolute(path) };
  const seasons = title.seasons.length ? `<section class="detail-section"><p class="eyebrow">${esc(copy.seasons)}</p><div class="season-grid">${title.seasons.map((season) => `<article><strong>${esc(season.name)}</strong><span>${season.episode_count} episódios</span></article>`).join("")}</div>${title.episodes.length ? `<ol class="episode-list">${title.episodes.map((episode) => `<li><span>S${episode.season} · E${episode.number}</span><strong>${esc(episode.titles[locale] ?? episode.titles.pt ?? "Episódio")}</strong><small>${episode.runtime_minutes ? `${episode.runtime_minutes} min` : ""}</small></li>`).join("")}</ol>` : ""}</section>` : "";
  const body = `${header(locale)}<main id="content"><article class="title-page"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${localePath(locale)}">VISIONE ${country}</a><span>/</span><span>${esc(name)}</span></nav><section class="title-hero"><div class="title-art" aria-hidden="true"><span>${esc(name.slice(0, 2).toUpperCase())}</span></div><div class="title-intro"><p class="eyebrow">${esc(copy[title.type])} · ${esc(title.year)}</p><h1>${esc(name)}</h1>${title.original_title && title.original_title !== name ? `<p class="original-title">${esc(title.original_title)}</p>` : ""}<p class="overview">${esc(title.overview[locale])}</p><ul class="facts"><li>${esc(title.genres.join(" · "))}</li>${title.runtime_minutes ? `<li>${title.runtime_minutes} min</li>` : ""}<li>${esc(title.countries.join(" · "))}</li></ul><div class="library-actions" data-library-title="${esc(title.id)}"><button type="button" data-library-action="watchlist">＋ ${esc(copy.watchlist)}</button><button type="button" data-library-action="favorite">♡ ${esc(copy.favorite)}</button>${releaseDate ? `<button type="button" data-calendar-date="${esc(releaseDate)}" data-calendar-title="${esc(name)}">Adicionar estreia ao calendário</button>` : ""}<span aria-live="polite"></span></div></div></section><section class="availability"><div class="section-heading"><div><p class="eyebrow">${esc(copy.where)} · ${country}</p><h2>Opções confirmadas agora.</h2></div><p>${esc(copy.updated)} ${esc(updated)}</p></div>${offerList(title, locale, providers)}<p class="availability-note">A disponibilidade pode mudar. Confirma sempre no fornecedor antes de subscrever, alugar ou comprar.</p></section><section class="detail-section"><p class="eyebrow">ELENCO E CRIAÇÃO</p><h2>Quem dá forma a esta história.</h2><p>${esc(people.join(" · ") || "Informação não fornecida pela fonte.")}</p></section>${seasons}<section class="detail-section sources-panel"><p class="eyebrow">${esc(copy.source)}</p><h2>Dados rastreáveis.</h2><p>${esc(title.source.attribution)}</p><a href="${esc(title.source.url)}" target="_blank" rel="noopener noreferrer">${esc(title.source.name)} ↗</a>${title.offers[country].map((offer) => `<a href="${esc(offer.source_url)}" target="_blank" rel="noopener noreferrer">Fonte de disponibilidade: ${esc(offer.provider_name)} ↗</a>`).join("")}</section></article></main>${footer()}`;
  return shell({ locale, path, title: `${name} — ${copy.where} | VISIONE`, description: `${title.overview[locale]} ${copy.updated}: ${updated}.`, body, robots: quality.indexable ? "index,follow,max-image-preview:large" : "noindex,follow", schema, pageClass: "title-body" });
}

export function renderProviderPage({ locale, provider, titles }) {
  const country = LOCALES[locale].country;
  const available = titles.filter((title) => title.offers[country].some((offer) => offer.provider_id === provider.id));
  const path = providerPath(locale, provider.id);
  const body = `${header(locale)}<main id="content"><section class="provider-hero" style="--provider:${esc(provider.accent)}"><span class="provider-mark">${esc(provider.short_name)}</span><div><p class="eyebrow">PLATAFORMA · ${country}</p><h1>${esc(provider.name)}</h1><p>Uma visão clara dos títulos atualmente confirmados nesta plataforma para o mercado selecionado. Os resultados exibem fonte e data; a VISIONE não vende subscrições nem reproduz o conteúdo.</p></div></section><section class="content-section"><div class="section-heading"><div><p class="eyebrow">DISPONIBILIDADE CONFIRMADA</p><h2>Filmes e séries.</h2></div><p>${available.length} título${available.length === 1 ? "" : "s"} no snapshot atual.</p></div>${available.length ? `<div class="title-grid">${available.map((title) => titleCard(title, locale)).join("")}</div>` : `<div class="empty-state"><strong>Aguardando uma fonte licenciada para este mercado.</strong><p>A página existe para navegação, mas permanece fora do índice enquanto não houver conteúdo suficiente.</p></div>`}</section></main>${footer()}`;
  return shell({ locale, path, title: `${provider.name} em ${country} | VISIONE`, description: `Descobre filmes e séries com disponibilidade confirmada em ${provider.name} para ${country}.`, body, robots: available.length ? "index,follow,max-image-preview:large" : "noindex,follow", pageClass: "provider-body" });
}

export function renderCreditsPage() {
  const body = `${header()}<main id="content"><article class="info-page"><p class="eyebrow">DADOS E CRÉDITOS</p><h1>Transparência antes de escala.</h1><p>A VISIONE mostra apenas informação rastreável, identifica a data da última verificação e nunca transforma ausência de dados em uma alegação de indisponibilidade.</p><h2>Fontes atuais</h2><p>O catálogo inicial usa páginas oficiais da Netflix, Apple TV e Prime Video, verificadas para criar uma amostra pequena e auditável. Os links levam ao fornecedor; não são marcados como afiliados.</p><h2>Integração preparada</h2><p>A camada opcional da <a href="https://www.themoviedb.org/" rel="noopener noreferrer">The Movie Database (TMDB)</a> funciona apenas durante ingestão/build. Dados de disponibilidade obtidos pelo endpoint de watch providers exigem atribuição à <strong>JustWatch</strong> e só podem ser publicados sob uma licença adequada ao uso comercial.</p><h2>Limites</h2><p>Preços ausentes não são estimados. Avaliações e reviews ausentes não são criados. A disponibilidade pode mudar e deve ser confirmada no serviço de destino.</p></article></main>${footer()}`;
  return shell({ locale: "pt", path: "/credits/", title: "Dados e créditos | VISIONE", description: "Fontes, atribuição, atualizações e limites dos dados de streaming publicados pela VISIONE.", body, pageClass: "info-body" });
}
