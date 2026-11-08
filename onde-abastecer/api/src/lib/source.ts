/** No credentials, personal coordinates or upstream bodies are logged. */
export async function fetchSource(url: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal, cf: { cacheTtl: 300, cacheEverything: true } });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429 || response.status >= 500) throw new Error('source_temporarily_unavailable');
        throw new Error('source_rejected_request');
      }
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 25 * 1024 * 1024) { await reader.cancel(); throw new Error('source_too_large'); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return new Response(bytes, { headers: response.headers });
    } catch (error) {
      if (attempt === 1 || (error instanceof Error && ['source_rejected_request', 'source_too_large'].includes(error.message))) throw new Error('source_unavailable', { cause: error });
      await new Promise(resolve => setTimeout(resolve, 200 + Math.floor(Math.random() * 200)));
    } finally { clearTimeout(timer); }
  }
  throw new Error('source_unavailable');
}
/** Bounded, isolate-local snapshot cache. Not durable or a global rate limiter. */
export function snapshotCache<T>(load: () => Promise<T>, ttlMs = 300000): () => Promise<T> {
  let cached: { value: T; until: number } | undefined;
  let pending: Promise<T> | undefined;
  return async () => {
    if (cached && cached.until > Date.now()) return cached.value;
    if (!pending) pending = load().then(value => { cached = { value, until: Date.now() + ttlMs }; return value; }).finally(() => { pending = undefined; });
    return pending;
  };
}
