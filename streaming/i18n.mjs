import { EXTRA_LOCALES } from "./config.mjs";

export const COPY = Object.freeze({
  en: Object.freeze({
    movies: "Movies", series: "Series", search: "Search", mediaMovie: "Movie", mediaSeries: "Series",
    heroEyebrow: "MOVIES · SERIES · WHERE TO WATCH", heroTitle: "Discover. Find. Watch.",
    heroLead: "Explore stories and jump straight to a verified legal streaming option.", marketNote: "Availability shown for Spain",
    top: "Top picks", recommended: "Recommended today", moviesTitle: "Movies in focus", seriesTitle: "Series in focus",
    verified: "Verified availability", viewOffer: "View offer", subscription: "Included with subscription", free: "Free / with ads",
    rent: "Rent", buy: "Buy", overview: "Overview", where: "Where to watch", lastChecked: "Last checked",
    providerTitles: "Available titles", back: "Back to VISIONE"
  }),
  fr: Object.freeze({
    movies: "Films", series: "Séries", search: "Rechercher", mediaMovie: "Film", mediaSeries: "Série",
    heroEyebrow: "FILMS · SÉRIES · OÙ REGARDER", heroTitle: "Découvrez. Trouvez. Regardez.",
    heroLead: "Explorez des histoires et accédez directement à une option légale vérifiée.", marketNote: "Disponibilité affichée pour l’Espagne",
    top: "Sélection VISIONE", recommended: "Recommandés aujourd’hui", moviesTitle: "Films à découvrir", seriesTitle: "Séries à découvrir",
    verified: "Disponibilité vérifiée", viewOffer: "Voir l’offre", subscription: "Inclus avec l’abonnement", free: "Gratuit / avec publicité",
    rent: "Location", buy: "Achat", overview: "Présentation", where: "Où regarder", lastChecked: "Dernière vérification",
    providerTitles: "Titres disponibles", back: "Retour à VISIONE"
  }),
  ru: Object.freeze({
    movies: "Фильмы", series: "Сериалы", search: "Найти", mediaMovie: "Фильм", mediaSeries: "Сериал",
    heroEyebrow: "ФИЛЬМЫ · СЕРИАЛЫ · ГДЕ СМОТРЕТЬ", heroTitle: "Откройте. Найдите. Смотрите.",
    heroLead: "Находите истории и переходите к проверенному легальному варианту просмотра.", marketNote: "Доступность указана для Испании",
    top: "Выбор VISIONE", recommended: "Рекомендуем сегодня", moviesTitle: "Фильмы в центре внимания", seriesTitle: "Сериалы в центре внимания",
    verified: "Подтверждённая доступность", viewOffer: "Открыть", subscription: "Входит в подписку", free: "Бесплатно / с рекламой",
    rent: "Аренда", buy: "Покупка", overview: "Описание", where: "Где смотреть", lastChecked: "Последняя проверка",
    providerTitles: "Доступные названия", back: "Назад к VISIONE"
  }),
  uk: Object.freeze({
    movies: "Фільми", series: "Серіали", search: "Знайти", mediaMovie: "Фільм", mediaSeries: "Серіал",
    heroEyebrow: "ФІЛЬМИ · СЕРІАЛИ · ДЕ ДИВИТИСЯ", heroTitle: "Відкривайте. Знаходьте. Дивіться.",
    heroLead: "Знаходьте історії та переходьте до перевіреного легального варіанта перегляду.", marketNote: "Доступність вказана для Іспанії",
    top: "Вибір VISIONE", recommended: "Рекомендуємо сьогодні", moviesTitle: "Фільми у фокусі", seriesTitle: "Серіали у фокусі",
    verified: "Підтверджена доступність", viewOffer: "Перейти", subscription: "Входить у підписку", free: "Безкоштовно / з рекламою",
    rent: "Оренда", buy: "Купівля", overview: "Опис", where: "Де дивитися", lastChecked: "Остання перевірка",
    providerTitles: "Доступні назви", back: "Назад до VISIONE"
  })
});

export function isExtraLocale(locale) {
  return EXTRA_LOCALES.includes(locale);
}

export function localizedName(title, locale) {
  return String(title?.titles?.[locale] || title?.original_title || title?.titles?.es || title?.titles?.pt || title?.slug || "").trim();
}

function genreText(title) {
  return (title?.genres ?? []).slice(0, 2).join(", ");
}

function castText(title) {
  const cast = Array.isArray(title?.credits?.cast) ? title.credits.cast.slice(0, 3) : [];
  return cast.join(", ");
}

export function synthesizedOverview(title, locale) {
  const c = COPY[locale];
  const name = localizedName(title, locale);
  const year = title?.year || "";
  const genres = genreText(title);
  const cast = castText(title);
  if (locale === "fr") return `${name} est ${title.type === "series" ? "une série" : "un film"} de ${year}${genres ? `, classé notamment dans ${genres}` : ""}${cast ? `. Avec ${cast}` : ""}. VISIONE affiche les options légales vérifiées disponibles en Espagne.`;
  if (locale === "ru") return `${name} — ${title.type === "series" ? "сериал" : "фильм"} ${year} года${genres ? ` в жанрах ${genres}` : ""}${cast ? `. В ролях: ${cast}` : ""}. VISIONE показывает проверенные легальные варианты просмотра в Испании.`;
  if (locale === "uk") return `${name} — ${title.type === "series" ? "серіал" : "фільм"} ${year} року${genres ? ` у жанрах ${genres}` : ""}${cast ? `. У ролях: ${cast}` : ""}. VISIONE показує перевірені легальні варіанти перегляду в Іспанії.`;
  return `${name} is a ${year} ${title.type === "series" ? "series" : "film"}${genres ? ` in genres including ${genres}` : ""}${cast ? `. Featuring ${cast}` : ""}. VISIONE shows verified legal viewing options available in Spain.`;
}

export function localizeTitle(title, locale) {
  if (!isExtraLocale(locale)) return title;
  const name = localizedName(title, locale);
  const existingOverview = String(title?.overview?.[locale] || "").trim();
  return {
    ...title,
    titles: { ...title.titles, [locale]: name },
    overview: { ...title.overview, [locale]: existingOverview || synthesizedOverview(title, locale) }
  };
}

export function copyFor(locale) {
  const value = COPY[locale];
  if (!value) throw new Error(`No extended locale copy for ${locale}`);
  return value;
}
