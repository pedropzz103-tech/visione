import {describe, expect, it} from 'vitest';
import {InMemoryIdempotencyStore} from '../../src/state/idempotency-store.js';
import {makePublishRequest} from '../helpers/factories.js';

describe('InMemoryIdempotencyStore', () => {
  it('rejects a second submission claim for the same key', async () => {
    const store = new InMemoryIdempotencyStore();
    const request = makePublishRequest();
    await store.markSubmitting(request.publicationKey, request);
    await expect(
      store.markSubmitting(request.publicationKey, request)
    ).rejects.toThrow('PUBLICATION_ALREADY_CLAIMED');
  });

  it('returns an immutable confirmed receipt', async () => {
    const store = new InMemoryIdempotencyStore();
    const request = makePublishRequest();
    const receipt = {
      schemaVersion: '1.0.0',
      publicationKey: request.publicationKey,
      provider: 'buffer',
      channel: 'tiktok',
      status: 'confirmed',
      providerPostId: 'post-1',
      message: 'Confirmed by Buffer',
      createdAt: '2026-08-20T12:00:00.000Z',
      mediaUrl: request.mediaUrl
    } as const;
    await store.markSubmitting(request.publicationKey, request);
    await store.saveReceipt(request.publicationKey, receipt);
    expect(await store.find(request.publicationKey)).toEqual(receipt);
    await expect(
      store.saveReceipt(request.publicationKey, {...receipt, providerPostId: 'post-2'})
    ).rejects.toThrow('RECEIPT_ALREADY_EXISTS');
  });
});
