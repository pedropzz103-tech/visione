/** Public server configuration only; never persist credentials or query tokens. */
export function normalizeApiUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password || url.search || url.hash) return undefined;
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (url.protocol === 'http:') {
      const host = url.hostname.toLowerCase();
      const parts = host.split('.').map(Number);
      const privateIPv4 = parts.length === 4 && parts.every(p => Number.isInteger(p) && p >= 0 && p <= 255) &&
        (parts[0] === 10 || parts[0] === 127 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31));
      if (!privateIPv4 && host !== 'localhost' && host !== '[::1]' && !host.endsWith('.local')) return undefined;
    }
    return url.toString().replace(/\/+$/, '');
  } catch { return undefined; }
}
