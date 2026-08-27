const root = document.documentElement;
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const PARTS = [
  './assets/gallery-01.b64',
  './assets/gallery-02.b64',
  './assets/gallery-03.b64',
  './assets/gallery-04.b64',
  './assets/gallery-05.b64'
];
const TILE_W = 360;
const TILE_H = 540;
const objectUrls = [];

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gallery image could not be decoded'));
    image.src = src;
  });
}

async function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to create gallery crop')), 'image/webp', .94);
  });
}

async function hydrateGallery() {
  const parts = await Promise.all(PARTS.map(async path => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Gallery asset failed: ${path} (${response.status})`);
    return (await response.text()).replace(/\s+/g, '');
  }));

  const atlas = await loadImage(`data:image/webp;base64,${parts.join('')}`);
  if (atlas.naturalWidth !== TILE_W * 3 || atlas.naturalHeight !== TILE_H * 3) {
    throw new Error(`Unexpected gallery dimensions: ${atlas.naturalWidth}x${atlas.naturalHeight}`);
  }

  const urls = new Map();
  for (let index = 0; index < 9; index += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = TILE_W;
    canvas.height = TILE_H;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas is unavailable');
    context.drawImage(
      atlas,
      (index % 3) * TILE_W,
      Math.floor(index / 3) * TILE_H,
      TILE_W,
      TILE_H,
      0,
      0,
      TILE_W,
      TILE_H
    );
    const blob = await canvasBlob(canvas);
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    urls.set(String(index + 1), url);
  }

  const images = [...document.querySelectorAll('[data-photo]')];
  images.forEach(image => { image.src = urls.get(image.dataset.photo) || ''; });
  await Promise.all(images.map(image => image.decode().catch(() => {})));
  root.classList.add('images-ready');
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');
if (reducedMotion || !('IntersectionObserver' in window)) {
  reveals.forEach(node => node.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .1, rootMargin: '0px 0px -5% 0px' });
  reveals.forEach(node => observer.observe(node));
}

const header = document.querySelector('.topbar');
let ticking = false;
function updateHeader() {
  header?.classList.toggle('scrolled', scrollY > 30);
  ticking = false;
}
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateHeader);
}, { passive: true });
updateHeader();

hydrateGallery().catch(error => {
  console.error(error);
  root.classList.add('images-error');
});

addEventListener('pagehide', () => objectUrls.forEach(URL.revokeObjectURL), { once: true });
