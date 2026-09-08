export const SITE_URL = "https://visione.one";

export const LOCALES = Object.freeze({
  es: Object.freeze({ code: "es", hreflang: "es-ES", country: "ES", prefix: "es", titleSegment: "donde-ver" }),
  pt: Object.freeze({ code: "pt", hreflang: "pt-PT", country: "PT", prefix: "pt", titleSegment: "onde-ver" }),
  br: Object.freeze({ code: "br", hreflang: "pt-BR", country: "BR", prefix: "br", titleSegment: "onde-assistir" }),
});

export const OFFER_TYPES = Object.freeze(["subscription", "free", "rent", "buy"]);
export const MEDIA_TYPES = Object.freeze(["movie", "series"]);

export function getLocale(locale) {
  const config = LOCALES[locale];
  if (!config) throw new Error(`Unsupported locale: ${locale}`);
  return config;
}

export function localePath(locale) {
  return `/${getLocale(locale).prefix}/`;
}

export function titlePath(locale, slug) {
  const config = getLocale(locale);
  if (!slug || typeof slug !== "string") throw new Error("A title slug is required");
  return `/${config.prefix}/${config.titleSegment}/${slug}/`;
}

export function providerPath(locale, slug) {
  const config = getLocale(locale);
  if (!slug || typeof slug !== "string") throw new Error("A provider slug is required");
  return `/${config.prefix}/plataformas/${slug}/`;
}
