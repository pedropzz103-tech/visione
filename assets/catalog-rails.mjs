export function getRailPageDistance(clientWidth) {
  return Math.max(240, Math.round(Number(clientWidth || 0) * .84));
}

export function getRailTarget({ scrollLeft = 0, clientWidth = 0, scrollWidth = 0 }, direction) {
  const maximum = Math.max(0, scrollWidth - clientWidth);
  const target = scrollLeft + getRailPageDistance(clientWidth) * Math.sign(direction || 0);
  return Math.min(maximum, Math.max(0, target));
}

function updateRailControls(section) {
  const rail = section.querySelector("[data-catalog-rail]");
  const previous = section.querySelector("[data-rail-prev]");
  const next = section.querySelector("[data-rail-next]");
  if (!rail || !previous || !next) return;

  const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth);
  const expanded = section.classList.contains("is-grid");
  previous.disabled = expanded || rail.scrollLeft <= 2;
  next.disabled = expanded || rail.scrollLeft >= maximum - 2;
}

function scrollRail(section, direction) {
  const rail = section.querySelector("[data-catalog-rail]");
  if (!rail) return;
  rail.scrollTo({
    left: getRailTarget(rail, direction),
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  });
}

function initializeRail(section) {
  const rail = section.querySelector("[data-catalog-rail]");
  const previous = section.querySelector("[data-rail-prev]");
  const next = section.querySelector("[data-rail-next]");
  const view = section.querySelector("[data-rail-view]");
  if (!rail || !previous || !next || !view) return;

  previous.addEventListener("click", () => scrollRail(section, -1));
  next.addEventListener("click", () => scrollRail(section, 1));
  rail.addEventListener("scroll", () => updateRailControls(section), { passive: true });

  view.addEventListener("click", () => {
    const expanded = section.classList.toggle("is-grid");
    view.setAttribute("aria-expanded", String(expanded));
    view.textContent = expanded ? view.dataset.closeLabel : view.dataset.openLabel;
    updateRailControls(section);
  });

  rail.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    scrollRail(section, event.key === "ArrowRight" ? 1 : -1);
  });

  rail.addEventListener("wheel", (event) => {
    if (section.classList.contains("is-grid") || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const canMove = event.deltaY > 0 ? rail.scrollLeft < maximum - 2 : rail.scrollLeft > 2;
    if (!canMove) return;
    event.preventDefault();
    rail.scrollLeft += event.deltaY;
  }, { passive: false });

  let dragStart = null;
  let dragged = false;
  rail.addEventListener("pointerdown", (event) => {
    if (section.classList.contains("is-grid") || event.button !== 0) return;
    dragStart = { x: event.clientX, scrollLeft: rail.scrollLeft };
    dragged = false;
    rail.classList.add("is-dragging");
    rail.setPointerCapture(event.pointerId);
  });
  rail.addEventListener("pointermove", (event) => {
    if (!dragStart) return;
    const distance = event.clientX - dragStart.x;
    if (Math.abs(distance) > 5) dragged = true;
    rail.scrollLeft = dragStart.scrollLeft - distance;
  });
  const endDrag = (event) => {
    if (!dragStart) return;
    dragStart = null;
    rail.classList.remove("is-dragging");
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
  };
  rail.addEventListener("pointerup", endDrag);
  rail.addEventListener("pointercancel", endDrag);
  rail.addEventListener("click", (event) => {
    if (!dragged) return;
    event.preventDefault();
    event.stopPropagation();
    dragged = false;
  }, true);

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => updateRailControls(section));
    observer.observe(rail);
  } else {
    addEventListener("resize", () => updateRailControls(section));
  }
  updateRailControls(section);
}

if (typeof document !== "undefined") {
  document.querySelectorAll("[data-catalog-section]").forEach(initializeRail);
}
