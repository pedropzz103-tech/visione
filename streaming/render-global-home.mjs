import { buildCollections } from "./catalog-selection.mjs";
import { localePath, SUPPORTED_LOCALES } from "./config.mjs";
import { publicMarkets } from "./publication.mjs";
import { escapeHtml, renderTitleCard } from "./render.mjs";

const MARKET_LOCALE = Object.freeze({ PT: "pt", ES: "es", BR: "br" });
const GLOBAL_MARKET_ORDER = Object.freeze(["PT", "ES", "BR"]);
function localeForTitle(title) { const markets = new Set(publicMarkets(title)); const market = GLOBAL_MARKET_ORDER.find((candidate) => markets.has(candidate)) ?? [...markets][0]; return MARKET_LOCALE[market] ?? "es"; }
function card(title, rank = null) { return renderTitleCard(title, localeForTitle(title), { rank }); }
function search() { return `<div class="search-module search-compact" data-visione-search data-locale="pt"><form role="search" action="/" class="search-form"><label class="sr-only" for="search-global">Procura um filme, série ou ator</label><span class="search-icon" aria-hidden="true">⌕</span><input id="search-global" data-search-input type="search" autocomplete="off" placeholder="Procura um filme, série ou ator"><button type="submit">Buscar</button></form><div class="search-results" data-search-results hidden></div></div>`; }
function languageSwitcher() { return `<div class="locale-switcher" aria-label="Idiomas">${SUPPORTED_LOCALES.map((locale) => `<a href="${localePath(locale)}">${locale.toUpperCase()}</a>`).join("")}</div>`; }
function header() { return `<header class="stream-header"><div class="stream-header-inner"><a class="visione-brand" href="/" aria-label="VISIONE"><img src="/visione-logo.webp" alt="" width="44" height="44"><span>VISIONE</span></a><div class="header-search">${search()}</div><div class="stream-header-actions"><nav aria-label="Principal"><a href="#catalogo">Catálogo</a><a href="/data-credits/">Dados & fontes</a><a href="/news/">Wire</a></nav>${languageSwitcher()}</div></div></header>`; }
function footer() { return `<footer class="stream-footer"><div><a class="visione-brand" href="/" aria-label="VISIONE"><img src="/visione-logo.webp" alt="" width="44" height="44"><span>VISIONE</span></a><p>VISIONE indica onde encontrar filmes e séries legalmente. Não hospeda nem transmite obras audiovisuais.</p></div><nav><a href="/news/about.html">Sobre</a><a href="/news/privacy.html">Privacidade</a><a href="/news/contact.html">Contato</a><a href="/news/">Wire</a></nav><p class="footer-note">© 2026 VISIONE.</p></footer>`; }
const LABELS = Object.freeze({
  "top-10": ["CURADORIA VISIONE · ATUALIZADA HOJE", "Top 10 VISIONE", "Seleção editorial; não representa audiência das plataformas."],
  recommended: ["PARA COMEÇAR AGORA", "Recomendados hoje", "Rotação diária VISIONE"],
  week: ["DESTAQUES EDITORIAIS", "Escolhas da semana", "Rotação semanal VISIONE"],
  "featured-movies": ["FILMES", "Filmes em destaque", "Títulos com disponibilidade verificada"],
  "featured-series": ["SÉRIES", "Séries em destaque", "Títulos com disponibilidade verificada"],
  "sci-fi-fantasy": ["UNIVERSOS", "Ficção científica e fantasia", "Explora outros mundos"],
  drama: ["DRAMA", "Histórias para mergulhar", "Curadoria por género"],
  "crime-thriller": ["SUSPENSE", "Crime, mistério e thriller", "Curadoria por género"],
  animation: ["ANIMAÇÃO", "Animação em destaque", "Curadoria por género"]
});
function section(collection, index) {
  const [eyebrow, title, note] = LABELS[collection.id] ?? ["CATÁLOGO", collection.id, ""];
  const cards = collection.titles.map((item, position) => card(item, collection.id === "top-10" ? position + 1 : null)).join("");
  return `<section id="${index === 0 ? "catalogo" : escapeHtml(collection.id)}" class="content-section catalog-section${collection.id === "top-10" ? " discovery-section top-ten-section" : ""}" data-catalog-section><div class="section-heading"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2>${note ? `<p class="collection-note">${escapeHtml(note)}</p>` : ""}</div><div class="rail-controls"><button type="button" class="rail-view-button" data-rail-view data-open-label="Ver mosaico" data-close-label="Fechar mosaico" aria-expanded="false">Ver mosaico</button></div></div><div class="rail-stage"><button type="button" class="rail-edge rail-edge-prev" data-rail-prev aria-label="Anterior"><span aria-hidden="true">‹</span></button><div class="title-rail cinematic-title-rail" data-catalog-rail tabindex="0">${cards}</div><button type="button" class="rail-edge rail-edge-next" data-rail-next aria-label="Seguinte"><span aria-hidden="true">›</span></button></div></section>`;
}
function providerTiles(providers = []) { return `<div class="provider-chips">${providers.map((provider) => `<span class="provider-chip provider-tile" data-provider="${escapeHtml(provider.id)}"><img class="provider-logo" src="${escapeHtml(provider.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="provider-name">${escapeHtml(provider.name)}</span></span>`).join("")}</div>`; }
export function renderGlobalHome(titles, providers = [], { date = new Date().toISOString().slice(0, 10) } = {}) {
  const collections = buildCollections(titles, { date, minSize: titles.length >= 12 ? 4 : 2, maxSize: 16 });
  const sections = collections.map(section).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VISIONE | Onde assistir filmes e séries</title><meta name="description" content="Descubra filmes e séries com capa e disponibilidade legal verificada na Espanha, Portugal e Brasil."><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#08090c"><link rel="canonical" href="https://visione.one/"><link rel="icon" href="/visione-logo.webp"><link rel="stylesheet" href="/assets/streaming.css"><link rel="stylesheet" href="/assets/editorial-cover.css"><link rel="stylesheet" href="/assets/streaming-layout.css?v=4"><script src="/assets/streaming.js" defer></script><script type="module" src="/assets/catalog-rails.mjs?v=2"></script></head><body class="stream-body discovery-home">${header()}<main><section class="global-hero cinematic-hero"><div class="cinematic-backdrop" aria-hidden="true"><img src="/assets/visione-cinematic-hero-v2.png" alt="" fetchpriority="high"></div><div class="cinematic-overlay" aria-hidden="true"></div><div class="hero-content"><p class="eyebrow">FILMES · SÉRIES · ONDE VER</p><h1>Descubra.<br><em>Encontre. Assista.</em></h1><p class="hero-lead">Um catálogo vivo com capas completas e opções legais verificadas.</p><p class="hero-note">Só mostramos títulos quando conseguimos confirmar onde assistir.</p></div></section>${sections}<section class="content-section provider-section"><div class="section-heading"><div><p class="eyebrow">TODAS AS SUAS TELAS</p><h2>Uma busca. Várias plataformas.</h2></div></div>${providerTiles(providers)}</section></main>${footer()}</body></html>`;
}
