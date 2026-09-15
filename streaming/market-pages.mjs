import { absoluteUrl, localePath } from "./config.mjs";
import { renderLocaleHome } from "./render.mjs";

const MARKET_CATALOGS = Object.freeze({
  es: Object.freeze({ movie: "peliculas", series: "series" }),
  pt: Object.freeze({ movie: "filmes", series: "series" }),
  br: Object.freeze({ movie: "filmes", series: "series" })
});

const DATA_CREDITS = Object.freeze({
  es: "Datos y fuentes",
  pt: "Dados e fontes",
  br: "Dados e fontes",
  en: "Data & sources",
  fr: "Données et sources",
  ru: "Данные и источники",
  uk: "Дані та джерела"
});

const CATALOG_META = Object.freeze({
  es: Object.freeze({
    movie: Object.freeze({ title: "Películas: dónde ver online | VISIONE", description: "Explora películas y encuentra opciones legales verificadas para verlas online en España." }),
    series: Object.freeze({ title: "Series: dónde ver online | VISIONE", description: "Explora series y encuentra opciones legales verificadas para verlas online en España." })
  }),
  pt: Object.freeze({
    movie: Object.freeze({ title: "Filmes: onde ver online | VISIONE", description: "Explora filmes e encontra opções legais verificadas para os veres online em Portugal." }),
    series: Object.freeze({ title: "Séries: onde ver online | VISIONE", description: "Explora séries e encontra opções legais verificadas para as veres online em Portugal." })
  }),
  br: Object.freeze({
    movie: Object.freeze({ title: "Filmes: onde assistir online | VISIONE", description: "Explore filmes e encontre opções legais verificadas para assistir online no Brasil." }),
    series: Object.freeze({ title: "Séries: onde assistir online | VISIONE", description: "Explore séries e encontre opções legais verificadas para assistir online no Brasil." })
  })
});

const CATALOG_HERO = Object.freeze({
  es: Object.freeze({
    movie: Object.freeze({ eyebrow: "PELÍCULAS", title: "Películas", lead: "Encuentra películas y llega a la plataforma legal correcta.", note: "Solo mostramos disponibilidad verificada por mercado." }),
    series: Object.freeze({ eyebrow: "SERIES", title: "Series", lead: "Encuentra series y llega a la plataforma legal correcta.", note: "Solo mostramos disponibilidad verificada por mercado." })
  }),
  pt: Object.freeze({
    movie: Object.freeze({ eyebrow: "FILMES", title: "Filmes", lead: "Encontra filmes e chega à plataforma legal certa.", note: "Mostramos apenas disponibilidade verificada por mercado." }),
    series: Object.freeze({ eyebrow: "SÉRIES", title: "Séries", lead: "Encontra séries e chega à plataforma legal certa.", note: "Mostramos apenas disponibilidade verificada por mercado." })
  }),
  br: Object.freeze({
    movie: Object.freeze({ eyebrow: "FILMES", title: "Filmes", lead: "Encontre filmes e chegue à plataforma legal certa.", note: "Mostramos apenas disponibilidade verificada por mercado." }),
    series: Object.freeze({ eyebrow: "SÉRIES", title: "Séries", lead: "Encontre séries e chegue à plataforma legal certa.", note: "Mostramos apenas disponibilidade verificada por mercado." })
  })
});

export function dataCreditsLabel(locale) {
  return DATA_CREDITS[locale] || DATA_CREDITS.pt;
}

export function catalogPath(locale, type) {
  const route = MARKET_CATALOGS[locale]?.[type];
  if (!route) throw new Error(`Unsupported market catalog: ${locale}/${type}`);
  return `/${locale}/${route}/`;
}

function replaceHeadValue(html, tagPattern, replacement) {
  return html.replace(tagPattern, replacement);
}

function renderCatalogHero(locale, type) {
  const hero = CATALOG_HERO[locale][type];
  return `<div class="hero-content"><p class="eyebrow">${hero.eyebrow}</p><h1>${hero.title}</h1><p class="hero-lead">${hero.lead}</p><p class="hero-note">${hero.note}</p></div></section>`;
}

export function renderMarketCatalogPage(locale, type, titles, providers) {
  if (!MARKET_CATALOGS[locale]) throw new Error(`Unsupported market locale: ${locale}`);
  if (type !== "movie" && type !== "series") throw new Error(`Unsupported media type: ${type}`);

  const filtered = titles.filter((title) => title.type === type);
  const path = catalogPath(locale, type);
  const canonical = absoluteUrl(path);
  const meta = CATALOG_META[locale][type];
  let html = renderLocaleHome(locale, filtered, providers);

  html = replaceHeadValue(html, /<title>[\s\S]*?<\/title>/, `<title>${meta.title}</title>`);
  html = replaceHeadValue(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${meta.description}">`);
  html = replaceHeadValue(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`);
  html = replaceHeadValue(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${meta.title}">`);
  html = replaceHeadValue(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${meta.description}">`);
  html = replaceHeadValue(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canonical}">`);
  html = html.replace(/<div class="hero-content">[\s\S]*?<\/div><\/section>/, renderCatalogHero(locale, type));
  html = html.replace('<body class="stream-body discovery-home">', `<body class="stream-body discovery-home media-catalog-page" data-catalog-type="${type}">`);
  html = html.replaceAll('<article class="title-card', `<article data-media-type="${type}" class="title-card`);

  return html;
}

export function localizeGeneratedMarketHtml(html, locale) {
  if (!MARKET_CATALOGS[locale]) return html;

  let output = html
    .replaceAll(`${localePath(locale)}#filmes`, catalogPath(locale, "movie"))
    .replaceAll(`${localePath(locale)}#series`, catalogPath(locale, "series"));

  if (locale !== "es") return output;

  const replacements = [
    ["Dados & fontes", "Datos y fuentes"],
    ["Dados e fontes", "Datos y fuentes"],
    ["VISIONE indica onde encontrar filmes e séries legalmente. Não hospeda nem transmite obras audiovisuais.", "VISIONE indica dónde encontrar películas y series legalmente. No aloja ni transmite obras audiovisuales."],
    [">Privacidade<", ">Privacidad<"],
    [">Publicidade<", ">Publicidad<"],
    [">Contato<", ">Contacto<"],
    ["Pôster de ", "Póster de "],
    ["Incluído na assinatura", "Incluido con suscripción"],
    ["Grátis / com anúncios", "Gratis / con anuncios"],
    ["Compara streaming, aluguer/alquiler e compra quando os dados verificados estiverem disponíveis.", "Compara streaming, alquiler y compra cuando haya datos verificados disponibles."],
    ["Títulos verificados disponibles em ", "Títulos verificados disponibles en "],
    [" em España | VISIONE", " en España | VISIONE"]
  ];

  for (const [from, to] of replacements) output = output.replaceAll(from, to);
  return output;
}

export function marketCatalogOutputPath(locale, type) {
  const path = catalogPath(locale, type);
  return `${path.slice(1)}index.html`;
}
