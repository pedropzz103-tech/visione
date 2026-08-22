const root = document.documentElement;
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

async function loadGallery() {
  const response = await fetch('./assets/gallery-atlas.b64', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Gallery asset failed: ${response.status}`);
  const encoded = (await response.text()).trim();
  root.style.setProperty('--gallery-atlas', `url("data:image/webp;base64,${encoded}")`);
  root.classList.add('images-ready');
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');
if (reducedMotion || !('IntersectionObserver' in window)) {
  reveals.forEach(node => node.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
  reveals.forEach(node => observer.observe(node));
}

const header = document.querySelector('.site-header');
let ticking = false;
function updateHeader() {
  header?.classList.toggle('scrolled', scrollY > 28);
  ticking = false;
}
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateHeader);
}, { passive: true });
updateHeader();

loadGallery().catch(error => {
  console.error(error);
  root.classList.add('images-error');
});
