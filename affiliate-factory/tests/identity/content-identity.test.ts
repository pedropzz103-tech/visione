import {describe, expect, it} from 'vitest';
import {mkdtemp, mkdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  canonicalJson,
  createContentHash,
  createBundleContentHash,
  createPublicationKey,
  createVideoId,
  sha256Hex
} from '../../src/identity/content-identity.js';
import {makeProductionManifest} from '../helpers/factories.js';

describe('content identity', () => {
  it('canonicalizes object keys while preserving array order', () => {
    expect(canonicalJson({b: 2, a: [3, 1]})).toBe('{"a":[3,1],"b":2}');
    expect(sha256Hex(canonicalJson({b: 2, a: 1})))
      .toBe(sha256Hex(canonicalJson({a: 1, b: 2})));
  });

  it('rejects values that cannot have a stable JSON identity', () => {
    expect(() => canonicalJson({value: Number.NaN})).toThrow('NON_CANONICAL_VALUE');
    expect(() => canonicalJson({value: undefined})).toThrow('NON_CANONICAL_VALUE');
  });

  it('creates stable video and publication identities', () => {
    const contentHash = createContentHash(makeProductionManifest());
    const videoId = createVideoId({
      productId: 'operator-product',
      contentHash,
      templateVersion: 'commercial-vertical@1',
      rendererVersion: '4.0.514'
    });
    expect(contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(videoId).toMatch(/^vid_[a-f0-9]{20}$/);
    expect(createPublicationKey({
      channel: 'tiktok',
      videoId,
      contentHash
    })).toMatch(/^[a-f0-9]{64}$/);
  });

  it('separates publication keys by channel', () => {
    const base = {videoId: 'vid_123', contentHash: 'abc'};
    expect(createPublicationKey({...base, channel: 'tiktok'}))
      .not.toBe(createPublicationKey({...base, channel: 'tiktok-shop'}));
  });

  it('changes content identity when operator asset bytes change', async () => {
    const root = await mkdtemp(join(tmpdir(), 'affiliate-identity-'));
    await mkdir(join(root, 'assets'));
    const asset = join(root, 'assets', 'operator-image.jpg');
    const manifest = makeProductionManifest();
    await writeFile(asset, Buffer.from('first-image'));
    const first = await createBundleContentHash(manifest, root);

    await writeFile(asset, Buffer.from('second-image'));
    const second = await createBundleContentHash(manifest, root);

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
  });
});
