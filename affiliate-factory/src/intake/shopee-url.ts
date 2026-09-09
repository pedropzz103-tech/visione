const allowedHosts = new Set([
  'shopee.com.br',
  'www.shopee.com.br',
  's.shopee.com.br'
]);

export function isAllowedShopeeAffiliateUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && allowedHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
