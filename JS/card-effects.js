"use strict";

// Original materials inspired by poke-holo.simey.me, not copied assets/styles.
const CARD_EFFECTS_KEY = "cardEffectsV1";
const EFFECT_MATERIALS = {
  glass: "Glass", holo: "Holographic", beams: "Holo beams", cosmos: "Cosmos",
  radiant: "Radiant", rainbow: "Rainbow", gold: "Gold", etched: "Etched silver",
};
const EFFECT_PATTERNS = { none: "None", lines: "Fine stripes", cross: "Crosshatch", dots: "Dots", grain: "Sparkle grain", rings: "Engraved rings", grid: "Micro grid", woven: "Woven", brushed: "Brushed metal", waves: "Ripples", scales: "Scales", twinkle: "Starlight", diamonds: "Diamond mesh", pinstripe: "Pinstripes", confetti: "Foil flakes", honeycomb: "Honeycomb" };
const GLASS_MODES = { glass: "Gradient glass", frosted: "Frosted", clear: "Clear", solid: "Solid white" };
const BACKGROUND_MODES = { balanced: "Balanced (original)", faithful: "Faithful to sampled color", pastel: "Pastel", vivid: "Vivid", mono: "Monochrome", complement: "Complementary" };
const BACKGROUND_SHAPES = { linear: "Linear", radial: "Radial glow", solid: "Solid color" };
const TEXT_FONTS = { system: "System", humanist: "Humanist", serif: "Serif", mono: "Monospace", arial: "Arial", helvetica: "Helvetica Neue", segoe: "Segoe UI", roboto: "Roboto", inter: "Inter", avenir: "Avenir Next", trebuchet: "Trebuchet MS", tahoma: "Tahoma" };
const TEXT_FONT_STACKS = { system: 'system-ui, sans-serif', humanist: 'Verdana, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace', arial: 'Arial, Helvetica, sans-serif', helvetica: '"Helvetica Neue", Helvetica, Arial, sans-serif', segoe: '"Segoe UI", system-ui, sans-serif', roboto: 'Roboto, Arial, sans-serif', inter: 'Inter, system-ui, sans-serif', avenir: '"Avenir Next", Avenir, system-ui, sans-serif', trebuchet: '"Trebuchet MS", Arial, sans-serif', tahoma: 'Tahoma, Verdana, sans-serif' };
const EFFECT_SELECTS = [["material", EFFECT_MATERIALS], ["pattern", EFFECT_PATTERNS], ["glassMode", GLASS_MODES], ["bgMode", BACKGROUND_MODES], ["bgShape", BACKGROUND_SHAPES], ["textFont", TEXT_FONTS], ["textCase", { none: "Original", uppercase: "UPPERCASE", lowercase: "lowercase", capitalize: "Capitalize" }], ["textAlign", { left: "Left", center: "Center", right: "Right" }]];
const EFFECT_DEFAULTS = { material: "holo", pattern: "lines", foil: 30, texture: 50, glare: 100, depth: 100, glass: 100, shadow: 100, softness: 100, rim: 20, radius: 8, glassRadius: 22, saturation: 100, idleFoil: 0, idleSaturation: 100, idleBrightness: 100, idleShadow: 0, direction: "up", travel: 8, zoom: 1.6, iconShadow: 100, iconSoftness: 100, iconBorder: 100, iconSurface: 100, iconSize: 38, iconPadding: 10, artworkRadius: 12, iconOpacity: 100, iconSaturation: 100, iconBrightness: 100, iconRestShadow: 0, iconParallax: 100, iconTilt: 100, iconZoom: 11, iconFoil: 100, iconGlare: 100, glassAngle: 180, glassMode: "glass", bgMode: "faithful", bgSaturation: 100, bgLightness: 0, bgContrast: 100, bgSpread: 100, bgAngle: 135, bgHue: 0, bgShape: "radial", textFont: "system", textCase: "none", textAlign: "left", textSize: 13.333, textWeight: 550, textPaddingX: 8, textPaddingY: 5, textSpacing: 0, textLineHeight: 160 };
const EFFECT_CONTROLS = [
  ["textSize", "Font size", 32, "px", "Typography"], ["textWeight", "Font weight", 900, "", "Typography"],
  ["textSpacing", "Letter spacing", 5, "px", "Typography"], ["textLineHeight", "Line height", 220, "%", "Typography"],
  ["textPaddingX", "Horizontal padding", 32, "px", "Spacing"], ["textPaddingY", "Vertical padding", 24, "px", "Spacing"],
  ["foil", "Iridescence", 100, "%", "Material"], ["texture", "Pattern intensity", 100, "%", "Material"],
  ["glare", "Light reflection", 100, "%", "Material"], ["saturation", "Color saturation", 180, "%", "Material"],
  ["depth", "3D depth", 300, "%", "Motion & lighting"], ["glass", "Glass lift & scale", 120, "%", "Motion & lighting"],
  ["shadow", "Hover shadow", 180, "%", "Motion & lighting"], ["softness", "Shadow softness", 180, "%", "Motion & lighting"],
  ["rim", "Luminous edge", 180, "%", "Shape"], ["radius", "Card corners", 28, "px", "Shape"], ["glassRadius", "Glass corners", 29, "px", "Shape"],
  ["travel", "Vertical travel", 30, "px", "Motion & lighting"], ["zoom", "Card enlargement", 20, "%", "Motion & lighting"],
  ["iconShadow", "Glass shadow", 200, "%", "Icon glass"], ["iconSoftness", "Glass shadow softness", 200, "%", "Icon glass"],
  ["iconBorder", "Glass outline", 200, "%", "Icon glass"], ["iconSurface", "Glass opacity", 150, "%", "Icon glass"],
  ["iconSize", "Artwork size", 64, "px", "Artwork"], ["iconPadding", "Glass padding", 24, "px", "Glass shape"],
  ["artworkRadius", "Artwork corners", 32, "px", "Artwork"], ["iconOpacity", "Artwork opacity", 100, "%", "Artwork"],
  ["iconSaturation", "Artwork saturation", 200, "%", "Artwork"], ["iconBrightness", "Artwork brightness", 160, "%", "Artwork"],
  ["iconRestShadow", "Resting glass shadow", 100, "%", "Icon glass"], ["iconParallax", "Glass parallax", 200, "%", "Glass motion"],
  ["iconTilt", "Glass tilt", 200, "%", "Glass motion"], ["iconZoom", "Glass enlargement", 30, "%", "Glass motion"],
  ["iconFoil", "Glass iridescence", 200, "%", "Glass finish"], ["iconGlare", "Glass highlight", 200, "%", "Glass finish"],
  ["glassAngle", "Glass gradient angle", 360, "°", "Glass finish"],
  ["bgSaturation", "Background saturation", 200, "%", "Background color"], ["bgLightness", "Lightness offset", 30, "%", "Background color"],
  ["bgContrast", "Contrast balancing", 150, "%", "Background color"], ["bgSpread", "Gradient separation", 250, "%", "Background color"],
  ["bgHue", "Accent hue offset", 180, "°", "Background color"], ["bgAngle", "Background gradient angle", 360, "°", "Background color"],
  ["idleFoil", "Resting foil", 100, "%", "Inactive cards"], ["idleSaturation", "Resting saturation", 140, "%", "Inactive cards"],
  ["idleBrightness", "Resting brightness", 120, "%", "Inactive cards"], ["idleShadow", "Resting shadow", 100, "%", "Inactive cards"],
];
function effectMinimum(key) {
  return { textSize: 10, textWeight: 300, textSpacing: -1, textLineHeight: 100, idleBrightness: 40, iconSize: 20, iconOpacity: 20, iconBrightness: 40, bgLightness: -30, bgHue: -180 }[key] ?? 0;
}
function normalizeCardEffects(value) {
  const result = { ...EFFECT_DEFAULTS };
  if (!value || typeof value !== "object") return result;
  for (const [key, options] of EFFECT_SELECTS) {
    if (Object.hasOwn(options, value[key])) result[key] = value[key];
  }
  if (["up", "center", "down"].includes(value.direction)) result.direction = value.direction;
  for (const [key, , max] of EFFECT_CONTROLS) {
    if (Number.isFinite(value[key])) result[key] = Math.max(effectMinimum(key), Math.min(max, value[key]));
  }
  return result;
}
let cardEffects = normalizeCardEffects(storage.readJSON(CARD_EFFECTS_KEY, null));
function applyCardEffects(settings, target = document.documentElement) {
  target.dataset.cardMaterial = settings.material;
  target.dataset.cardPattern = settings.pattern;
  target.dataset.glassMode = settings.glassMode;
  target.style.setProperty("--effect-textFont", TEXT_FONT_STACKS[settings.textFont]);
  target.style.setProperty("--effect-textCase", settings.textCase);
  target.style.setProperty("--effect-textAlign", settings.textAlign);
  for (const [key, , , unit] of EFFECT_CONTROLS) {
    target.style.setProperty(`--effect-${key}`, unit === "px" ? `${settings[key]}px` : unit === "°" ? `${settings[key]}deg` : unit === "%" ? settings[key] / 100 : settings[key]);
  }
  if (target === document.documentElement) backgroundSettings = settings;
  for (const surface of target.querySelectorAll(".filter, .image")) {
    const color = backgroundSources.get(surface);
    if (color) applyFilterBackground(surface, color, settings);
  }
}
applyCardEffects(cardEffects);

