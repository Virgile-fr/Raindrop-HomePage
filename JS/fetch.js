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

function fetchCardsIcons() {
  fetch("https://api.raindrop.io/rest/v1/raindrops/0?search=❤️&perpage=50", {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  })
    .then((response) => response.json())
    .then((data) =>
      data.items.forEach((result) => {
        let content = test(result.link, result.title);

        grid.insertAdjacentHTML("beforeend", content);
      })
    );
}

function fetchCardsCovers() {
  fetch("https://api.raindrop.io/rest/v1/raindrops/0?search=❤️&perpage=50", {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  })
    .then((response) => response.json())
    .then((data) =>
      data.items.forEach((result) => {
        let content = test2(result.link, result.title, result.cover);

        grid.insertAdjacentHTML("beforeend", content);
      })
    );
}

// result.cover = preview in raindrop
// result.link = url of the link
// result.title = name of the link
// ${googlefavicon(result.link)} = google favicon of the link
// ${favicon(result.link)} = favicon of the link
// ${statvoofavicon(result.link)} = statvoofavicon favicon of the link
