const IMAGE_PARTS = { 'work-01': 4, 'work-02': 3, 'work-03': 3, 'a110-front': 8 };

async function loadImageData(key) {
  const count = IMAGE_PARTS[key];
  if (!count) throw new Error(`Unknown image key: ${key}`);
  const parts = await Promise.all(Array.from({ length: count }, (_, index) =>
    fetch(`./assets/${key}-${String(index + 1).padStart(2, '0')}.b64`).then(response => {
      if (!response.ok) throw new Error(`Unable to load ${key} part ${index + 1}`);
      return response.text();
    })
  ));
  return `data:image/webp;base64,${parts.join('')}`;
}

async function hydrateImages() {
  const images = [...document.querySelectorAll('[data-image]')];
  const keys = [...new Set(images.map(img => img.dataset.image))];
  const data = new Map(await Promise.all(keys.map(async key => [key, await loadImageData(key)])));
  images.forEach(img => { img.src = data.get(img.dataset.image); });
  await Promise.all(images.map(img => img.complete ? Promise.resolve() : img.decode().catch(() => {})));
  document.documentElement.classList.add('images-ready');
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.getElementById('year').textContent = new Date().getFullYear();

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    if (entry.target.classList.contains('detail-focus')) entry.target.classList.add('is-focus');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: .14, rootMargin: '0px 0px -5% 0px' });
document.querySelectorAll('.reveal').forEach(node => revealObserver.observe(node));

const header = document.querySelector('.site-header');
const hero = document.querySelector('.hero-image');
let scrollTick = false;
function renderPageScroll() {
  const y = scrollY;
  header.classList.toggle('scrolled', y > 30);
  if (!reducedMotion && hero) {
    const p = Math.max(0, Math.min(1, y / innerHeight));
    hero.style.transform = `translate3d(0,${p * 3.5}%,0) scale(${1.02 + p * .05})`;
  }
  scrollTick = false;
}
addEventListener('scroll', () => { if (!scrollTick) { scrollTick = true; requestAnimationFrame(renderPageScroll); } }, { passive: true });
renderPageScroll();

async function mountWebGL() {
  if (reducedMotion) return;
  const section = document.querySelector('.a110-deconstruct');
  const sourceImage = document.getElementById('a110-source');
  const host = section?.querySelector('.a110-webgl-host');
  if (!section || !sourceImage || !host) return;

  const init = async () => {
    try {
      if (!window.gsap || !window.ScrollTrigger) throw new Error('GSAP/ScrollTrigger unavailable');
      const [{ createA110Scene }, { mountA110ScrollScene }] = await Promise.all([
        import('./webgl-scene.mjs'), import('./scroll-scene.mjs')
      ]);
      const scene = createA110Scene({ host, sourceImage });
      section.classList.add('webgl-ready');
      const cleanupScroll = mountA110ScrollScene({ section, scene });
      const finePointer = matchMedia('(pointer:fine)').matches;
      if (finePointer) {
        section.addEventListener('pointermove', event => {
          const r = section.getBoundingClientRect();
          const nx = ((event.clientX - r.left) / r.width) * 2 - 1;
          const ny = -(((event.clientY - r.top) / Math.max(1, r.height)) * 2 - 1);
          scene.setPointer(nx, ny);
        }, { passive: true });
      }
      addEventListener('resize', scene.resize, { passive: true });
      addEventListener('pagehide', () => { cleanupScroll(); scene.dispose(); }, { once: true });
    } catch (error) {
      console.error('A110 WebGL fallback:', error);
      section.classList.add('webgl-fallback');
    }
  };

  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); init(); }
  }, { rootMargin: '80% 0px 80% 0px' });
  observer.observe(section);
}

hydrateImages().then(mountWebGL).catch(error => {
  console.error(error);
  document.documentElement.classList.add('images-error');
});
