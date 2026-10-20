import {
  BaseCreativePlanSchema,
  type BaseCreativePlan,
  type ProductManifest
} from '../contracts/index.js';

function formatPrice(priceMinor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(priceMinor / 100);
}

export function createBaseCreativePlan(
  manifest: ProductManifest
): BaseCreativePlan {
  const totalFrames = manifest.durationSeconds * 30;
  const boundaries = [0, 0.17, 0.4, 0.63, 0.83, 1].map(
    (ratio) => Math.round(totalFrames * ratio)
  );
  const firstAsset = manifest.assets[0];
  if (firstAsset === undefined) {
    throw new Error('MANIFEST_REQUIRES_ASSET');
  }

  return BaseCreativePlanSchema.parse({
    schemaVersion: '1.0.0',
    productId: manifest.productId,
    durationSeconds: manifest.durationSeconds,
    fps: 30,
    sections: [
      {
        kind: 'hook',
        startFrame: boundaries[0],
        endFrame: boundaries[1],
        text: manifest.headline ?? manifest.productName
      },
      {
        kind: 'product',
        startFrame: boundaries[1],
        endFrame: boundaries[2],
        text: manifest.productName,
        assetId: firstAsset.id
      },
      {
        kind: 'benefits',
        startFrame: boundaries[2],
        endFrame: boundaries[3],
        text: manifest.benefits.join(' • ')
      },
      {
        kind: 'price',
        startFrame: boundaries[3],
        endFrame: boundaries[4],
        text: formatPrice(manifest.currentPriceMinor)
      },
      {
        kind: 'cta',
        startFrame: boundaries[4],
        endFrame: boundaries[5],
        text: manifest.cta
      }
    ]
  });
}
