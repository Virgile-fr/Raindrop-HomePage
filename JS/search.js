"use strict";

(() => {
  const svg = content => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${content}</svg>`;
  const magnifier = svg('<circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" stroke-width="1.7"/><path d="m15.5 15.5 4.3 4.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>');
  const google = svg('<path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.4 10A6 6 0 0 1 12 5.9Z"/>');
  const engines = {
    g: { name: "Google", icon: google, url: q => `https://www.google.com/search?q=${q}` },
    y: { name: "YouTube", icon: svg('<rect x="2" y="5" width="20" height="14" rx="4.5" fill="#FF0033"/><path d="m10 9 5 3-5 3Z" fill="white"/>'), url: q => `https://www.youtube.com/results?search_query=${q}` },
    i: { name: "Google Images", icon: svg('<rect x="3" y="4" width="18" height="16" rx="3" stroke="#4285F4" stroke-width="2"/><circle cx="8" cy="9" r="2" fill="#FBBC05"/><path d="m4 17 5-5 4 4 3-4 4 5" stroke="#34A853" stroke-width="2" stroke-linejoin="round"/>'), url: q => `https://www.google.com/search?tbm=isch&q=${q}` },
    b: { name: "Brave", icon: svg('<path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5Z" fill="#F76632"/><path d="M9 7h4a2.5 2.5 0 0 1 0 5H9Zm0 5h4.5a2.5 2.5 0 0 1 0 5H9Z" stroke="white" stroke-width="1.6" stroke-linejoin="round"/>'), url: q => `https://search.brave.com/search?q=${q}` },
    h: { name: "Hugging Face", icon: '<span class="engine-emoji" aria-hidden="true">🤗</span>', url: q => `https://huggingface.co/search/full-text?q=${q}` },
    x: { name: "X", icon: svg('<path d="M4 3h4.8L20 21h-4.8ZM20 3 4 21" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>'), url: q => `https://x.com/search?q=${q}` },
    s: { name: "Spotify", icon: svg('<circle cx="12" cy="12" r="10" fill="#1ED760"/><path d="M6.5 9c4-1.2 7.9-.8 11.1 1M7.2 12c3.4-1 6.8-.6 9.6.9M8 15c2.8-.8 5.4-.5 7.7.7" stroke="#142719" stroke-width="1.7" stroke-linecap="round"/>'), url: q => `https://open.spotify.com/search/${q}` },
  };
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
  let mode = null;
  let indexedCards = [];
  let matches = [];
  let active = -1;
  let composing = false;
  let renderedRows = [];
  let lastAnnouncement = "";

  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const focused = () => root.contains(document.activeElement);
  const query = () => input.value.trim();

  function announce(message) {
    if (lastAnnouncement === message) return;
    lastAnnouncement = message;
    announcement.textContent = message;
  }

  function setMode(key) {
    mode = key;
    const engine = engines[key];
    // Only fixed, locally defined SVG markup is inserted here.
    icon.innerHTML = engine ? engine.icon : magnifier;
    badge.textContent = engine?.name || "";
    badge.hidden = !engine;
    root.classList.toggle("has-engine", Boolean(engine));
    input.placeholder = engine ? "Votre recherche…" : "Rechercher…";
    input.setAttribute("aria-label", engine ? `Rechercher sur ${engine.name}` : "Rechercher dans les favoris");
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
        initial.textContent = Array.from(entry.title)[0]?.toLocaleUpperCase("fr") || "↗";
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
        row.addEventListener("pointerdown", event => event.preventDefault());
        row.addEventListener("click", event => openMatch(index, event.ctrlKey || event.metaKey || event.shiftKey));
        row.addEventListener("pointermove", () => {
          if (active !== index) { active = index; paintActive(); }
        });
        renderedRows.push(row);
        fragment.append(row);
      });
    }
    results.replaceChildren(fragment);
    results.hidden = renderedRows.length === 0;
    tips.hidden = Boolean(mode || text);
    if (mode) {
      caption.textContent = text ? `Entrée pour rechercher sur ${engines[mode].name}` : `Rechercher sur ${engines[mode].name}`;
    } else if (text) {
      caption.textContent = matches.length ? `${matches.length} favori${matches.length > 1 ? "s" : ""} · ↑ ↓ pour choisir · Entrée pour ouvrir` : "Aucun favori trouvé";
      if (indexedCards.length === 0 && grid.getAttribute("aria-busy") === "true") caption.textContent = "Chargement des favoris…";
    } else caption.textContent = "Vos favoris, ou un raccourci suivi d’un espace";
    if (focused()) {
      panel.hidden = false;
      input.setAttribute("aria-expanded", String(renderedRows.length > 0));
    } else closePanel();
    announce(mode ? `${engines[mode].name}. Entrée pour rechercher.` : text ? caption.textContent : "Recherche dans les favoris");
  }

  function processInput() {
    if (composing) return;
    if (!mode) {
      const prefix = input.value.match(/^([gyibhxs]) +(.*)$/i);
      if (prefix) {
        setMode(prefix[1].toLowerCase());
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
      if (mode) navigate(engines[mode].url(encodeURIComponent(query())), event.ctrlKey || event.metaKey);
      else openMatch(active < 0 ? 0 : active, event.ctrlKey || event.metaKey);
    } else if (!mode && renderedRows.length && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      panel.hidden = false;
      input.setAttribute("aria-expanded", "true");
      active = event.key === "ArrowDown" ? (active + 1) % renderedRows.length : (active <= 0 ? renderedRows.length - 1 : active - 1);
      paintActive();
    }
  });
  clear.addEventListener("click", () => { reset(); input.focus({ preventScroll: true }); });
  root.addEventListener("focusout", () => queueMicrotask(() => {
    if (!focused()) { closePanel(); shortcut.hidden = Boolean(input.value || mode); }
  }));
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
  new MutationObserver(reindex).observe(grid, { childList: true });
  setMode(null);
  reindex();
})();
