import assert from "node:assert/strict";
import test from "node:test";

function makeControl() {
  const listeners = new Map();
  return {
    disabled: false,
    dataset: { openLabel: "Open", closeLabel: "Close" },
    textContent: "Open",
    listeners,
    addEventListener(type, handler) { listeners.set(type, handler); },
    setAttribute() {}
  };
}

test("a normal click on a catalog card does not capture the pointer as a drag", async () => {
  const listeners = new Map();
  let capturedPointer = null;
  const classList = {
    contains() { return false; },
    add() {},
    remove() {},
    toggle() { return false; }
  };
  const rail = {
    scrollLeft: 0,
    scrollWidth: 1200,
    clientWidth: 600,
    classList,
    addEventListener(type, handler) { listeners.set(type, handler); },
    setPointerCapture(pointerId) { capturedPointer = pointerId; },
    hasPointerCapture(pointerId) { return capturedPointer === pointerId; },
    releasePointerCapture(pointerId) { if (capturedPointer === pointerId) capturedPointer = null; },
    scrollTo() {}
  };
  const previous = makeControl();
  const next = makeControl();
  const view = makeControl();
  const section = {
    classList,
    querySelector(selector) {
      if (selector === "[data-catalog-rail]") return rail;
      if (selector === "[data-rail-prev]") return previous;
      if (selector === "[data-rail-next]") return next;
      if (selector === "[data-rail-view]") return view;
      return null;
    }
  };

  const previousDocument = globalThis.document;
  const previousResizeObserver = globalThis.ResizeObserver;
  const previousAddEventListener = globalThis.addEventListener;
  globalThis.document = { querySelectorAll() { return [section]; } };
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.addEventListener = () => {};

  try {
    await import(`../assets/catalog-rails.mjs?card-click-regression=${Date.now()}`);
    const pointerDown = listeners.get("pointerdown");
    assert.equal(typeof pointerDown, "function");
    pointerDown({ button: 0, clientX: 100, pointerId: 7 });
    assert.equal(capturedPointer, null, "a tap/click should remain an ordinary link click until a real horizontal drag begins");
  } finally {
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
    if (previousResizeObserver === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = previousResizeObserver;
    if (previousAddEventListener === undefined) delete globalThis.addEventListener; else globalThis.addEventListener = previousAddEventListener;
  }
});
