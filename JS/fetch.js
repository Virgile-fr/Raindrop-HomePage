const USAGE_STORAGE_KEY = "favoriteUsageCounts";
const FAVORITES_PER_PAGE = 50;
const MAX_FAVORITE_PAGES = 2;
const FAVORITE_QUERY = encodeURIComponent("❤️");

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: "Bearer " + token },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Token invalide. Veuillez vérifier votre token Raindrop.");
      } else if (response.status === 403) {
        throw new Error("Accès refusé. Vérifiez les permissions de votre token.");
      } else if (response.status === 429) {
        throw new Error("Trop de requêtes. Veuillez patienter quelques instants.");
      }
      throw new Error(`Erreur de requête: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Erreur de réseau. Vérifiez votre connexion internet.");
    }
    throw error;
  }
}

async function fetchcollections() {
  const data = await fetchJson("https://api.raindrop.io/rest/v1/collections");
  console.log(data);
  return data;
}

async function fetchcollection(collectionID) {
  const data = await fetchJson(
    "https://api.raindrop.io/rest/v1/raindrops/" + collectionID
  );
  console.log(data);
  return data;
}

function getUsageCount(link) {
  const usageData = JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) || "{}");
  return usageData[link] || 0;
}

function recordUsage(link) {
  const usageData = JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) || "{}");
  usageData[link] = (usageData[link] || 0) + 1;
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usageData));
}

function sortByUsage(items) {
  return [...items].sort((a, b) => {
    const usageDifference = getUsageCount(b.link) - getUsageCount(a.link);

    if (usageDifference !== 0) {
      return usageDifference;
    }

    return new Date(b.created).getTime() - new Date(a.created).getTime();
  });
}

function getTotalPages(meta) {
  const totalItems = meta?.count ?? meta?.items?.length ?? 0;
  const pageCount = Math.ceil(totalItems / FAVORITES_PER_PAGE);
  return Math.min(Math.max(pageCount, 1), MAX_FAVORITE_PAGES);
}

async function fetchFavoritePage(page) {
  return fetchJson(
    `https://api.raindrop.io/rest/v1/raindrops/0?search=${FAVORITE_QUERY}&perpage=${FAVORITES_PER_PAGE}&page=${page}`
  );
}

async function fetchAllFavoriteItems() {
  const firstPage = await fetchFavoritePage(0);
  const totalPages = getTotalPages(firstPage);

  if (totalPages === 1) {
    return firstPage.items ?? [];
  }

  const additionalPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchFavoritePage(index + 1))
  );

  return [firstPage, ...additionalPages].flatMap((page) => page.items ?? []);
}

async function renderFavoriteCards(renderer) {
  try {
    const favoriteItems = await fetchAllFavoriteItems();
    const sortedItems = sortByUsage(favoriteItems);
    const content = sortedItems.map(renderer).join("");

    grid.insertAdjacentHTML("beforeend", content);
    refreshIconFilterColors();
  } catch (error) {
    console.error("Failed to render favorites", error);

    const errorMessage = document.createElement("div");
    errorMessage.style.cssText = "padding: 40px; text-align: center; color: #ff4444; font-size: 14px; max-width: 600px; margin: 0 auto;";
    errorMessage.innerHTML = `
      <h2 style="margin-bottom: 16px;">⚠️ Erreur de chargement</h2>
      <p style="margin-bottom: 12px;">${error.message || "Impossible de charger vos favoris."}</p>
      <p style="font-size: 12px; opacity: 0.8;">Vérifiez votre token et votre connexion internet.</p>
    `;
    grid.appendChild(errorMessage);
  }
}

function fetchCardsIcons() {
  renderFavoriteCards((result) => renderIconCard(result.link, result.title));
}

function fetchCardsCovers() {
  renderFavoriteCards((result) => renderCoverCard(result.link, result.title, result.cover));
}

// result.cover = preview in raindrop
// result.link = url of the link
// result.title = name of the link
// ${vemetricfavicon(result.link)} = Vemetric Favicon API icon of the link
// ${googlefavicon(result.link)} = google favicon of the link
// ${favicon(result.link)} = favicon of the link
// ${statvoofavicon(result.link)} = statvoofavicon favicon of the link
