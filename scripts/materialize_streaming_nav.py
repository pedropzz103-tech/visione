from pathlib import Path

PAGES = {
    Path('index.html'): 'Dados & fontes',
    Path('es/index.html'): 'Datos y fuentes',
    Path('pt/index.html'): 'Dados e fontes',
    Path('br/index.html'): 'Dados e fontes',
}

changed = []
for path, label in PAGES.items():
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    if 'href="/data-credits/"' in text:
        continue
    anchor = '<a href="/news/">Wire</a>'
    replacement = f'<a href="/data-credits/">{label}</a>{anchor}'
    updated = text.replace(anchor, replacement)
    if updated != text:
        path.write_text(updated, encoding='utf-8')
        changed.append(str(path))

print('Streaming navigation updated:', ', '.join(changed) if changed else 'none')
