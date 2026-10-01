"use strict";

const SEARCH_ENGINES_KEY = "searchEnginesV1";
const ENGINE_CATALOG = [
  ["g", "Google", "https://www.google.com/search?q=%s"],
  ["y", "YouTube", "https://www.youtube.com/results?search_query=%s"],
  ["i", "Google Images", "https://www.google.com/search?tbm=isch&q=%s"],
  ["b", "Brave", "https://search.brave.com/search?q=%s"],
  ["h", "Hugging Face", "https://huggingface.co/search/full-text?q=%s"],
  ["x", "X", "https://x.com/search?q=%s"],
  ["s", "Spotify", "https://open.spotify.com/search/%s"],
  ["d", "DuckDuckGo", "https://duckduckgo.com/?q=%s"],
  ["", "Bing", "https://www.bing.com/search?q=%s"],
  ["w", "Wikipedia", "https://en.wikipedia.org/w/index.php?search=%s"],
  ["r", "Reddit", "https://www.reddit.com/search/?q=%s"],
  ["c", "GitHub", "https://github.com/search?q=%s"],
  ["", "Stack Overflow", "https://stackoverflow.com/search?q=%s"],
  ["m", "MDN", "https://developer.mozilla.org/en-US/search?q=%s"],
  ["n", "npm", "https://www.npmjs.com/search?q=%s"],
  ["p", "PyPI", "https://pypi.org/search/?q=%s"],
  ["a", "arXiv", "https://arxiv.org/search/?query=%s&searchtype=all"],
  ["", "Google Scholar", "https://scholar.google.com/scholar?q=%s"],
  ["", "Google Maps", "https://www.google.com/maps/search/?api=1&query=%s"],
  ["", "Google Translate", "https://translate.google.com/?sl=auto&tl=en&text=%s&op=translate"],
  ["", "Wikimedia Commons", "https://commons.wikimedia.org/w/index.php?search=%s&title=Special:MediaSearch&type=image"],
  ["u", "Unsplash", "https://unsplash.com/s/photos/%s"],
  ["", "Pexels", "https://www.pexels.com/search/%s/"],
  ["", "Behance", "https://www.behance.net/search/projects?search=%s"],
  ["", "Dribbble", "https://dribbble.com/search/%s"],
].map(([shortcut, name, template], index) => ({ id: `engine-${index}`, name, shortcut, template, enabled: index < 7 }));

function validSearchTemplate(template) {
  try {
    if (typeof template !== "string" || !template.includes("%s") || template.length > 2000) return false;
    const url = new URL(template.replaceAll("%s", "example"));
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password &&
      !new URL(template).host.includes("%s");
  } catch { return false; }
}
function readSearchEngines() {
  const saved = storage.readJSON(SEARCH_ENGINES_KEY, null);
  if (!Array.isArray(saved)) return ENGINE_CATALOG.map(engine => ({ ...engine }));
  const ids = new Set();
  const shortcuts = new Set();
  const valid = saved.slice(0, 60).filter(engine => {
    if (!engine || typeof engine.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(engine.id) || ids.has(engine.id) ||
        typeof engine.name !== "string" || !engine.name.trim() || !validSearchTemplate(engine.template)) return false;
    ids.add(engine.id);
    return true;
  }).map(engine => {
    const shortcut = /^[a-z]$/.test(engine.shortcut) && !shortcuts.has(engine.shortcut) ? engine.shortcut : "";
    if (shortcut) shortcuts.add(shortcut);
    return { id: engine.id, name: engine.name.slice(0, 60), template: engine.template, shortcut, enabled: engine.enabled === true };
  });
  // Preserve an intentionally empty list; recover from wholly malformed data.
  return saved.length && !valid.length ? ENGINE_CATALOG.map(engine => ({ ...engine })) : valid;
}
let searchEngineSettings = readSearchEngines();
function getSearchEngines() {
  return Object.fromEntries(searchEngineSettings.filter(engine => engine.enabled).map(engine => [engine.id, {
    ...engine, url: query => engine.template.replaceAll("%s", query),
  }]));
}
function createSearchEngineIcon(engine) {
  const host = document.createElement("span");
  host.className = "search-provider-icon";
  host.setAttribute("aria-hidden", "true");
  // The resolver shares domain requests and never receives search terms.
  loadFavicon(host, new URL(engine.template.replaceAll("%s", "example")).origin, engine.name);
  return host;
}

