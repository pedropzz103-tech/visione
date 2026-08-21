import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {calculateLayout} from '../../src/render/remotion/layout.js';
import {makeTikTokVariant} from '../helpers/factories.js';

describe('calculateLayout', () => {
  it('keeps the portrait fixture image free of baked text that would be cropped', () => {
    const source = readFileSync(resolve('fixtures/product-test/assets/product-card.svg'), 'utf8');
    expect(source).not.toContain('<text');
  });

  it('keeps every text box inside the TikTok safe zone', () => {
    const evidence = calculateLayout(makeTikTokVariant());
    for (const box of evidence.textBoxes) {
      expect(box.x).toBeGreaterThanOrEqual(90);
      expect(box.y).toBeGreaterThanOrEqual(180);
      expect(box.x + box.width).toBeLessThanOrEqual(930);
      expect(box.y + box.height).toBeLessThanOrEqual(1620);
    }
    expect(evidence.overflows).toEqual([]);
  });

  it('reports text that exceeds the declared template capacity', () => {
    const variant = makeTikTokVariant();
    const evidence = calculateLayout({
      ...variant,
      headline: 'X'.repeat(71)
    });
    expect(evidence.overflows).toContain('headline');
  });
});
