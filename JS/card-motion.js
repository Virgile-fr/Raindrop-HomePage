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
    for (const name of ["transform", "--float-light-x", "--float-light-y", "--float-light", "--float-shadow-x", "--float-shadow-y", "--float-shadow-alpha", "--float-icon-x", "--float-icon-y", "--float-depth", "--float-sheen-angle", "--float-sheen-x", "--float-sheen-y", "--float-rim-angle", "--float-icon-scale", "--float-icon-shadow-x", "--float-icon-shadow-y"]) {
      state.card.style.removeProperty(name);
    }
    moving.delete(state);
    if (active === state) active = null;
  }

  // Exact critically damped spring: frame-rate independent, with no oscillation
  // at rest. Velocity survives target changes instead of restarting a transition.
  function spring(state, key, target, frequency, dt) {
    const velocity = `${key}Velocity`;
    const offset = state[key] - target;
    const impulse = (state[velocity] || 0) + frequency * offset;
    const decay = Math.exp(-frequency * dt);
    state[key] = target + (offset + impulse * dt) * decay;
    state[velocity] = ((state[velocity] || 0) - frequency * impulse * dt) * decay;
  }

  function animate(time) {
    const dt = (previousTime ? Math.min(time - previousTime, 40) : 16) / 1000;
    previousTime = time;
    let unsettled = false;
    for (const state of moving) {
      if (!state.anchor.isConnected || state.anchor.hidden) {
        clear(state);
        continue;
      }
      const engaged = state === active;
      const targetX = engaged ? state.targetX : 0;
      const targetY = engaged ? state.targetY : 0;
      const targetDepth = engaged ? (state.pressed ? 0.58 : 1) : 0;
      if (engaged) {
        spring(state, "x", targetX, 28, dt);
        spring(state, "y", targetY, 28, dt);
        spring(state, "depth", targetDepth, 28, dt);
        const lightEase = 1 - Math.exp(-dt / 0.045);
        state.lightX += (targetX - state.lightX) * lightEase;
        state.lightY += (targetY - state.lightY) * lightEase;
      } else {
        // A finite exit avoids a spring tail keeping hover styles alive.
        const progress = Math.min(1, (time - state.exit.time) / 220);
        if (progress === 1) { clear(state); continue; }
        const remaining = (1 - progress) ** 3;
        for (const key of ["x", "y", "depth", "lightX", "lightY"]) state[key] = state.exit[key] * remaining;
        state.xVelocity = state.yVelocity = state.depthVelocity = 0;
      }
      const error = Math.abs(targetX - state.x) + Math.abs(targetY - state.y) +
        Math.abs(targetDepth - state.depth) + Math.abs(targetX - state.lightX) + Math.abs(targetY - state.lightY);
      const speed = Math.abs(state.xVelocity) + Math.abs(state.yVelocity) + Math.abs(state.depthVelocity);
      if (!engaged && error < 0.001 && speed < 0.01) {
        clear(state);
        continue;
      }
      unsettled ||= error > 0.001 || speed > 0.01;
      const { x, y, depth, card, lightX, lightY } = state;
      const edge = Math.min(1, Math.hypot(x, y) / Math.SQRT2);
      const strength = state.touch ? 0.8 : 1;
      card.style.transform = `perspective(900px) translate3d(${x * depth * 0.7}px, ${-5.5 * depth}px, 0) rotateX(${-y * 7 * strength}deg) rotateY(${x * 8 * strength}deg) scale(${1 + depth * 0.016})`;
      card.style.setProperty("--float-depth", depth);
      card.style.setProperty("--float-light-x", `${50 + lightX * 42}%`);
      card.style.setProperty("--float-light-y", `${42 + lightY * 40}%`);
      card.style.setProperty("--float-light", depth * (0.18 + edge * 0.09));
      card.style.setProperty("--float-sheen-angle", `${118 + lightX * 18 - lightY * 12}deg`);
      card.style.setProperty("--float-sheen-x", `${50 + lightX * 32}%`);
      card.style.setProperty("--float-sheen-y", `${50 + lightY * 28}%`);
      card.style.setProperty("--float-rim-angle", `${Math.atan2(lightX, -lightY - 0.45) * 180 / Math.PI}deg`);
      card.style.setProperty("--float-shadow-x", `${-x * 10}px`);
      card.style.setProperty("--float-shadow-y", `${6 + depth * 16 - y * 5}px`);
      card.style.setProperty("--float-shadow-alpha", depth * 0.21);
      card.style.setProperty("--float-icon-x", `${x * 4}px`);
      card.style.setProperty("--float-icon-y", `${y * 4 - depth * 2}px`);
      card.style.setProperty("--float-icon-scale", 1 + depth * 0.035);
      card.style.setProperty("--float-icon-shadow-x", `${-x * 3}px`);
      card.style.setProperty("--float-icon-shadow-y", `${3 + depth * 5 - y * 2}px`);
    }
    // No animation loop when settled; only moving cards receive style writes.
    frame = unsettled ? requestAnimationFrame(animate) : 0;
    if (!frame) previousTime = 0;
  }

  function wake() {
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function release() {
    if (!active) return;
    active.exit = { time: performance.now(), x: active.x, y: active.y, depth: active.depth, lightX: active.lightX, lightY: active.lightY };
    active = null;
    wake();
  }

  function position(event) {
    if (!active && event.type === "pointermove" && event.pointerType === "mouse" && event.buttons === 0) engage(event);
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
    if (!anchor || anchor.hidden || anchor.classList.contains("preview-pending") || anchor.classList.contains("card-entering")) return;
    if (active?.anchor === anchor) {
      if (event.type === "pointerdown") { active.pressed = true; wake(); }
      return;
    }
    release();
    const card = anchor.querySelector(".card");
    if (!card) return;
    active = [...moving].find(state => state.anchor === anchor) ||
      { anchor, card, x: 0, y: 0, depth: 0, lightX: 0, lightY: 0, targetX: 0, targetY: 0 };
    active.exit = null;
    active.pointerId = event.pointerId;
    active.touch = event.pointerType === "touch";
    active.pressed = event.type === "pointerdown" && !active.touch;
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
    if (event.pointerId !== active?.pointerId) return;
    if (event.pointerType !== "mouse") release();
    else { active.pressed = false; wake(); }
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
