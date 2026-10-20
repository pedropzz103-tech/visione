import {z} from 'zod';
import {IsoDateTimeSchema, SchemaVersion, Sha256Schema} from './common.js';

export const PublicationChannelSchema = z.enum(['tiktok', 'x', 'threads']);

const HttpsMediaUrlSchema = z.url().refine(
  (url) => url.startsWith('https://'),
  'Media URL must use HTTPS'
);

export const PublishAssetSchema = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('video'), url: HttpsMediaUrlSchema}),
  z.object({kind: z.literal('image'), url: HttpsMediaUrlSchema})
]);

export const PublishRequestSchema = z.object({
  schemaVersion: SchemaVersion,
  purpose: z.literal('production'),
  channel: PublicationChannelSchema,
  productId: z.string().min(1),
  videoId: z.string().min(1),
  contentHash: Sha256Schema,
  publicationKey: Sha256Schema,
  assets: z.array(PublishAssetSchema).min(1).max(10),
  caption: z.string().min(1).max(2200),
  affiliateUrl: z.url(),
  thumbnailOffsetMs: z.number().int().nonnegative().default(2000)
}).superRefine((request, context) => {
  const kinds = request.assets.map((asset) => asset.kind);
  if (request.channel === 'tiktok' && (
    request.assets.length !== 1 || kinds[0] !== 'video'
  )) {
    context.addIssue({
      code: 'custom', path: ['assets'],
      message: 'TikTok publication requires exactly one video asset'
    });
  }
  if (request.channel !== 'tiktok' && kinds.some((kind) => kind !== 'image')) {
    context.addIssue({
      code: 'custom', path: ['assets'],
      message: 'X and Threads publication require image assets'
    });
  }
  if (request.channel === 'x' && request.assets.length > 4) {
    context.addIssue({
      code: 'custom', path: ['assets'],
      message: 'X publication supports at most four images'
    });
  }
});

export const PublishReceiptSchema = z.object({
  schemaVersion: SchemaVersion,
  publicationKey: Sha256Schema,
  provider: z.enum(['buffer', 'noop', 'tiktok-shop', 'shopee']),
  channel: z.enum(['tiktok', 'x', 'threads', 'tiktok-shop', 'shopee']),
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
  mediaUrls: z.array(z.url()).optional()
});

export type PublicationChannel = z.infer<typeof PublicationChannelSchema>;
export type PublishAsset = z.infer<typeof PublishAssetSchema>;
export type PublishRequest = z.infer<typeof PublishRequestSchema>;
export type PublishReceipt = z.infer<typeof PublishReceiptSchema>;
