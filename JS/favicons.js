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
    description: "Optional provider · requests may count toward your quota",
    cors: false,
    url: domain => `https://icon.horse/icon/${domain}`,
  },
};
const RECOMMENDED_ICON_PROVIDERS = ["vemetric", "google"];
function initialIconData(address, title = "") {
  const domain = new URL(address).hostname.replace(/^www\./, "");
  const words = (String(title).trim() || domain.split(".")[0]).match(/[\p{L}\p{N}]+/gu) || ["?"];
  const letters = (words.length > 1 ? Array.from(words[0])[0] + Array.from(words[1])[0] : Array.from(words[0]).slice(0, 2).join(""))
    .toLocaleUpperCase("en");
  let hash = 0;
  for (const character of domain) hash = ((hash * 31) + character.codePointAt(0)) >>> 0;
  return { letters, background: `hsl(${hash % 360}, 55%, 38%)`, color: hslToRgb(hash % 360, 0.55, 0.38) };
}

function createInitialIcon(address, title = "") {
  const data = initialIconData(address, title);
  const initials = document.createElement("span");
  initials.className = "initial-glyph";
  initials.setAttribute("aria-hidden", "true");
  initials.textContent = data.letters;
  initials.style.backgroundColor = data.background;
  return initials;
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
  request.then(() => pendingVemetricMetadata.delete(source), () => pendingVemetricMetadata.delete(source));
  return request;
}

// Version 2 stores real image results or a small missing-icon marker, never
// rendered initials. Keys are domain + provider order, independent of titles.
const ICON_RESULT_KEY = "iconResultsV2";
storage.remove("iconResultsV1");
const savedIconResults = storage.readJSON(ICON_RESULT_KEY, {});
function validIconResult(result) {
  return result && Number.isFinite(result.expires) && result.expires > Date.now() &&
    result.expires <= Date.now() + 7 * 86400000 && (result.kind === "initials" ||
      (result.kind === "image" && typeof result.src === "string" && /^(https:\/\/|data:image\/png;base64,)/.test(result.src)));
}
const iconResults = new Map(Object.entries(savedIconResults && typeof savedIconResults === "object" && !Array.isArray(savedIconResults) ? savedIconResults : {})
  .filter(([, result]) => validIconResult(result)).slice(-500));
const pendingIconResults = new Map();
let iconSaveTimer;

function flushIconResults() {
  clearTimeout(iconSaveTimer);
  iconSaveTimer = null;
  if (resettingCache) return;
  let bytes = 0;
  const entries = [...iconResults].reverse().filter(([key, value]) => {
    if (!validIconResult(value)) return false;
    const size = (key.length + JSON.stringify(value).length) * 2;
    if (bytes + size > 2000000) return false;
    bytes += size;
    return true;
  }).slice(0, 500).reverse();
  while (entries.length && !storage.set(ICON_RESULT_KEY, JSON.stringify(Object.fromEntries(entries)))) {
    entries.splice(0, Math.max(1, Math.ceil(entries.length / 4)));
  }
  if (!entries.length) storage.remove(ICON_RESULT_KEY);
}
function persistIconResults() {
  if (!iconSaveTimer) iconSaveTimer = setTimeout(flushIconResults, 150);
}
window.addEventListener("pagehide", () => { if (iconSaveTimer) flushIconResults(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && iconSaveTimer) flushIconResults(); });

function iconRequestUrl(source) {
  const epoch = storage.get("iconCacheEpoch");
  if (!epoch) return source;
  const url = new URL(source);
  url.searchParams.set("_refresh", epoch);
  return url.href;
}

// A shared visibility observer also releases targets removed by filtering,
// re-rendering or dialog edits, so detached icons do not accumulate.
const nearbyTasks = new Map();
const nearbyObserver = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    nearbyObserver.unobserve(entry.target);
    const task = nearbyTasks.get(entry.target);
    nearbyTasks.delete(entry.target);
    if (entry.target.isConnected) task?.();
  }
}, { rootMargin: "300px" }) : null;
function whenNearViewport(element, task) {
  if (!nearbyObserver) { queueMicrotask(task); return; }
  nearbyTasks.set(element, task);
  nearbyObserver.observe(element);
}
new MutationObserver(() => {
  for (const element of nearbyTasks.keys()) if (!element.isConnected) {
    nearbyObserver?.unobserve(element);
    nearbyTasks.delete(element);
  }
}).observe(document.body, { childList: true, subtree: true });