function effectScope(key) {
  if (key.startsWith("idle") || key === "iconRestShadow") return "rest";
  return ["direction", "depth", "glass", "shadow", "softness", "rim", "travel", "zoom", "glare", "iconShadow", "iconParallax", "iconTilt", "iconZoom", "iconGlare"].includes(key) ? "hover" : "both";
}
// Each setting has exactly one home; state is conveyed by its badge, not by a second taxonomy.
const EFFECT_SECTIONS = [
  { id: "card", label: "Card", description: "The outer card shape and overall color treatment.", groups: [
    ["Shape", ["radius"]], ["Overall color", ["saturation"]], ["At rest", ["idleSaturation", "idleBrightness"]],
  ] },
  { id: "motion", label: "Motion", description: "Tilt, movement and enlargement while interacting with a card.", groups: [
    ["Whole card", ["direction", "depth", "travel", "zoom"]],
    ["Inner glass", ["glass", "iconParallax", "iconTilt", "iconZoom"]],
  ] },
  { id: "lighting", label: "Light & shadow", description: "Reflections, luminous edges and shadows cast by the whole card.", groups: [
    ["Light", ["glare", "rim"]], ["Hover shadow", ["shadow", "softness"]], ["Resting shadow", ["idleShadow"]],
  ] },
  { id: "surface", label: "Material & pattern", description: "Reflective finishes and fine surface textures. Resting visibility reveals both when idle.", groups: [
    ["Reflective material", ["material", "foil"]], ["Surface pattern", ["pattern", "texture"]], ["At rest", ["idleFoil"]],
  ] },
  { id: "glass", label: "Inner glass", description: "The transparent square behind the icon. Its movement is in Motion.", groups: [
    ["Shape & outline", ["iconPadding", "glassRadius", "iconBorder"]],
    ["Surface & highlights", ["glassMode", "iconSurface", "glassAngle", "iconFoil", "iconGlare"]],
    ["Glass shadow", ["iconShadow", "iconRestShadow", "iconSoftness"]],
  ] },
  { id: "icon", label: "Icon", description: "The logo or initials inside the glass. These settings do not resize the outer card.", groups: [
    ["Size & shape", ["iconSize", "artworkRadius"]], ["Color & opacity", ["iconOpacity", "iconSaturation", "iconBrightness"]],
  ] },
  { id: "background", label: "Card colors", description: "Colors derived from the icon, using its cached color sample. Photo covers retain their image.", groups: [
    ["Color mapping", ["bgMode", "bgSaturation", "bgLightness", "bgContrast"]],
    ["Gradient", ["bgShape", "bgSpread", "bgHue", "bgAngle"]],
  ] },
  { id: "text", label: "Text", description: "Card titles. Fonts use a system fallback when unavailable; nothing is downloaded.", groups: [
    ["Typography", ["textFont", "textSize", "textWeight", "textCase"]],
    ["Alignment & spacing", ["textAlign", "textSpacing", "textLineHeight", "textPaddingX", "textPaddingY"]],
  ] },
];
const EFFECT_LABELS = { depth: "Card tilt strength", iconParallax: "Follow pointer", iconTilt: "Glass tilt strength", iconSize: "Icon size", artworkRadius: "Icon corner radius", iconOpacity: "Icon opacity", iconSaturation: "Icon saturation", iconBrightness: "Icon brightness", bgSpread: "Gradient color difference", bgContrast: "Color contrast", bgHue: "Second color hue shift", iconSoftness: "Shadow blur", softness: "Shadow blur", iconBorder: "Glass border strength", material: "Material", pattern: "Pattern", direction: "Movement direction", glassMode: "Glass finish", bgMode: "Color treatment", bgShape: "Gradient shape", textFont: "Font family", textCase: "Letter case", textAlign: "Alignment", glass: "Overall glass movement", iconZoom: "Hover enlargement", idleFoil: "Resting visibility", saturation: "Overall saturation", rim: "Edge glow intensity", foil: "Iridescence intensity" };
function renderEffectControl(key) {
  const control = EFFECT_CONTROLS.find(entry => entry[0] === key);
  const label = EFFECT_LABELS[key] || control?.[1];
  if (!control) {
    const choices = key === "direction" ? '<option value="up">Up</option><option value="center">Centered</option><option value="down">Down</option>' : "";
    const patterns = key === "pattern" ? `<div class="pattern-gallery" role="group" aria-label="Pattern samples">${Object.entries(EFFECT_PATTERNS).map(([id, name]) => `<button type="button" data-pattern-choice="${id}" aria-label="${name}" aria-pressed="false"><span class="pattern-swatch" data-card-pattern="${id}" aria-hidden="true"></span><span>${name}</span></button>`).join("")}</div>` : "";
    return `<label for="effects-${key}">${label}<select id="effects-${key}" name="${key}">${choices}</select></label>${patterns}`;
  }
  const [, , max, unit] = control;
  const step = unit === "px" || ["zoom", "iconZoom"].includes(key) ? 1 : unit === "°" || max <= 100 ? 5 : 10;
  return `<label for="effects-${key}">${label}<output for="effects-${key}" data-unit="${unit}"></output><input id="effects-${key}" name="${key}" type="range" min="${effectMinimum(key)}" max="${max}" step="any" data-coarse-step="${step}" data-fine-step="${key === "textWeight" ? 1 : .1}"></label>`;
}

