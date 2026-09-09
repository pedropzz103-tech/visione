import { clientCopy } from "/assets/discovery-i18n.js?v=20260909-1";

const normalize = (value = "") => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
function distance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}
function score(query, text) {
  if (text === query) return 1;
  if (text.startsWith(query)) return .96;
  if (text.split(" ").some((word) => word.startsWith(query))) return .92;
  if (text.includes(query)) return .88;
  const queryTokens = query.split(" ").filter((token) => token.length >= 4);
  const words = text.split(" ").filter((token) => token.length >= 4);
  if (!queryTokens.length || !words.length) return 0;
  return queryTokens.reduce((sum, token) => sum + Math.max(...words.map((word) => 1 - distance(token, word) / Math.max(token.length, word.length))), 0) / queryTokens.length;
}
let indexPromise;
const loadIndex = () => indexPromise ??= fetch("/data/search-index.json", { credentials: "same-origin" }).then((response) => {
  if (!response.ok) throw new Error(`Search index unavailable (${response.status})`);
  return response.json();
});
for (const root of document.querySelectorAll("[data-search-root]")) {
  const input = root.querySelector("input[type=search]");
  const button = root.querySelector("button");
  const results = root.querySelector("[role=listbox]");
  let active = -1;
  let timer;
  const locale = root.dataset.locale || "pt";
  const copy = clientCopy(locale);
  const render = async () => {
    const query = normalize(input.value);
    active = -1;
    if (!query) { results.hidden = true; results.replaceChildren(); return; }
    try {
      const index = await loadIndex();
      const matches = index.map((entry) => ({ entry, score: score(query, entry.searchText) })).filter((item) => item.score >= .58).sort((a, b) => b.score - a.score).slice(0, 8);
      results.innerHTML = matches.length ? matches.map(({ entry }) => {
        const title = entry.titles[locale] || entry.titles.pt || Object.values(entry.titles)[0];
        return `<a class="search-result" role="option" aria-selected="false" href="${entry.paths[locale] || entry.paths.pt}"><span>${title.slice(0, 2).toUpperCase()}</span><span><strong>${title}</strong><small>${entry.type === "movie" ? copy.movie : copy.series}</small></span><small>${entry.year ?? ""}</small></a>`;
      }).join("") : `<p class="search-empty">${copy.noResults}</p>`;
      results.hidden = false;
    } catch {
      results.innerHTML = `<p class="search-empty">${copy.searchUnavailable}</p>`;
      results.hidden = false;
    }
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(render, 160); };
  input.addEventListener("input", schedule);
  button.addEventListener("click", render);
  input.addEventListener("keydown", (event) => {
    const options = [...results.querySelectorAll("[role=option]")];
    if (event.key === "Escape") { results.hidden = true; return; }
    if (!options.length || !["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Enter" && active >= 0) { options[active].click(); return; }
    active = event.key === "ArrowDown" ? Math.min(active + 1, options.length - 1) : Math.max(active - 1, 0);
    options.forEach((option, index) => option.setAttribute("aria-selected", String(index === active)));
    options[active].scrollIntoView({ block: "nearest" });
  });
}
