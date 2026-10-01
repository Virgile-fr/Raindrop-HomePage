"use strict";

(() => {
  const grid = document.getElementById("grid");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const moving = new Set();
  let active = null;
  let frame = 0;
  let previousTime = 0;
  let touchTap = null;
  let navigationPending = false;
  let navigationTimer = 0;
  const clamp = value => Math.max(-1, Math.min(1, value));

  function clear(state) {
    state.anchor.classList.remove("card-floating");
    state.card.classList.remove("is-floating");
    for (const name of ["transform", "--float-light-x", "--float-light-y", "--float-light", "--float-shadow-x", "--float-shadow-y", "--float-shadow-alpha", "--float-icon-x", "--float-icon-y", "--float-depth", "--float-sheen-angle", "--float-sheen-x", "--float-sheen-y", "--float-rim-angle", "--float-icon-scale", "--float-icon-shadow-x", "--float-icon-shadow-y", "--float-shadow-blur", "--float-icon-rotate", "--float-icon-shadow-blur", "--float-holo-x", "--float-holo-y", "--float-holo-alpha", "--float-icon-tilt-x", "--float-icon-tilt-y"]) {
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
        // The raised glass follows a slightly softer spring than the card.
        spring(state, "iconX", targetX, 22, dt);
        spring(state, "iconY", targetY, 22, dt);
        spring(state, "iconDepth", targetDepth, 24, dt);
        const lightEase = 1 - Math.exp(-dt / 0.045);
        state.lightX += (targetX - state.lightX) * lightEase;
        state.lightY += (targetY - state.lightY) * lightEase;
      } else {
        // A finite exit avoids a spring tail keeping hover styles alive.
        const progress = Math.min(1, (time - state.exit.time) / 220);
        if (progress === 1) { clear(state); continue; }
        const remaining = (1 - progress) ** 3;
        for (const key of ["x", "y", "depth", "lightX", "lightY", "iconX", "iconY", "iconDepth"]) state[key] = state.exit[key] * remaining;
        state.xVelocity = state.yVelocity = state.depthVelocity = 0;
        state.iconXVelocity = state.iconYVelocity = state.iconDepthVelocity = 0;
      }
      const error = Math.abs(targetX - state.x) + Math.abs(targetY - state.y) +
        Math.abs(targetDepth - state.depth) + Math.abs(targetX - state.iconX) + Math.abs(targetY - state.iconY) + Math.abs(targetDepth - state.iconDepth) + Math.abs(targetX - state.lightX) + Math.abs(targetY - state.lightY);
      const speed = Math.abs(state.xVelocity) + Math.abs(state.yVelocity) + Math.abs(state.depthVelocity) + Math.abs(state.iconXVelocity) + Math.abs(state.iconYVelocity) + Math.abs(state.iconDepthVelocity);
      if (!engaged && error < 0.001 && speed < 0.01) {
        clear(state);
        continue;
      }
      unsettled ||= error > 0.001 || speed > 0.01;
      const { x, y, depth, card, lightX, lightY, iconX, iconY, iconDepth } = state;
      const edge = Math.min(1, Math.hypot(x, y) / Math.SQRT2);
      const strength = state.touch ? 0.8 : 1;
      card.style.transform = `perspective(900px) translate3d(${x * depth * 0.7}px, ${-8 * depth}px, 0) rotateX(${-y * 9 * strength}deg) rotateY(${x * 11 * strength}deg) scale(${1 + depth * 0.016})`;
      card.style.setProperty("--float-depth", depth);
      // Foil travels against the glare, like a second reflective material.
      card.style.setProperty("--float-holo-x", `${50 - lightX * 34}%`);
      card.style.setProperty("--float-holo-y", `${50 - lightY * 30}%`);
      card.style.setProperty("--float-holo-alpha", depth * (0.30 + edge * 0.22) * strength);
      card.style.setProperty("--float-icon-tilt-x", `${-iconY * iconDepth * 7 * strength}deg`);
      card.style.setProperty("--float-icon-tilt-y", `${iconX * iconDepth * 9 * strength}deg`);
      card.style.setProperty("--float-light-x", `${50 + lightX * 42}%`);
      card.style.setProperty("--float-light-y", `${42 + lightY * 40}%`);
      card.style.setProperty("--float-light", depth * (0.23 + edge * 0.08));
      card.style.setProperty("--float-sheen-angle", `${118 + lightX * 18 - lightY * 12}deg`);
      card.style.setProperty("--float-sheen-x", `${50 + lightX * 32}%`);
      card.style.setProperty("--float-sheen-y", `${50 + lightY * 28}%`);
      card.style.setProperty("--float-rim-angle", `${Math.atan2(lightX, -lightY - 0.45) * 180 / Math.PI}deg`);
      card.style.setProperty("--float-shadow-x", `${-lightX * depth * 13}px`);
      card.style.setProperty("--float-shadow-y", `${4 + depth * 20 - lightY * depth * 7}px`);
      card.style.setProperty("--float-shadow-alpha", depth * (0.19 + edge * 0.035));
      card.style.setProperty("--float-shadow-blur", `${12 + depth * 24 + edge * depth * 6}px`);
      card.style.setProperty("--float-icon-x", `${iconX * 5.5 * strength}px`);
      card.style.setProperty("--float-icon-y", `${iconY * 5 * strength - iconDepth * 3}px`);
      card.style.setProperty("--float-icon-rotate", `${iconX * iconDepth * 1.4 * strength}deg`);
      card.style.setProperty("--float-icon-shadow-blur", `${8 + iconDepth * 12}px`);
      card.style.setProperty("--float-icon-scale", 1 + iconDepth * 0.11 * strength);
      card.style.setProperty("--float-icon-shadow-x", `${-lightX * iconDepth * 5}px`);
      card.style.setProperty("--float-icon-shadow-y", `${2 + iconDepth * 9 - lightY * iconDepth * 3}px`);
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
    active.exit = { time: performance.now(), x: active.x, y: active.y, depth: active.depth, lightX: active.lightX, lightY: active.lightY, iconX: active.iconX, iconY: active.iconY, iconDepth: active.iconDepth };
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
      if (event.type === "pointerdown") { active.pressed = !active.touch; wake(); }
      return;
    }
    release();
    const card = anchor.querySelector(".card");
    if (!card) return;
    active = [...moving].find(state => state.anchor === anchor) ||
      { anchor, card, x: 0, y: 0, depth: 0, lightX: 0, lightY: 0, iconX: 0, iconY: 0, iconDepth: 0, targetX: 0, targetY: 0 };
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

  // Brief same-tab tap feedback on phones, preserving native long-press menus
  // and all mouse, keyboard, modifier-key and scrolling interactions.
  grid.addEventListener("pointerdown", event => {
    touchTap = event.pointerType === "touch" && event.isPrimary
      ? { anchor: event.target.closest("#grid > a[data-link]"), x: event.clientX, y: event.clientY, time: performance.now(), id: event.pointerId }
      : null;
  }, { passive: true });
  document.addEventListener("pointermove", event => {
    if (touchTap && event.pointerId === touchTap.id && Math.hypot(event.clientX - touchTap.x, event.clientY - touchTap.y) > 10) touchTap = null;
  }, { passive: true });
  document.addEventListener("pointercancel", () => { touchTap = null; }, { passive: true });
  document.addEventListener("scroll", () => { touchTap = null; }, { passive: true, capture: true });
  grid.addEventListener("click", event => {
    const tap = touchTap;
    touchTap = null;
    if (!tap?.anchor || event.defaultPrevented || !event.isTrusted || event.detail === 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
        performance.now() - tap.time > 500 || !tap.anchor.contains(event.target)) return;
    event.preventDefault();
    if (navigationPending) return;
    navigationPending = true;
    const immediate = reducedMotion.matches || tap.anchor.classList.contains("preview-pending") || tap.anchor.classList.contains("card-entering");
    const navigate = () => {
      navigationPending = false;
      if (tap.anchor.isConnected) window.location.assign(tap.anchor.href);
    };
    if (immediate) navigate();
    else navigationTimer = setTimeout(navigate, 140);
  });
  window.addEventListener("pageshow", () => { navigationPending = false; touchTap = null; });
  window.addEventListener("pagehide", () => { clearTimeout(navigationTimer); navigationPending = false; touchTap = null; reset(); });
  document.addEventListener("contextmenu", () => { touchTap = null; });

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
