import {describe, expect, it} from 'vitest';
import {createBaseCreativePlan} from '../../src/creative/base-plan.js';
import {createTikTokVariant} from '../../src/creative/tiktok-variant.js';
import {makeProductionManifest} from '../helpers/factories.js';

describe('createTikTokVariant', () => {
  it('locks CTA, safe zones, and channel settings before render', () => {
    const manifest = makeProductionManifest();
    const variant = createTikTokVariant(
      manifest,
      createBaseCreativePlan(manifest)
    );

    expect(variant.channel).toBe('tiktok');
    expect(variant.cta).toBe(manifest.cta);
    expect(variant.priceText).toBe('R$ 129,90');
    expect(variant.previousPriceText).toBe('R$ 159,90');
    expect(variant.width).toBe(1080);
    expect(variant.height).toBe(1920);
    expect(variant.fps).toBe(30);
    expect(variant.safeZones).toEqual({
      top: 180,
      right: 150,
      bottom: 300,
      left: 90
    });
  });

  it('adds an affiliate disclosure without changing product facts', () => {
    const manifest = makeProductionManifest();
    const variant = createTikTokVariant(
      manifest,
      createBaseCreativePlan(manifest)
    );
    expect(variant.caption).toContain(manifest.caption);
    expect(variant.caption).toContain('#publicidade');
    expect(variant.benefits).toEqual(manifest.benefits);
  });
});
