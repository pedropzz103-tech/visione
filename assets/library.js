import { buildCalendarEvent } from "/scripts/lib/calendar.mjs";

const KEY = "visione-library-v1";
const state = (() => {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? { watchlist: [], favorite: [] }; }
  catch { return { watchlist: [], favorite: [] }; }
})();
for (const root of document.querySelectorAll("[data-library-title]")) {
  const id = root.dataset.libraryTitle;
  const status = root.querySelector("[aria-live]");
  for (const button of root.querySelectorAll("[data-library-action]")) {
    const action = button.dataset.libraryAction;
    const render = () => button.setAttribute("aria-pressed", String(state[action]?.includes(id)));
    render();
    button.addEventListener("click", () => {
      const values = new Set(state[action] ?? []);
      values.has(id) ? values.delete(id) : values.add(id);
      state[action] = [...values];
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Private mode may disallow storage. */ }
      render();
      status.textContent = values.has(id) ? "Guardado apenas neste dispositivo." : "Removido da lista deste dispositivo.";
    });
  }
  const calendar = root.querySelector("[data-calendar-date]");
  if (calendar) {
    calendar.addEventListener("click", () => {
      const content = buildCalendarEvent({ title: calendar.dataset.calendarTitle, date: calendar.dataset.calendarDate, url: location.href });
      const href = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = href;
      link.download = `${calendar.dataset.calendarDate}-visione.ics`;
      link.click();
      URL.revokeObjectURL(href);
      status.textContent = "Evento de estreia preparado para o calendário.";
    });
  }
}
