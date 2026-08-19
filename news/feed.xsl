<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="rss/channel/title"/> RSS</title>
        <style>
          :root{--bg:#f7f4ee;--surface:#fffdf9;--line:#ded6c8;--text:#171a20;--muted:#6f7782;--gold:#b28a47;--navy:#142033}
          *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:1100px;margin:0 auto;padding:48px 22px 70px}.brand{display:flex;align-items:center;gap:12px;font-weight:800;letter-spacing:.14em;color:var(--navy);text-decoration:none}.brand img{width:42px;height:42px;object-fit:contain}.eyebrow{margin-top:50px;font:700 11px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.18em;color:var(--gold)}h1{font-family:Georgia,"Times New Roman",serif;font-weight:500;font-size:clamp(44px,7vw,78px);line-height:.95;letter-spacing:-.04em;margin:14px 0 16px}.intro{font-size:18px;line-height:1.6;color:#48505c;max-width:760px}.notice{margin:28px 0 36px;padding:16px 18px;border:1px solid #d5c9b6;background:#f2eadc;border-radius:14px;color:#55452f}.items{display:grid;gap:16px}.item{display:block;padding:24px 26px;background:var(--surface);border:1px solid var(--line);border-radius:20px;text-decoration:none;color:inherit;transition:transform .18s ease,border-color .18s ease}.item:hover{transform:translateY(-2px);border-color:#c9b287}.item h2{font-family:Georgia,"Times New Roman",serif;font-size:clamp(25px,3vw,34px);line-height:1.08;margin:0 0 10px}.item p{margin:0;color:#59616c;line-height:1.55}.date{display:block;margin-top:14px;color:var(--muted);font-size:12px}footer{margin-top:40px;color:var(--muted);font-size:13px}.back{display:inline-block;margin-top:22px;color:var(--navy);font-weight:700;text-decoration:none}
        </style>
      </head>
      <body>
        <main class="wrap">
          <a class="brand" href="https://visione.one/"><img src="https://visione.one/visione-logo.webp" alt="VISIONE"/><span>VISIONE WIRE</span></a>
          <p class="eyebrow">RSS FEED</p>
          <h1><xsl:value-of select="rss/channel/title"/></h1>
          <p class="intro"><xsl:value-of select="rss/channel/description"/></p>
          <div class="notice">This is the VISIONE Wire RSS feed. Feed readers still receive the original XML; this page is only a human-friendly browser view.</div>
          <section class="items">
            <xsl:for-each select="rss/channel/item">
              <a class="item">
                <xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>
                <h2><xsl:value-of select="title"/></h2>
                <p><xsl:value-of select="description"/></p>
                <span class="date"><xsl:value-of select="pubDate"/></span>
              </a>
            </xsl:for-each>
          </section>
          <a class="back" href="https://visione.one/">← Back to VISIONE Wire</a>
          <footer>RSS 2.0 · VISIONE Wire</footer>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>