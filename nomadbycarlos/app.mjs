const root = document.documentElement;
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const BUILD_ID = '20260827-photos-fixed';
const ASSET_BASE = '../carluxiii-preview/assets/';
const IMAGE_FILES = {
  'work-01': ['work-01-01.b64','work-01-02.b64','work-01-03.b64','work-01-04.b64'],
  'work-02': ['work-02-01.b64','work-02-02.b64','work-02-03.b64'],
  'work-03': ['work-03-01.b64','work-03-02.b64','work-03-03.b64'],
  'a110-front': [
    'a110-front-01.b64','a110-front-02.b64',
    'a110-front-03a.b64','a110-front-03b.b64','a110-front-03c.b64','a110-front-03d.b64',
    'a110-front-04.b64','a110-front-05.b64','a110-front-06.b64','a110-front-07.b64','a110-front-08.b64'
  ]
};

async function loadImageData(key) {
  const files = IMAGE_FILES[key];
  if (!files) throw new Error(`Unknown image key: ${key}`);
  const parts = await Promise.all(files.map(async file => {
    const response = await fetch(`${ASSET_BASE}${file}?v=${BUILD_ID}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to load ${file}: ${response.status}`);
    return (await response.text()).replace(/\s+/g, '');
  }));
  const base64 = parts.join('');
  if (!base64.startsWith('UklGR')) throw new Error(`Invalid WebP data for ${key}`);
  return `data:image/webp;base64,${base64}`;
}

async function hydrateImages() {
  const images = [...document.querySelectorAll('[data-image]')];
  const keys = [...new Set(images.map(image => image.dataset.image))];
  const sources = new Map(await Promise.all(keys.map(async key => [key, await loadImageData(key)])));
  images.forEach(image => { image.src = sources.get(image.dataset.image) || ''; });
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

hydrateImages().catch(error => {
  console.error('nomadbycarlos image loader:', error);
  root.classList.add('images-error');
});
