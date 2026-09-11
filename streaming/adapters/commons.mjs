const DEFAULT_API = "https://commons.wikimedia.org/w/api.php";
const DEFAULT_USER_AGENT = "VISIONE/1.0 (+https://visione.one/data-credits/)";

function cleanHtml(value = "") {
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedLicense(value = "") {
  return cleanHtml(value).replace(/\s+/g, " ").trim();
}

export function isReusableCommonsLicense(value) {
  const license = normalizedLicense(value).toLowerCase();
  // Keep the public cover path deliberately conservative: only images that can
  // be reused commercially without an attribution obligation are promoted.
  // CC BY/CC BY-SA files can be supported later once per-card attribution UI exists.
  return /^(?:public domain(?: mark)?|cc0(?: 1\.0)?)$/.test(license);
}

export function mapCommonsImageInfo(payload, filename) {
  const pages = Object.values(payload?.query?.pages ?? {});
  const info = pages[0]?.imageinfo?.[0];
  if (!info) return null;
  const metadata = info.extmetadata ?? {};
  const license = normalizedLicense(metadata.LicenseShortName?.value || metadata.License?.value);
  if (!isReusableCommonsLicense(license)) return null;
  const url = String(info.thumburl || info.url || "").trim();
  if (!/^https:\/\//i.test(url)) return null;
  const credit = cleanHtml(metadata.Artist?.value || metadata.Credit?.value || "Wikimedia Commons");
  const sourceUrl = String(info.descriptionurl || "").trim() || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename).replaceAll("%20", "_")}`;
  return {
    url,
    source_url: sourceUrl,
    license,
    credit: credit || "Wikimedia Commons"
  };
}

export async function fetchCommonsArtwork(filename, {
  fetchImpl = globalThis.fetch,
  apiUrl = DEFAULT_API,
  userAgent = DEFAULT_USER_AGENT,
  width = 720
} = {}) {
  const name = String(filename ?? "").trim().replace(/^File:/i, "");
  if (!name) return null;
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");

  const url = new URL(apiUrl);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("titles", `File:${name}`);
  url.searchParams.set("iiprop", "url|extmetadata");
  url.searchParams.set("iiurlwidth", String(Math.max(320, Math.min(1600, Number(width) || 720))));

  const response = await fetchImpl(url, {
    headers: { Accept: "application/json", "User-Agent": userAgent }
  });
  if (!response.ok) throw new Error(`Wikimedia Commons request failed with ${response.status}`);
  return mapCommonsImageInfo(await response.json(), name);
}
