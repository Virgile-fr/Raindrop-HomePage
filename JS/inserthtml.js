"use strict";

const grid = document.getElementById("grid");
const statusMessage = document.getElementById("status-message");
const retryButton = document.getElementById("retry");

function safeWebUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function setStatus(message, retry = false) {
  statusMessage.textContent = message;
  retryButton.hidden = !retry;
}

const previewStates = new WeakMap();
const entranceMotion = matchMedia("(prefers-reduced-motion: reduce)");
let previewGeneration = 0;


async function revealPreviews(anchors, generation) {
  // A slow provider must not hold already decoded neighbors behind a batch gate.
  await Promise.all(anchors.map((anchor, index) => revealPreview(anchor, generation, Math.min(index * 35, 350))));
}

async function revealPreview(anchor, generation, entranceDelay) {
  const state = previewStates.get(anchor);
  let timer;
  const ready = await Promise.race([
    state.ready.then(() => true),
    new Promise(resolve => { timer = setTimeout(() => resolve(false), state.fallbackDelay); }),
  ]);
  clearTimeout(timer);
  if (!anchor.isConnected || generation !== previewGeneration) return;
  if (!ready) state.fallback();
  anchor.classList.remove("preview-pending");
  anchor.removeAttribute("aria-busy");
  if (anchor.hidden || document.activeElement === anchor || entranceMotion.matches || !anchor.animate) return;
  anchor.classList.add("card-entering");
  const animation = anchor.animate([
    { opacity: 0, transform: "perspective(900px) translate3d(0, -18px, 0) rotateX(9deg) scale(.965)" },
    { opacity: 1, transform: "perspective(900px) translate3d(0, 0, 0) rotateX(0deg) scale(1)" },
  ], { duration: 420, delay: entranceDelay, easing: "cubic-bezier(.2,.75,.25,1)", fill: "backwards" });
  state.animation = animation;
  const stop = () => animation.cancel();
  const reduce = () => { if (entranceMotion.matches) stop(); };
  anchor.addEventListener("focus", stop, { once: true });
  entranceMotion.addEventListener("change", reduce);
  animation.finished.catch(() => {}).finally(() => {
    anchor.classList.remove("card-entering");
    anchor.removeEventListener("focus", stop);
    entranceMotion.removeEventListener("change", reduce);
    state.animation = null;
  });
}

const previewObserver = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
  const order = new Map([...grid.children].map((anchor, index) => [anchor, index]));
  const anchors = entries.filter(entry => entry.isIntersecting).map(entry => entry.target)
    .sort((a, b) => order.get(a) - order.get(b));
  if (!anchors.length) return;
  anchors.forEach(anchor => previewObserver.unobserve(anchor));
  const generation = previewGeneration;
  revealPreviews(anchors, generation);
}, { rootMargin: "80px" }) : null;

function createCard(item, coverView) {
  const url = safeWebUrl(item.link);
  if (!url) return null;
  const title = typeof item.title === "string" && item.title.trim() ? item.title : new URL(url).hostname;
  const anchor = document.createElement("a");
  anchor.className = "preview-pending";
  anchor.setAttribute("aria-busy", "true");
  anchor.href = url;
  anchor.dataset.link = item.link;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.setAttribute("aria-label", title);
  const card = document.createElement("div");
  card.className = `card ${coverView ? "cover-cards" : "icon-cards"}`;
  const frame = document.createElement("div");
  frame.className = coverView ? "image" : "filter";
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  let coverReady = false;
  const initialHost = document.createElement("span");
  initialHost.className = "icon";
  if (coverView) initialHost.append(createInitialIcon(url, title));
  const fallback = () => {
    if (coverReady) return;
    frame.classList.add("preview-initials");
    frame.replaceChildren(initialHost);
    applyFilterBackground(frame, initialIconData(url, title).color);
    resolveReady();
  };
  previewStates.set(anchor, { ready, fallback, fallbackDelay: coverView ? 2500 : 0 });
  if (coverView) {
    const cover = safeWebUrl(item.cover);
    if (cover) {
      whenNearViewport(frame, async () => {
        const image = await readIconImage(cover, false, 15000);
        if (!anchor.isConnected) return;
        if (!image) { fallback(); return; }
        coverReady = true;
        image.alt = "";
        frame.classList.remove("preview-initials");
        frame.style.removeProperty("background");
        backgroundSources.delete(frame);
        frame.replaceChildren(image);
        resolveReady();
      });
    } else fallback();
  } else {
    frame.append(initialHost);
    // HTML initials are ready synchronously. Remote icons upgrade this same
    // surface only after decoding and color extraction, without a second reveal.
    loadFavicon(initialHost, url, title);
    resolveReady();
  }
  const label = document.createElement("div");
  label.className = "title";
  label.title = title;
  label.textContent = title;
  card.append(frame, label);
  anchor.append(card);
  return anchor;
}

function renderFavorites() {
  if (favoriteItems === null) return;
  const fragment = document.createDocumentFragment();
  for (const item of sortByUsage(favoriteItems)) {
    const card = createCard(item, toggle.checked);
    if (card) fragment.append(card);
  }
  for (const anchor of grid.children) previewStates.get(anchor)?.animation?.cancel();
  previewObserver?.disconnect();
  previewGeneration += 1;
  grid.replaceChildren(fragment);
  for (const anchor of grid.children) {
    if (previewObserver) previewObserver.observe(anchor);
    else revealPreviews([anchor], previewGeneration);
  }
}

function handleCardClick(event) {
  if (event.type === "auxclick" && event.button !== 1) return;
  const anchor = event.target.closest("a[data-link]");
  if (anchor && grid.contains(anchor)) recordUsage(anchor.dataset.link);
}

grid.addEventListener("click", handleCardClick);
grid.addEventListener("auxclick", handleCardClick);
retryButton.addEventListener("click", () => refreshFavorites());
