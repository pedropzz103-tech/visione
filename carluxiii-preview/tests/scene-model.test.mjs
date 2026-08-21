import test from 'node:test';
import assert from 'node:assert/strict';
import { A110_LAYERS, getActiveLayers } from '../scene-config.mjs';
import { validateNormalizedPolygon, interpolateLayer } from '../scene-model.mjs';

test('every semantic polygon is normalized and non-rectangular', () => {
  for (const layer of A110_LAYERS) {
    assert.equal(validateNormalizedPolygon(layer.mask), true, layer.id);
    assert.ok(layer.mask.length >= 6, `${layer.id} needs a semantic contour`);
  }
});

test('progress zero perfectly recomposes every layer', () => {
  for (const layer of A110_LAYERS) {
    assert.deepEqual(interpolateLayer(layer, 0), { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, opacity: 1 });
  }
});

test('progress one reaches each target transform', () => {
  for (const layer of A110_LAYERS) {
    const result = interpolateLayer(layer, 1);
    assert.equal(result.x, layer.target.x);
    assert.equal(result.y, layer.target.y);
    assert.equal(result.z, layer.target.z);
  }
});

test('mobile layer set is smaller than desktop layer set', () => {
  assert.ok(getActiveLayers(390).length < getActiveLayers(1440).length);
});
