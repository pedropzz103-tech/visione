const LEGACY_HOST = "wire.visione.one";
const CANONICAL_ORIGIN = "https://visione.one";

export default {
  async fetch(request) {
    const incoming = new URL(request.url);

    if (incoming.hostname !== LEGACY_HOST) {
      return fetch(request);
    }

    let pathname;
    if (incoming.pathname === "/") {
      pathname = "/";
    } else if (incoming.pathname === "/visione-logo.webp") {
      pathname = "/visione-logo.webp";
    } else if (incoming.pathname.startsWith("/news/")) {
      pathname = incoming.pathname;
    } else {
      pathname = `/news${incoming.pathname}`;
    }

    const target = new URL(pathname, CANONICAL_ORIGIN);
    target.search = incoming.search;

    return Response.redirect(target.toString(), 301);
  }
};
