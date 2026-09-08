export const SITE_ORIGIN = "https://visione.one";

export const LOCALES = Object.freeze({
  es: Object.freeze({
    code: "es",
    lang: "es-ES",
    country: "ES",
    label: "España",
    flag: "🇪🇸",
    promise: "Encuentra dónde ver películas y series.",
    searchPlaceholder: "Busca una película, serie o actor",
    titleSegment: "donde-ver",
    providerSegment: "plataforma",
    unavailableLabel: "No encontramos una oferta verificada en los servicios compatibles.",
    dataPendingLabel: "Los datos de disponibilidad para este título todavía no están conectados.",
    updatedLabel: "Última comprobación"
  }),
  pt: Object.freeze({
    code: "pt",
    lang: "pt-PT",
    country: "PT",
    label: "Portugal",
    flag: "🇵🇹",
    promise: "Descobre onde ver filmes e séries.",
    searchPlaceholder: "Procura um filme, série ou ator",
    titleSegment: "onde-ver",
    providerSegment: "plataforma",
    unavailableLabel: "Não encontrámos uma oferta verificada nos serviços suportados.",
    dataPendingLabel: "Os dados de disponibilidade para este título ainda não estão ligados.",
    updatedLabel: "Última verificação"
  }),
  br: Object.freeze({
    code: "br",
    lang: "pt-BR",
    country: "BR",
    label: "Brasil",
    flag: "🇧🇷",
    promise: "Descubra onde assistir filmes e séries.",
    searchPlaceholder: "Busque um filme, série ou ator",
    titleSegment: "onde-assistir",
    providerSegment: "plataforma",
    unavailableLabel: "Não encontramos uma oferta verificada nos serviços compatíveis.",
    dataPendingLabel: "Os dados de disponibilidade deste título ainda não estão conectados.",
    updatedLabel: "Última verificação"
  })
});

export const SUPPORTED_LOCALES = Object.freeze(Object.keys(LOCALES));

export function getLocale(locale) {
  const config = LOCALES[locale];
  if (!config) throw new Error(`Unsupported locale: ${locale}`);
  return config;
}

export function localePath(locale) {
  getLocale(locale);
  return `/${locale}/`;
}

export function titlePath(locale, slug) {
  const config = getLocale(locale);
  if (!slug) throw new Error("Title slug is required");
  return `/${locale}/${config.titleSegment}/${slug}/`;
}

export function providerPath(locale, slug) {
  const config = getLocale(locale);
  if (!slug) throw new Error("Provider slug is required");
  return `/${locale}/${config.providerSegment}/${slug}/`;
}

export function absoluteUrl(pathname) {
  return new URL(pathname, `${SITE_ORIGIN}/`).href;
}

export function localizedPathSet(slug) {
  return Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, titlePath(locale, slug)]));
}
