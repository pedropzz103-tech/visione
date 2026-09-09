import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {z} from 'zod';
import {describe, expect, it} from 'vitest';
import {FilesystemMediaStore} from '../../src/storage/filesystem-media-store.js';
import {privateObjectKey, publicationObjectKey} from '../../src/storage/media-store.js';

describe('FilesystemMediaStore', () => {
  it('keeps private JSON private and reads it through a schema', async () => {
    const root = await mkdtemp(join(tmpdir(), 'affiliate-store-'));
    const store = new FilesystemMediaStore({root, publicBaseUrl: 'https://media.example.test/'});
    const key = privateObjectKey('state/runs/run-1.json');

    const stored = await store.putPrivateJson(key, {ok: true});

    expect(stored.publicUrl).toBeNull();
    await expect(store.getPrivateJson(key, z.object({ok: z.boolean()})))
      .resolves.toEqual({ok: true});
  });

  it('maps only publication objects to a stable public URL', async () => {
    const root = await mkdtemp(join(tmpdir(), 'affiliate-store-'));
    const file = join(root, 'source.jpg');
    await writeFile(file, Buffer.from('image'));
    const store = new FilesystemMediaStore({root, publicBaseUrl: 'https://media.example.test/'});

    const stored = await store.putPublicFile(
      publicationObjectKey('final/publication/abc/product.jpg'),
      file,
      'image/jpeg'
    );

    expect(stored.publicUrl).toBe('https://media.example.test/final/publication/abc/product.jpg');
    await expect(store.headPublic(publicationObjectKey('final/publication/abc/product.jpg')))
      .resolves.toMatchObject({sizeBytes: 5});
  });

  it('creates idempotency claims without overwriting them', async () => {
    const root = await mkdtemp(join(tmpdir(), 'affiliate-store-'));
    const store = new FilesystemMediaStore({root, publicBaseUrl: 'https://media.example.test'});
    const key = privateObjectKey('state/idempotency/key.json');

    await store.putPrivateJsonIfAbsent(key, {attempt: 1});
    await expect(store.putPrivateJsonIfAbsent(key, {attempt: 2}))
      .rejects.toThrow('OBJECT_ALREADY_EXISTS');
  });

  it('restores an approved private render without exposing a URL', async () => {
    const root = await mkdtemp(join(tmpdir(), 'affiliate-store-'));
    const source = join(root, 'approved.mp4');
    const destination = join(root, 'restored.mp4');
    await writeFile(source, Buffer.from('approved-video'));
    const store = new FilesystemMediaStore({root, publicBaseUrl: 'https://media.example.test'});
    const key = privateObjectKey('temporary/renders/vid-approved.mp4');

    await store.putPrivateFile(key, source, 'video/mp4');
    const restored = await store.getPrivateFile(key, destination);

    expect(restored).toMatchObject({publicUrl: null, sizeBytes: 14});
    await expect(readFile(destination, 'utf8')).resolves.toBe('approved-video');
  });
});
