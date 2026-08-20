import {describe, expect, it} from 'vitest';
import {createBaseCreativePlan} from '../../src/creative/base-plan.js';
import {makeProductionManifest} from '../helpers/factories.js';

describe('createBaseCreativePlan', () => {
  it('uses only operator-supplied product facts', () => {
    const manifest = makeProductionManifest();
    const plan = createBaseCreativePlan(manifest);
    const serialized = JSON.stringify(plan);

    expect(serialized).toContain(manifest.productName);
    expect(serialized).toContain(manifest.benefits[0]);
    expect(serialized).toContain(manifest.cta);
    expect(serialized).not.toContain('melhor do mercado');
    expect(plan.sections.map((section) => section.kind)).toEqual([
      'hook',
      'product',
      'benefits',
      'price',
      'cta'
    ]);
    expect(plan.sections.at(-1)?.endFrame).toBe(450);
  });

  it('does not mutate the validated manifest', () => {
    const manifest = makeProductionManifest();
    const before = structuredClone(manifest);
    createBaseCreativePlan(manifest);
    expect(manifest).toEqual(before);
  });
});
