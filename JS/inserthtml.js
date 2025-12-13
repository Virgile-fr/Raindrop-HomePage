let grid = document.getElementById("grid");

grid.addEventListener("click", handleCardClick);

function smallerTitle(title) {
  if (title.length > 14) {
    return title.substring(0, 12) + "..";
  } else return title;
}

function test(lien, titre) {
  const { primary, fallback } = getFaviconPreference(lien);
  const initialIcon = primary ?? fallback ?? "";
  const fallbackIcon = fallback ?? "";
  const crossOriginAttr = allowsCrossOriginLoading(initialIcon)
    ? ' crossOrigin="anonymous"'
    : "";
  let content = `
  <a href="${lien}" target="_blank">
    <div class="card icon-cards">
      <!-- this line is for filter icon : <div class="image" style="background-image:url(${googlefavicon(lien)});"> -->
      <div class="filter">
          <img class="icon" src="${initialIcon}"${crossOriginAttr} onerror="this.onerror=null; this.src='${fallbackIcon}'">
        </div>
        <!--  this line is for filter icon : </div> -->
        <div class="title" title="${titre}">${smallerTitle(titre)}</div>
    </div>
  </a>`;
  return content;
}

function test2(lien, titre, image) {
  let content = `
  <a href="${lien}" target="_blank">
    <div class="card cover-cards">
      <div class="image" style="background-image:url(${image});">
      </div>
      <div class="title" title="${titre}">${smallerTitle(titre)}</div>
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
