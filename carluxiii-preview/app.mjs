import { clamp01, sectionProgress, sliceTransform } from './motion.mjs';

const IMAGE_PARTS = { 'work-01': 4, 'work-02': 3, 'work-03': 3 };

async function loadImageData(key) {
  const count = IMAGE_PARTS[key];
  const parts = await Promise.all(Array.from({ length: count }, (_, index) =>
    fetch(`./assets/${key}-${String(index + 1).padStart(2, '0')}.b64`).then((response) => {
      if (!response.ok) throw new Error(`Unable to load ${key} part ${index + 1}`);
      return response.text();
    })
  ));
  return `data:image/webp;base64,${parts.join('')}`;
}

async function hydrateImages() {
  const keys = [...new Set([...document.querySelectorAll('[data-image]')].map((img) => img.dataset.image))];
  await Promise.all(keys.map(async (key) => {
    const src = await loadImageData(key);
    document.querySelectorAll(`[data-image="${key}"]`).forEach((img) => { img.src = src; });
  }));
  document.documentElement.classList.add('images-ready');
}

hydrateImages().catch((error) => {
  console.error(error);
  document.documentElement.classList.add('images-error');
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const heroImage = document.querySelector('.hero-photo img');
const glow = document.querySelector('.cursor-glow');
const deconstruct = document.querySelector('.deconstruct');
const slices = [...document.querySelectorAll('[data-slice]')];
const progressBar = document.querySelector('.progress-track span');
const callouts = [...document.querySelectorAll('.callout')];
const year = document.getElementById('year');

year.textContent = new Date().getFullYear();

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }
}, { threshold: 0.13, rootMargin: '0px 0px -6% 0px' });

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${Math.min(i % 3, 2) * 70}ms`;
  revealObserver.observe(el);
});

let ticking = false;
function renderScroll() {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 34);

  if (!reducedMotion && heroImage) {
    const heroProgress = clamp01(y / Math.max(1, window.innerHeight));
    heroImage.style.transform = `translate3d(0, ${heroProgress * 5.5}%, 0) scale(${1.035 + heroProgress * .055})`;
  }

  if (deconstruct && !reducedMotion) {
    const rect = deconstruct.getBoundingClientRect();
    const raw = sectionProgress(rect.top, rect.height, window.innerHeight);
    const p = clamp01((raw - .06) / .82);
    progressBar.style.transform = `scaleX(${p})`;

    slices.forEach((slice, index) => {
      const t = sliceTransform(index, p, slices.length);
      slice.style.transform = `translate3d(${t.x}px, ${t.y}px, ${t.z}px) rotateY(${t.rotateY}deg) rotateZ(${t.rotateZ}deg)`;
    });

    const calloutOpacity = clamp01((p - .58) / .22);
    callouts.forEach((node, index) => {
      const stagger = clamp01(calloutOpacity - index * .16);
      node.style.opacity = stagger;
      node.style.transform = `translateY(${(1 - stagger) * 8}px)`;
    });
  }

  ticking = false;
}

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(renderScroll);
    ticking = true;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
renderScroll();

if (!reducedMotion && window.matchMedia('(pointer:fine)').matches) {
  window.addEventListener('pointermove', (event) => {
    glow.style.opacity = '1';
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }, { passive: true });

  document.querySelectorAll('.tilt-card').forEach((card) => {
    const figure = card.querySelector('figure');
    card.addEventListener('pointermove', (event) => {
      const r = card.getBoundingClientRect();
      const px = (event.clientX - r.left) / r.width - .5;
      const py = (event.clientY - r.top) / r.height - .5;
      figure.style.transform = `rotateX(${-py * 3.8}deg) rotateY(${px * 5.2}deg) translateZ(0)`;
    });
    card.addEventListener('pointerleave', () => { figure.style.transform = ''; });
  });
}
