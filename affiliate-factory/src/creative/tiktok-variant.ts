import {
  ChannelCreativeVariantSchema,
  type BaseCreativePlan,
  type ChannelCreativeVariant,
  type ProductManifest
} from '../contracts/index.js';

function formatPrice(priceMinor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(priceMinor / 100);
}

function disclosedCaption(caption: string): string {
  return /#publicidade\b/i.test(caption)
    ? caption
    : caption.trimEnd() + '\n\n#publicidade';
}

export function createTikTokVariant(
  manifest: ProductManifest,
  plan: BaseCreativePlan
): ChannelCreativeVariant {
  if (plan.productId !== manifest.productId) {
    throw new Error('PLAN_PRODUCT_MISMATCH');
  }

  return ChannelCreativeVariantSchema.parse({
    schemaVersion: '1.0.0',
    channel: 'tiktok',
    productId: manifest.productId,
    headline: manifest.headline ?? manifest.productName,
    productName: manifest.productName,
    priceText: formatPrice(manifest.currentPriceMinor),
    previousPriceText: manifest.previousPriceMinor === undefined
      ? undefined
      : formatPrice(manifest.previousPriceMinor),
    benefits: manifest.benefits,
    assets: manifest.assets,
    cta: manifest.cta,
    caption: disclosedCaption(manifest.caption),
    affiliateUrl: manifest.affiliateUrl,
    branding: manifest.branding,
    width: 1080,
    height: 1920,
    fps: 30,
    durationSeconds: manifest.durationSeconds,
    safeZones: {
      top: 180,
      right: 150,
      bottom: 300,
      left: 90
    },
    sections: plan.sections
  });
}
