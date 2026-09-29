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

function createCard(item, coverView) {
  const url = safeWebUrl(item.link);
  if (!url) return null;
  const title = typeof item.title === "string" && item.title.trim() ? item.title : new URL(url).hostname;
  const anchor = document.createElement("a");
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
  if (coverView) {
    const cover = safeWebUrl(item.cover);
    if (cover) {
      image.src = cover;
      image.addEventListener("error", () => image.remove(), { once: true });
      frame.append(image);
    }
  } else {
    image.className = "icon";
    image.width = 42;
    image.height = 42;
    loadFavicon(image, url);
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
  grid.replaceChildren(fragment);
}

function handleCardClick(event) {
  if (event.type === "auxclick" && event.button !== 1) return;
  const anchor = event.target.closest("a[data-link]");
  if (anchor && grid.contains(anchor)) recordUsage(anchor.dataset.link);
}

grid.addEventListener("click", handleCardClick);
grid.addEventListener("auxclick", handleCardClick);
retryButton.addEventListener("click", () => refreshFavorites());
