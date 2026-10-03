"use strict";

// Small, local line icons; never dependent on a favicon service.
const SETTINGS_ICON_PATHS = {
  card: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 15h18"/>',
  motion: '<path d="M4 12h16m-5-5 5 5-5 5M4 5h5M4 19h5"/>',
  lighting: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  surface: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  glass: '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="m8 12 4-4m-2 8 6-6"/>',
  icon: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m4 16 5-5 4 4 3-3 4 4"/><circle cx="15" cy="8" r="1"/>',
  background: '<rect x="2" y="3" width="20" height="18" rx="3"/><path d="m2 17 6-6 5 5 4-4 5 5"/><circle cx="16" cy="8" r="1"/>',
  text: '<path d="M4 5h16M12 5v15m-4 0h8"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  key: '<circle cx="8" cy="9" r="5"/><path d="m12 13 8 8m-4-4 3-3m-6 0 3-3"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  save: '<path d="m5 12 4 4L19 6"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  add: '<path d="M12 4v16M4 12h16"/>', list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
};
function settingsIcon(name) {
  return `<svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${SETTINGS_ICON_PATHS[name] || SETTINGS_ICON_PATHS.card}</svg>`;
}
function addSettingsIcon(element, name) {
  if (element && !element.querySelector(".settings-icon")) element.insertAdjacentHTML("afterbegin", settingsIcon(name));
}

// Keep fine values intact when reopening. Snap only during an actual user edit.
function settingsRangeValue(input, fine) {
  const step = Number(fine ? input.dataset.fineStep || .1 : input.dataset.coarseStep || 1);
  const value = Math.round(Number(input.value) / step) * step;
  return Math.max(Number(input.min), Math.min(Number(input.max), Number(value.toFixed(3))));
}
let settingsShift = false;
window.addEventListener("keydown", event => { settingsShift = event.shiftKey; }, true);
window.addEventListener("keyup", event => { settingsShift = event.shiftKey; }, true);
window.addEventListener("blur", () => { settingsShift = false; });
document.addEventListener("input", event => {
  if (event.target.matches('dialog input[type="range"][data-coarse-step]')) event.target.value = settingsRangeValue(event.target, settingsShift);
}, true);
document.addEventListener("keydown", event => {
  const input = event.target;
  if (!input.matches('dialog input[type="range"][data-coarse-step]')) return;
  const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
  if (!direction) return;
  event.preventDefault();
  const step = Number(event.shiftKey ? input.dataset.fineStep || .1 : input.dataset.coarseStep);
  input.value = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value) + direction * step));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}, true);

function selectSettingsTab(dialog, id) {
  for (const tab of dialog.querySelectorAll(".settings-tabs [role=tab]")) {
    const active = tab.getAttribute("aria-controls") === id;
    tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
  }
}
function makeSettingsTabs(dialog, entries) {
  const nav = document.createElement("div");
  nav.className = "settings-tabs"; nav.setAttribute("role", "tablist"); nav.setAttribute("aria-label", "Settings sections");
  entries.forEach(([label, icon, nodes], index) => {
    const panel = document.createElement("section");
    panel.id = `${dialog.id}-section-${index}`; panel.setAttribute("role", "tabpanel"); panel.hidden = index !== 0;
    const tab = document.createElement("button"); tab.type = "button"; tab.id = `${panel.id}-tab`;
    tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", panel.id); tab.setAttribute("aria-selected", String(index === 0)); tab.tabIndex = index ? -1 : 0;
    panel.setAttribute("aria-labelledby", tab.id); tab.innerHTML = settingsIcon(icon); tab.append(label);
    nodes.filter(Boolean).forEach(node => panel.append(node)); dialog.append(panel); nav.append(tab);
    tab.addEventListener("click", () => selectSettingsTab(dialog, panel.id));
  });
  nav.addEventListener("keydown", event => {
    const tabs = [...nav.querySelectorAll("[role=tab]")], index = tabs.indexOf(event.target);
    const next = event.key === "ArrowRight" ? (index+1)%tabs.length : event.key === "ArrowLeft" ? (index+tabs.length-1)%tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length-1 : -1;
    if (index < 0 || next < 0) return;
    event.preventDefault(); tabs[next].click(); tabs[next].focus(); tabs[next].scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  dialog.prepend(nav);
}
function prepareSettingsDialog(dialog, icon) {
  dialog.classList.add("settings-dialog");
  const title = dialog.querySelector("h2"), actions = dialog.querySelector(".icons-dialog-actions");
  const header = document.createElement("header"); header.className = "settings-header";
  addSettingsIcon(title, icon); header.append(title);
  if (actions) {
    for (const button of actions.querySelectorAll("button")) {
      const originalLabel = button.textContent;
      if (/reset|restore|recommended/.test(button.id)) {
        button.textContent = /recommended/.test(button.id) ? "Reset order" : "Reset";
        button.title = originalLabel;
        button.setAttribute("aria-label", originalLabel);
      }
      addSettingsIcon(button, /save/.test(button.id) ? "save" : /cancel/.test(button.id) ? "close" : "reset");
    }
    header.append(actions);
  }
  const feedback = dialog.querySelector("#effects-feedback, #icons-feedback, #wallpaper-feedback");
  if (feedback) { feedback.classList.add("settings-feedback"); header.append(feedback); }
  const tabs = dialog.querySelector(".effects-tabs, .settings-tabs");
  const body = document.createElement("div"); body.className = "settings-body";
  // The card tab bar is outside the form; controls retain their original form.
  if (tabs) tabs.remove();
  while (dialog.firstChild) body.append(dialog.firstChild);
  dialog.append(header); if (tabs) dialog.append(tabs); dialog.append(body);
}

document.addEventListener("DOMContentLoaded", () => {
  for (const [id, icon] of Object.entries({ "change-token":"key", "reset-cache":"reset", "search-engines":"search", "icons-api":"icon", "card-effects":"card", "page-background":"background" })) addSettingsIcon(document.getElementById(id), icon);
  const icons = document.getElementById("icons-dialog");
  makeSettingsTabs(icons, [
    ["Providers", "list", [icons.querySelector("#icons-dialog-description"), icons.querySelector("#icons-provider-list")]],
    ["Appearance & quality", "icon", [...icons.querySelectorAll(".icon-quality, .icons-note")]],
  ]);
  const engines = document.getElementById("engines-dialog");
  const catalog = engines.querySelector("details"); catalog.open = true;
  makeSettingsTabs(engines, [
    ["My engines", "search", [engines.querySelector("p"), engines.querySelector("#engine-settings-list")]],
    ["Catalog", "list", [catalog]], ["Custom engine", "add", [engines.querySelector("#engine-editor")]],
  ]);
  for (const [id, icon] of [["effects-dialog","card"],["icons-dialog","icon"],["engines-dialog","search"],["background-dialog","background"]]) prepareSettingsDialog(document.getElementById(id), icon);
});
