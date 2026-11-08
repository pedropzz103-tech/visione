/** Development only: same Worker handler/adapters on Node, for proxy-bound environments. */
import { createServer } from 'node:http';
import worker from '../api/src/index';
const port = Number(process.env.PORT ?? 8788);
const host = process.env.HOST ?? '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const server = createServer(async (incoming, outgoing) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    const request = new Request(`http://localhost:${port}${incoming.url ?? '/'}`, { method: incoming.method, headers });
    const response = await worker.fetch(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(500, { 'content-type': 'application/json' }); outgoing.end('{"error":"internal_error"}');
  }
});
server.listen(port, host, () => console.log(`Onde Abastecer development API: http://${host}:${port} (not a production server)`));
