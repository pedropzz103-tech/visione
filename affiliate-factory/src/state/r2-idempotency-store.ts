import {
  PublishReceiptSchema,
  PublishRequestSchema,
  type PublishReceipt,
  type PublishRequest
} from '../contracts/index.js';
import {privateObjectKey, type MediaStore} from '../storage/media-store.js';
import type {IdempotencyStore} from './idempotency-store.js';

const submissionKey = (publicationKey: string) =>
  privateObjectKey(`state/idempotency/${publicationKey}.json`);
const receiptKey = (publicationKey: string) =>
  privateObjectKey(`state/receipts/${publicationKey}.json`);

export class R2IdempotencyStore implements IdempotencyStore {
  public constructor(private readonly media: MediaStore) {}

  public find(publicationKey: string): Promise<PublishReceipt | null> {
    return this.media.getPrivateJson(receiptKey(publicationKey), PublishReceiptSchema);
  }

  public findSubmission(publicationKey: string): Promise<PublishRequest | null> {
    return this.media.getPrivateJson(submissionKey(publicationKey), PublishRequestSchema);
  }

  public async markSubmitting(publicationKey: string, request: PublishRequest): Promise<void> {
    if (request.publicationKey !== publicationKey) {
      throw new Error('PUBLICATION_KEY_MISMATCH');
    }
    try {
      await this.media.putPrivateJsonIfAbsent(submissionKey(publicationKey), request);
    } catch (error) {
      if ((error as Error).message === 'OBJECT_ALREADY_EXISTS') {
        throw new Error('PUBLICATION_ALREADY_CLAIMED');
      }
      throw error;
    }
  }

  public async saveReceipt(publicationKey: string, receipt: PublishReceipt): Promise<void> {
    if (receipt.publicationKey !== publicationKey) {
      throw new Error('PUBLICATION_KEY_MISMATCH');
    }
    if (await this.findSubmission(publicationKey) === null) {
      throw new Error('PUBLICATION_NOT_CLAIMED');
    }
    try {
      await this.media.putPrivateJsonIfAbsent(receiptKey(publicationKey), receipt);
    } catch (error) {
      if ((error as Error).message === 'OBJECT_ALREADY_EXISTS') {
        throw new Error('RECEIPT_ALREADY_EXISTS');
      }
      throw error;
    }
  }
}
