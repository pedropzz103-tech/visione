export const clamp01 = (value) => Math.min(1, Math.max(0, value));

export function sectionProgress(top, height, viewportHeight) {
  const travel = Math.max(1, height - viewportHeight);
  return clamp01(-top / travel);
}

export function sliceTransform(index, progress, total = 7) {
  const p = clamp01(progress);
  if (p === 0) return { x: 0, y: 0, z: 0, rotateY: 0, rotateZ: 0 };
  const center = (total - 1) / 2;
  const distance = index - center;
  const direction = Math.sign(distance || (index % 2 ? 1 : -1));
  const magnitude = Math.abs(distance) + 1;
  return {
    x: direction * (70 + magnitude * 18) * p,
    y: distance * 7 * p,
    z: (55 + magnitude * 24) * p,
    rotateY: direction * (4 + magnitude * 1.8) * p,
    rotateZ: distance * 0.75 * p,
  };
}
