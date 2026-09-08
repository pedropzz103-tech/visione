import { LOCALES, SITE_URL, titlePath } from "./config.mjs";

export function canonicalFor(sitePath) {
  if (typeof sitePath !== "string" || !sitePath.startsWith("/") || sitePath.startsWith("//")) {
    throw new Error("Canonical requires a site path beginning with /");
  }
  return `${SITE_URL}${sitePath}`;
}

export function hreflangForTitle(title) {
  const links = Object.entries(LOCALES).map(([locale, config]) => ({
    hreflang: config.hreflang,
    href: canonicalFor(titlePath(locale, title.slug)),
  }));
  links.push({ hreflang: "x-default", href: canonicalFor(titlePath("pt", title.slug)) });
  return links;
}

export function hreflangForLocales() {
  const links = Object.entries(LOCALES).map(([locale, config]) => ({ hreflang: config.hreflang, href: canonicalFor(`/${locale}/`) }));
  links.push({ hreflang: "x-default", href: canonicalFor("/") });
  return links;
}

export function titleSchema(title, locale) {
  const schema = {
    "@context": "https://schema.org",
    "@type": title.type === "movie" ? "Movie" : "TVSeries",
    name: title.titles[locale] ?? title.original_title,
    alternateName: title.original_title || undefined,
    dateCreated: title.year ? String(title.year) : undefined,
    genre: title.genres?.length ? title.genres : undefined,
    description: title.overview?.[locale] || undefined,
    director: title.credits?.directors?.length ? title.credits.directors.map((name) => ({ "@type": "Person", name })) : undefined,
    creator: title.credits?.creators?.length ? title.credits.creators.map((name) => ({ "@type": "Person", name })) : undefined,
    actor: title.credits?.cast?.length ? title.credits.cast.map((name) => ({ "@type": "Person", name })) : undefined,
    url: canonicalFor(titlePath(locale, title.slug)),
  };
  if (title.rating?.value != null && title.rating?.count > 0 && title.rating?.source) {
    schema.aggregateRating = { "@type": "AggregateRating", ratingValue: title.rating.value, ratingCount: title.rating.count, author: title.rating.source };
  }
  return schema;
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: canonicalFor(item.path) })),
  };
}

export function faqSchema(items) {
  if (!items?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
  };
}

function xml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function generateSitemap(pages) {
  const indexable = pages.filter((page) => page.indexable);
  const seen = new Set();
  for (const page of indexable) {
    if (seen.has(page.canonical)) throw new Error(`Duplicate canonical in sitemap: ${page.canonical}`);
    seen.add(page.canonical);
  }
  const rows = indexable.sort((left, right) => left.canonical.localeCompare(right.canonical)).map((page) => `  <url><loc>${xml(page.canonical)}</loc>${page.lastmod ? `<lastmod>${xml(page.lastmod)}</lastmod>` : ""}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}