const effectsDialog = document.createElement("dialog");
effectsDialog.id = "effects-dialog";
effectsDialog.setAttribute("aria-labelledby", "effects-title");
effectsDialog.innerHTML = `<h2 id="effects-title">Card effects</h2>
<p>Choose an element to customize. Badges show whether a setting affects hover, rest, or both.</p>
<div class="effects-layout"><div class="effects-demo"><div id="effects-preview-stage"><div class="card icon-cards" id="effects-preview"><div class="filter"><span class="icon"><span class="initial-glyph">Aa</span></span></div><div class="title">Live preview</div></div></div><div class="effects-preview-modes" role="group" aria-label="Preview state"><button type="button" data-preview="hover" aria-pressed="true">Hover</button><button type="button" data-preview="rest" aria-pressed="false">At rest</button></div><p class="icons-note">Move over the preview or drag on touch. Hold Shift for fine slider adjustments. Changes apply after Save.</p></div>
<form id="effects-form"><div class="effects-tabs" role="tablist" aria-label="Effect settings">
${EFFECT_SECTIONS.map(({id,label},i)=>`<button type="button" role="tab" id="effects-tab-${id}" aria-controls="effects-panel-${id}" aria-selected="${i===0}" tabindex="${i===0 ? 0 : -1}">${settingsIcon(id)}${label}</button>`).join("")}</div>
${EFFECT_SECTIONS.map(({id,label,description,groups},i)=>`<section role="tabpanel" id="effects-panel-${id}" aria-labelledby="effects-tab-${id}" ${i ? "hidden" : ""}><h3>${label}</h3><p class="icons-note effects-section-description">${description}</p>${groups.map(([title,keys])=>`<fieldset><legend>${title}</legend>${keys.map(renderEffectControl).join("")}</fieldset>`).join("")}</section>`).join("")}</form></div>
<p class="icons-note">Reduced-motion preferences take priority over animated effects. Saved in this browser; preserved when you reset the icon cache.</p>
<p id="effects-feedback" role="status"></p><div class="icons-dialog-actions"><button type="button" id="effects-reset">Restore defaults</button><button type="button" id="effects-cancel">Cancel</button><button type="button" id="effects-save">Save</button></div>`;
document.body.append(effectsDialog);
const effectsForm = effectsDialog.querySelector("form");
for (const [key, options] of EFFECT_SELECTS) {
  for (const [value, label] of Object.entries(options)) effectsForm.elements[key].add(new Option(label, value));
}
// Expose the scope beside every control, including selects, to sighted and screen-reader users.
for (const label of effectsForm.querySelectorAll("label")) {
  const control = label.querySelector("input, select");
  const caption = document.createElement("span");
  caption.className = "setting-caption";
  caption.append(label.firstChild);
  const badge = document.createElement("span");
  badge.className = "setting-scope";
  badge.dataset.scope = effectScope(control.name);
  badge.textContent = { both: "Both", hover: "Hover", rest: "At rest" }[badge.dataset.scope];
  badge.id = `scope-${control.name}`;
  control.setAttribute("aria-describedby", badge.id);
  caption.append(badge);
  label.prepend(caption);
}
let effectsDraft;
const effectsPreview = document.getElementById("effects-preview");
const effectsDemo = effectsDialog.querySelector(".effects-demo");
// Same color pipeline as real favicon cards; no remote preview image is needed.
applyFilterBackground(effectsPreview.querySelector(".filter"), { r: 36, g: 117, b: 158 });
const effectsReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let previewRest = false;
let previewX = -.3, previewY = -.25, previewFrame = 0;
const previewState = { card: effectsPreview, x: 0, y: 0, depth: 0, lightX: 0, lightY: 0, iconX: 0, iconY: 0, iconDepth: 0, touch: false };
let previewTime = 0;
function drawEffectsPreview(time) {
  cancelAnimationFrame(previewFrame);
  previewFrame = 0;
  if (!effectsDraft || !effectsDialog.open) return;
  const now = typeof time === "number" ? time : performance.now();
  const dt = previewTime ? Math.min(40, now-previewTime)/1000 : .016;
  previewTime = now;
  const resting = previewRest || effectsReducedMotion.matches;
  const x = resting ? 0 : previewX, y = resting ? 0 : previewY, depth = resting ? 0 : 1;
  effectsPreview.classList.toggle("is-floating", !resting);
  const targets = { x, y, depth, iconX: x, iconY: y, iconDepth: depth };
  for (const [key, target] of Object.entries(targets)) springCardValue(previewState, key, target, key === "iconDepth" ? 24 : key.startsWith("icon") ? 22 : 28, dt);
  const ease = 1-Math.exp(-dt/.045);
  previewState.lightX += (x-previewState.lightX)*ease;
  previewState.lightY += (y-previewState.lightY)*ease;
  if (resting) for (const key of ["x","y","depth","iconX","iconY","iconDepth","lightX","lightY"]) { previewState[key]=0; previewState[`${key}Velocity`]=0; }
  renderCardMotion(previewState, effectsDraft);
  if (Object.entries(targets).some(([key,target])=>Math.abs(previewState[key]-target)>.001 || Math.abs(previewState[`${key}Velocity`] || 0)>.01) || Math.abs(previewState.lightX-x)+Math.abs(previewState.lightY-y)>.001) previewFrame=requestAnimationFrame(drawEffectsPreview);
  else previewTime=0;
}

