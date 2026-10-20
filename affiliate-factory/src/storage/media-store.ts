import {z, type ZodType} from 'zod';

const SafePathSchema = z.string().min(1).refine(
  (value) => !value.includes('..') && !value.includes('\\') && !value.startsWith('/'),
  'Object key must be a safe relative path'
);

const PrivateObjectKeySchema = SafePathSchema.refine(
  (value) => /^(state|runs|diagnostics|bundles|input|temporary|rejected)\//.test(value),
  'Private object key must use a private prefix'
).brand<'PrivateObjectKey'>();

const PublicationObjectKeySchema = SafePathSchema.refine(
  (value) => /^final\/publication\/[A-Za-z0-9._/-]+$/.test(value),
  'Publication object key must use final/publication'
).brand<'PublicationObjectKey'>();

export type PrivateObjectKey = z.infer<typeof PrivateObjectKeySchema>;
export type PublicationObjectKey = z.infer<typeof PublicationObjectKeySchema>;

export const privateObjectKey = (value: string): PrivateObjectKey =>
  PrivateObjectKeySchema.parse(value);
export const publicationObjectKey = (value: string): PublicationObjectKey =>
  PublicationObjectKeySchema.parse(value);

export type PublicationContentType =
  | 'video/mp4'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif';

export type StoredObject = {
  key: string;
  sizeBytes: number;
  etag: string | undefined;
  publicUrl: string | null;
};

export interface MediaStore {
  putPrivateJson(key: PrivateObjectKey, value: unknown): Promise<StoredObject>;
  putPrivateJsonIfAbsent(key: PrivateObjectKey, value: unknown): Promise<StoredObject>;
  getPrivateJson<T>(key: PrivateObjectKey, schema: ZodType<T>): Promise<T | null>;
  putPrivateFile(key: PrivateObjectKey, file: string, contentType: string): Promise<StoredObject>;
  getPrivateFile(key: PrivateObjectKey, destination: string): Promise<StoredObject | null>;
  putPublicFile(
    key: PublicationObjectKey,
    file: string,
    contentType: PublicationContentType
  ): Promise<StoredObject>;
  headPublic(key: PublicationObjectKey): Promise<StoredObject | null>;
}
