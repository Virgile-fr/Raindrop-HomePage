"use strict";

// Storage may be blocked (private browsing, quota, browser policy).
// Keep the current tab usable even when preferences cannot be persisted.
let resettingCache = false;
const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    if (resettingCache && key !== "iconCacheEpoch") return;
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* Best effort. */ }
  },
  readJSON(key, fallback) {
    try { return JSON.parse(this.get(key)) ?? fallback; } catch { return fallback; }
  },
};


// Reset only application caches, preserving credentials, usage and preferences.
function resetPageCache() {
  if (resettingCache) return;
  resettingCache = true;
  for (const key of ["iconResultsV1", "iconResultsV2", "iconSampledColorsV1", "vemetricMetadataV1", "googlePlaceholderV1", "raindropFavoritesCacheV1"]) storage.remove(key);
  storage.set("iconCacheEpoch", String(Date.now()));
  location.reload();
}

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && event.key.toLowerCase() === "r") {
    event.preventDefault();
    resetPageCache();
  }
}, { capture: true });

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("reset-cache")?.addEventListener("click", resetPageCache);
});