const engineDialog = document.createElement("dialog");
engineDialog.id = "engines-dialog";
engineDialog.setAttribute("aria-labelledby", "engines-title");
engineDialog.innerHTML = `<h2 id="engines-title">Search engines</h2>
<p>Enable engines and arrange them by priority. The first enabled engine is used when no favorite matches. Disable all engines to search favorites only.</p>
<ul id="engine-settings-list"></ul>
<details><summary>Add from the catalog</summary><div id="engine-catalog"></div></details>
<form id="engine-editor">
<h3 id="engine-editor-title">Add a custom engine</h3>
<label>Name<input name="name" required maxlength="60" placeholder="Example Search"></label>
<label>Search URL<input name="template" type="url" required maxlength="2000" placeholder="https://example.com/search?q=%s"></label>
<small>Replace the search terms with %s. Example: https://example.com/search?q=%s</small>
<label>Shortcut (optional)<input name="shortcut" maxlength="1" pattern="[a-zA-Z]" placeholder="e" autocapitalize="none"></label>
<p id="engine-editor-error" role="alert"></p>
<button type="submit">Add engine</button><button id="engine-edit-cancel" type="button">Clear form</button>
</form>
<p class="icons-note">Icons use your configured icon APIs and cache. Missing icons use initials. Settings are saved in this browser.</p>
<div class="icons-dialog-actions"><button id="engines-restore" type="button">Restore defaults</button><button id="engines-cancel" type="button">Cancel</button><button id="engines-save" type="button">Save</button></div>`;
document.body.append(engineDialog);
const engineList = engineDialog.querySelector("#engine-settings-list");
const editor = engineDialog.querySelector("form");
let engineDraft = [];
let editingEngine = null;
function resetEngineEditor() {
  editingEngine = null;
  editor.reset();
  editor.querySelector("h3").textContent = "Add a custom engine";
  editor.querySelector('[type="submit"]').textContent = "Add engine";
  editor.querySelector("#engine-edit-cancel").textContent = "Clear form";
  editor.querySelector('[role="alert"]').textContent = "";
}
function renderEngineSettings(focusId) {
  engineList.replaceChildren();
  engineDraft.forEach((engine, index) => {
    const row = document.createElement("li");
    const label = document.createElement("label");
    label.className = "provider-option";
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = engine.enabled;
    enabled.addEventListener("change", () => { engine.enabled = enabled.checked; });
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = engine.name;
    const hint = document.createElement("small");
    hint.textContent = engine.shortcut ? `${engine.shortcut} + space` : "No shortcut";
    copy.append(name, hint);
    label.append(enabled, createSearchEngineIcon(engine), copy);
    row.append(label);
    const controls = document.createElement("div");
    controls.className = "engine-row-actions";
    const action = (text, title, callback, disabled = false) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = text;
      button.id = `${engine.id}-${text}`;
      button.setAttribute("aria-label", `${title} ${engine.name}`);
      button.disabled = disabled;
      button.addEventListener("click", callback);
      controls.append(button);
      return button;
    };
    for (const [offset, text] of [[-1, "↑"], [1, "↓"]]) action(text, offset < 0 ? "Move up" : "Move down", () => {
      [engineDraft[index], engineDraft[index + offset]] = [engineDraft[index + offset], engineDraft[index]];
      renderEngineSettings(`${engine.id}-${text}`);
    }, index + offset < 0 || index + offset >= engineDraft.length);
    action("Edit", "Edit", () => {
      editingEngine = engine.id;
      for (const key of ["name", "template", "shortcut"]) editor.elements[key].value = engine[key];
      editor.querySelector("h3").textContent = "Edit engine";
      editor.querySelector('[type="submit"]').textContent = "Apply edit";
      editor.querySelector("#engine-edit-cancel").textContent = "Cancel edit";
      editor.querySelector('[role="alert"]').textContent = "";
      editor.elements.name.focus();
    });
    action("Remove", "Remove", () => {
      engineDraft.splice(index, 1);
      if (editingEngine === engine.id) resetEngineEditor();
      renderEngineSettings();
      (engineList.children[Math.min(index, engineDraft.length - 1)]?.querySelector("input") || editor.elements.name).focus();
    });
    row.append(controls);
    engineList.append(row);
  });
  const catalog = engineDialog.querySelector("#engine-catalog");
  catalog.replaceChildren();
  for (const engine of ENGINE_CATALOG.filter(item => !engineDraft.some(entry => entry.id === item.id))) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `Add ${engine.name}`;
    button.addEventListener("click", () => {
      if (engineDraft.length >= 60) return;
      engineDraft.push({ ...engine, enabled: true, shortcut: engineDraft.some(item => item.shortcut === engine.shortcut) ? "" : engine.shortcut });
      renderEngineSettings();
    });
    catalog.append(button);
  }
  if (!catalog.childElementCount) catalog.textContent = "All catalog engines are already listed above. Enable any you want to use.";
  const focus = focusId && document.getElementById(focusId);
  if (focus) (focus.disabled ? focus.parentElement.querySelector("button:not(:disabled)") : focus)?.focus();
}
editor.addEventListener("submit", event => {
  event.preventDefault();
  const name = editor.elements.name.value.trim();
  const template = editor.elements.template.value.trim();
  const shortcut = editor.elements.shortcut.value.trim().toLowerCase();
  const error = editor.querySelector('[role="alert"]');
  if (!name || !validSearchTemplate(template)) { error.textContent = "Enter a name and an HTTP(S) search URL containing %s outside the domain."; return; }
  if (shortcut && !/^[a-z]$/.test(shortcut)) { error.textContent = "Use a single letter from a to z for the shortcut."; return; }
  if (shortcut && engineDraft.some(engine => engine.id !== editingEngine && engine.shortcut === shortcut)) { error.textContent = "This shortcut is already assigned to another engine."; return; }
  if (!editingEngine && engineDraft.length >= 60) { error.textContent = "You can save up to 60 engines."; return; }
  const existing = engineDraft.find(engine => engine.id === editingEngine);
  if (existing) Object.assign(existing, { name, template, shortcut });
  else engineDraft.push({ id: `custom-${crypto.randomUUID()}`, name, template, shortcut, enabled: true });
  resetEngineEditor();
  renderEngineSettings();
});
engineDialog.querySelector("#engine-edit-cancel").addEventListener("click", resetEngineEditor);
document.getElementById("search-engines").addEventListener("click", () => {
  engineDraft = searchEngineSettings.map(engine => ({ ...engine }));
  resetEngineEditor();
  renderEngineSettings();
  engineDialog.showModal();
});
engineDialog.querySelector("#engines-restore").addEventListener("click", () => {
  engineDraft = ENGINE_CATALOG.map(engine => ({ ...engine }));
  resetEngineEditor();
  renderEngineSettings();
});
engineDialog.querySelector("#engines-cancel").addEventListener("click", () => engineDialog.close());
engineDialog.querySelector("#engines-save").addEventListener("click", () => {
  if (editingEngine || editor.elements.name.value.trim() || editor.elements.template.value.trim() || editor.elements.shortcut.value.trim()) { editor.querySelector('[role="alert"]').textContent = "Add or apply the engine below, or cancel the edit before saving."; editor.scrollIntoView({ block: "nearest" }); return; }
  const next = engineDraft.map(engine => ({ ...engine }));
  if (!storage.set(SEARCH_ENGINES_KEY, JSON.stringify(next))) {
    editor.querySelector('[role="alert"]').textContent = "Settings could not be saved. Browser storage may be blocked or full.";
    editor.scrollIntoView({ block: "nearest" });
    return;
  }
  searchEngineSettings = next;
  document.dispatchEvent(new Event("searchengineschange"));
  engineDialog.close();
});
