import { titlePath } from "./config.mjs";

export function normalizeQuery(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

export function scoreSearch(query, entry) {
  const normalized = normalizeQuery(query);
  const text = normalizeQuery(entry.searchText ?? "");
  if (!normalized || !text) return 0;
  if (text === normalized) return 1;
  if (text.startsWith(normalized)) return 0.96;
  if (text.split(" ").some((word) => word.startsWith(normalized))) return 0.92;
  if (text.includes(normalized)) return 0.88;

  const queryTokens = normalized.split(" ").filter((token) => token.length >= 4);
  const textTokens = text.split(" ").filter((token) => token.length >= 4);
  if (!queryTokens.length || !textTokens.length) return 0;

  const scores = queryTokens.map((queryToken) => Math.max(...textTokens.map((textToken) => {
    const distance = editDistance(queryToken, textToken);
    return 1 - distance / Math.max(queryToken.length, textToken.length);
  })));
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function buildSearchIndex(catalog = []) {
  return catalog.map((title) => {
    const aliases = [
      title.original_title,
      ...(title.genres ?? []),
      ...(title.credits?.directors ?? []),
      ...(title.credits?.creators ?? []),
      ...(title.credits?.cast ?? []),
    ].filter(Boolean);
    const titles = { ...(title.titles ?? {}) };
    return {
      id: title.id,
      type: title.type,
      year: title.year,
      titles,
      aliases,
      paths: {
        es: titlePath("es", title.slug),
        pt: titlePath("pt", title.slug),
        br: titlePath("br", title.slug),
      },
      searchText: normalizeQuery([...Object.values(titles), ...aliases].join(" ")),
    };
  });
}

export function searchCatalog(query, index, limit = 8) {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];
  return index
    .map((entry) => ({ entry, score: scoreSearch(normalized, entry) }))
    .filter(({ score }) => score >= 0.58)
    .sort((left, right) => right.score - left.score || String(left.entry.year).localeCompare(String(right.entry.year)))
    .slice(0, limit)
    .map(({ entry, score }) => ({ ...entry, score }));
}
