const WIRE_HOST = "wire.visione.one";
const ORIGIN = "https://visione.one";

export default {
  async fetch(request) {
    const incoming = new URL(request.url);

    if (incoming.hostname !== WIRE_HOST) {
      return fetch(request);
    }

    let path = incoming.pathname;
    if (path === "/") path = "/index.html";

    let originUrl;
    if (path === "/visione-logo.webp") {
      originUrl = new URL(`${ORIGIN}/visione-logo.webp`);
    } else {
      originUrl = new URL(`${ORIGIN}/news${path}`);
    }
    originUrl.search = incoming.search;

    const headers = new Headers(request.headers);
    headers.set("Host", "visione.one");

    const originRequest = new Request(originUrl.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual"
    });

    const originResponse = await fetch(originRequest, {
      cf: {
        cacheEverything: request.method === "GET",
        cacheTtlByStatus: { "200-299": 300, "404": 60, "500-599": 0 }
      }
    });

    const responseHeaders = new Headers(originResponse.headers);
    responseHeaders.set("x-content-type-options", "nosniff");
    responseHeaders.set("referrer-policy", "strict-origin-when-cross-origin");
    responseHeaders.set("x-frame-options", "SAMEORIGIN");

    const location = responseHeaders.get("location");
    if (location) {
      responseHeaders.set(
        "location",
        location.replace("https://visione.one/news/", "https://wire.visione.one/")
      );
    }

    const contentType = responseHeaders.get("content-type") || "";
    const shouldRewrite =
      contentType.includes("text/html") ||
      contentType.includes("application/xml") ||
      contentType.includes("text/xml") ||
      contentType.includes("application/rss+xml");

    if (!shouldRewrite || request.method === "HEAD") {
      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: responseHeaders
      });
    }

    let body = await originResponse.text();
    body = body
      .replaceAll("https://visione.one/news/", "https://wire.visione.one/")
      .replaceAll("https://visione.one/news", "https://wire.visione.one")
      .replaceAll('href="/news/', 'href="/')
      .replaceAll('src="../visione-logo.webp"', 'src="https://visione.one/visione-logo.webp"');

    responseHeaders.delete("content-length");

    return new Response(body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders
    });
  }
};
