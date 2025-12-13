const USAGE_STORAGE_KEY = "favoriteUsageCounts";

function fetchcollections() {
  fetch("https://api.raindrop.io/rest/v1/collections", {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
    });
}

function fetchcollection(collectionID) {
  fetch("https://api.raindrop.io/rest/v1/raindrops/" + collectionID, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
    });
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

function fetchCardsIcons() {
  fetch("https://api.raindrop.io/rest/v1/raindrops/0?search=❤️&perpage=50", {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  })
    .then((response) => response.json())
    .then((data) => {
      const sortedItems = sortByUsage(data.items);

      sortedItems.forEach((result) => {
        let content = test(result.link, result.title);

        grid.insertAdjacentHTML("beforeend", content);
      });
    });
} 


function fetchCardsCovers() {
  fetch("https://api.raindrop.io/rest/v1/raindrops/0?search=❤️&perpage=50", {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  })
    .then((response) => response.json())
    .then((data) => {
      const sortedItems = sortByUsage(data.items);

      sortedItems.forEach((result) => {
        let content = test2(result.link, result.title, result.cover);
        grid.insertAdjacentHTML("beforeend", content);
      });
    });
}

// result.cover = preview in raindrop
// result.link = url of the link
// result.title = name of the link
// ${googlefavicon(result.link)} = google favicon of the link
// ${favicon(result.link)} = favicon of the link
// ${statvoofavicon(result.link)} = statvoofavicon favicon of the link
