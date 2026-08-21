import {describe, expect, it, vi} from 'vitest';
import {
  DisabledShopeeAffiliateAdapter,
  DisabledTikTokShopPublisher
} from '../../src/publish/disabled-publishers.js';
import {makePublishRequest} from '../helpers/factories.js';

describe('disabled integrations', () => {
  it.each([
    [new DisabledTikTokShopPublisher(), 'tiktok-shop'],
    [new DisabledShopeeAffiliateAdapter(), 'shopee']
  ] as const)('returns a typed receipt without a network call', async (publisher, channel) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const receipt = await publisher.publish(makePublishRequest());

    expect(receipt).toMatchObject({status: 'not_configured', channel});
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
