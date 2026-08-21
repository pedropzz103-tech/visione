import { clamp01 } from './scene-model.mjs';

export function mountA110ScrollScene({ section, scene }) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!section || !scene || !gsap || !ScrollTrigger) throw new Error('Scroll scene dependencies unavailable');
  gsap.registerPlugin(ScrollTrigger);

  const stage = section.querySelector('.a110-stage');
  const shade = section.querySelector('.a110-shade');
  const progressLine = section.querySelector('.scene-progress span');
  const copy = section.querySelector('.a110-copy');
  const callouts = [...section.querySelectorAll('.semantic-callout')];

  const map = (value, start, end) => clamp01((value - start) / (end - start));

  const trigger = ScrollTrigger.create({
    trigger: section,
    pin: stage,
    start: 'top top',
    end: () => `+=${Math.round(window.innerHeight * 2.2)}`,
    scrub: .8,
    invalidateOnRefresh: true,
    onUpdate(self) {
      const p = self.progress;
      const approach = map(p, 0, .18);
      const separation = map(p, .12, .66);
      const labels = map(p, .58, .82);
      scene.setProgress(separation);
      if (progressLine) progressLine.style.transform = `scaleX(${p})`;
      if (shade) shade.style.opacity = String(.18 + approach * .28 + separation * .12);
      if (copy) copy.style.transform = `translate3d(0, ${-approach * 18}px, 0)`;
      callouts.forEach((node, index) => {
        const local = clamp01(labels * 1.35 - index * .12);
        node.style.opacity = String(local);
        node.style.transform = `translate3d(0, ${(1 - local) * 12}px, 0)`;
      });
    }
  });

  return () => trigger.kill(true);
}
