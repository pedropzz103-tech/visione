(() => {
  const supported = new Set(["es", "pt", "br"]);
  const currentPathLocale = location.pathname.split("/").filter(Boolean)[0];
  let selectedLocale = supported.has(currentPathLocale) ? currentPathLocale : localStorage.getItem("visione-market");
  if (!supported.has(selectedLocale)) selectedLocale = "es";

  document.querySelectorAll("[data-explicit-market],[data-market]").forEach((link) => {
    link.addEventListener("click", () => {
      const market = link.dataset.explicitMarket || link.dataset.market;
      if (supported.has(market)) localStorage.setItem("visione-market", market);
    });
  });

  let indexPromise;
  const getIndex = () => {
    if (!indexPromise) {
      indexPromise = fetch("/data/search-index.json", { credentials: "same-origin" })
        .then((response) => {
          if (!response.ok) throw new Error(`Search index unavailable: ${response.status}`);
          return response.json();
        })
        .catch(() => []);
    }
    return indexPromise;
  };

  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const renderResult = (record) => {
    const link = document.createElement("a");
    link.className = "search-result";
    link.href = record.url;

    if (record.poster) {
      const image = document.createElement("img");
      image.className = "search-result-poster";
      image.src = record.poster;
      image.alt = "";
      image.loading = "lazy";
      link.append(image);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "search-result-poster";
      fallback.setAttribute("aria-hidden", "true");
      link.append(fallback);
    }

    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = record.title;
    const meta = document.createElement("small");
    meta.textContent = `${record.year} · ${record.type === "series" ? "Série" : "Filme"}`;
    copy.append(title, meta);

    const arrow = document.createElement("span");
    arrow.textContent = "→";
    arrow.setAttribute("aria-hidden", "true");
    link.append(copy, arrow);
    return link;
  };

  document.querySelectorAll("[data-visione-search]").forEach((module) => {
    const input = module.querySelector("[data-search-input]");
    const results = module.querySelector("[data-search-results]");
    const form = module.querySelector("form");
    let locale = module.dataset.locale || selectedLocale;
    if (location.pathname === "/" && supported.has(selectedLocale)) locale = selectedLocale;

    const update = async () => {
      const query = normalize(input.value);
      results.replaceChildren();
      if (query.length < 2) {
        results.hidden = true;
        return [];
      }
      const records = await getIndex();
      const matches = records
        .filter((record) => record.locale === locale)
        .map((record) => ({ record, haystack: normalize([record.title, ...(record.alternateTitles || [])].join(" ")) }))
        .filter(({ haystack }) => haystack.includes(query))
        .slice(0, 7)
        .map(({ record }) => record);

      if (!matches.length) {
        const empty = document.createElement("div");
        empty.className = "search-result";
        empty.textContent = locale === "es" ? "No encontramos ese título en el catálogo actual." : "Esse título ainda não está no catálogo atual.";
        results.append(empty);
      } else {
        matches.forEach((record) => results.append(renderResult(record)));
      }
      results.hidden = false;
      return matches;
    };

    input.addEventListener("input", update);
    input.addEventListener("focus", () => { if (input.value.trim().length >= 2) update(); });
    document.addEventListener("click", (event) => {
      if (!module.contains(event.target)) results.hidden = true;
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const matches = await update();
      if (matches.length === 1) location.href = matches[0].url;
    });
  });
})();
