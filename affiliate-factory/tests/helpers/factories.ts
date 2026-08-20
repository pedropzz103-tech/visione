import type {
  ChannelCreativeVariant,
  LayoutEvidence,
  MediaProbe,
  ProductManifest,
  PublishRequest,
  RenderResult,
  RunSummary
} from '../../src/contracts/index.js';

export function makeProductionManifest(): ProductManifest {
  return {
    schemaVersion: '1.0.0',
    purpose: 'production',
    productId: 'operator-product',
    productName: 'Produto fornecido pelo operador',
    affiliateUrl: 'https://s.shopee.com.br/operator-link',
    currency: 'BRL',
    currentPriceMinor: 12990,
    previousPriceMinor: 15990,
    benefits: ['Caracteristica fornecida pelo operador'],
    assets: [{
      id: 'operator-image',
      kind: 'image',
      file: 'assets/operator-image.jpg',
      provenance: {
        sourceType: 'operator-supplied',
        source: 'operator morning bundle',
        originalUrl: 'https://example.invalid/operator-source'
      }
    }],
    headline: 'Headline fornecida pelo operador',
    cta: 'Confira pelo link de afiliado',
    caption: 'Publicidade. Consulte o link de afiliado.',
    durationSeconds: 15,
    branding: {
      label: 'Affiliate Factory',
      primaryColor: '#FF5A36',
      backgroundColor: '#0D0D12',
      textColor: '#FFFFFF'
    }
  };
}

export function makeTikTokVariant(): ChannelCreativeVariant {
  const manifest = makeProductionManifest();
  return {
    schemaVersion: '1.0.0',
    channel: 'tiktok',
    productId: manifest.productId,
    headline: manifest.headline ?? manifest.productName,
    productName: manifest.productName,
    priceText: 'R$ 129,90',
    previousPriceText: 'R$ 159,90',
    benefits: manifest.benefits,
    assets: manifest.assets,
    cta: manifest.cta,
    caption: manifest.caption,
    affiliateUrl: manifest.affiliateUrl,
    branding: manifest.branding,
    width: 1080,
    height: 1920,
    fps: 30,
    durationSeconds: 15,
    safeZones: {top: 180, right: 150, bottom: 300, left: 90},
    sections: [
      {kind: 'hook', startFrame: 0, endFrame: 75, text: manifest.headline ?? manifest.productName},
      {kind: 'product', startFrame: 75, endFrame: 180, text: manifest.productName, assetId: 'operator-image'},
      {kind: 'benefits', startFrame: 180, endFrame: 285, text: manifest.benefits[0] ?? ''},
      {kind: 'price', startFrame: 285, endFrame: 375, text: 'R$ 129,90'},
      {kind: 'cta', startFrame: 375, endFrame: 450, text: manifest.cta}
    ]
  };
}

export function makeLayoutEvidence(): LayoutEvidence {
  return {
    safeZone: {x: 90, y: 180, width: 840, height: 1440},
    overflows: [],
    textBoxes: [{
      id: 'headline',
      x: 110,
      y: 210,
      width: 800,
      height: 180,
      fontSize: 72,
      lineHeight: 82,
      maxLines: 2,
      measuredCharacterLimit: 70
    }]
  };
}

export function makeRenderResult(): RenderResult {
  return {
    schemaVersion: '1.0.0',
    videoId: 'vid_operator',
    outputPath: 'artifacts/vid_operator.mp4',
    contentHash: 'a'.repeat(64),
    width: 1080,
    height: 1920,
    fps: 30,
    frameCount: 450,
    durationSeconds: 15,
    videoCodec: 'h264',
    audioCodec: 'aac',
    sizeBytes: 1024,
    layout: makeLayoutEvidence()
  };
}

export function makeValidProbe(): MediaProbe {
  return {
    video: {
      codec: 'h264',
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: 15
    },
    audio: {codec: 'aac'},
    format: {durationSeconds: 15, sizeBytes: 1024}
  };
}

export function makePublishRequest(
  channel: 'tiktok' | 'x' | 'threads' = 'tiktok'
): PublishRequest {
  const assets = channel === 'tiktok'
    ? [{kind: 'video' as const, url: 'https://media.visione.one/final/publication/vid_operator/video.mp4'}]
    : [{kind: 'image' as const, url: 'https://media.visione.one/final/publication/vid_operator/product.jpg'}];
  return {
    schemaVersion: '1.0.0',
    purpose: 'production',
    channel,
    productId: 'operator-product',
    videoId: 'vid_operator',
    contentHash: 'a'.repeat(64),
    publicationKey: 'b'.repeat(64),
    assets,
    caption: 'Publicidade. Consulte o link de afiliado.',
    affiliateUrl: 'https://s.shopee.com.br/operator-link',
    thumbnailOffsetMs: 2000
  };
}

export function makeRunSummary(): RunSummary {
  return {
    schemaVersion: '1.0.0',
    runId: 'run-1',
    productName: 'Produto fornecido pelo operador',
    videoId: 'vid_operator',
    state: 'published',
    render: 'OK',
    qa: 'OK',
    r2: 'OK',
    buffer: 'OK',
    tiktokStatus: 'confirmado',
    xStatus: 'confirmado',
    threadsStatus: 'confirmado',
    publicUrl: 'https://media.visione.one/final/publication/vid_operator/video.mp4'
  };
}
