import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {copyFile, mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import type {ZodType} from 'zod';
import type {
  MediaStore,
  PrivateObjectKey,
  PublicationContentType,
  PublicationObjectKey,
  StoredObject
} from './media-store.js';

async function fileEtag(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

export class FilesystemMediaStore implements MediaStore {
  readonly #publicBaseUrl: string;

  public constructor(private readonly options: {root: string; publicBaseUrl: string}) {
    this.#publicBaseUrl = options.publicBaseUrl.replace(/\/+$/, '');
  }

  #path(scope: 'private' | 'public', key: string): string {
    return join(this.options.root, scope, ...key.split('/'));
  }

  async #stored(path: string, key: string, publicUrl: string | null): Promise<StoredObject> {
    const info = await stat(path);
    return {key, sizeBytes: info.size, etag: await fileEtag(path), publicUrl};
  }

  public async putPrivateJson(key: PrivateObjectKey, value: unknown): Promise<StoredObject> {
    const path = this.#path('private', key);
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    return this.#stored(path, key, null);
  }

  public async putPrivateJsonIfAbsent(key: PrivateObjectKey, value: unknown): Promise<StoredObject> {
    const path = this.#path('private', key);
    await mkdir(dirname(path), {recursive: true});
    try {
      await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {encoding: 'utf8', flag: 'wx'});
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new Error('OBJECT_ALREADY_EXISTS');
      }
      throw error;
    }
    return this.#stored(path, key, null);
  }

  public async getPrivateJson<T>(key: PrivateObjectKey, schema: ZodType<T>): Promise<T | null> {
    try {
      return schema.parse(JSON.parse(await readFile(this.#path('private', key), 'utf8')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  public async putPrivateFile(
    key: PrivateObjectKey,
    file: string,
    _contentType: string
  ): Promise<StoredObject> {
    const path = this.#path('private', key);
    await mkdir(dirname(path), {recursive: true});
    await copyFile(file, path);
    return this.#stored(path, key, null);
  }

  public async putPublicFile(
    key: PublicationObjectKey,
    file: string,
    _contentType: PublicationContentType
  ): Promise<StoredObject> {
    const path = this.#path('public', key);
    await mkdir(dirname(path), {recursive: true});
    await copyFile(file, path);
    return this.#stored(path, key, `${this.#publicBaseUrl}/${key}`);
  }

  public async headPublic(key: PublicationObjectKey): Promise<StoredObject | null> {
    const path = this.#path('public', key);
    try {
      return await this.#stored(path, key, `${this.#publicBaseUrl}/${key}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}
