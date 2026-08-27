const root = document.documentElement;
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

let galleryUrl = null;

async function loadGallery() {
  const response = await fetch('/carluxiii/assets/gallery-atlas.b64', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Gallery asset failed: ${response.status}`);

  const base64 = (await response.text()).replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const blob = new Blob([bytes], { type: 'image/webp' });
  galleryUrl = URL.createObjectURL(blob);

  await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error('Decoded gallery image could not be rendered'));
    image.src = galleryUrl;
  });

  root.style.setProperty('--atlas', `url("${galleryUrl}")`);
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
  }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
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

loadGallery().catch(error => {
  console.error(error);
  root.classList.add('images-error');
});

addEventListener('beforeunload', () => {
  if (galleryUrl) URL.revokeObjectURL(galleryUrl);
});
