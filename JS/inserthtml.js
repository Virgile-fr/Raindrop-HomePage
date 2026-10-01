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
  const anchors = [anchor];
  await Promise.all(anchors.map(async anchor => {
    const state = previewStates.get(anchor);
    let timeout;
    const deadline = new Promise(resolve => { timeout = setTimeout(() => resolve(false), state.fallbackDelay); });
    const ready = await Promise.race([state.ready.then(() => true), deadline]);
    clearTimeout(timeout);
    if (!ready && anchor.isConnected && generation === previewGeneration) await state.fallback();
  }));
  if (generation !== previewGeneration) return;
  const visible = anchors.filter(anchor => anchor.isConnected && !anchor.hidden);
  anchors.forEach(anchor => {
    anchor.classList.remove("preview-pending");
    anchor.removeAttribute("aria-busy");
  });
  const entrances = [];
  visible.forEach((anchor, index) => {
    if (entranceMotion.matches || !anchor.animate) return;
    anchor.classList.add("card-entering");
    const animation = anchor.animate([
      { opacity: 0, transform: "perspective(900px) translate3d(0, -18px, 0) rotateX(9deg) scale(.965)" },
      { opacity: 1, transform: "perspective(900px) translate3d(0, 0, 0) rotateX(0deg) scale(1)" },
    ], { duration: 420, delay: entranceDelay, easing: "cubic-bezier(.2,.75,.25,1)", fill: "backwards" });
    const finish = () => anchor.classList.remove("card-entering");
    animation.onfinish = finish;
    animation.oncancel = finish;
    const stop = () => animation.cancel();
    anchor.addEventListener("focus", stop, { once: true });
    const reduce = () => { if (entranceMotion.matches) animation.cancel(); };
    entranceMotion.addEventListener("change", reduce);
    entrances.push(animation.finished.catch(() => {}));
    animation.finished.catch(() => {}).finally(() => {
      anchor.removeEventListener("focus", stop);
      entranceMotion.removeEventListener("change", reduce);
    });
  });
  await Promise.all(entrances);
}

const previewObserver = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
  const anchors = entries.filter(entry => entry.isIntersecting).map(entry => entry.target)
    .sort((a, b) => [...grid.children].indexOf(a) - [...grid.children].indexOf(b));
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
  const image = document.createElement("img");
  image.alt = ""; // The enclosing link already has a complete accessible name.
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  let finalIconReady = false;
  let initialPreview = null;
  let fallbackPromise = null;
  image.addEventListener("previewready", async () => {
    finalIconReady = true;
    if (initialPreview) {
      initialPreview.remove();
      // Restore the final gradient only when a temporary preview replaced it.
      delete image.dataset.colorized;
      await colorizeIconBackground(image);
    }
    image.style.removeProperty("display");
    resolveReady();
  }, { once: true });
  const showFallback = async () => {
    const replacement = new Image(42, 42);
    replacement.className = "icon";
    replacement.alt = "";
    replacement.src = createInitialIcon(url, title);
    try { await replacement.decode(); } catch { /* Keep the title usable. */ }
    if (finalIconReady) return;
    if (coverView) {
      card.classList.replace("cover-cards", "icon-cards");
      frame.className = "filter";
      frame.replaceChildren(replacement);
    } else {
      // Keep the real image connected so provider validation and color analysis
      // can finish, then swap only once the final image has decoded.
      initialPreview = replacement;
      image.style.display = "none";
      frame.append(replacement);
    }
    await colorizeIconBackground(replacement);
    rememberPreviewFallback(image, replacement);
    resolveReady();
  };
  const fallback = () => fallbackPromise ||= showFallback();
  previewStates.set(anchor, { ready, fallback, fallbackDelay: coverView ? 2500 : 100 });
  if (coverView) {
    const cover = safeWebUrl(item.cover);
    if (cover) {
      image.src = cover;
      image.addEventListener("load", async () => {
        try { await image.decode(); } catch { return fallback(); }
        resolveReady();
      }, { once: true });
      image.addEventListener("error", fallback, { once: true });
      frame.append(image);
    } else queueMicrotask(fallback);
  } else {
    image.className = "icon";
    image.width = 42;
    image.height = 42;
    loadFavicon(image, url, title);
    frame.append(image);
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
