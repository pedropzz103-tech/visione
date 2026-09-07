# VISIONE Main-Domain and Editorial Quality Redesign

## Goal

Restore the editorial publication as the primary product at `https://visione.one/`, remove the institutional studio presentation from the root homepage, consolidate editorial authority on the main domain, and raise technical and editorial quality before a new Google AdSense review.

This redesign does not guarantee AdSense approval. Its purpose is to remove avoidable quality, consistency, navigation and originality problems and make the site easier for readers and crawlers to understand.

## Canonical domain architecture

`visione.one` is the only editorial domain in this architecture.

- Homepage: `https://visione.one/`
- Articles: `https://visione.one/news/<slug>.html`
- Editorial pages: `https://visione.one/news/about.html`, `/news/editorial.html`, `/news/accountability.html`, `/news/coverage.html`, `/news/contact.html`, `/news/privacy.html`, `/news/cookie-policy.html`, `/news/advertising.html`
- RSS: `https://visione.one/news/feed.xml`
- General sitemap: `https://visione.one/sitemap.xml`
- Google News sitemap: `https://visione.one/news/news-sitemap.xml`

No editorial subdomain, proxy layer or alternate canonical host is part of this design. `tablet.visione.one`, used by SDKPOS, is outside the publication architecture and must not be changed, redirected, proxied or included in editorial deployment work.

## Homepage

The root `index.html` is the editorial homepage rather than the institutional presentation. The visual language remains publication-first: strong feature story, restrained typography, clear source-conscious summaries, responsive cards and visible trust links.

The homepage should not look like an automatically generated feed. It is deliberately curated, features a small number of strong stories, and provides direct access to About, Coverage, Editorial Standards, Accountability, Contact and RSS.

The root page uses the existing `news/styles.css` editorial design system and main-domain canonical metadata. Historical project files may remain accessible at their existing URLs, but they do not define the root homepage or the publication sitemap.

`news/index.html` must not compete with the root homepage. It uses `noindex,follow`, canonicalizes to `https://visione.one/`, contains no advertising code, and acts only as a simple route back to the canonical homepage.

## Editorial focus

VISIONE narrows its declared focus to areas where it can add durable analytical value:

- artificial intelligence and agents;
- software and developer infrastructure;
- computing, chips, data centers and cloud infrastructure;
- cybersecurity and digital infrastructure;
- digital business and major technology-company economics;
- technology regulation, competition and policy;
- science or space only when there is a meaningful technology or infrastructure angle;
- market developments only when they materially affect technology or digital infrastructure.

Routine gaming announcements, entertainment filler, celebrity coverage, rumor-driven stories, generic world news and low-information product posts are not part of the normal publishing pipeline. Older substantive articles can remain available; the change is primarily a forward-looking editorial standard.

## Publication cadence

Quality takes priority over volume.

The editorial automation researches twice per day rather than four times per day. It may publish at most one new article URL per day under normal conditions. A second new article is allowed only for an exceptional, independently verified breaking development with clear long-term reader value.

Material developments on an existing story should normally update the existing URL with a visible modified time rather than create a duplicate page. If no candidate meets the quality gate, the correct result is to publish nothing.

The automation remains paused unless the user explicitly asks to restart it.

## Original-value gate

A new article must do more than summarize or rewrite source material. Before publication it must contain at least one meaningful original-value component, such as:

- a comparison built from source data;
- a chronology or incident timeline assembled from multiple sources;
- calculations derived transparently from reported figures;
- analysis of a primary document, filing, benchmark, policy text or technical specification;
- a contextual benchmark against previous events or company results;
- a clearly labeled VISIONE interpretation that connects multiple verified facts;
- a material update that synthesizes how the story changed over time.

Word count is not a quality metric. Articles should be as long as the evidence justifies and should never be padded to hit a target.

## Source and verification gate

For a normal news article, prefer a primary source plus at least one credible independent source. When a primary document is itself the subject, the article may rely more heavily on that document, but claims, context and uncertainty must still be separated clearly.

Every article must distinguish confirmed facts, source claims, allegations, estimates and VISIONE analysis. Numerical claims, dates, legal conclusions and technical specifications must be checked before publication.

A visible Sources section is required for substantive news articles. Image source and licensing or rights context must be included where appropriate.

## Authorship and accountability

The publication makes responsibility concrete.

- Pedro is the responsible editor identified by the publication.
- A dedicated author/profile page links to Editorial Standards and Accountability.
- New article schema uses a Person author entity where appropriate, with VISIONE as publisher.
- Visible bylines remain consistent with that authorship model.
- AI assistance may be disclosed in Editorial Standards and Accountability, but AI is never represented as a factual source.

## SEO and metadata normalization

All editorial pages agree on one URL architecture.

The site normalizes:

- canonical URLs;
- `og:url`;
- NewsArticle `mainEntityOfPage`;
- author and publisher URLs;
- navigation and footer links;
- RSS channel/item URLs;
- sitemap URLs;
- robots sitemap declarations;
- homepage structured data.

No canonical or structured-data field should point away from `visione.one` for first-party editorial content.

The general sitemap includes the canonical homepage, editorial trust pages and all indexable canonical article URLs. The Google News sitemap contains only eligible recent news URLs, normally articles published within the previous 48 hours, while older stories remain in the general sitemap.

## AdSense and user experience

Advertising code should exist only on meaningful publisher-content pages where it is appropriate. Utility, noindex or navigation-only pages should not load AdSense.

The site retains clear navigation, readable content, privacy/cookie disclosure, advertising standards and `ads.txt`. Privacy and cookie wording must describe the actual configuration rather than claiming services or consent mechanisms that are not active.

Editorial content remains the dominant visual and informational element. Ad density, when ads are approved, must not obscure or imitate editorial content.

## Automated quality checks

The repository quality check must fail before future editorial changes are accepted when the canonical architecture drifts. At minimum it verifies:

- the root homepage canonical is `https://visione.one/`;
- article canonicals resolve under `/news/`;
- substantive article pages contain a byline, NewsArticle metadata and Sources section;
- sitemap URLs use the canonical domain;
- the News sitemap does not intentionally accumulate stale entries;
- `ads.txt` contains the expected publisher record;
- the retired editorial subdomain infrastructure and its deployment workflow are absent;
- stale institutional redesign documents that could reintroduce the old architecture are absent.

The checks should be conservative enough not to reward meaningless padding or arbitrary word counts.

## Migration safety

The redesign preserves existing article slugs and their `/news/` URLs. No article should be moved to a new path without a deliberate migration plan.

`tablet.visione.one` remains outside the editorial architecture. No editorial deployment, test or automation may target it.

Before completion, verify the live root homepage, several article canonicals, robots.txt, sitemap.xml, news sitemap, RSS and ads.txt.

## Success criteria

The work is complete when:

1. `visione.one` visibly serves the editorial publication as its homepage.
2. The institutional presentation is no longer the root experience.
3. Current editorial URLs consistently canonicalize to `visione.one/news/...`.
4. No retired editorial-subdomain Worker, route or deployment workflow remains in the repository.
5. `tablet.visione.one` remains untouched by the migration.
6. Sitemap, News sitemap, RSS and robots files all use the main-domain architecture.
7. Editorial/About/Accountability pages describe the narrower high-value focus and stronger originality requirements.
8. Automated checks detect domain drift and missing editorial-quality signals.
9. The editorial automation uses lower cadence and higher selectivity and remains disabled until explicitly restarted.
10. The site is in a materially stronger state for an AdSense re-review, without claiming or implying guaranteed approval.
