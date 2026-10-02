"use strict";

// Original materials inspired by poke-holo.simey.me, not copied assets/styles.
const CARD_EFFECTS_KEY = "cardEffectsV1";
const EFFECT_MATERIALS = {
  glass: "Glass", holo: "Holographic", beams: "Holo beams", cosmos: "Cosmos",
  radiant: "Radiant", rainbow: "Rainbow", gold: "Gold", etched: "Etched silver",
};
const EFFECT_PATTERNS = { none: "None", lines: "Fine stripes", cross: "Crosshatch", dots: "Dots", grain: "Sparkle grain", rings: "Engraved rings" };
const EFFECT_DEFAULTS = { material: "holo", pattern: "lines", foil: 30, texture: 50, glare: 100, depth: 100, glass: 100, shadow: 100, softness: 100, rim: 100, radius: 8, glassRadius: 22, saturation: 100, idleFoil: 0, idleSaturation: 100, idleBrightness: 100, idleShadow: 0, direction: "up", travel: 8, zoom: 1.6, iconShadow: 100, iconSoftness: 100, iconBorder: 100, iconSurface: 100 };
const EFFECT_CONTROLS = [
  ["foil", "Iridescence", 100, "%", "Material"], ["texture", "Pattern intensity", 100, "%", "Material"],
  ["glare", "Light reflection", 100, "%", "Material"], ["saturation", "Color saturation", 180, "%", "Material"],
  ["depth", "3D depth", 300, "%", "Motion & lighting"], ["glass", "Glass lift & scale", 120, "%", "Motion & lighting"],
  ["shadow", "Hover shadow", 180, "%", "Motion & lighting"], ["softness", "Shadow softness", 180, "%", "Motion & lighting"],
  ["rim", "Luminous edge", 180, "%", "Shape"], ["radius", "Card corners", 28, "px", "Shape"], ["glassRadius", "Glass corners", 29, "px", "Shape"],
  ["travel", "Vertical travel", 30, "px", "Motion & lighting"], ["zoom", "Card enlargement", 20, "%", "Motion & lighting"],
  ["iconShadow", "Glass shadow", 200, "%", "Icon glass"], ["iconSoftness", "Glass shadow softness", 200, "%", "Icon glass"],
  ["iconBorder", "Glass outline", 200, "%", "Icon glass"], ["iconSurface", "Glass opacity", 150, "%", "Icon glass"],
  ["idleFoil", "Resting foil", 100, "%", "Inactive cards"], ["idleSaturation", "Resting saturation", 140, "%", "Inactive cards"],
  ["idleBrightness", "Resting brightness", 120, "%", "Inactive cards"], ["idleShadow", "Resting shadow", 100, "%", "Inactive cards"],
];
function normalizeCardEffects(value) {
  const result = { ...EFFECT_DEFAULTS };
  if (!value || typeof value !== "object") return result;
  for (const [key, options] of [["material", EFFECT_MATERIALS], ["pattern", EFFECT_PATTERNS]]) {
    if (Object.hasOwn(options, value[key])) result[key] = value[key];
  }
  if (["up", "center", "down"].includes(value.direction)) result.direction = value.direction;
  for (const [key, , max] of EFFECT_CONTROLS) {
    if (Number.isFinite(value[key])) result[key] = Math.max(key === "idleBrightness" ? 40 : 0, Math.min(max, value[key]));
  }
  return result;
}
let cardEffects = normalizeCardEffects(storage.readJSON(CARD_EFFECTS_KEY, null));
function applyCardEffects(settings, target = document.documentElement) {
  target.dataset.cardMaterial = settings.material;
  target.dataset.cardPattern = settings.pattern;
  for (const [key, , , unit] of EFFECT_CONTROLS) {
    target.style.setProperty(`--effect-${key}`, unit === "px" ? `${settings[key]}px` : settings[key] / 100);
  }
}
applyCardEffects(cardEffects);

function effectTab(key) {
  if (key.startsWith("idle")) return "rest";
  return ["foil", "texture", "saturation", "radius", "glassRadius", "iconBorder", "iconSurface"].includes(key) ? "general" : "hover";
}

