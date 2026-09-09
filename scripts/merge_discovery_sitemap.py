from pathlib import Path
import html
import re

SITEMAP = Path('sitemap.xml')
BASE = 'https://visione.one'
LOCALE_ROOTS = [Path('es'), Path('pt'), Path('br'), Path('credits')]

text = SITEMAP.read_text(encoding='utf-8')
existing = set(re.findall(r'<loc>([^<]+)</loc>', text))
entries = []

for root in LOCALE_ROOTS:
    if not root.exists():
        continue
    for page in sorted(root.rglob('index.html')):
        body = page.read_text(encoding='utf-8')
        robots = re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\']([^"\']+)', body, re.I)
        if robots and 'noindex' in robots.group(1).lower():
            continue
        canonical = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)', body, re.I)
        if not canonical:
            canonical = re.search(r'<link\s+href=["\']([^"\']+)["\']\s+rel=["\']canonical["\']', body, re.I)
        if not canonical:
            continue
        url = html.unescape(canonical.group(1))
        if not url.startswith(BASE + '/') or url in existing:
            continue
        entries.append(url)
        existing.add(url)

if entries:
    block = ''.join(f'  <url><loc>{url}</loc></url>\n' for url in entries)
    text = text.replace('</urlset>', block + '</urlset>')
    SITEMAP.write_text(text, encoding='utf-8')
    print('Discovery sitemap URLs added:', len(entries))
else:
    print('Discovery sitemap already complete')
