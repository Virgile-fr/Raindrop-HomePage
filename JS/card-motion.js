"use strict";

(() => {
  const grid = document.getElementById("grid");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const moving = new Set();
  let active = null;
  let frame = 0;
  let previousTime = 0;
  const clamp = value => Math.max(-1, Math.min(1, value));

  function clear(state) {
    state.anchor.classList.remove("card-floating");
    state.card.classList.remove("is-floating");
    for (const name of ["transform", "--float-light-x", "--float-light-y", "--float-light", "--float-shadow-x", "--float-shadow-y", "--float-shadow-alpha", "--float-icon-x", "--float-icon-y"]) {
      state.card.style.removeProperty(name);
    }
    moving.delete(state);
    if (active === state) active = null;
  }

  function animate(time) {
    const delta = previousTime ? Math.min(time - previousTime, 40) : 16;
    previousTime = time;
    for (const state of moving) {
      if (!state.anchor.isConnected || state.anchor.hidden) {
        clear(state);
        continue;
      }
      const engaged = state === active;
      const ease = 1 - Math.exp(-delta / (engaged ? 85 : 125));
      state.x += ((engaged ? state.targetX : 0) - state.x) * ease;
      state.y += ((engaged ? state.targetY : 0) - state.y) * ease;
      state.depth += ((engaged ? 1 : 0) - state.depth) * ease;
      if (!engaged && state.depth < 0.002) {
        clear(state);
        continue;
      }
      const { x, y, depth, card } = state;
      card.style.transform = `perspective(850px) translateY(${-4 * depth}px) rotateX(${-y * 5}deg) rotateY(${x * 6}deg) scale(${1 + depth * 0.012})`;
      card.style.setProperty("--float-light-x", `${50 + x * 40}%`);
      card.style.setProperty("--float-light-y", `${40 + y * 40}%`);
      card.style.setProperty("--float-light", depth * 0.24);
      card.style.setProperty("--float-shadow-x", `${-x * 7}px`);
      card.style.setProperty("--float-shadow-y", `${8 + depth * 10 - y * 4}px`);
      card.style.setProperty("--float-shadow-alpha", depth * 0.17);
      card.style.setProperty("--float-icon-x", `${x * 2.5}px`);
      card.style.setProperty("--float-icon-y", `${y * 2.5 - depth * 1.5}px`);
    }
    // Stay asleep once the pointer and the cards have settled.
    const unsettled = [...moving].some(state => state !== active ||
      Math.abs(state.targetX - state.x) + Math.abs(state.targetY - state.y) + Math.abs(1 - state.depth) > 0.001);
    frame = unsettled ? requestAnimationFrame(animate) : 0;
    if (!frame) previousTime = 0;
  }

  function wake() {
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function release() {
    if (!active) return;
    active = null;
    wake();
  }

  function position(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    const rect = active.rect;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return release();
    active.targetX = clamp(x * 2 - 1);
    active.targetY = clamp(y * 2 - 1);
    wake();
  }

  function engage(event) {
    if (reducedMotion.matches || !event.isPrimary || (event.type === "pointerdown" && event.button !== 0)) return;
    if (event.type === "pointerover" && event.pointerType !== "mouse") return;
    const anchor = event.target.closest("#grid > a[data-link]");
    if (!anchor || anchor.hidden || active?.anchor === anchor) return;
    release();
    const card = anchor.querySelector(".card");
    if (!card) return;
    active = [...moving].find(state => state.anchor === anchor) ||
      { anchor, card, x: 0, y: 0, depth: 0, targetX: 0, targetY: 0 };
    active.pointerId = event.pointerId;
    // Measure the untransformed link, so tilting never feeds back into hit geometry.
    active.rect = anchor.getBoundingClientRect();
    moving.add(active);
    anchor.classList.add("card-floating");
    card.classList.add("is-floating");
    position(event);
  }

  grid.addEventListener("pointerover", engage, { passive: true });
  grid.addEventListener("pointerdown", engage, { passive: true });
  document.addEventListener("pointermove", position, { passive: true });
  grid.addEventListener("pointerout", event => {
    if (active && event.pointerId === active.pointerId && !active.anchor.contains(event.relatedTarget)) release();
  }, { passive: true });
  document.addEventListener("pointerup", event => {
    if (event.pointerType !== "mouse" && event.pointerId === active?.pointerId) release();
  }, { passive: true });
  document.addEventListener("pointercancel", release, { passive: true });
  document.addEventListener("scroll", release, { passive: true, capture: true });
  window.addEventListener("resize", release, { passive: true });
  window.addEventListener("blur", release);
  document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); });
  // Rendering and search filtering may remove or hide a settled card.
  new MutationObserver(() => {
    for (const state of moving) if (!state.anchor.isConnected || state.anchor.hidden) clear(state);
  }).observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    for (const state of moving) clear(state);
  }
  reducedMotion.addEventListener("change", reset);
})();
