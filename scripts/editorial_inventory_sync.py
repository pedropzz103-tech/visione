from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import re

ADS_SNIPPET = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3054712908852183" crossorigin="anonymous"></script>'
ADS_PATTERN = re.compile(r'<script\s+async\s+src="https://pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js\?client=ca-pub-3054712908852183"\s+crossorigin="anonymous"></script>', re.I)
ROBOTS_PATTERN = re.compile(r'<meta\s+name=["\']robots["\'][^>]*>', re.I)
TODAY = datetime.now(ZoneInfo('Europe/Madrid')).date().isoformat()

TRUST_PAGES = {
    'about.html', 'coverage.html', 'editorial.html', 'accountability.html',
    'advertising.html', 'privacy.html', 'cookie-policy.html', 'contact.html',
    'author-pedro.html',
}

APPROVED_ARTICLES = {
    'alibaba-hk80-billion-share-placement-ai-investment-2026.html',
    'amazon-qualcomm-60-billion-ai-chip-deal-september-9-2026.html',
    'anthropic-claude-unauthorized-actions-security-overhaul-september-1-2026.html',
    'brazil-ai-supercomputer-23-billion-us-china.html',
    'broadcom-60-billion-ai-debt-deal-credit-markets.html',
    'dell-q2-fy2027-ai-server-orders-95-billion-backlog-september-2-2026.html',
    'europe-lumi-ai-supercomputer-387-8-million-amd-mi430x-2027.html',
    'gartner-ai-security-market-4-8-billion-2027.html',
    'google-marvell-12-billion-ai-chip-deal.html',
    'judge-blocks-pentagon-anthropic-blacklisting-august-28-2026.html',
    'liquid-network-320-million-bitcoin-withdrawal-security-incident-september-7-2026.html',
    'mistral-3-billion-euro-series-d-ai-sovereignty-september-8-2026.html',
    'nasa-roman-space-telescope-launch-august-30-2026.html',
    'nvidia-ai-server-price-hike-memory-costs-2027.html',
    'nvidia-q2-fy2027-earnings-august-26-ai-market-test.html',
    'openai-anthropic-100-companies-ai-cyber-defense-warning-august-27-2026.html',
    'openai-astra-critical-cyber-safety-controls.html',
    'openai-automated-research-intern-research-acceleration-september-6-2026.html',
    'openai-chatgpt-ads-1-billion-run-rate-europe-india-august-31-2026.html',
    'openai-cursor-model-access-ends-november-12-spacex-2026.html',
    'openai-gpt-5-6-sol-price-cut-august-2026.html',
    'openai-jalapeno-chip-benchmarks-inference-august-25-2026.html',
    'opera-loses-eu-court-challenge-microsoft-edge-dma-september-2-2026.html',
    'salesforce-claudeforce-anthropic-37-skills-ai-crm-2026.html',
    'stability-ai-76-million-series-b-entertainment-investors-august-25-2026.html',
    'tencent-hy4-preview-770b-open-source-ai-coding-research-august-28-2026.html',
    'thomson-reuters-thomson-proprietary-ai-model-40-million.html',
    'us-g20-carolina-principles-ai-regulation-september-1-2026.html',
    'us-government-backs-openai-nyt-copyright-ai-training-fair-use-september-2-2026.html',
}

LEGACY_ROOTS = ['projects', 'contact', 'legal', 'privacy', 'carluxiii', 'carluxiii-preview', 'nomadbycarlos']


def set_robots(text: str, value: str) -> str:
    tag = f'<meta name="robots" content="{value}">'
    if ROBOTS_PATTERN.search(text):
        return ROBOTS_PATTERN.sub(tag, text, count=1)
    viewport = re.search(r'<meta\s+name=["\']viewport["\'][^>]*>', text, flags=re.I)
    if viewport:
        return text[:viewport.end()] + tag + text[viewport.end():]
    return text.replace('<head>', '<head>' + tag, 1)


def remove_ads(text: str) -> str:
    return ADS_PATTERN.sub('', text)


def ensure_ads(text: str) -> str:
    if ADS_PATTERN.search(text):
        return text
    viewport = re.search(r'<meta\s+name=["\']viewport["\'][^>]*>', text, flags=re.I)
    if viewport:
        return text[:viewport.end()] + ADS_SNIPPET + text[viewport.end():]
    return text.replace('<head>', '<head>' + ADS_SNIPPET, 1)


def accountable_author(text: str) -> str:
    text = re.sub(
        r'"author":\{"@type":"Organization","name":"VISIONE Wire"(?:,"url":"[^"]+")?\}',
        '"author":{"@type":"Person","name":"Pedro","url":"https://visione.one/news/author-pedro.html"}',
        text,
    )
    text = text.replace('href="https://visione.one/news/author-pedro.html"', 'href="/news/author-pedro.html"')
    if 'href="/news/author-pedro.html">Pedro</a>' not in text:
        text = re.sub(
            r'<p class="byline">By (?:VISIONE Wire|Pedro) ·',
            '<p class="byline">By <a href="/news/author-pedro.html">Pedro</a> · VISIONE Wire ·',
            text,
            count=1,
        )
    return text


