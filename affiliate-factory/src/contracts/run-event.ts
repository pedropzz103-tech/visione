import {z} from 'zod';
import {IsoDateTimeSchema, SchemaVersion} from './common.js';

export const PipelineStateSchema = z.enum([
  'received',
  'validated',
  'planned',
  'rendered',
  'qa_passed',
  'uploaded',
  'submitting',
  'published',
  'rejected',
  'failed',
  'needs_reconciliation',
  'skipped_duplicate'
]);

export const RunEventSchema = z.object({
  schemaVersion: SchemaVersion,
  runId: z.string().min(1),
  videoId: z.string().min(1).optional(),
  state: PipelineStateSchema,
  stage: z.string().min(1),
  event: z.string().min(1),
  occurredAt: IsoDateTimeSchema,
  details: z.record(z.string(), z.unknown()).default({})
});

const StageStatusSchema = z.enum(['OK', 'ERRO', 'PULADO']);

export const RunSummarySchema = z.object({
  schemaVersion: SchemaVersion,
  runId: z.string().min(1),
  productName: z.string().min(1),
  videoId: z.string().min(1).optional(),
  state: PipelineStateSchema,
  render: StageStatusSchema,
  qa: StageStatusSchema,
  r2: StageStatusSchema,
  buffer: StageStatusSchema,
  tiktokStatus: z.string().min(1),
  xStatus: z.string().min(1),
  threadsStatus: z.string().min(1),
  publicUrl: z.url().optional(),
  errorCode: z.string().min(1).optional()
});

export type PipelineState = z.infer<typeof PipelineStateSchema>;
export type RunEvent = z.infer<typeof RunEventSchema>;
export type RunSummary = z.infer<typeof RunSummarySchema>;
