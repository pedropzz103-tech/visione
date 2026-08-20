import {describe, expect, it} from 'vitest';
import {PublishReceiptSchema} from '../../src/contracts/index.js';
import {R2IdempotencyStore} from '../../src/state/r2-idempotency-store.js';
import {FilesystemMediaStore} from '../../src/storage/filesystem-media-store.js';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makePublishRequest} from '../helpers/factories.js';

describe('R2IdempotencyStore', () => {
  it('treats an unreceipted submission as reconciliation, never as resubmittable', async () => {
    const media = new FilesystemMediaStore({
      root: await mkdtemp(join(tmpdir(), 'affiliate-idem-')),
      publicBaseUrl: 'https://media.example.test'
    });
    const store = new R2IdempotencyStore(media);
    const request = makePublishRequest();

    await store.markSubmitting(request.publicationKey, request);

    await expect(store.markSubmitting(request.publicationKey, request))
      .rejects.toThrow('PUBLICATION_ALREADY_CLAIMED');
    await expect(store.findSubmission(request.publicationKey)).resolves.toEqual(request);
    await expect(store.find(request.publicationKey)).resolves.toBeNull();
  });

  it('persists and returns a confirmed provider receipt', async () => {
    const media = new FilesystemMediaStore({
      root: await mkdtemp(join(tmpdir(), 'affiliate-idem-')),
      publicBaseUrl: 'https://media.example.test'
    });
    const store = new R2IdempotencyStore(media);
    const request = makePublishRequest();
    const receipt = PublishReceiptSchema.parse({
      schemaVersion: '1.0.0', publicationKey: request.publicationKey,
      provider: 'buffer', channel: 'tiktok', status: 'confirmed',
      providerPostId: 'buffer-1', message: 'created',
      createdAt: '2026-08-20T12:00:00.000Z', mediaUrls: request.assets.map((asset) => asset.url)
    });

    await store.markSubmitting(request.publicationKey, request);
    await store.saveReceipt(request.publicationKey, receipt);

    await expect(store.find(request.publicationKey)).resolves.toEqual(receipt);
  });
});
