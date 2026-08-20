import {describe, expect, it} from 'vitest';
import {
  BaseCreativePlanSchema,
  ChannelCreativeVariantSchema,
  ProductManifestSchema,
  PublishReceiptSchema,
  PublishRequestSchema,
  QualityGateResultSchema,
  RenderResultSchema,
  RunEventSchema
} from '../../src/contracts/index.js';

const fixtureManifest = {
  schemaVersion: '1.0.0',
  purpose: 'fixture',
  productId: 'fixture-product',
  productName: 'Produto demonstrativo - nao publicar',
  affiliateUrl: 'https://s.shopee.com.br/fixture-link',
  currency: 'BRL',
  currentPriceMinor: 0,
  benefits: ['Fixture interna sem alegacao comercial'],
  assets: [{
    id: 'card',
    kind: 'image',
    file: 'assets/product-card.svg',
    provenance: {
      sourceType: 'repository-created',
      source: 'fixtures/product-test'
    }
  }],
  cta: 'Fixture interna - nao publicar',
  caption: 'TESTE INTERNO - NAO PUBLICAR'
} as const;

describe('versioned contracts', () => {
  it('accepts a complete fixture manifest', () => {
    const parsed = ProductManifestSchema.parse(fixtureManifest);
    expect(parsed.purpose).toBe('fixture');
    expect(parsed.branding).toEqual({
      label: 'Affiliate Factory',
      primaryColor: '#FF5A36',
      backgroundColor: '#0D0D12',
      textColor: '#FFFFFF'
    });
  });

  it('rejects a production manifest with a zero price', () => {
    expect(() => ProductManifestSchema.parse({
      ...fixtureManifest,
      purpose: 'production',
      currentPriceMinor: 0
    })).toThrow();
  });

  it('rejects a production manifest without operator-supplied provenance', () => {
    expect(() => ProductManifestSchema.parse({
      ...fixtureManifest,
      purpose: 'production',
      currentPriceMinor: 12990,
      assets: fixtureManifest.assets
    })).toThrow();
  });

  it('prevents fixture content from becoming a publish request', () => {
    expect(() => PublishRequestSchema.parse({
      schemaVersion: '1.0.0',
      purpose: 'fixture',
      channel: 'tiktok',
      productId: 'fixture-product',
      videoId: 'vid_fixture',
      contentHash: 'a'.repeat(64),
      publicationKey: 'b'.repeat(64),
      mediaUrl: 'https://media.visione.one/final/publication/video.mp4',
      caption: 'TESTE',
      affiliateUrl: fixtureManifest.affiliateUrl
    })).toThrow();
  });

  it.each(['x', 'threads'] as const)('accepts a production %s image request', (channel) => {
    const parsed = PublishRequestSchema.parse({
      schemaVersion: '1.0.0',
      purpose: 'production',
      channel,
      productId: 'operator-product',
      videoId: 'vid_operator',
      contentHash: 'a'.repeat(64),
      publicationKey: 'b'.repeat(64),
      assets: [{kind: 'image', url: 'https://media.example.test/final/publication/p/image.jpg'}],
      caption: 'Publicidade. Produto fornecido pelo operador.',
      affiliateUrl: 'https://s.shopee.com.br/operator-link'
    });

    expect(parsed.channel).toBe(channel);
  });

  it('validates every required downstream contract', () => {
    expect(BaseCreativePlanSchema.shape.schemaVersion.value).toBe('1.0.0');
    expect(ChannelCreativeVariantSchema.shape.schemaVersion.value).toBe('1.0.0');
    expect(RenderResultSchema.shape.schemaVersion.value).toBe('1.0.0');
    expect(QualityGateResultSchema.shape.schemaVersion.value).toBe('1.0.0');
    expect(PublishReceiptSchema.shape.schemaVersion.value).toBe('1.0.0');
    expect(RunEventSchema.shape.schemaVersion.value).toBe('1.0.0');
  });
});
