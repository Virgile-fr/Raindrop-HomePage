"use strict";

const GOOGLE_FAVICON_PRIORITY_KEY = "googleFaviconPriority";
const ICON_PROVIDERS_KEY = "iconApiProvidersV1";
const ICON_PROVIDERS = {
  vemetric: {
    name: "Vemetric",
    description: "128 px · gratuit, sans clé · couleurs des cartes",
    cors: true,
    url: domain => `https://favicon.vemetric.com/${domain}?size=128`,
  },
  google: {
    name: "Google",
    description: "128 px demandés · fond coloré depuis l’icône · icône générique possible",
    cors: false,
    url: domain => `https://www.google.com/s2/favicons?sz=128&domain=${domain}`,
  },
  faviconim: {
    name: "Favicon.im",
    description: "Jusqu’à 256 px · gratuit, sans clé · disponibilité variable",
    cors: true,
    url: domain => `https://a.favicon.im/${domain}?larger=true&throw-error-on-404=true`,
  },
  iconhorse: {
    name: "Icon Horse",
    description: "1 000 icônes/mois · rechargements susceptibles de consommer le quota",
    cors: false,
    url: domain => `https://icon.horse/icon/${domain}`,
  },
};
const RECOMMENDED_ICON_PROVIDERS = ["vemetric", "google"];
const FALLBACK_ICON = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42"><text x="21" y="30" text-anchor="middle" font-size="30">★</text></svg>');

function readIconProviders() {
  const saved = storage.readJSON(ICON_PROVIDERS_KEY, null);
  const valid = Array.isArray(saved)
    ? [...new Set(saved.filter(id => Object.hasOwn(ICON_PROVIDERS, id)))]
    : [];
  if (valid.length) return valid;
  // Preserve the existing user's choice until they explicitly change it.
  return storage.get(GOOGLE_FAVICON_PRIORITY_KEY) === "true"
    ? ["google", "vemetric"] : ["vemetric", "google"];
}

let selectedIconProviders = readIconProviders();

function getFaviconPreference(address) {
  const domain = encodeURIComponent(new URL(address).hostname);
  return selectedIconProviders.map(id => ICON_PROVIDERS[id].url(domain));
}

function loadFavicon(image, address) {
  const urls = getFaviconPreference(address);
  const sources = [];
  selectedIconProviders.forEach((id, index) => {
    const url = urls[index];
    // A displayed image does not need readable pixels. If anonymous CORS
    // fails (including after a redirect), retry the same image normally.
    if (ICON_PROVIDERS[id].cors) sources.push({ url, cors: true });
    sources.push({ url, cors: false });
  });
  sources.push({ url: FALLBACK_ICON, cors: false });
  let index = 0;
  const loadNext = () => {
    if (index === sources.length) return;
    const source = sources[index++];
    delete image.dataset.colorized;
    if (source.cors) image.crossOrigin = "anonymous";
    else image.removeAttribute("crossorigin");
    image.src = source.url;
  };
  image.addEventListener("error", loadNext);
  image.addEventListener("load", () => {
    const frame = image.closest(".filter");
    if (!frame) return;
    if (colorizeIconBackground(image)) {
      frame.style.removeProperty("--icon-backdrop");
    } else {
      // CSS can display/blur the loaded icon without reading its pixels.
      // This preserves artwork-based colors without a proxy or another API.
      frame.style.setProperty("--icon-backdrop", `url("${image.currentSrc || image.src}")`);
    }
  });
  loadNext();
}

function updateFaviconPriorityIndicator() {
  const button = document.querySelector(".favorite-priority-toggle");
  const first = selectedIconProviders[0];
  const label = `Icônes ${ICON_PROVIDERS[first].name} en priorité` +
    (selectedIconProviders.length > 1 ? " (cliquer pour passer au service suivant)" : "");
  button.classList.toggle("google-priority", first === "google");
  button.title = label;
  button.setAttribute("aria-label", label);
  button.removeAttribute("aria-pressed");
  button.disabled = selectedIconProviders.length < 2;
}

function saveIconProviders(providers) {
  selectedIconProviders = [...providers];
  storage.set(ICON_PROVIDERS_KEY, JSON.stringify(selectedIconProviders));
  storage.set(GOOGLE_FAVICON_PRIORITY_KEY, String(selectedIconProviders[0] === "google"));
  updateFaviconPriorityIndicator();
  if (!toggle.checked) renderFavorites();
}

function toggleFaviconPriority() {
  if (selectedIconProviders.length < 2) return;
  saveIconProviders([...selectedIconProviders.slice(1), selectedIconProviders[0]]);
}

document.addEventListener("DOMContentLoaded", () => {
  const dialog = document.getElementById("icons-dialog");
  const list = document.getElementById("icons-provider-list");
  const saveButton = document.getElementById("icons-save");
  const feedback = document.getElementById("icons-feedback");
  let draftOrder = [];
  let draftEnabled = new Set();

  function renderProviderOptions(focusId) {
    const fragment = document.createDocumentFragment();
    draftOrder.forEach((id, index) => {
      const provider = ICON_PROVIDERS[id];
      const row = document.createElement("li");
      const label = document.createElement("label");
      label.className = "provider-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = draftEnabled.has(id);
      const details = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = provider.name;
      const description = document.createElement("small");
      description.textContent = provider.description;
      details.append(name, description);
      label.append(checkbox, details);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) draftEnabled.add(id);
        else draftEnabled.delete(id);
        updateSaveState();
      });
      const moveControls = document.createElement("div");
      moveControls.className = "provider-move";
      for (const [direction, symbol, wording] of [[-1, "↑", "Monter"], [1, "↓", "Descendre"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = symbol;
        button.id = `move-${id}-${direction}`;
        button.setAttribute("aria-label", `${wording} ${provider.name}`);
        button.disabled = index + direction < 0 || index + direction >= draftOrder.length;
        button.addEventListener("click", () => {
          const nextIndex = index + direction;
          [draftOrder[index], draftOrder[nextIndex]] = [draftOrder[nextIndex], draftOrder[index]];
          renderProviderOptions(button.id);
        });
        moveControls.append(button);
      }
      row.append(label, moveControls);
      fragment.append(row);
    });
    list.replaceChildren(fragment);
    updateSaveState();
    if (focusId) {
      const button = document.getElementById(focusId);
      if (!button.disabled) button.focus();
      else button.parentElement.querySelector("button:not(:disabled)")?.focus();
    }
  }

  function updateSaveState() {
    saveButton.disabled = draftEnabled.size === 0;
    feedback.textContent = draftEnabled.size ? "" : "Sélectionnez au moins un service.";
  }

  document.getElementById("icons-api").addEventListener("click", () => {
    draftOrder = [...selectedIconProviders, ...Object.keys(ICON_PROVIDERS).filter(id => !selectedIconProviders.includes(id))];
    draftEnabled = new Set(selectedIconProviders);
    renderProviderOptions();
    dialog.showModal();
  });
  document.getElementById("icons-cancel").addEventListener("click", () => dialog.close());
  document.getElementById("icons-recommended").addEventListener("click", () => {
    draftOrder = [...RECOMMENDED_ICON_PROVIDERS, ...Object.keys(ICON_PROVIDERS).filter(id => !RECOMMENDED_ICON_PROVIDERS.includes(id))];
    draftEnabled = new Set(RECOMMENDED_ICON_PROVIDERS);
    renderProviderOptions();
  });
  saveButton.addEventListener("click", () => {
    const enabled = draftOrder.filter(id => draftEnabled.has(id));
    if (!enabled.length) return;
    saveIconProviders(enabled);
    dialog.close();
  });
});
