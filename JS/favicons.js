"use strict";

const GOOGLE_FAVICON_PRIORITY_KEY = "googleFaviconPriority";
let googleFaviconPriority = storage.get(GOOGLE_FAVICON_PRIORITY_KEY) === "true";
const FALLBACK_ICON = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42"><text x="21" y="30" text-anchor="middle" font-size="30">★</text></svg>');

function getFaviconPreference(address) {
  const url = new URL(address);
  const vemetric = `https://favicon.vemetric.com/${encodeURIComponent(url.hostname)}`;
  const google = `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(url.host)}`;
  return googleFaviconPriority ? [google, vemetric] : [vemetric, google];
}

function loadFavicon(image, address) {
  const sources = [...getFaviconPreference(address), FALLBACK_ICON];
  let index = 0;
  const loadNext = () => {
    if (index === sources.length) return;
    const source = sources[index++];
    delete image.dataset.colorized;
    // Google can be displayed without CORS, but cannot be read by canvas.
    // Re-evaluate on EVERY fallback, including Vemetric -> Google.
    if (source.startsWith("https://favicon.vemetric.com/")) image.crossOrigin = "anonymous";
    else image.removeAttribute("crossorigin");
    image.src = source;
  };
  image.addEventListener("error", loadNext);
  image.addEventListener("load", () => {
    if (image.crossOrigin === "anonymous") colorizeIconBackground(image);
  });
  loadNext();
}

function updateFaviconPriorityIndicator() {
  const button = document.querySelector(".favorite-priority-toggle");
  const label = googleFaviconPriority
    ? "Icônes Google en priorité (cliquer pour inverser)"
    : "Icônes Vemetric en priorité (cliquer pour inverser)";
  button.classList.toggle("google-priority", googleFaviconPriority);
  button.title = label;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(googleFaviconPriority));
}

function toggleFaviconPriority() {
  googleFaviconPriority = !googleFaviconPriority;
  storage.set(GOOGLE_FAVICON_PRIORITY_KEY, String(googleFaviconPriority));
  updateFaviconPriorityIndicator();
  if (!toggle.checked) renderFavorites();
}