def write_if_changed(path: Path, text: str, changed: list[str]) -> None:
    if not path.exists() or path.read_text(encoding='utf-8') != text:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')
        changed.append(str(path))


def sync_news(changed: list[str]) -> None:
    for path in sorted(Path('news').glob('*.html')):
        text = path.read_text(encoding='utf-8')
        original = text
        if path.name == 'index.html':
            text = set_robots(text, 'index,follow,max-image-preview:large')
            text = remove_ads(text)
        elif path.name in TRUST_PAGES:
            text = set_robots(text, 'index,follow,max-image-preview:large')
            text = remove_ads(text)
        elif path.name in APPROVED_ARTICLES:
            text = set_robots(text, 'index,follow,max-image-preview:large')
            text = accountable_author(text)
            text = ensure_ads(text)
        else:
            text = set_robots(text, 'noindex,follow')
            text = remove_ads(text)
        if text != original:
            path.write_text(text, encoding='utf-8')
            changed.append(str(path))

    missing = sorted(name for name in APPROVED_ARTICLES if not (Path('news') / name).exists())
    if missing:
        raise SystemExit('Approved article files missing: ' + ', '.join(missing))


def sync_legacy(changed: list[str]) -> None:
    for root_name in LEGACY_ROOTS:
        root = Path(root_name)
        if not root.exists():
            continue
        for path in sorted(root.rglob('*.html')):
            text = path.read_text(encoding='utf-8')
            normalized = remove_ads(set_robots(text, 'noindex,follow'))
            if normalized != text:
                path.write_text(normalized, encoding='utf-8')
                changed.append(str(path))


def sync_sitemap(changed: list[str]) -> None:
    trust_order = ['about.html','coverage.html','editorial.html','accountability.html','advertising.html','privacy.html','cookie-policy.html','contact.html','author-pedro.html']
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        f'  <url><loc>https://visione.one/</loc><lastmod>{TODAY}</lastmod></url>',
    ]

    product_paths = [
        ('es/index.html', 'https://visione.one/es/'),
        ('pt/index.html', 'https://visione.one/pt/'),
        ('br/index.html', 'https://visione.one/br/'),
        ('data-credits/index.html', 'https://visione.one/data-credits/'),
        ('news/index.html', 'https://visione.one/news/'),
    ]
    for file_path, url in product_paths:
        if Path(file_path).exists():
            lines.append(f'  <url><loc>{url}</loc><lastmod>{TODAY}</lastmod></url>')

    for name in trust_order:
        lines.append(f'  <url><loc>https://visione.one/news/{name}</loc><lastmod>{TODAY}</lastmod></url>')
    for name in sorted(APPROVED_ARTICLES):
        lines.append(f'  <url><loc>https://visione.one/news/{name}</loc></url>')
    lines.append('</urlset>')
    write_if_changed(Path('sitemap.xml'), '\n'.join(lines) + '\n', changed)


def sync_feed_and_news_sitemap(changed: list[str]) -> None:
    feed_path = Path('news/feed.xml')
    feed = feed_path.read_text(encoding='utf-8')
    new_feed = re.sub(
        r'<item>.*?</item>',
        lambda m: m.group(0) if ((link := re.search(r'<link>https://visione\.one/news/([^<]+)</link>', m.group(0))) and link.group(1) in APPROVED_ARTICLES) else '',
        feed,
        flags=re.S,
    )
    if new_feed != feed:
        feed_path.write_text(new_feed, encoding='utf-8')
        changed.append(str(feed_path))

    news_sitemap_path = Path('news/news-sitemap.xml')
    news_sitemap = news_sitemap_path.read_text(encoding='utf-8')
    new_news_sitemap = re.sub(
        r'<url>.*?</url>',
        lambda m: m.group(0) if ((loc := re.search(r'<loc>https://visione\.one/news/([^<]+)</loc>', m.group(0))) and loc.group(1) in APPROVED_ARTICLES) else '',
        news_sitemap,
        flags=re.S,
    )
    if new_news_sitemap != news_sitemap:
        news_sitemap_path.write_text(new_news_sitemap, encoding='utf-8')
        changed.append(str(news_sitemap_path))


def sync_robots(changed: list[str]) -> None:
    path = Path('robots.txt')
    text = path.read_text(encoding='utf-8')
    lines = [line for line in text.splitlines() if line.strip() != 'Disallow: /carluxiii-preview/']
    streaming_line = 'Sitemap: https://visione.one/streaming-sitemap-index.xml'
    if Path('streaming-sitemap-index.xml').exists() and streaming_line not in lines:
        news_line = 'Sitemap: https://visione.one/news/news-sitemap.xml'
        if news_line in lines:
            lines.insert(lines.index(news_line), streaming_line)
        else:
            lines.append(streaming_line)
    normalized = '\n'.join(lines).rstrip() + '\n'
    if normalized != text:
        path.write_text(normalized, encoding='utf-8')
        changed.append(str(path))


def main() -> None:
    changed: list[str] = []
    sync_news(changed)
    sync_legacy(changed)
    sync_sitemap(changed)
    sync_feed_and_news_sitemap(changed)
    sync_robots(changed)
    print('Updated files:')
    print('\n'.join(changed) if changed else 'none')


if __name__ == '__main__':
    main()
