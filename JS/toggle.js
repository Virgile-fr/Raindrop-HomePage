const toggle = document.querySelector("input");

function deleteGrid() {
  grid.innerHTML = "";
}

toggle.addEventListener("change", function () {
  if (this.checked) {
    deleteGrid();
    fetchCardsCovers();
    localStorage.setItem("switch", "on");
  } else {
    deleteGrid();
    fetchCardsIcons();
    localStorage.removeItem("switch");
  }
});

function getGrid() {
  if (toggle.checked || localStorage.switch == "on") {
    fetchCardsCovers();
    toggle.checked = true;
  } else {
    fetchCardsIcons();
    toggle.checked = false;
  }
}