function updateEffectsDraft() {
  effectsDraft = normalizeCardEffects(Object.fromEntries([...effectsForm.elements].filter(el=>el.name).map(el=>[el.name, el.type === "range" ? Number(el.value) : el.value])));
  applyCardEffects(effectsDraft, effectsDemo);
  for (const output of effectsForm.querySelectorAll("output")) output.value = `${Number(Number(document.getElementById(output.getAttribute("for")).value).toFixed(2))}${output.dataset.unit}`;
  for (const button of effectsForm.querySelectorAll("[data-pattern-choice]")) button.setAttribute("aria-pressed", String(button.dataset.patternChoice === effectsDraft.pattern));
  document.getElementById("effects-feedback").textContent = "";
  drawEffectsPreview();
}
function fillEffectsForm(value) {
  for (const [key, entry] of Object.entries(value)) effectsForm.elements[key].value = entry;
  updateEffectsDraft();
}
for (const button of effectsDialog.querySelectorAll("[data-preview]")) button.addEventListener("click", () => {
  previewRest = button.dataset.preview === "rest";
  for (const option of effectsDialog.querySelectorAll("[data-preview]")) option.setAttribute("aria-pressed", String(option === button));
  drawEffectsPreview();
});
const effectTabs = [...effectsDialog.querySelectorAll('[role="tab"]')];
function selectEffectTab(button) {
  button.scrollIntoView({ block: "nearest", inline: "nearest" });
  for (const tab of effectTabs) {
    const selected = tab === button;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
  }
  if (button.id === "effects-tab-motion") {
    previewRest = false;
    for (const option of effectsDialog.querySelectorAll("[data-preview]")) option.setAttribute("aria-pressed", String((option.dataset.preview === "rest") === previewRest));
  }
  drawEffectsPreview();
}
for (const [index,tab] of effectTabs.entries()) {
  tab.addEventListener("click",()=>selectEffectTab(tab));
  tab.addEventListener("keydown",event=>{
    const next = event.key === "ArrowRight" ? (index+1)%effectTabs.length : event.key === "ArrowLeft" ? (index+effectTabs.length-1)%effectTabs.length : event.key === "Home" ? 0 : event.key === "End" ? effectTabs.length-1 : -1;
    if (next<0) return;
    event.preventDefault(); effectTabs[next].focus(); selectEffectTab(effectTabs[next]);
  });
}
for (const button of effectsForm.querySelectorAll("[data-pattern-choice]")) button.addEventListener("click", () => {
  effectsForm.elements.pattern.value = button.dataset.patternChoice;
  updateEffectsDraft();
});
effectsForm.addEventListener("submit", event=>event.preventDefault());
function previewControlScope(event) {
  if (!event.target.matches("input[name], select[name]")) return;
  const scope = effectScope(event.target.name);
  if (scope === "both") return;
  previewRest = scope === "rest";
  for (const option of effectsDialog.querySelectorAll("[data-preview]")) option.setAttribute("aria-pressed", String((option.dataset.preview === "rest") === previewRest));
  drawEffectsPreview();
}
effectsForm.addEventListener("focusin", previewControlScope);
effectsForm.addEventListener("input", event => { previewControlScope(event); updateEffectsDraft(); });
document.getElementById("effects-preview-stage").addEventListener("pointermove", event => {
  const bounds = document.getElementById("effects-preview-stage").getBoundingClientRect();
  previewX = Math.max(-1, Math.min(1, (event.clientX-bounds.left)/bounds.width*2-1));
  previewY = Math.max(-1, Math.min(1, (event.clientY-bounds.top)/bounds.height*2-1));
  if (!previewFrame) previewFrame = requestAnimationFrame(drawEffectsPreview);
});
document.getElementById("effects-preview-stage").addEventListener("pointerleave", ()=>{previewX=-.3;previewY=-.25;drawEffectsPreview();});
effectsReducedMotion.addEventListener("change", drawEffectsPreview);
effectsDialog.addEventListener("close", ()=>{cancelAnimationFrame(previewFrame);previewFrame=0;previewTime=0;});
document.getElementById("card-effects").addEventListener("click", ()=>{effectsDialog.showModal();fillEffectsForm(cardEffects);});
document.getElementById("effects-reset").addEventListener("click", ()=>fillEffectsForm(EFFECT_DEFAULTS));
document.getElementById("effects-cancel").addEventListener("click", ()=>effectsDialog.close());
document.getElementById("effects-save").addEventListener("click", ()=>{
  if (!storage.set(CARD_EFFECTS_KEY, JSON.stringify(effectsDraft))) {
    document.getElementById("effects-feedback").textContent = "Settings could not be saved. Browser storage may be blocked or full.";
    return;
  }
  cardEffects = { ...effectsDraft };
  applyCardEffects(cardEffects);
  document.dispatchEvent(new Event("cardeffectschange"));
  effectsDialog.close();
});
