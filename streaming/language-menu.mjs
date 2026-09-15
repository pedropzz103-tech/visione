import { localePath, SUPPORTED_LOCALES } from "./config.mjs";

const LANGUAGE_NAMES = Object.freeze({
  es: "Español",
  pt: "Português",
  br: "Português (BR)",
  en: "English",
  fr: "Français",
  ru: "Русский",
  uk: "Українська"
});

const SELECT_LANGUAGE_LABELS = Object.freeze({
  es: "Seleccionar idioma",
  pt: "Selecionar idioma",
  br: "Selecionar idioma",
  en: "Select language",
  fr: "Sélectionner la langue",
  ru: "Выбрать язык",
  uk: "Вибрати мову"
});

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderLanguageMenu(activeLocale = null) {
  const active = SUPPORTED_LOCALES.includes(activeLocale) ? activeLocale : null;
  const trigger = active ? active.toUpperCase() : "Idioma";
  const ariaLabel = SELECT_LANGUAGE_LABELS[active] || "Selecionar idioma";
  const options = SUPPORTED_LOCALES.map((locale) => {
    const current = locale === active ? ' aria-current="page"' : "";
    return `<a class="language-option" href="${localePath(locale)}" lang="${esc(locale)}"${current}>${esc(LANGUAGE_NAMES[locale] ?? locale.toUpperCase())}<span>${locale.toUpperCase()}</span></a>`;
  }).join("");

  return `<details class="language-menu"><summary aria-label="${esc(ariaLabel)}">🌐 ${esc(trigger)} ▾</summary><div class="language-menu-panel">${options}</div></details>`;
}
