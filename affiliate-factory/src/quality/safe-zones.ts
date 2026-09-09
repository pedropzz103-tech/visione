import type {LayoutEvidence} from '../contracts/index.js';

export function findSafeZoneViolations(layout: LayoutEvidence): string[] {
  const right = layout.safeZone.x + layout.safeZone.width;
  const bottom = layout.safeZone.y + layout.safeZone.height;
  return layout.textBoxes
    .filter((box) => (
      box.x < layout.safeZone.x ||
      box.y < layout.safeZone.y ||
      box.x + box.width > right ||
      box.y + box.height > bottom
    ))
    .map((box) => box.id);
}
