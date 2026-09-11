export const SITE_ORIGIN = "https://visione.one";

export const LOCALES = Object.freeze({
  es: Object.freeze({
    code: "es", lang: "es-ES", country: "ES", label: "España", flag: "🇪🇸",
    promise: "Encuentra dónde ver películas y series.", searchPlaceholder: "Busca una película, serie o actor",
    titleSegment: "donde-ver", providerSegment: "plataforma",
    unavailableLabel: "No encontramos una oferta verificada en los servicios compatibles.",
    dataPendingLabel: "Los datos de disponibilidad para este título todavía no están conectados.", updatedLabel: "Última comprobación"
  }),
  pt: Object.freeze({
    code: "pt", lang: "pt-PT", country: "PT", label: "Portugal", flag: "🇵🇹",
    promise: "Descobre onde ver filmes e séries.", searchPlaceholder: "Procura um filme, série ou ator",
    titleSegment: "onde-ver", providerSegment: "plataforma",
    unavailableLabel: "Não encontrámos uma oferta verificada nos serviços suportados.",
    dataPendingLabel: "Os dados de disponibilidade para este título ainda não estão ligados.", updatedLabel: "Última verificação"
  }),
  br: Object.freeze({
    code: "br", lang: "pt-BR", country: "BR", label: "Brasil", flag: "🇧🇷",
    promise: "Descubra onde assistir filmes e séries.", searchPlaceholder: "Busque um filme, série ou ator",
    titleSegment: "onde-assistir", providerSegment: "plataforma",
    unavailableLabel: "Não encontramos uma oferta verificada nos serviços compatíveis.",
    dataPendingLabel: "Os dados de disponibilidade deste título ainda não estão conectados.", updatedLabel: "Última verificação"
  })
});

export const LANGUAGE_LOCALES = Object.freeze({
  en: Object.freeze({
    code: "en", lang: "en", country: "ES", label: "English", marketLabel: "Spain", flag: "🇬🇧",
    promise: "Find where to watch movies and series.", searchPlaceholder: "Search for a movie, series or actor",
    titleSegment: "where-to-watch", providerSegment: "platform",
    unavailableLabel: "We could not find a verified offer on supported services.",
    dataPendingLabel: "Availability data for this title is not connected yet.", updatedLabel: "Last checked"
  }),
  fr: Object.freeze({
    code: "fr", lang: "fr-FR", country: "ES", label: "Français", marketLabel: "Espagne", flag: "🇫🇷",
    promise: "Trouvez où regarder des films et des séries.", searchPlaceholder: "Rechercher un film, une série ou un acteur",
    titleSegment: "ou-regarder", providerSegment: "plateforme",
    unavailableLabel: "Nous n’avons trouvé aucune offre vérifiée sur les services pris en charge.",
    dataPendingLabel: "Les données de disponibilité de ce titre ne sont pas encore connectées.", updatedLabel: "Dernière vérification"
  }),
  ru: Object.freeze({
    code: "ru", lang: "ru-RU", country: "ES", label: "Русский", marketLabel: "Испания", flag: "🇷🇺",
    promise: "Узнайте, где смотреть фильмы и сериалы.", searchPlaceholder: "Найти фильм, сериал или актёра",
    titleSegment: "gde-smotret", providerSegment: "platforma",
    unavailableLabel: "Мы не нашли подтверждённого предложения в поддерживаемых сервисах.",
    dataPendingLabel: "Данные о доступности этого названия пока не подключены.", updatedLabel: "Последняя проверка"
  }),
  uk: Object.freeze({
    code: "uk", lang: "uk-UA", country: "ES", label: "Українська", marketLabel: "Іспанія", flag: "🇺🇦",
    promise: "Дізнайтеся, де дивитися фільми та серіали.", searchPlaceholder: "Знайти фільм, серіал або актора",
    titleSegment: "de-dyvytysia", providerSegment: "platforma",
    unavailableLabel: "Ми не знайшли підтвердженої пропозиції в підтримуваних сервісах.",
    dataPendingLabel: "Дані про доступність цієї назви ще не підключені.", updatedLabel: "Остання перевірка"
  })
});

const ALL_LOCALES = Object.freeze({ ...LOCALES, ...LANGUAGE_LOCALES });
export const SUPPORTED_LOCALES = Object.freeze(Object.keys(ALL_LOCALES));
export const MARKET_LOCALES = Object.freeze(Object.keys(LOCALES));
export const EXTRA_LOCALES = Object.freeze(Object.keys(LANGUAGE_LOCALES));

export function getLocale(locale) {
  const config = ALL_LOCALES[locale];
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
