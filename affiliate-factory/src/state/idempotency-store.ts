import type {
  PublishReceipt,
  PublishRequest
} from '../contracts/index.js';

export interface IdempotencyStore {
  find(publicationKey: string): Promise<PublishReceipt | null>;
  findSubmission(publicationKey: string): Promise<PublishRequest | null>;
  markSubmitting(
    publicationKey: string,
    request: PublishRequest
  ): Promise<void>;
  saveReceipt(
    publicationKey: string,
    receipt: PublishReceipt
  ): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  readonly #submissions = new Map<string, PublishRequest>();
  readonly #receipts = new Map<string, PublishReceipt>();

  public async find(publicationKey: string): Promise<PublishReceipt | null> {
    const receipt = this.#receipts.get(publicationKey);
    return receipt === undefined ? null : structuredClone(receipt);
  }

  public async findSubmission(
    publicationKey: string
  ): Promise<PublishRequest | null> {
    const request = this.#submissions.get(publicationKey);
    return request === undefined ? null : structuredClone(request);
  }

  public async markSubmitting(
    publicationKey: string,
    request: PublishRequest
  ): Promise<void> {
    if (
      this.#submissions.has(publicationKey) ||
      this.#receipts.has(publicationKey)
    ) {
      throw new Error('PUBLICATION_ALREADY_CLAIMED');
    }
    this.#submissions.set(publicationKey, structuredClone(request));
  }

  public async saveReceipt(
    publicationKey: string,
    receipt: PublishReceipt
  ): Promise<void> {
    if (this.#receipts.has(publicationKey)) {
      throw new Error('RECEIPT_ALREADY_EXISTS');
    }
    if (
      !this.#submissions.has(publicationKey) ||
      receipt.publicationKey !== publicationKey
    ) {
      throw new Error('PUBLICATION_NOT_CLAIMED');
    }
    this.#receipts.set(publicationKey, structuredClone(receipt));
  }
}
