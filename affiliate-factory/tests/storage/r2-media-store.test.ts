import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, it, vi} from 'vitest';
import {R2MediaStore} from '../../src/storage/r2-media-store.js';
import {privateObjectKey, publicationObjectKey} from '../../src/storage/media-store.js';

describe('R2MediaStore', () => {
  it('routes private and public writes to separate buckets', async () => {
    const file = join(await mkdtemp(join(tmpdir(), 'affiliate-r2-')), 'video.mp4');
    await writeFile(file, Buffer.from('video'));
    const commands: Array<{constructor: {name: string}; input?: Record<string, unknown>}> = [];
    const client = {send: vi.fn(async (command: typeof commands[number]) => {
      commands.push(command);
      return {ETag: 'etag'};
    })};
    const store = new R2MediaStore({
      client,
      privateBucket: 'ops-private',
      publicBucket: 'publication-public',
      publicBaseUrl: 'https://media.example.test/'
    });

    const privateStored = await store.putPrivateJson(
      privateObjectKey('state/runs/run-1.json'),
      {ok: true}
    );
    const publicStored = await store.putPublicFile(
      publicationObjectKey('final/publication/abc/video.mp4'),
      file,
      'video/mp4'
    );

    expect(privateStored.publicUrl).toBeNull();
    expect(publicStored.publicUrl).toBe('https://media.example.test/final/publication/abc/video.mp4');
    expect(commands.map((command) => command.input?.Bucket)).toEqual([
      'ops-private', 'publication-public'
    ]);
  });

  it('uses IfNoneMatch for an idempotency claim', async () => {
    const client = {send: vi.fn(async (_command: unknown) => ({ETag: 'etag'}))};
    const store = new R2MediaStore({
      client,
      privateBucket: 'private',
      publicBucket: 'public',
      publicBaseUrl: 'https://media.example.test'
    });

    await store.putPrivateJsonIfAbsent(
      privateObjectKey('state/idempotency/pub.json'),
      {status: 'submitting'}
    );

    expect((client.send.mock.calls[0]?.[0] as {input: {IfNoneMatch?: string}}).input.IfNoneMatch)
      .toBe('*');
  });

  it('sanitizes provider failures instead of exposing secrets', async () => {
    const client = {send: vi.fn(async () => {
      throw new Error('Authorization Bearer secret-access-key');
    })};
    const store = new R2MediaStore({
      client,
      privateBucket: 'private',
      publicBucket: 'public',
      publicBaseUrl: 'https://media.example.test'
    });

    await expect(store.putPrivateJson(privateObjectKey('state/runs/x.json'), {ok: false}))
      .rejects.toThrow('R2_PUT_PRIVATE_FAILED');
    await expect(store.putPrivateJson(privateObjectKey('state/runs/y.json'), {ok: false}))
      .rejects.not.toThrow(/secret-access-key|Authorization/);
  });

  it('streams a cached private render to a local destination', async () => {
    const client = {send: vi.fn(async (command: {constructor: {name: string}}) => {
      if (command.constructor.name === 'GetObjectCommand') {
        return {
          ContentLength: 6,
          ETag: 'etag',
          Body: {transformToByteArray: async () => new Uint8Array(Buffer.from('cached'))}
        };
      }
      throw new Error('unexpected command');
    })};
    const store = new R2MediaStore({
      client, privateBucket: 'private', publicBucket: 'public',
      publicBaseUrl: 'https://media.example.test'
    });
    const target = join(await mkdtemp(join(tmpdir(), 'affiliate-r2-get-')), 'cached.mp4');

    const stored = await store.getPrivateFile(
      privateObjectKey('temporary/renders/cached.mp4'), target
    );

    expect(stored).toMatchObject({sizeBytes: 6, publicUrl: null});
    await expect(readFile(target, 'utf8')).resolves.toBe('cached');
  });
});