const effectsDialog = document.createElement("dialog");
effectsDialog.id = "effects-dialog";
effectsDialog.setAttribute("aria-labelledby", "effects-title");
effectsDialog.innerHTML = `<h2 id="effects-title">Card effects</h2>
<p>Choose a reflective finish, mix in a pattern, and adjust its intensity.</p>
<div class="effects-layout"><div class="effects-demo"><div id="effects-preview-stage"><div class="card icon-cards" id="effects-preview"><div class="filter"><span class="icon"><span class="initial-glyph">Aa</span></span></div><div class="title">Live preview</div></div></div><div class="effects-preview-modes" role="group" aria-label="Preview state"><button type="button" data-preview="hover" aria-pressed="true">Hover</button><button type="button" data-preview="rest" aria-pressed="false">At rest</button></div><p class="icons-note">Move over the preview or drag on touch. Settings apply to your cards after Save.</p></div>
<form id="effects-form"><div class="effects-tabs" role="tablist" aria-label="Effect settings">
${[["general","General"],["hover","Hover"],["rest","At rest"]].map(([id,label],i)=>`<button type="button" role="tab" id="effects-tab-${id}" aria-controls="effects-panel-${id}" aria-selected="${i===0}" tabindex="${i===0 ? 0 : -1}">${label}</button>`).join("")}</div>
${["general","hover","rest"].map((tab,i)=>`<section role="tabpanel" id="effects-panel-${tab}" aria-labelledby="effects-tab-${tab}" ${i ? "hidden" : ""}>
${tab === "general" ? '<p class="icons-note">Shared by hover and resting cards.</p><label>Material<select name="material"></select></label><label>Pattern<select name="pattern"></select></label>' : ""}
${tab === "hover" ? '<label>Movement direction<select name="direction"><option value="up">Up</option><option value="center">Centered</option><option value="down">Down</option></select></label>' : ""}
${[...new Set(EFFECT_CONTROLS.filter(control=>effectTab(control[0])===tab).map(control=>control[4]))].map(group=>`<fieldset><legend>${group}</legend>${EFFECT_CONTROLS.filter(control=>effectTab(control[0])===tab && control[4]===group).map(([key,label,max,unit])=>`<label for="effects-${key}">${label}<output for="effects-${key}" data-unit="${unit}"></output><input id="effects-${key}" name="${key}" type="range" min="${key === "idleBrightness" ? 40 : 0}" max="${max}" step="${key === "zoom" ? .1 : 1}"></label>`).join("")}</fieldset>`).join("")}</section>`).join("")}</form></div>
<p class="icons-note">Reduced-motion preferences take priority over animated effects. Saved in this browser; preserved when you reset the icon cache.</p>
<p id="effects-feedback" role="status"></p><div class="icons-dialog-actions"><button type="button" id="effects-reset">Restore defaults</button><button type="button" id="effects-cancel">Cancel</button><button type="button" id="effects-save">Save</button></div>`;
document.body.append(effectsDialog);
const effectsForm = effectsDialog.querySelector("form");
for (const [key, options] of [["material", EFFECT_MATERIALS], ["pattern", EFFECT_PATTERNS]]) {
  for (const [value, label] of Object.entries(options)) effectsForm.elements[key].add(new Option(label, value));
}
let effectsDraft;
const effectsPreview = document.getElementById("effects-preview");
const effectsDemo = effectsDialog.querySelector(".effects-demo");
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
  for (const output of effectsForm.querySelectorAll("output")) output.value = `${document.getElementById(output.getAttribute("for")).value}${output.dataset.unit}`;
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
const effectTabs = [...effectsForm.querySelectorAll('[role="tab"]')];
function selectEffectTab(button) {
  for (const tab of effectTabs) {
    const selected = tab === button;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
  }
  if (button.id !== "effects-tab-general") {
    previewRest = button.id === "effects-tab-rest";
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
effectsForm.addEventListener("submit", event=>event.preventDefault());
effectsForm.addEventListener("input", updateEffectsDraft);
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
