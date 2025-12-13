const USAGE_STORAGE_KEY = "favoriteUsageCounts";
const FAVORITES_PER_PAGE = 50;
const MAX_FAVORITE_PAGES = 2;
const FAVORITE_QUERY = encodeURIComponent("❤️");

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
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
  } catch (error) {
    console.error("Failed to render favorites", error);
  }
}

function fetchCardsIcons() {
  renderFavoriteCards((result) => test(result.link, result.title));
}

function fetchCardsCovers() {
  renderFavoriteCards((result) => test2(result.link, result.title, result.cover));
}

// result.cover = preview in raindrop
// result.link = url of the link
// result.title = name of the link
// ${vemetricfavicon(result.link)} = Vemetric Favicon API icon of the link
// ${googlefavicon(result.link)} = google favicon of the link
// ${favicon(result.link)} = favicon of the link
// ${statvoofavicon(result.link)} = statvoofavicon favicon of the link
