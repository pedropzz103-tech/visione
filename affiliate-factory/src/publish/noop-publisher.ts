import {
  PublishReceiptSchema,
  type PublishReceipt,
  type PublishRequest
} from '../contracts/index.js';
import type {Publisher} from './publisher.js';

export class NoopPublisher implements Publisher {
  public async publish(request: PublishRequest): Promise<PublishReceipt> {
    return PublishReceiptSchema.parse({
      schemaVersion: '1.0.0',
      publicationKey: request.publicationKey,
      provider: 'noop',
      channel: request.channel,
      status: 'skipped',
      message: 'PUBLICATION_DISABLED',
      createdAt: new Date().toISOString(),
      mediaUrls: request.assets.map((asset) => asset.url)
    });
  }
}
