import {
  PublishReceiptSchema,
  type PublishReceipt,
  type PublishRequest
} from '../contracts/index.js';

abstract class DisabledPublisher {
  public abstract readonly provider: 'tiktok-shop' | 'shopee';
  public abstract readonly channel: 'tiktok-shop' | 'shopee';

  public async publish(request: PublishRequest): Promise<PublishReceipt> {
    return PublishReceiptSchema.parse({
      schemaVersion: '1.0.0',
      publicationKey: request.publicationKey,
      provider: this.provider,
      channel: this.channel,
      status: 'not_configured',
      message: `${this.channel.toUpperCase()}_INTEGRATION_DISABLED`,
      createdAt: new Date().toISOString(),
      mediaUrls: request.assets.map((asset) => asset.url)
    });
  }
}

export class DisabledTikTokShopPublisher extends DisabledPublisher {
  public readonly provider = 'tiktok-shop' as const;
  public readonly channel = 'tiktok-shop' as const;
}

export class DisabledShopeeAffiliateAdapter extends DisabledPublisher {
  public readonly provider = 'shopee' as const;
  public readonly channel = 'shopee' as const;
}
