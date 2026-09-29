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
  const nextToken = requestToken();
  if (!nextToken) return;
  storage.set("token", nextToken);
  storage.remove(FAVORITES_CACHE_KEY);
  const button = event.currentTarget;
  button.disabled = true;
  try {
    // Let an existing refresh settle before changing credentials.
    await gridLoad;
    await favoritesRequest;
    token = nextToken;
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
    setStatus("Saisissez votre token Raindrop pour afficher vos favoris.");
    return;
  }
  await restoreFavoritesCache();
  renderFavorites();
  await refreshFavorites();
}

let gridLoad = getGrid();
