import type { Currency, PriceBand } from '../types';
const BAND_COLORS: Record<PriceBand, string> = { 1: '#16734B', 2: '#486B25', 3: '#856300', 4: '#A34819', 5: '#B52C39' };
export function colorForBand(band: PriceBand | undefined): string { return BAND_COLORS[band ?? 3]; }
export function formatPrice(price: number, currency: Currency, language = 'pt'): string {
  return new Intl.NumberFormat(language === 'pt' ? 'pt-PT' : 'en-GB', { style: 'currency', currency, minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(price);
}
