import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {loadManualBundle} from '../../src/intake/manual-bundle.js';
import {isAllowedShopeeAffiliateUrl} from '../../src/intake/shopee-url.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('manual product intake', () => {
  it('loads the checked-in fixture and verifies its asset exists', async () => {
    const manifest = await loadManualBundle(resolve('fixtures/product-test'));
    expect(manifest.productId).toBe('fixture-product');
    expect(manifest.assets).toHaveLength(1);
  });

  it('does not make network requests or follow affiliate redirects', async () => {
    vi.stubGlobal('fetch', () => {
      throw new Error('network access is forbidden during intake');
    });
    await expect(
      loadManualBundle(resolve('fixtures/product-test'))
    ).resolves.toMatchObject({productId: 'fixture-product'});
  });

  it('rejects a bundle whose declared asset is missing', async () => {
    const bundle = await mkdtemp(join(tmpdir(), 'affiliate-factory-'));
    await writeFile(join(bundle, 'manifest.json'), JSON.stringify({
      schemaVersion: '1.0.0',
      purpose: 'fixture',
      productId: 'missing-asset',
      productName: 'Fixture sem asset',
      affiliateUrl: 'https://s.shopee.com.br/fixture',
      currency: 'BRL',
      currentPriceMinor: 0,
      benefits: ['Fixture'],
      assets: [{
        id: 'missing',
        kind: 'image',
        file: 'assets/missing.svg',
        provenance: {
          sourceType: 'repository-created',
          source: 'test'
        }
      }],
      cta: 'Nao publicar',
      caption: 'TESTE'
    }));

    await expect(loadManualBundle(bundle)).rejects.toMatchObject({
      code: 'ASSET_MISSING'
    });
  });

  it('accepts exact Shopee Brazil hosts and rejects lookalikes', () => {
    expect(isAllowedShopeeAffiliateUrl('https://s.shopee.com.br/abc')).toBe(true);
    expect(isAllowedShopeeAffiliateUrl('https://www.shopee.com.br/item')).toBe(true);
    expect(isAllowedShopeeAffiliateUrl('https://shopee.com.br.evil.example/item')).toBe(false);
    expect(isAllowedShopeeAffiliateUrl('http://shopee.com.br/item')).toBe(false);
  });
});
