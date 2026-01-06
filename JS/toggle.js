const toggle = document.querySelector("input");
const imageIcon = document.querySelector(".header-image-icon");

function deleteGrid() {
  grid.innerHTML = "";
}

function updateModeIndicator(isCoverMode) {
  if (isCoverMode) {
    imageIcon.classList.add('mode-active');
  } else {
    imageIcon.classList.remove('mode-active');
  }
}

function fadeOutAndReload(fetchFunction, storageAction, isCoverMode) {
  // Add fade-out class
  grid.classList.add('fade-out');

  // Wait for animation to complete, then reload
  setTimeout(() => {
    deleteGrid();
    grid.classList.remove('fade-out');
    fetchFunction();
    storageAction();
    updateModeIndicator(isCoverMode);

    // Add fade-in class after content loads
    requestAnimationFrame(() => {
      grid.classList.add('fade-in');
      setTimeout(() => grid.classList.remove('fade-in'), 300);
    });
  }, 300); // Match transition duration
}

toggle.addEventListener("change", function () {
  if (this.checked) {
    fadeOutAndReload(
      fetchCardsCovers,
      () => localStorage.setItem("switch", "on"),
      true
    );
  } else {
    fadeOutAndReload(
      fetchCardsIcons,
      () => localStorage.removeItem("switch"),
      false
    );
  }
});

async function getGrid() {
  if (toggle.checked || localStorage.switch == "on") {
    fetchCardsCovers();
    toggle.checked = true;
    updateModeIndicator(true);
  } else {
    fetchCardsIcons();
    toggle.checked = false;
    updateModeIndicator(false);
  }
}
