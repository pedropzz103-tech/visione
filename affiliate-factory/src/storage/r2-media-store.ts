import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import type {ZodType} from 'zod';
import type {
  MediaStore,
  PrivateObjectKey,
  PublicationContentType,
  PublicationObjectKey,
  StoredObject
} from './media-store.js';

type ObjectClient = {send(command: unknown): Promise<unknown>};

export type R2MediaStoreOptions = {
  client?: ObjectClient;
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  privateBucket: string;
  publicBucket: string;
  publicBaseUrl: string;
};

function isNotFound(error: unknown): boolean {
  const value = error as {$metadata?: {httpStatusCode?: number}; name?: string};
  return value.$metadata?.httpStatusCode === 404 || value.name === 'NoSuchKey' || value.name === 'NotFound';
}

function isPrecondition(error: unknown): boolean {
  const value = error as {$metadata?: {httpStatusCode?: number}; name?: string};
  return value.$metadata?.httpStatusCode === 412 || value.name === 'PreconditionFailed';
}

export class R2MediaStore implements MediaStore {
  readonly #client: ObjectClient;
  readonly #publicBaseUrl: string;

  public constructor(private readonly options: R2MediaStoreOptions) {
    if (options.client) {
      this.#client = options.client;
    } else {
      if (!options.accountId || !options.accessKeyId || !options.secretAccessKey) {
        throw new Error('R2_CONFIGURATION_INCOMPLETE');
      }
      this.#client = new S3Client({
        region: 'auto',
        endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey
        }
      }) as ObjectClient;
    }
    this.#publicBaseUrl = options.publicBaseUrl.replace(/\/+$/, '');
  }

  async #send(command: unknown, operation: string): Promise<Record<string, unknown>> {
    try {
      return await this.#client.send(command) as Record<string, unknown>;
    } catch (error) {
      if (isPrecondition(error)) {
        throw new Error('OBJECT_ALREADY_EXISTS');
      }
      if (isNotFound(error)) {
        throw new Error('OBJECT_NOT_FOUND');
      }
      throw new Error(`R2_${operation}_FAILED`);
    }
  }

  public async putPrivateJson(key: PrivateObjectKey, value: unknown): Promise<StoredObject> {
    const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    const result = await this.#send(new PutObjectCommand({
      Bucket: this.options.privateBucket,
      Key: key,
      Body: body,
      ContentType: 'application/json'
    }), 'PUT_PRIVATE');
    return {key, sizeBytes: body.length, etag: result.ETag as string | undefined, publicUrl: null};
  }

  public async putPrivateJsonIfAbsent(key: PrivateObjectKey, value: unknown): Promise<StoredObject> {
    const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    const result = await this.#send(new PutObjectCommand({
      Bucket: this.options.privateBucket,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      IfNoneMatch: '*'
    }), 'PUT_PRIVATE');
    return {key, sizeBytes: body.length, etag: result.ETag as string | undefined, publicUrl: null};
  }

  public async getPrivateJson<T>(key: PrivateObjectKey, schema: ZodType<T>): Promise<T | null> {
    let result: Record<string, unknown>;
    try {
      result = await this.#send(new GetObjectCommand({
        Bucket: this.options.privateBucket,
        Key: key
      }), 'GET_PRIVATE');
    } catch (error) {
      if ((error as Error).message === 'OBJECT_NOT_FOUND') {
        return null;
      }
      throw error;
    }
    const body = result.Body as {transformToString?: () => Promise<string>} | undefined;
    if (!body?.transformToString) {
      throw new Error('R2_GET_PRIVATE_INVALID_BODY');
    }
    return schema.parse(JSON.parse(await body.transformToString()));
  }

  public async putPrivateFile(
    key: PrivateObjectKey,
    file: string,
    contentType: string
  ): Promise<StoredObject> {
    const sizeBytes = (await stat(file)).size;
    const result = await this.#send(new PutObjectCommand({
      Bucket: this.options.privateBucket,
      Key: key,
      Body: createReadStream(file),
      ContentLength: sizeBytes,
      ContentType: contentType
    }), 'PUT_PRIVATE');
    return {key, sizeBytes, etag: result.ETag as string | undefined, publicUrl: null};
  }

  public async putPublicFile(
    key: PublicationObjectKey,
    file: string,
    contentType: PublicationContentType
  ): Promise<StoredObject> {
    const sizeBytes = (await stat(file)).size;
    const result = await this.#send(new PutObjectCommand({
      Bucket: this.options.publicBucket,
      Key: key,
      Body: createReadStream(file),
      ContentLength: sizeBytes,
      ContentType: contentType
    }), 'PUT_PUBLIC');
    return {
      key,
      sizeBytes,
      etag: result.ETag as string | undefined,
      publicUrl: `${this.#publicBaseUrl}/${key}`
    };
  }

  public async headPublic(key: PublicationObjectKey): Promise<StoredObject | null> {
    try {
      const result = await this.#send(new HeadObjectCommand({
        Bucket: this.options.publicBucket,
        Key: key
      }), 'HEAD_PUBLIC');
      return {
        key,
        sizeBytes: Number(result.ContentLength ?? 0),
        etag: result.ETag as string | undefined,
        publicUrl: `${this.#publicBaseUrl}/${key}`
      };
    } catch (error) {
      if ((error as Error).message === 'OBJECT_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }
}
