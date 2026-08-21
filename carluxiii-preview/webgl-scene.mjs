import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js';
import { getActiveLayers } from './scene-config.mjs';
import { clamp01, interpolateLayer } from './scene-model.mjs';

function boundsFor(points) {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function buildSemanticTexture(sourceImage, layer) {
  const b = boundsFor(layer.mask);
  const sourceW = sourceImage.naturalWidth;
  const sourceH = sourceImage.naturalHeight;
  const sx = Math.floor(b.minX * sourceW);
  const sy = Math.floor(b.minY * sourceH);
  const sw = Math.max(2, Math.ceil((b.maxX - b.minX) * sourceW));
  const sh = Math.max(2, Math.ceil((b.maxY - b.minY) * sourceH));
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.clearRect(0, 0, sw, sh);
  ctx.save();
  ctx.beginPath();
  layer.mask.forEach(([nx, ny], index) => {
    const x = (nx - b.minX) / (b.maxX - b.minX) * sw;
    const y = (ny - b.minY) / (b.maxY - b.minY) * sh;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, sw, sh);
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return { texture, bounds: b };
}

export function createA110Scene({ host, sourceImage }) {
  if (!host || !sourceImage) throw new Error('A110 scene requires host and source image');
  if (!sourceImage.complete || !sourceImage.naturalWidth) throw new Error('A110 source image is not loaded');

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.className = 'a110-canvas';
  host.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  const group = new THREE.Group();
  scene.add(group);

  const aspect = sourceImage.naturalWidth / sourceImage.naturalHeight;
  const baseHeight = 7.5;
  const baseWidth = baseHeight * aspect;

  const baseTexture = new THREE.Texture(sourceImage);
  baseTexture.needsUpdate = true;
  baseTexture.colorSpace = THREE.SRGBColorSpace;
  baseTexture.minFilter = THREE.LinearFilter;
  baseTexture.magFilter = THREE.LinearFilter;
  const baseMaterial = new THREE.MeshBasicMaterial({ map: baseTexture, transparent: true, opacity: 1, depthWrite: false });
  const baseMesh = new THREE.Mesh(new THREE.PlaneGeometry(baseWidth, baseHeight), baseMaterial);
  baseMesh.position.z = 0;
  group.add(baseMesh);

  const activeLayers = getActiveLayers(window.innerWidth);
  const semanticMeshes = activeLayers.map((layer, index) => {
    const { texture, bounds } = buildSemanticTexture(sourceImage, layer);
    const width = baseWidth * (bounds.maxX - bounds.minX);
    const height = baseHeight * (bounds.maxY - bounds.minY);
    const cx = ((bounds.minX + bounds.maxX) / 2 - .5) * baseWidth;
    const cy = (.5 - (bounds.minY + bounds.maxY) / 2) * baseHeight;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, alphaTest: .01 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.set(cx, cy, .02 + index * .003);
    mesh.userData = { layer, origin: { x: cx, y: cy, z: .02 + index * .003 }, texture };
    group.add(mesh);
    return mesh;
  });

  let progress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let disposed = false;

  function resize() {
    if (disposed) return;
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const mobile = width < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const byHeight = (baseHeight / 2) / Math.tan(fovRad / 2);
    const byWidth = (baseWidth / 2) / (Math.tan(fovRad / 2) * camera.aspect);
    camera.position.z = Math.max(byHeight, byWidth) * 1.08;
    camera.updateProjectionMatrix();
    render();
  }

  function setProgress(value) {
    progress = clamp01(value);
    semanticMeshes.forEach(mesh => {
      const { layer, origin } = mesh.userData;
      const t = interpolateLayer(layer, progress);
      mesh.position.set(origin.x + t.x, origin.y + t.y, origin.z + t.z);
      mesh.rotation.set(t.rx, t.ry, t.rz);
      mesh.material.opacity = .96 + .04 * (1 - progress);
    });
    const ghost = progress;
    baseMaterial.opacity = 1 - ghost * .32;
    const tone = 1 - ghost * .24;
    baseMaterial.color.setRGB(tone, tone, tone);
    group.position.z = -.35 * progress;
    group.rotation.x = -.018 * progress;
    render();
  }

  function setPointer(nx, ny) {
    pointerX = clamp01((nx + 1) / 2) * 2 - 1;
    pointerY = clamp01((ny + 1) / 2) * 2 - 1;
    render();
  }

  function render() {
    if (disposed) return;
    camera.position.x = pointerX * .16 * progress;
    camera.position.y = pointerY * .11 * progress;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    baseMesh.geometry.dispose();
    baseMaterial.dispose();
    baseTexture.dispose();
    semanticMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.userData.texture.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  }

  resize();
  return { setProgress, setPointer, resize, render, dispose, isReady: true };
}
