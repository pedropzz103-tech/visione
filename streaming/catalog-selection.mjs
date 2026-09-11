function score(title) {
  const rating = Number(title?.rating?.value) || 0;
  const discovery = Number(title?.discovery?.score) || 0;
  const sitelinks = Number(title?.discovery?.sitelinks) || 0;
  const year = Number(title?.year) || 1900;
  const recency = Math.max(0, Math.min(25, year - 2000));
  return rating * 8 + discovery + Math.log2(Math.max(1, sitelinks + 1)) * 4 + recency;
}

function hash(value) {
  let h = 2166136261;
  for (const char of String(value)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededOrder(titles, seed) {
  return [...titles].sort((a, b) => {
    const ah = hash(`${seed}:${a.slug}`);
    const bh = hash(`${seed}:${b.slug}`);
    return ah - bh || score(b) - score(a) || String(a.slug).localeCompare(String(b.slug));
  });
}

function scoreOrder(titles) {
  return [...titles].sort((a, b) => score(b) - score(a) || String(a.slug).localeCompare(String(b.slug)));
}

function matchesGenre(title, patterns) {
  const genres = (title?.genres ?? []).join(" ").toLowerCase();
  return patterns.some((pattern) => genres.includes(pattern));
}

function weekSeed(date) {
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function buildCollections(titles = [], {
  date = new Date().toISOString().slice(0, 10),
  minSize = 4,
  maxSize = 16
} = {}) {
  const unique = [...new Map(titles.filter(Boolean).map((title) => [title.slug, title])).values()];
  const limit = Math.max(4, Math.min(20, Number(maxSize) || 16));
  const minimum = Math.max(2, Math.min(limit, Number(minSize) || 4));
  const usage = new Map();
  const output = [];

  const add = (id, candidates, { size = limit, force = false } = {}) => {
    const deduped = [...new Map(candidates.map((title) => [title.slug, title])).values()];
    const underBudget = deduped.filter((title) => (usage.get(title.slug) ?? 0) < 3);
    const pool = underBudget.length >= minimum ? underBudget : deduped;
    const picked = pool.slice(0, size);
    if (!force && picked.length < minimum) return;
    if (!picked.length) return;
    for (const title of picked) usage.set(title.slug, (usage.get(title.slug) ?? 0) + 1);
    output.push({ id, titles: picked });
  };

  const ranked = scoreOrder(unique);
  add("top-10", ranked, { size: Math.min(10, ranked.length), force: ranked.length > 0 });
  add("recommended", seededOrder(unique, `day:${date}`), { size: limit });
  add("week", seededOrder(unique, `week:${weekSeed(date)}`), { size: limit });
  add("featured-movies", scoreOrder(unique.filter((title) => title.type === "movie")), { size: limit });
  add("featured-series", scoreOrder(unique.filter((title) => title.type === "series")), { size: limit });
  add("sci-fi-fantasy", scoreOrder(unique.filter((title) => matchesGenre(title, ["science fiction", "science-fiction", "sci-fi", "fantasy", "ficção científica", "ficcion"])))), { size: limit });
  add("drama", scoreOrder(unique.filter((title) => matchesGenre(title, ["drama"])))), { size: limit });
  add("crime-thriller", scoreOrder(unique.filter((title) => matchesGenre(title, ["crime", "thriller", "suspense", "mystery", "misterio", "mistério"])))), { size: limit });
  add("animation", scoreOrder(unique.filter((title) => matchesGenre(title, ["animation", "anime", "animação", "animacion"])))), { size: limit });

  return output;
}
