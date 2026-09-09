const CLIENT_COPY = Object.freeze({
  es: Object.freeze({
    movie: "Película",
    series: "Serie",
    noResults: "Ningún resultado en este catálogo verificado.",
    searchUnavailable: "La búsqueda local no está disponible temporalmente.",
    subscriptionSaved: "Guardado solo en este dispositivo.",
    subscriptionRemoved: "Eliminado de la lista de este dispositivo.",
    calendarReady: "Evento de estreno preparado para el calendario.",
  }),
  pt: Object.freeze({
    movie: "Filme",
    series: "Série",
    noResults: "Nenhum resultado neste catálogo verificado.",
    searchUnavailable: "A pesquisa local está temporariamente indisponível.",
    subscriptionSaved: "Guardado apenas neste dispositivo.",
    subscriptionRemoved: "Removido da lista deste dispositivo.",
    calendarReady: "Evento de estreia preparado para o calendário.",
  }),
  br: Object.freeze({
    movie: "Filme",
    series: "Série",
    noResults: "Nenhum resultado neste catálogo verificado.",
    searchUnavailable: "A busca local está temporariamente indisponível.",
    subscriptionSaved: "Salvo apenas neste dispositivo.",
    subscriptionRemoved: "Removido da lista deste dispositivo.",
    calendarReady: "Evento de estreia preparado para o calendário.",
  }),
});

export function clientCopy(locale) {
  return CLIENT_COPY[locale] ?? CLIENT_COPY.pt;
}

export function localeFromLanguage(language = "") {
  if (language.toLowerCase() === "pt-br") return "br";
  if (language.toLowerCase().startsWith("es")) return "es";
  return "pt";
}
