let grid = document.getElementById("grid");

function smallerTitle(title) {
  if (title.length > 14) {
    return title.substring(0, 12) + "..";
  } else return title;
}

function test(lien, titre) {
  let content = `
  <a href="${lien}" target="_blank">
    <div class="card icon-cards">
      <!-- this line is for filter icon : <div class="image" style="background-image:url(${googlefavicon(lien)});"> -->
      <div class="filter">
          <img class="icon" src=${googlefavicon(lien)}>
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
