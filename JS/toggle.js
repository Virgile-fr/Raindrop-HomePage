const toggle = document.querySelector("input");
const iconProviderToggle = document.getElementById("icon-provider-toggle");

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

function updateIconProviderButton(provider) {
  if (!iconProviderToggle) return;

  iconProviderToggle.style.color = provider === "google" ? "#4285F4" : "#f5c518";
  iconProviderToggle.title =
    provider === "google"
      ? "Icônes Google sélectionnées (cliquer pour passer sur Vemetric)"
      : "Icônes Vemetric sélectionnées (cliquer pour passer sur Google)";
}

function refreshIconsIfVisible() {
  if (!toggle.checked) {
    deleteGrid();
    fetchCardsIcons();
  }
}

iconProviderToggle?.addEventListener("click", () => {
  const provider = toggleIconProvider();
  updateIconProviderButton(provider);
  refreshIconsIfVisible();
});

async function getGrid() {
  if (toggle.checked || localStorage.switch == "on") {
    fetchCardsCovers();
    toggle.checked = true;
  } else {
    fetchCardsIcons();
    toggle.checked = false;
  }

  updateIconProviderButton(getIconProvider());
}
