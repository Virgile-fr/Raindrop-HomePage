"use strict";

const GOOGLE_FAVICON_PRIORITY_KEY = "googleFaviconPriority";
const ICON_PROVIDERS_KEY = "iconApiProvidersV1";
const ICON_PROVIDERS = {
  vemetric: {
    name: "Vemetric",
    description: "128 px · free, no API key · sampled card colors",
    cors: true,
    url: domain => `https://favicon.vemetric.com/${domain}?size=128`,
  },
  google: {
    name: "Google",
    description: "128 px requested · sampled icon colors · known placeholder detection",
    cors: false,
    url: domain => `https://www.google.com/s2/favicons?sz=128&domain=${domain}`,
  },
  faviconim: {
    name: "Favicon.im",
    description: "Up to 256 px · free, no API key · availability varies",
    cors: true,
    url: domain => `https://a.favicon.im/${domain}?larger=true&throw-error-on-404=true`,
  },
  iconhorse: {
    name: "Icon Horse",
    description: "1,000 icons/month · reloads may count toward the quota",
    cors: false,
    url: domain => `https://icon.horse/icon/${domain}`,
  },
};
const RECOMMENDED_ICON_PROVIDERS = ["vemetric", "google"];
function createInitialIcon(address, title = "") {
  const domain = new URL(address).hostname.replace(/^www\./, "");
  const words = (String(title).trim() || domain.split(".")[0]).match(/[\p{L}\p{N}]+/gu) || ["?"];
  const letters = (words.length > 1 ? Array.from(words[0])[0] + Array.from(words[1])[0] : Array.from(words[0]).slice(0, 2).join(""))
    .toLocaleUpperCase("en");
  let hash = 0;
  for (const character of domain) hash = ((hash * 31) + character.codePointAt(0)) >>> 0;
  const background = `hsl(${hash % 360}, 55%, 38%)`;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = background;
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = "#ffffff";
    context.font = "600 54px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(letters, 64, 67, 110);
    return canvas.toDataURL("image/png");
  }
  // Letters are restricted to Unicode letters/numbers, so they are safe XML.
  return "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="${background}"/><text x="64" y="84" text-anchor="middle" font-family="sans-serif" font-size="54" font-weight="600" fill="white">${letters}</text></svg>`);
}

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

const VEMETRIC_METADATA_KEY = "vemetricMetadataV1";
const VEMETRIC_METADATA_MAX_AGE = 24 * 60 * 60 * 1000;
const storedVemetricMetadata = storage.readJSON(VEMETRIC_METADATA_KEY, {});
const vemetricMetadata = storedVemetricMetadata && typeof storedVemetricMetadata === "object" && !Array.isArray(storedVemetricMetadata)
  ? storedVemetricMetadata : {};
const pendingVemetricMetadata = new Map();

function isVemetricDefault(source) {
  const cached = vemetricMetadata[source];
  if (cached && typeof cached.isDefault === "boolean" && Number.isFinite(cached.savedAt) &&
      Date.now() >= cached.savedAt && Date.now() - cached.savedAt < VEMETRIC_METADATA_MAX_AGE) {
    return Promise.resolve(cached.isDefault);
  }
  if (pendingVemetricMetadata.has(source)) return pendingVemetricMetadata.get(source);
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const metadataUrl = new URL(source);
      metadataUrl.searchParams.set("response", "json");
      const response = await fetch(metadataUrl, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok) return false;
      const metadata = await response.json();
      if (typeof metadata.source !== "string") return false;
      // "fallback" is a real /favicon.ico candidate; only "default" is
      // the generated placeholder. Never reject an image based on bytes.
      const isDefault = metadata.source === "default" || metadata.sourceUrl === "default.svg";
      vemetricMetadata[source] = { isDefault, savedAt: Date.now() };
      const entries = Object.entries(vemetricMetadata)
        .filter(([, entry]) => entry && Date.now() - entry.savedAt < VEMETRIC_METADATA_MAX_AGE)
        .sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, 500);
      for (const key of Object.keys(vemetricMetadata)) delete vemetricMetadata[key];
      Object.assign(vemetricMetadata, Object.fromEntries(entries));
      storage.set(VEMETRIC_METADATA_KEY, JSON.stringify(vemetricMetadata));
      return isDefault;
    } catch {
      // Metadata unavailable: preserve a potentially valid icon.
      return false;
    } finally {
      clearTimeout(timeout);
    }
  })();
  pendingVemetricMetadata.set(source, request);
  return request;
}

const ICON_RESULT_KEY = "iconResultsV1";
const cachedIconResults = storage.readJSON(ICON_RESULT_KEY, {});
const iconResults = new Map(Object.entries(cachedIconResults && typeof cachedIconResults === "object" ? cachedIconResults : {}));
const pendingIconResults = new Map();
let iconSaveTimer;

function persistIconResults() {
  clearTimeout(iconSaveTimer);
  iconSaveTimer = setTimeout(() => {
    // Bound both entry count and encoded image storage; retain newest results.
    let bytes = 0;
    const entries = [...iconResults].reverse().filter(([, value]) => {
      if (!value || value.expires <= Date.now()) return false;
      const size = JSON.stringify(value).length * 2;
      if (bytes + size > 2000000) return false;
      bytes += size;
      return true;
    }).slice(0, 500);
    storage.set(ICON_RESULT_KEY, JSON.stringify(Object.fromEntries(entries.reverse())));
  }, 150);
}

