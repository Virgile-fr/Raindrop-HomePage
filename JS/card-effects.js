"use strict";

// Original materials inspired by poke-holo.simey.me, not copied assets/styles.
const CARD_EFFECTS_KEY = "cardEffectsV1";
const EFFECT_MATERIALS = {
  glass: "Glass", holo: "Holographic", beams: "Holo beams", cosmos: "Cosmos",
  radiant: "Radiant", rainbow: "Rainbow", gold: "Gold", etched: "Etched silver",
};
const EFFECT_PATTERNS = { none: "None", lines: "Fine stripes", cross: "Crosshatch", dots: "Dots", grain: "Sparkle grain", rings: "Engraved rings" };
const EFFECT_DEFAULTS = { material: "holo", pattern: "lines", foil: 30, texture: 50, glare: 100, depth: 100, glass: 100 };
function normalizeCardEffects(value) {
  const result = { ...EFFECT_DEFAULTS };
  if (!value || typeof value !== "object") return result;
  for (const [key, options] of [["material", EFFECT_MATERIALS], ["pattern", EFFECT_PATTERNS]]) {
    if (Object.hasOwn(options, value[key])) result[key] = value[key];
  }
  for (const key of ["foil", "texture", "glare", "depth", "glass"]) {
    if (Number.isFinite(value[key])) result[key] = Math.max(0, Math.min(key === "depth" || key === "glass" ? 120 : 100, value[key]));
  }
  return result;
}
let cardEffects = normalizeCardEffects(storage.readJSON(CARD_EFFECTS_KEY, null));
function applyCardEffects(settings, target = document.documentElement) {
  target.dataset.cardMaterial = settings.material;
  target.dataset.cardPattern = settings.pattern;
  for (const key of ["foil", "texture", "glare"]) target.style.setProperty(`--effect-${key}`, settings[key] / 100);
}
applyCardEffects(cardEffects);

const effectsDialog = document.createElement("dialog");
effectsDialog.id = "effects-dialog";
effectsDialog.setAttribute("aria-labelledby", "effects-title");
effectsDialog.innerHTML = `<h2 id="effects-title">Card effects</h2>
<p>Choose a reflective finish, mix in a pattern, and adjust its intensity.</p>
<div class="effects-layout"><div class="effects-demo"><div class="card icon-cards is-floating" id="effects-preview"><div class="filter"><span class="icon"><span class="initial-glyph">Aa</span></span></div><div class="title">Live preview</div></div><p class="icons-note">Move over the preview or drag on touch. Settings apply to your cards after Save.</p></div>
<form id="effects-form"><label>Material<select name="material"></select></label><label>Pattern<select name="pattern"></select></label>
${[["foil","Iridescence",100],["texture","Pattern intensity",100],["glare","Light reflection",100],["depth","3D depth",120],["glass","Glass lift & scale",120]].map(([key,label,max]) => `<label for="effects-${key}">${label}<output for="effects-${key}"></output><input id="effects-${key}" name="${key}" type="range" min="0" max="${max}" step="1"></label>`).join("")}</form></div>
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
let previewX = -.3, previewY = -.25, previewFrame = 0;
function drawEffectsPreview() {
  previewFrame = 0;
  if (!effectsDraft || !effectsDialog.open) return;
  const x = previewX, y = previewY, depth = effectsDraft.depth / 100, glass = effectsDraft.glass / 100;
  const p = effectsPreview.style;
  effectsPreview.style.transform = effectsReducedMotion.matches ? "none" : `perspective(900px) rotateX(${-y*9*depth}deg) rotateY(${x*11*depth}deg)`;
  for (const [key,value] of Object.entries({"light-x":`${50+x*42}%`,"light-y":`${42+y*40}%`,"holo-x":`${50-x*65}%`,"holo-y":`${50-y*55}%`,"sheen-x":`${50+x*32}%`,"sheen-y":`${50+y*28}%`,"sheen-angle":`${118+x*18-y*12}deg`,"grain-x":`${x*8}px`,"grain-y":`${y*8}px`,"icon-scale":1+.11*glass,"icon-x":`${x*5.5*glass}px`,"icon-y":`${(y*5-3)*glass}px`})) p.setProperty(`--float-${key}`,value);
}
function updateEffectsDraft() {
  effectsDraft = normalizeCardEffects(Object.fromEntries([...effectsForm.elements].filter(el=>el.name).map(el=>[el.name, el.type === "range" ? Number(el.value) : el.value])));
  applyCardEffects(effectsDraft, effectsDemo);
  for (const output of effectsForm.querySelectorAll("output")) output.value = `${document.getElementById(output.getAttribute("for")).value}%`;
  document.getElementById("effects-feedback").textContent = "";
  drawEffectsPreview();
}
function fillEffectsForm(value) {
  for (const [key, entry] of Object.entries(value)) effectsForm.elements[key].value = entry;
  updateEffectsDraft();
}
effectsForm.addEventListener("submit", event=>event.preventDefault());
effectsForm.addEventListener("input", updateEffectsDraft);
effectsPreview.addEventListener("pointermove", event => {
  const bounds = effectsDemo.getBoundingClientRect();
  previewX = Math.max(-1, Math.min(1, (event.clientX-bounds.left)/bounds.width*2-1));
  previewY = Math.max(-1, Math.min(1, (event.clientY-bounds.top)/220*2-1));
  if (!previewFrame) previewFrame = requestAnimationFrame(drawEffectsPreview);
});
effectsPreview.addEventListener("pointerleave", ()=>{previewX=-.3;previewY=-.25;drawEffectsPreview();});
effectsReducedMotion.addEventListener("change", drawEffectsPreview);
effectsDialog.addEventListener("close", ()=>{cancelAnimationFrame(previewFrame);previewFrame=0;});
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
