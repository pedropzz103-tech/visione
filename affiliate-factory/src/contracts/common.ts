import {z} from 'zod';

export const SchemaVersion = z.literal('1.0.0');
export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const IsoDateTimeSchema = z.string().datetime({offset: true});

export const AssetProvenanceSchema = z.object({
  sourceType: z.enum(['operator-supplied', 'repository-created']),
  source: z.string().trim().min(1),
  originalUrl: z.url().optional()
});

export const AssetSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.enum(['image', 'video']),
  file: z.string().trim().min(1).refine(
    (value) => !value.includes('..') && !value.startsWith('/') && !/^[a-zA-Z]:/.test(value),
    'Asset path must stay inside the bundle'
  ),
  provenance: AssetProvenanceSchema
});

export const ProductionAssetSchema = AssetSchema.extend({
  provenance: AssetProvenanceSchema.extend({
    sourceType: z.literal('operator-supplied')
  })
});

export type Asset = z.infer<typeof AssetSchema>;
