import {describe, expect, it} from 'vitest';
import {calculateLayout} from '../../src/render/remotion/layout.js';
import {makeTikTokVariant} from '../helpers/factories.js';

describe('calculateLayout', () => {
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
