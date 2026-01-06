let grid = document.getElementById("grid");

grid.addEventListener("click", handleCardClick);

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function smallerTitle(title) {
  if (title.length > 14) {
    return title.substring(0, 12) + "..";
  } else return title;
}

function renderIconCard(lien, titre) {
  const { primary, fallback } = getFaviconPreference(lien);
  const initialIcon = primary ?? fallback ?? "";
  const fallbackIcon = fallback ?? "";
  const crossOriginAttr = allowsCrossOriginLoading(initialIcon)
    ? ' crossOrigin="anonymous"'
    : "";

  const escapedUrl = escapeHtml(lien);
  const escapedTitle = escapeHtml(titre);
  const escapedIcon = escapeHtml(initialIcon);
  const escapedFallback = escapeHtml(fallbackIcon);

  let content = `
  <a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">
    <div class="card icon-cards">
      <div class="filter">
          <img class="icon" src="${escapedIcon}"${crossOriginAttr} alt="${escapedTitle}" loading="lazy" onerror="this.onerror=null; this.src='${escapedFallback}'">
        </div>
        <div class="title" title="${escapedTitle}">${escapeHtml(smallerTitle(titre))}</div>
    </div>
  </a>`;
  return content;
}

function renderCoverCard(lien, titre, image) {
  const escapedUrl = escapeHtml(lien);
  const escapedTitle = escapeHtml(titre);
  const escapedImage = escapeHtml(image);

  let content = `
  <a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">
    <div class="card cover-cards">
      <div class="image" style="background-image:url(${escapedImage});" role="img" aria-label="${escapedTitle}">
      </div>
      <div class="title" title="${escapedTitle}">${escapeHtml(smallerTitle(titre))}</div>
    </div>
  </a>`;
  return content;
}

function handleCardClick(event) {
  const anchor = event.target.closest("a");

  if (!anchor || !grid.contains(anchor)) {
    return;
  }

  const link = anchor.getAttribute("href");

  if (link) {
    recordUsage(link);
  }
}