function iconRequestUrl(source) {
  const epoch = storage.get("iconCacheEpoch");
  if (!epoch) return source;
  const url = new URL(source);
  url.searchParams.set("_refresh", epoch);
  return url.href;
}

function paintCachedIcon(image, result) {
  image.removeAttribute("crossorigin");
  image.src = result.src;
  if (validIconColor(result.color)) {
    // Cards may still be inside their construction fragment.
    queueMicrotask(() => {
      const filter = image.closest(".filter");
      if (filter) applyFilterBackground(filter, result.color);
    });
  }
}

const waitingIcons = new WeakMap();
const iconVisibility = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    iconVisibility.unobserve(entry.target);
    const start = waitingIcons.get(entry.target);
    waitingIcons.delete(entry.target);
    start?.();
  }
}, { rootMargin: "300px" }) : null;

function loadFavicon(image, address, title) {
  const key = JSON.stringify([new URL(address).hostname, selectedIconProviders, title]);
  const providers = [...selectedIconProviders];
  const start = (ignoreCache = false) => {
    const saved = iconResults.get(key);
    if (!ignoreCache && saved && saved.expires > Date.now() && typeof saved.src === "string" &&
        /^(data:image\/|https:\/\/)/.test(saved.src)) {
      image.onerror = () => {
        image.onerror = null;
        iconResults.delete(key);
        persistIconResults();
        start(true);
      };
      paintCachedIcon(image, saved);
      return;
    }
    if (pendingIconResults.has(key)) {
      pendingIconResults.get(key).then(result => paintCachedIcon(image, result));
      return;
    }
    let finish;
    pendingIconResults.set(key, new Promise(resolve => { finish = resolve; }));
    resolveFavicon(image, address, title, providers, result => {
      iconResults.delete(key);
      iconResults.set(key, result);
      while (iconResults.size > 500) iconResults.delete(iconResults.keys().next().value);
      persistIconResults();
      pendingIconResults.delete(key);
      finish(result);
    });
  };
  const saved = iconResults.get(key);
  if (saved?.expires > Date.now() || !iconVisibility) start();
  else {
    waitingIcons.set(image, start);
    iconVisibility.observe(image);
  }
}

function resolveFavicon(image, address, title, providers, finish) {
  const domain = encodeURIComponent(new URL(address).hostname);
  const urls = providers.map(id => iconRequestUrl(ICON_PROVIDERS[id].url(domain)));
  const sources = [];
  providers.forEach((id, index) => {
    const url = urls[index];
    if (ICON_PROVIDERS[id].cors) sources.push({ id, url, cors: true });
    sources.push({ id, url, cors: false });
  });
  sources.push({ id: "local", url: null, cors: false });
  let index = 0;
  let current;
  let generation = 0;
  let timeout;
  let hadError = false;
  image.loading = "eager";
  const loadNext = () => {
    clearTimeout(timeout);
    if (index === sources.length) return;
    current = sources[index++];
    generation += 1;
    delete image.dataset.colorized;
    if (current.cors) image.crossOrigin = "anonymous";
    else image.removeAttribute("crossorigin");
    image.src = current.url || createInitialIcon(address, title);
    if (current.id !== "local") timeout = setTimeout(() => { hadError = true; loadNext(); }, 5000);
  };
  const onError = () => { hadError = true; loadNext(); };
  image.addEventListener("error", onError);
  const onLoad = async () => {
    clearTimeout(timeout);
    const loaded = current;
    const loadedGeneration = generation;
    if (loaded.id === "vemetric" && await isVemetricDefault(loaded.url)) {
      if (generation !== loadedGeneration) return;
      // Skip every remaining attempt for this provider, including no-CORS.
      while (sources[index]?.id === "vemetric") index += 1;
      loadNext();
      return;
    }
    if (loaded.id === "google" && await isGoogleDefault(loaded.url)) {
      if (generation !== loadedGeneration) return;
      while (sources[index]?.id === "google") index += 1;
      loadNext();
      return;
    }
    if (generation !== loadedGeneration) return;
    await colorizeIconBackground(image);
    if (generation !== loadedGeneration) return;
    const source = image.currentSrc || image.src;
    const color = computeDominantColor(image) || dominantColorCache.get(source) || iconColors[source]?.color;
    let src = source;
    if (loaded.cors) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 128;
        canvas.getContext("2d").drawImage(image, 0, 0, 128, 128);
        src = canvas.toDataURL("image/png");
      } catch { /* The resolved URL still avoids provider probing. */ }
    }
    image.removeEventListener("error", onError);
    image.removeEventListener("load", onLoad);
    finish({ src, color, expires: Date.now() + (hadError ? 15 * 60000 : loaded.id === "local" ? 86400000 : 7 * 86400000) });
  };
  image.addEventListener("load", onLoad);
  loadNext();
}

function updateFaviconPriorityIndicator() {
  const button = document.querySelector(".favorite-priority-toggle");
  const first = selectedIconProviders[0];
  const label = `${ICON_PROVIDERS[first].name} icons first` +
    (selectedIconProviders.length > 1 ? " (click to use the next provider)" : "");
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
      for (const [direction, symbol, wording] of [[-1, "↑", "Move up"], [1, "↓", "Move down"]]) {
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
    feedback.textContent = draftEnabled.size ? "" : "Select at least one provider.";
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
