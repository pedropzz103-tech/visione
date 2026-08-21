import {z} from 'zod';
import {AssetSchema, ProductionAssetSchema, SchemaVersion} from './common.js';

const allowedShopeeHosts = new Set([
  'shopee.com.br',
  'www.shopee.com.br',
  's.shopee.com.br'
]);

const ShopeeAffiliateUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && allowedShopeeHosts.has(url.hostname.toLowerCase());
}, 'Affiliate URL must use an allowed Shopee Brazil host');

const BrandingSchema = z.object({
  label: z.string().trim().min(1).max(40).default('Affiliate Factory'),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#FF5A36'),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0D0D12'),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#FFFFFF')
}).default({
  label: 'Affiliate Factory',
  primaryColor: '#FF5A36',
  backgroundColor: '#0D0D12',
  textColor: '#FFFFFF'
});

const ManifestBase = z.object({
  schemaVersion: SchemaVersion,
  productId: z.string().trim().min(1).max(100),
  productName: z.string().trim().min(1).max(120),
  affiliateUrl: ShopeeAffiliateUrlSchema,
  currency: z.literal('BRL'),
  previousPriceMinor: z.number().int().nonnegative().optional(),
  benefits: z.array(z.string().trim().min(1).max(120)).min(1).max(3),
  headline: z.string().trim().min(1).max(70).optional(),
  cta: z.string().trim().min(1).max(100),
  caption: z.string().trim().min(1).max(2200),
  durationSeconds: z.number().int().min(10).max(25).default(15),
  branding: BrandingSchema
});

const FixtureManifestSchema = ManifestBase.extend({
  purpose: z.literal('fixture'),
  currentPriceMinor: z.literal(0),
  assets: z.array(AssetSchema).min(1)
});

const ProductionManifestSchema = ManifestBase.extend({
  purpose: z.literal('production'),
  currentPriceMinor: z.number().int().positive(),
  assets: z.array(ProductionAssetSchema).min(1)
}).superRefine((manifest, context) => {
  if (
    manifest.previousPriceMinor !== undefined &&
    manifest.previousPriceMinor <= manifest.currentPriceMinor
  ) {
    context.addIssue({
      code: 'custom',
      path: ['previousPriceMinor'],
      message: 'Previous price must be greater than current price'
    });
  }
});

export const ProductManifestSchema = z.discriminatedUnion('purpose', [
  FixtureManifestSchema,
  ProductionManifestSchema
]);

export type ProductManifest = z.infer<typeof ProductManifestSchema>;
export type ProductionManifest = z.infer<typeof ProductionManifestSchema>;
