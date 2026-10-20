import {z} from 'zod';
import {SchemaVersion, Sha256Schema} from './common.js';

export const TextBoxSchema = z.object({
  id: z.string().min(1),
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
  fontSize: z.number().positive(),
  lineHeight: z.number().positive(),
  maxLines: z.number().int().positive(),
  measuredCharacterLimit: z.number().int().positive()
});

export const LayoutEvidenceSchema = z.object({
  textBoxes: z.array(TextBoxSchema),
  overflows: z.array(z.string()),
  safeZone: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
    width: z.number().positive(),
    height: z.number().positive()
  })
});

export const RenderResultSchema = z.object({
  schemaVersion: SchemaVersion,
  videoId: z.string().min(1),
  outputPath: z.string().min(1),
  contentHash: Sha256Schema,
  width: z.literal(1080),
  height: z.literal(1920),
  fps: z.literal(30),
  frameCount: z.number().int().positive(),
  durationSeconds: z.number().positive(),
  videoCodec: z.string().min(1),
  audioCodec: z.string().min(1).nullable(),
  sizeBytes: z.number().int().nonnegative(),
  layout: LayoutEvidenceSchema
});

export const MediaProbeSchema = z.object({
  video: z.object({
    codec: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().positive(),
    durationSeconds: z.number().positive()
  }),
  audio: z.object({
    codec: z.string().min(1)
  }).nullable(),
  format: z.object({
    durationSeconds: z.number().positive(),
    sizeBytes: z.number().int().positive()
  })
});

export const QualityCheckSchema = z.object({
  code: z.string().min(1),
  passed: z.boolean(),
  evidence: z.string().min(1)
});

export const QualityGateResultSchema = z.object({
  schemaVersion: SchemaVersion,
  videoId: z.string().min(1),
  passed: z.boolean(),
  checks: z.array(QualityCheckSchema).min(1)
}).superRefine((result, context) => {
  const allPassed = result.checks.every((check) => check.passed);
  if (allPassed !== result.passed) {
    context.addIssue({
      code: 'custom',
      path: ['passed'],
      message: 'Quality gate verdict must match its checks'
    });
  }
});

export type LayoutEvidence = z.infer<typeof LayoutEvidenceSchema>;
export type MediaProbe = z.infer<typeof MediaProbeSchema>;
export type RenderResult = z.infer<typeof RenderResultSchema>;
export type QualityGateResult = z.infer<typeof QualityGateResultSchema>;