function readIconImage(source, cors = false, timeoutMs = 5000) {
  return new Promise(resolve => {
    const image = new Image();
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    if (cors) image.crossOrigin = "anonymous";
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      if (!result) image.removeAttribute("src");
      resolve(result);
    };
    const timeout = setTimeout(() => finish(null), timeoutMs);
    image.onerror = () => finish(null);
    image.onload = async () => {
      try { await image.decode(); finish(image); } catch { finish(null); }
    };
    image.src = source;
  });
}

const iconRequestQueue = [];
let activeIconRequests = 0;
function scheduleIconRequest(task) {
  return new Promise(resolve => {
    iconRequestQueue.push({ task, resolve });
    drainIconRequests();
  });
}
function drainIconRequests() {
  while (activeIconRequests < 6 && iconRequestQueue.length) {
    const { task, resolve } = iconRequestQueue.shift();
    activeIconRequests += 1;
    Promise.resolve().then(task).catch(() => ({ kind: "initials", expires: Date.now() + 15 * 60000 }))
      .then(resolve).finally(() => { activeIconRequests -= 1; drainIconRequests(); });
  }
}

async function resolveFavicon(address, providers) {
  const domain = encodeURIComponent(new URL(address).hostname);
  let hadError = false;
  for (const id of providers) {
    const provider = ICON_PROVIDERS[id];
    const source = iconRequestUrl(provider.url(domain));
    // Avoid downloading Vemetric's known placeholder in either CORS mode.
    if (id === "vemetric" && await isVemetricDefault(source)) continue;
    let image = await readIconImage(source, provider.cors);
    if (!image && provider.cors) image = await readIconImage(source, false);
    if (!image) { hadError = true; continue; }
    if (id === "google" && await isGoogleDefault(source)) continue;
    const color = await resolveIconColor(image, source);
    let src = source;
    if (image.crossOrigin === "anonymous") {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 128;
        canvas.getContext("2d").drawImage(image, 0, 0, 128, 128);
        src = canvas.toDataURL("image/png");
      } catch { /* Keep the provider URL if readable pixel storage is unavailable. */ }
    }
    return { kind: "image", src, color, expires: Date.now() + 7 * 86400000 };
  }
  return { kind: "initials", expires: Date.now() + (hadError ? 15 * 60000 : 86400000) };
}

function resolvedFavicon(address, providers) {
  const key = JSON.stringify([new URL(address).hostname, providers]);
  const saved = iconResults.get(key);
  if (validIconResult(saved)) return Promise.resolve(saved);
  if (pendingIconResults.has(key)) return pendingIconResults.get(key);
  const request = scheduleIconRequest(() => resolveFavicon(address, providers)).then(result => {
    iconResults.delete(key);
    iconResults.set(key, result);
    while (iconResults.size > 500) iconResults.delete(iconResults.keys().next().value);
    persistIconResults();
    return result;
  });
  pendingIconResults.set(key, request);
  request.then(() => pendingIconResults.delete(key), () => pendingIconResults.delete(key));
  return request;
}

function loadFavicon(host, address, title) {
  const providers = [...selectedIconProviders];
  const initial = createInitialIcon(address, title);
  host.replaceChildren(initial);
  const filter = host.closest(".filter");
  if (filter) applyFilterBackground(filter, initialIconData(address, title).color);
  whenNearViewport(host, async () => {
    let result = await resolvedFavicon(address, providers);
    if (!host.isConnected || result.kind !== "image") return;
    let image = await readIconImage(result.src);
    if (!image) {
      // A once-valid cached image may disappear. Retry the provider chain once.
      iconResults.delete(JSON.stringify([new URL(address).hostname, providers]));
      persistIconResults();
      result = await resolvedFavicon(address, providers);
      if (result.kind !== "image") return;
      image = await readIconImage(result.src);
    }
    if (!image || !host.isConnected) return;
    image.alt = "";
    host.replaceChildren(image);
    if (filter && validIconColor(result.color)) applyFilterBackground(filter, result.color);
  });
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
  if (!storage.set(ICON_PROVIDERS_KEY, JSON.stringify(providers))) {
    const message = "Icon settings could not be saved. Browser storage may be blocked or full.";
    document.getElementById("icons-feedback").textContent = message;
    setStatus(message);
    return false;
  }
  selectedIconProviders = [...providers];
  storage.set(GOOGLE_FAVICON_PRIORITY_KEY, String(selectedIconProviders[0] === "google"));
  updateFaviconPriorityIndicator();
  document.dispatchEvent(new Event("iconproviderschange"));
  if (!toggle.checked) renderFavorites();
  return true;
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
    if (saveIconProviders(enabled)) dialog.close();
  });
});
