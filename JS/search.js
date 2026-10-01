"use strict";

(() => {
  const svg = content => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${content}</svg>`;
  const magnifier = svg('<circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" stroke-width="1.7"/><path d="m15.5 15.5 4.3 4.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>');
  let engines = getSearchEngines();
  const root = document.getElementById("homepage-search");
  const input = document.getElementById("search-input");
  const icon = document.getElementById("search-icon");
  const badge = document.getElementById("search-engine-name");
  const clear = document.getElementById("search-clear");
  const panel = document.getElementById("search-panel");
  const results = document.getElementById("search-results");
  const caption = document.getElementById("search-caption");
  const tips = document.getElementById("search-tips");
  const shortcut = document.getElementById("search-shortcut");
  const empty = document.getElementById("search-empty");
  const announcement = document.getElementById("search-announcement");
  const touchUI = matchMedia("(max-width: 760px), (pointer: coarse)");
  const picker = document.createElement("div");
  picker.className = "search-engine-picker";
  picker.setAttribute("role", "group");
  picker.setAttribute("aria-label", "Search mode");
  const modeButtons = new Map();
  function rebuildEngineControls() {
    picker.replaceChildren();
    modeButtons.clear();
    tips.replaceChildren();
    for (const key of [null, ...Object.keys(engines)]) {
      const button = document.createElement("button");
      button.type = "button";
      if (key) button.append(createSearchEngineIcon(engines[key]));
      else button.innerHTML = magnifier;
      const label = document.createElement("span");
      label.textContent = key ? engines[key].name : "Favorites";
      button.append(label);
      button.setAttribute("aria-label", key ? `Search on ${engines[key].name}` : "Search favorites");
      button.addEventListener("click", () => {
        setMode(key);
        input.focus({ preventScroll: true });
        update();
        button.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
      modeButtons.set(key, button);
      picker.append(button);
    }
    for (const engine of Object.values(engines)) {
      if (!engine.shortcut) continue;
      const item = document.createElement("li");
      const key = document.createElement("kbd");
      key.textContent = engine.shortcut;
      item.append(key, document.createTextNode(` ${engine.name}`));
      tips.append(item);
    }
  }
  rebuildEngineControls();
  root.querySelector(".search-pill").after(picker);
  let selectingResult = false;
  let mode = null;
  let indexedCards = [];
  let matches = [];
  let active = -1;
  let composing = false;
  let renderedRows = [];
  let rowActions = [];
  let lastAnnouncement = "";

  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en");
  const focused = () => root.contains(document.activeElement);
  const query = () => input.value.trim();

  function announce(message) {
    if (lastAnnouncement === message) return;
    lastAnnouncement = message;
    announcement.textContent = message;
  }

  function setMode(key) {
    mode = key;
    modeButtons.forEach((button, value) => button.setAttribute("aria-pressed", String(value === key)));
    const engine = engines[key];
    // Engine art is resolved separately; the neutral magnifier is local SVG.
    icon.replaceChildren();
    if (engine) icon.append(createSearchEngineIcon(engine));
    else icon.innerHTML = magnifier;
    badge.textContent = engine?.name || "";
    badge.hidden = !engine;
    root.classList.toggle("has-engine", Boolean(engine));
    input.placeholder = engine ? "Your search…" : "Search…";
    input.setAttribute("aria-label", engine ? `Search on ${engine.name}` : "Search favorites");
  }

  function closePanel() {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function paintActive() {
    renderedRows.forEach((row, index) => row.setAttribute("aria-selected", String(index === active)));
    if (active >= 0 && renderedRows[active]) {
      input.setAttribute("aria-activedescendant", renderedRows[active].id);
      renderedRows[active].scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  }

  function navigate(url, newTab = false, bookmark = null) {
    if (bookmark) recordUsage(bookmark);
    closePanel();
    if (newTab) window.open(url, "_blank", "noopener,noreferrer");
    else window.location.assign(url);
  }

  function openMatch(index, newTab = false) {
    const entry = matches[index];
    if (entry) navigate(entry.card.href, newTab, entry.card.dataset.link);
  }

  function update() {
    const text = query();
    const terms = normalize(text).split(/\s+/).filter(Boolean);
    matches = [];
    indexedCards.forEach(entry => {
      const visible = Boolean(mode) || terms.every(term => entry.search.includes(term));
      entry.card.hidden = !visible;
      if (visible) matches.push(entry);
    });
    empty.hidden = Boolean(mode) || !text || matches.length > 0 || indexedCards.length === 0;
    clear.hidden = !input.value && !mode;
    shortcut.hidden = Boolean(input.value || mode || focused());
    active = -1;
    input.removeAttribute("aria-activedescendant");
    renderedRows = [];
    rowActions = [];
    const fragment = document.createDocumentFragment();
    if (!mode && text) {
      matches.slice(0, 8).forEach((entry, index) => {
        const row = document.createElement("div");
        row.id = `search-result-${index}`;
        row.className = "search-result";
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", "false");
        const initial = document.createElement("span");
        initial.className = "search-result-initial";
        initial.textContent = Array.from(entry.title)[0]?.toLocaleUpperCase("en") || "↗";
        const copy = document.createElement("span");
        copy.className = "search-result-copy";
        const title = document.createElement("span");
        title.className = "search-result-title";
        title.textContent = entry.title;
        const domain = document.createElement("span");
        domain.className = "search-result-domain";
        domain.textContent = entry.domain;
        copy.append(title, domain);
        const arrow = document.createElement("span");
        arrow.className = "search-result-arrow";
        arrow.textContent = "↗";
        arrow.setAttribute("aria-hidden", "true");
        row.append(initial, copy, arrow);
        row.addEventListener("pointerdown", event => {
          if (event.pointerType === "mouse") event.preventDefault();
          else selectingResult = true;
        });
        row.addEventListener("click", event => openMatch(index, event.ctrlKey || event.metaKey || event.shiftKey));
        row.addEventListener("pointermove", event => {
          if (event.pointerType !== "mouse") return;
          if (active !== index) { active = index; paintActive(); }
        });
        renderedRows.push(row);
        rowActions.push(newTab => openMatch(index, newTab));
        fragment.append(row);
      });
    }
    if (text && Object.keys(engines).length) {
      const separator = document.createElement("div");
      separator.className = "search-engine-section";
      separator.textContent = "Search on";
      separator.setAttribute("role", "presentation");
      fragment.append(separator);
      const engineKeys = mode ? [mode, ...Object.keys(engines).filter(key => key !== mode)] : Object.keys(engines);
      engineKeys.forEach(key => {
        const engine = engines[key];
        const index = renderedRows.length;
        const row = document.createElement("div");
        row.id = `search-result-${index}`;
        row.className = "search-result search-engine-result";
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", "false");
        row.setAttribute("aria-label", `Search for ${text} on ${engine.name}`);
        const logo = document.createElement("span");
        logo.className = "search-result-initial search-engine-logo";
        logo.append(createSearchEngineIcon(engine));
        const copy = document.createElement("span");
        copy.className = "search-result-copy";
        const title = document.createElement("span");
        title.className = "search-result-title";
        title.textContent = engine.name;
        const term = document.createElement("span");
        term.className = "search-result-domain";
        term.textContent = text;
        copy.append(title, term);
        const hint = document.createElement("kbd");
        hint.className = "search-engine-key";
        hint.textContent = engine.shortcut;
        hint.hidden = !engine.shortcut;
        hint.setAttribute("aria-hidden", "true");
        row.append(logo, copy, hint);
        const action = newTab => navigate(engine.url(encodeURIComponent(query())), newTab);
        row.addEventListener("pointerdown", event => {
          if (event.pointerType === "mouse") event.preventDefault();
          else selectingResult = true;
        });
        row.addEventListener("click", event => action(event.ctrlKey || event.metaKey || event.shiftKey));
        row.addEventListener("pointermove", event => {
          if (event.pointerType !== "mouse") return;
          if (active !== index) { active = index; paintActive(); }
        });
        renderedRows.push(row);
        rowActions.push(action);
        fragment.append(row);
      });
    }
    results.replaceChildren(fragment);
    results.hidden = renderedRows.length === 0;
    tips.hidden = Boolean(mode || text || touchUI.matches || !tips.childElementCount);
    if (mode) {
      caption.textContent = text ? `Press Enter to search on ${engines[mode].name}` : `Search on ${engines[mode].name}`;
    } else if (text) {
      caption.textContent = matches.length ? `${matches.length} favorite${matches.length > 1 ? "s" : ""} · ↑ ↓ to select · Enter to open` : Object.keys(engines).length ? `No favorites · Press Enter to search ${Object.values(engines)[0].name}` : "No matching favorites · Enable an engine in search engines settings";
      if (indexedCards.length === 0 && grid.getAttribute("aria-busy") === "true") caption.textContent = "Loading favorites…";
    } else caption.textContent = "Your favorites, or a shortcut followed by a space";
    if (touchUI.matches) {
      caption.textContent = mode ? `Search on ${engines[mode].name}` : text
        ? matches.length ? `${matches.length} favorite${matches.length === 1 ? "" : "s"} · Tap a result to open`
          : Object.keys(engines).length ? "No favorites · Search with an engine below" : "No matching favorites · Enable a search engine in settings"
        : Object.keys(engines).length ? "Choose Favorites or a search engine" : "Search your favorites";
    }
    if (focused()) {
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
    } else closePanel();
    announce(mode ? `${engines[mode].name}. ${touchUI.matches ? "Use your keyboard’s Search key or tap a result." : "Press Enter to search."}` : text ? caption.textContent : "Searching favorites");
  }

  function processInput() {
    if (composing) return;
    if (!mode) {
      const prefix = input.value.match(/^([a-z]) +(.*)$/i);
      const engineId = prefix && Object.keys(engines).find(key => engines[key].shortcut === prefix[1].toLowerCase());
      if (engineId) {
        setMode(engineId);
        input.value = prefix[2];
      }
    }
    update();
  }

  function reset() {
    input.value = "";
    setMode(null);
    update();
  }

  function reindex() {
    indexedCards = Array.from(grid.querySelectorAll(":scope > a[data-link]"), card => {
      const title = card.getAttribute("aria-label") || card.textContent.trim();
      const url = new URL(card.href);
      let decoded = url.href;
      try { decoded = decodeURIComponent(url.href); } catch { /* Keep malformed escapes literal. */ }
      return { card, title, domain: url.hostname.replace(/^www\./, ""), search: normalize(`${title} ${decoded}`) };
    });
    update();
  }

  input.addEventListener("input", processInput);
  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; processInput(); });
  input.addEventListener("focus", update);
  input.addEventListener("keydown", event => {
    if (event.isComposing || composing || event.keyCode === 229) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (input.value || mode) reset();
      else { closePanel(); input.blur(); }
    } else if (event.key === "Backspace" && !input.value && mode) {
      event.preventDefault();
      setMode(null);
      update();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!query()) return;
      const action = rowActions[active < 0 ? 0 : active];
      if (action) action(event.ctrlKey || event.metaKey);
    } else if (renderedRows.length && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
      active = event.key === "ArrowDown" ? (active + 1) % renderedRows.length : (active <= 0 ? renderedRows.length - 1 : active - 1);
      paintActive();
    }
  });
  clear.addEventListener("click", () => { reset(); input.focus({ preventScroll: true }); });
  root.addEventListener("focusout", () => queueMicrotask(() => {
    if (!focused() && !selectingResult) { closePanel(); shortcut.hidden = Boolean(input.value || mode); }
  }));
  const finishSelection = () => setTimeout(() => {
    selectingResult = false;
    if (!focused()) closePanel();
  }, 0);
  document.addEventListener("pointerup", finishSelection, { passive: true });
  document.addEventListener("pointercancel", finishSelection, { passive: true });
  document.addEventListener("pointerdown", event => {
    if (!root.contains(event.target)) closePanel();
  });
  document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || document.querySelector("dialog[open]")) return;
    const target = event.target;
    const editable = target instanceof Element && (target.closest("input, textarea, select, [role='textbox']") || target.isContentEditable);
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
      if (editable && target !== input) return;
      event.preventDefault(); input.focus(); input.select(); return;
    }
    if (editable || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1 || /\s/.test(event.key)) return;
    if (window.getSelection()?.toString()) return;
    event.preventDefault();
    input.focus();
    input.value += event.key;
    processInput();
  });
  const refreshEngines = () => {
    engines = getSearchEngines();
    rebuildEngineControls();
    setMode(Object.hasOwn(engines, mode) ? mode : null);
    update();
  };
  document.addEventListener("searchengineschange", refreshEngines);
  document.addEventListener("iconproviderschange", refreshEngines);
  touchUI.addEventListener("change", update);
  new MutationObserver(reindex).observe(grid, { childList: true });
  setMode(null);
  reindex();
})();
