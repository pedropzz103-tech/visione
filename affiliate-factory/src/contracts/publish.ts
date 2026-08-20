import {z} from 'zod';
import {IsoDateTimeSchema, SchemaVersion, Sha256Schema} from './common.js';

export const PublishRequestSchema = z.object({
  schemaVersion: SchemaVersion,
  purpose: z.literal('production'),
  channel: z.literal('tiktok'),
  productId: z.string().min(1),
  videoId: z.string().min(1),
  contentHash: Sha256Schema,
  publicationKey: Sha256Schema,
  mediaUrl: z.url().refine((url) => url.startsWith('https://'), 'Media URL must use HTTPS'),
  caption: z.string().min(1).max(2200),
  affiliateUrl: z.url(),
  thumbnailOffsetMs: z.number().int().nonnegative().default(2000)
});

export const PublishReceiptSchema = z.object({
  schemaVersion: SchemaVersion,
  publicationKey: Sha256Schema,
  provider: z.enum(['buffer', 'noop', 'tiktok-shop', 'shopee']),
  channel: z.enum(['tiktok', 'tiktok-shop', 'shopee']),
  status: z.enum([
    'confirmed',
    'rejected',
    'ambiguous',
    'skipped',
    'skipped_duplicate',
    'not_configured'
  ]),
  providerPostId: z.string().min(1).optional(),
  message: z.string().min(1),
  createdAt: IsoDateTimeSchema,
  mediaUrl: z.url().optional()
});

export type PublishRequest = z.infer<typeof PublishRequestSchema>;
export type PublishReceipt = z.infer<typeof PublishReceiptSchema>;
