"use strict";

const USAGE_STORAGE_KEY = "favoriteUsageCounts";
const FAVORITES_PER_PAGE = 50;
const FAVORITE_QUERY = encodeURIComponent("❤️");
const FAVORITES_CACHE_KEY = "raindropFavoritesCacheV1";
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
let favoriteItems = null;
let favoritesRequest = null;
let cacheOwner = null;

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + token },
      signal: controller.signal,
    });
    if (!response.ok) {
      const messages = {
        401: "Invalid token. Please enter a new Raindrop token.",
        403: "Access denied. Check your token permissions.",
        429: "Too many requests. Please wait before trying again.",
      };
      const error = new Error(messages[response.status] || `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    if (data.result === false || !Array.isArray(data.items)) {
      throw new Error("Invalid Raindrop response. Please try again.");
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The server is taking too long to respond. Please try again.");
    if (error instanceof TypeError) throw new Error("Network error. Check your internet connection.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function readUsageCounts() {
  const value = storage.readJSON(USAGE_STORAGE_KEY, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function usageCount(counts, link) {
  const count = counts[link];
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

function recordUsage(link) {
  const counts = readUsageCounts();
  counts[link] = usageCount(counts, link) + 1;
  storage.set(USAGE_STORAGE_KEY, JSON.stringify(counts));
}

function sortByUsage(items) {
  // Parse storage once per sort, rather than twice per comparison.
  const counts = readUsageCounts();
  return items.map(item => ({
    item,
    uses: usageCount(counts, item.link),
    created: Date.parse(item.created) || 0,
  })).sort((a, b) => b.uses - a.uses || b.created - a.created)
    .map(entry => entry.item);
}

async function fetchAllFavoriteItems() {
  const items = [];
  const seen = new Set();
  // A short page is the API's pagination boundary. No arbitrary favorites cap
  // and no dependence on an optional/ambiguous count field.
  for (let page = 0; ; page += 1) {
    const data = await fetchJson(
      `https://api.raindrop.io/rest/v1/raindrops/0?search=${FAVORITE_QUERY}&perpage=${FAVORITES_PER_PAGE}&page=${page}`
    );
    let added = 0;
    for (const item of data.items) {
      if (!item || typeof item.link !== "string") continue;
      const id = item._id ?? item.link;
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({ link: item.link, title: item.title, cover: item.cover, created: item.created });
      added += 1;
    }
    if (data.items.length < FAVORITES_PER_PAGE) break;
    if (!added) throw new Error("Raindrop returned a repeated page. Please try again.");
  }
  return items;
}

async function restoreFavoritesCache() {
  try {
    // Bind cached bookmarks to this credential without persisting another copy
    // of the token. Skip caching if Web Crypto is unavailable.
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    cacheOwner = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const cached = storage.readJSON(FAVORITES_CACHE_KEY, null);
    if (cached?.owner === cacheOwner && Number.isFinite(cached.savedAt) &&
        Date.now() - cached.savedAt >= 0 && Date.now() - cached.savedAt < CACHE_MAX_AGE &&
        Array.isArray(cached.items) && cached.items.every(item => item && typeof item.link === "string")) {
      favoriteItems = cached.items;
    } else {
      storage.remove(FAVORITES_CACHE_KEY);
    }
  } catch { /* Network loading still works without a cache. */ }
}

function refreshFavorites() {
  if (favoritesRequest) return favoritesRequest;
  setStatus(favoriteItems === null ? "Loading favorites…" : "Refreshing…");
  grid.setAttribute("aria-busy", "true");
  favoritesRequest = (async () => {
    try {
      const items = await fetchAllFavoriteItems();
      const changed = JSON.stringify(items) !== JSON.stringify(favoriteItems);
      favoriteItems = items;
      if (cacheOwner) {
        storage.set(FAVORITES_CACHE_KEY, JSON.stringify({ owner: cacheOwner, savedAt: Date.now(), items }));
      }
      if (changed) renderFavorites();
      setStatus(items.length ? "" : "No favorites yet. Mark bookmarks as favorites in Raindrop.");
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        storage.remove(FAVORITES_CACHE_KEY);
        favoriteItems = null;
        grid.replaceChildren();
      }
      const suffix = favoriteItems !== null ? " Saved favorites are still displayed." : "";
      setStatus(error.message + suffix, true);
    } finally {
      grid.setAttribute("aria-busy", "false");
      favoritesRequest = null;
    }
  })();
  return favoritesRequest;
}
