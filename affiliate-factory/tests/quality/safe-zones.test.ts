import {describe, expect, it} from 'vitest';
import {findSafeZoneViolations} from '../../src/quality/safe-zones.js';
import {makeLayoutEvidence} from '../helpers/factories.js';

describe('findSafeZoneViolations', () => {
  it('accepts text boxes fully contained by the safe zone', () => {
    expect(findSafeZoneViolations(makeLayoutEvidence())).toEqual([]);
  });

  it('names every text box that crosses the safe zone', () => {
    const layout = makeLayoutEvidence();
    layout.textBoxes.push({
      id: 'cta', x: 880, y: 1500, width: 100, height: 160,
      fontSize: 40, lineHeight: 48, maxLines: 2, measuredCharacterLimit: 30
    });

    expect(findSafeZoneViolations(layout)).toEqual(['cta']);
  });
});
