import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  DisabledShopeeProductHunter,
  ProductHunterDisabledError
} from '../../src/intake/product-hunter.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DisabledShopeeProductHunter', () => {
  it('does not access Shopee or any network resource', async () => {
    vi.stubGlobal('fetch', () => {
      throw new Error('network must not be called');
    });
    const hunter = new DisabledShopeeProductHunter();
    await expect(hunter.discover()).rejects.toEqual(
      new ProductHunterDisabledError(
        'SHOPEE_AUTOMATED_DISCOVERY_NOT_AUTHORIZED'
      )
    );
  });
});
