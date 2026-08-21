export const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function easeInOutCubic(t) {
  t = clamp01(t);
  return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function validateNormalizedPolygon(points) {
  if (!Array.isArray(points) || points.length < 3) return false;
  const unique = new Set();
  for (const point of points) {
    if (!Array.isArray(point) || point.length !== 2) return false;
    const [x, y] = point;
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) return false;
    unique.add(`${x.toFixed(6)},${y.toFixed(6)}`);
  }
  if (unique.size < 3) return false;
  if (points.length === 4) {
    const xs = new Set(points.map(([x]) => x.toFixed(6)));
    const ys = new Set(points.map(([,y]) => y.toFixed(6)));
    if (xs.size === 2 && ys.size === 2) return false;
  }
  return true;
}

export function interpolateLayer(layer, progress) {
  const p = easeInOutCubic(progress);
  if (p === 0) return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, opacity: 1 };
  const target = layer.target || {};
  return {
    x: (target.x || 0) * p,
    y: (target.y || 0) * p,
    z: (target.z || 0) * p,
    rx: (target.rx || 0) * p,
    ry: (target.ry || 0) * p,
    rz: (target.rz || 0) * p,
    opacity: 1
  };
}
