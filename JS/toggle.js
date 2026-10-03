"use strict";

const toggle = document.getElementById("switch");
toggle.checked = storage.get("switch") === "on";
toggle.addEventListener("change", () => {
  storage.set("switch", toggle.checked ? "on" : "off");
  renderFavorites();
});

document.querySelector(".favorite-priority-toggle").addEventListener("click", toggleFaviconPriority);
updateFaviconPriorityIndicator();

document.getElementById("change-token").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const nextToken = await requestToken();
  if (!nextToken) return;
  cancelFavoritesRefresh();
  token = nextToken;
  storage.set("token", nextToken);
  storage.remove(FAVORITES_CACHE_KEY);
  button.disabled = true;
  try {
    favoriteItems = null;
    cacheOwner = null;
    grid.replaceChildren();
    gridLoad = getGrid();
    await gridLoad;
  } finally {
    button.disabled = false;
  }
});

async function getGrid() {
  if (!token) {
    setStatus("Enter your Raindrop token to display your favorites.");
    return;
  }
  const generation = favoritesGeneration;
  await restoreFavoritesCache();
  if (generation !== favoritesGeneration) return;
  renderFavorites();
  await refreshFavorites();
}

let gridLoad = getGrid();
