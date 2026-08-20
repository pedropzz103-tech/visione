import {z} from 'zod';
import {AssetSchema, SchemaVersion} from './common.js';

export const CreativeSectionSchema = z.object({
  kind: z.enum(['hook', 'product', 'benefits', 'price', 'cta']),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  text: z.string().min(1),
  assetId: z.string().min(1).optional()
}).refine((section) => section.endFrame > section.startFrame, {
  message: 'Section endFrame must be after startFrame'
});

export const BaseCreativePlanSchema = z.object({
  schemaVersion: SchemaVersion,
  productId: z.string().min(1),
  durationSeconds: z.number().int().min(10).max(25),
  fps: z.literal(30),
  sections: z.array(CreativeSectionSchema).length(5)
});

export const SafeZonesSchema = z.object({
  top: z.number().int().nonnegative(),
  right: z.number().int().nonnegative(),
  bottom: z.number().int().nonnegative(),
  left: z.number().int().nonnegative()
});

export const ChannelCreativeVariantSchema = z.object({
  schemaVersion: SchemaVersion,
  channel: z.literal('tiktok'),
  productId: z.string().min(1),
  headline: z.string().min(1).max(70),
  productName: z.string().min(1).max(120),
  priceText: z.string().min(1),
  previousPriceText: z.string().min(1).optional(),
  benefits: z.array(z.string().min(1)).min(1).max(3),
  assets: z.array(AssetSchema).min(1),
  cta: z.string().min(1).max(100),
  caption: z.string().min(1).max(2200),
  affiliateUrl: z.url(),
  branding: z.object({
    label: z.string().min(1),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/)
  }),
  width: z.literal(1080),
  height: z.literal(1920),
  fps: z.literal(30),
  durationSeconds: z.number().int().min(10).max(25),
  safeZones: SafeZonesSchema,
  sections: z.array(CreativeSectionSchema).length(5)
});

export type BaseCreativePlan = z.infer<typeof BaseCreativePlanSchema>;
export type ChannelCreativeVariant = z.infer<typeof ChannelCreativeVariantSchema>;
