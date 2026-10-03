"use strict";

const PAGE_BACKGROUND_KEY = "pageBackgroundV1";
const WALLPAPER_DEFAULTS = { mode: "default", color: "#202b38", color2: "#485d77", angle: 135, fit: "cover", position: "center", parallax: false, image: "" };
function validWallpaperSource(value) {
  if (typeof value !== "string") return false;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return value.length <= 2200000;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
function normalizeWallpaper(value) {
  const result = { ...WALLPAPER_DEFAULTS };
  if (!value || typeof value !== "object") return result;
  for (const [key, options] of Object.entries({ mode: ["default", "color", "gradient", "image"], fit: ["cover", "contain", "width"], position: ["top", "center", "bottom"] })) if (options.includes(value[key])) result[key] = value[key];
  for (const key of ["color", "color2"]) if (/^#[\da-f]{6}$/i.test(value[key])) result[key] = value[key];
  if (Number.isFinite(value.angle)) result.angle = Math.max(0, Math.min(360, value.angle));
  result.parallax = value.parallax === true;
  if (validWallpaperSource(value.image)) result.image = value.image;
  return result;
}
function readWallpaperImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.referrerPolicy = "no-referrer";
    const timer = setTimeout(() => { img.src = ""; reject(new Error("Image loading timed out. Try another URL or import a file.")); }, 15000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error("Could not load this image. Check the URL or choose a local file.")); };
    img.src = source;
  });
}
// Size and crop calculation is shared by the page and preview.
function wallpaperGeometry(width, height, image, fit) {
  const scale = fit === "width" ? width / image.naturalWidth : (fit === "contain" ? Math.min : Math.max)(width / image.naturalWidth, height / image.naturalHeight);
  return { width: image.naturalWidth * scale, height: image.naturalHeight * scale };
}
let pageWallpaper = normalizeWallpaper(storage.readJSON(PAGE_BACKGROUND_KEY, null));
let pageWallpaperImage = null, wallpaperFrame = 0, pageWallpaperGeneration = 0;
const wallpaperMotion = matchMedia("(prefers-reduced-motion: reduce)");
const wallpaperLayer = document.createElement("div"); wallpaperLayer.id = "page-wallpaper"; wallpaperLayer.setAttribute("aria-hidden", "true"); document.body.prepend(wallpaperLayer);
function paintWallpaper(element, value, image, page = false) {
  element.style.backgroundColor = value.mode === "default" ? "var(--body-background-color)" : value.color;
  element.style.backgroundImage = value.mode === "default" ? "var(--body-background-image)" : value.mode === "gradient" ? `linear-gradient(${value.angle}deg, ${value.color}, ${value.color2})` : "none";
  element.style.backgroundSize = "100% 100%"; element.style.backgroundPosition = "center";
  if (value.mode !== "image" || !image) return;
  const width = element.clientWidth, height = element.clientHeight;
  const size = wallpaperGeometry(width, height, image, value.fit);
  const overflow = size.height - height;
  let fraction = { top: 0, center: .5, bottom: 1 }[value.position];
  if (page && value.parallax && !wallpaperMotion.matches && overflow > 1) {
    const travel = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    if (travel > 0) fraction = Math.max(0, Math.min(1, scrollY / travel));
  }
  element.style.backgroundImage = `url(${JSON.stringify(value.image)})`;
  element.style.backgroundSize = `${size.width}px ${size.height}px`;
  element.style.backgroundPosition = `${(width-size.width)/2}px ${-overflow*fraction}px`;
}
function renderPageWallpaper() {
  wallpaperFrame = 0;
  wallpaperLayer.hidden = pageWallpaper.mode === "default";
  paintWallpaper(wallpaperLayer, pageWallpaper, pageWallpaperImage, true);
}
function scheduleWallpaper() { if (!wallpaperFrame) wallpaperFrame = requestAnimationFrame(renderPageWallpaper); }
async function applyPageWallpaper(value) {
  const generation = ++pageWallpaperGeneration;
  pageWallpaper = value; pageWallpaperImage = null; renderPageWallpaper();
  if (value.mode === "image" && value.image) {
    try { const image = await readWallpaperImage(value.image); if (generation !== pageWallpaperGeneration) return; pageWallpaperImage = image; scheduleWallpaper(); }
    catch { /* Use the selected backing color if a remote image is unavailable. */ }
  }
}
addEventListener("scroll", () => { if (pageWallpaper.mode === "image" && pageWallpaper.parallax) scheduleWallpaper(); }, { passive: true });
addEventListener("resize", scheduleWallpaper);
wallpaperMotion.addEventListener("change", scheduleWallpaper);
if (typeof ResizeObserver === "function") new ResizeObserver(scheduleWallpaper).observe(document.body);
applyPageWallpaper(pageWallpaper);

const wallpaperDialog = document.createElement("dialog"); wallpaperDialog.id = "background-dialog"; wallpaperDialog.setAttribute("aria-labelledby", "background-title");
wallpaperDialog.innerHTML = `<h2 id="background-title">Page background</h2>
<div class="icons-dialog-actions"><button id="background-reset" type="button">Restore defaults</button><button id="background-cancel" type="button">Cancel</button><button id="background-save" type="button">Save</button></div>
<div id="wallpaper-preview" role="img" aria-label="Background preview"></div>
<form id="wallpaper-form">
<label hidden>Background type<select name="mode"><option value="default">Theme default</option><option value="color">Solid color</option><option value="gradient">Gradient</option><option value="image">Image</option></select></label>
<div data-wallpaper-modes="color gradient image"><label>Base color<input name="color" type="color"></label></div>
<div data-wallpaper-modes="gradient"><label>Second color<input name="color2" type="color"></label><label>Gradient angle <output id="wallpaper-angle"></output><input name="angle" type="range" min="0" max="360" step="any" data-coarse-step="5" data-fine-step=".1"></label></div>
<div data-wallpaper-modes="image">
<label>Import an image<input id="wallpaper-file" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif"></label>
<p class="icons-note">Imported images stay in this browser. They are resized to at most 2560 px to limit storage use.</p>
<label>Or use an image URL<input id="wallpaper-url" type="url" placeholder="https://example.com/wallpaper.jpg"></label><button id="wallpaper-load" type="button">Load image</button>
<p class="icons-note">Use a direct HTTP(S) image URL. HTTPS is more reliable; the image host receives a request when the wallpaper loads.</p>
<label>Image sizing<select name="fit"><option value="cover">Fill screen (crop edges)</option><option value="contain">Fit whole image</option><option value="width">Fit screen width</option></select></label>
<label>Vertical alignment<select name="position"><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label>
<label class="wallpaper-check"><input name="parallax" type="checkbox">Scroll parallax</label>
<p class="icons-note" id="wallpaper-parallax-help">Parallax pans from top to bottom as you scroll, replacing fixed alignment. It only runs when the displayed image is taller than the screen. Reduced motion disables it.</p>
</div></form><p id="wallpaper-feedback" role="status"></p>`;
document.body.append(wallpaperDialog);
const wallpaperForm = document.getElementById("wallpaper-form"), wallpaperPreview = document.getElementById("wallpaper-preview"), wallpaperFeedback = document.getElementById("wallpaper-feedback"), wallpaperSave = document.getElementById("background-save");
const wallpaperModes = document.createElement("div");
wallpaperModes.className = "settings-tabs"; wallpaperModes.setAttribute("role", "radiogroup"); wallpaperModes.setAttribute("aria-label", "Background type");
for (const [mode, label, icon] of [["default", "Theme default", "reset"], ["color", "Color", "lighting"], ["gradient", "Gradient", "surface"], ["image", "Image", "background"]]) {
  const button = document.createElement("button"); button.type = "button"; button.dataset.wallpaperMode = mode;
  button.setAttribute("role", "radio"); button.setAttribute("aria-checked", "false"); button.tabIndex = -1;
  button.innerHTML = settingsIcon(icon); button.append(label); wallpaperModes.append(button);
  button.addEventListener("click", () => { wallpaperForm.elements.mode.value = mode; updateWallpaperPreview(); });
}
wallpaperModes.addEventListener("keydown", event => {
  const buttons = [...wallpaperModes.children], index = buttons.indexOf(event.target);
  const offset = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (index < 0 || !offset) return;
  event.preventDefault(); const next = buttons[(index+offset+buttons.length)%buttons.length]; next.click(); next.focus();
});
wallpaperDialog.prepend(wallpaperModes);
let wallpaperDraft = { ...pageWallpaper }, wallpaperDraftImage = null, wallpaperLoadGeneration = 0, wallpaperLoading = false;
function updateWallpaperPreview() {
  for (const key of ["mode", "color", "color2", "fit", "position"]) wallpaperDraft[key] = wallpaperForm.elements[key].value;
  wallpaperDraft.angle = Number(wallpaperForm.elements.angle.value); wallpaperDraft.parallax = wallpaperForm.elements.parallax.checked;
  for (const group of wallpaperForm.querySelectorAll("[data-wallpaper-modes]")) group.hidden = !group.dataset.wallpaperModes.split(" ").includes(wallpaperDraft.mode);
  for (const button of wallpaperDialog.querySelectorAll("[data-wallpaper-mode]")) {
    const active = button.dataset.wallpaperMode === wallpaperDraft.mode;
    button.setAttribute("aria-checked", String(active)); button.tabIndex = active ? 0 : -1;
  }
  document.getElementById("wallpaper-angle").value = `${Number(wallpaperDraft.angle.toFixed(1))}°`;
  paintWallpaper(wallpaperPreview, wallpaperDraft, wallpaperDraftImage);
  wallpaperSave.disabled = wallpaperLoading || (wallpaperDraft.mode === "image" && !wallpaperDraftImage);
  const canPan = wallpaperDraftImage && wallpaperGeometry(innerWidth, innerHeight, wallpaperDraftImage, wallpaperDraft.fit).height > innerHeight + 1;
  wallpaperForm.elements.parallax.disabled = !canPan || wallpaperMotion.matches;
  wallpaperForm.elements.position.disabled = !!canPan && wallpaperDraft.parallax && !wallpaperMotion.matches;
}
function fillWallpaperForm() {
  for (const key of ["mode", "color", "color2", "angle", "fit", "position"]) wallpaperForm.elements[key].value = wallpaperDraft[key];
  wallpaperForm.elements.parallax.checked = wallpaperDraft.parallax;
  document.getElementById("wallpaper-url").value = /^https?:/.test(wallpaperDraft.image) ? wallpaperDraft.image : "";
  document.getElementById("wallpaper-file").value = "";
  updateWallpaperPreview();
}
async function loadWallpaperDraft(source, local = false) {
  const originalSource = source;
  const generation = ++wallpaperLoadGeneration;
  wallpaperLoading = true; wallpaperSave.disabled = true; wallpaperFeedback.textContent = "Loading image…";
  try {
    let image = await readWallpaperImage(source);
    if (local) {
      const scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth*scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight*scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      source = canvas.toDataURL("image/webp", .85);
      if (!validWallpaperSource(source)) throw new Error("This image is too large to save. Try a smaller image.");
      image = await readWallpaperImage(source);
    }
    if (generation !== wallpaperLoadGeneration) return;
    if (local) document.getElementById("wallpaper-url").value = "";
    wallpaperDraft.image = source; wallpaperDraftImage = image; wallpaperFeedback.textContent = "Image ready. Save to apply.";
  } catch (error) { if (generation === wallpaperLoadGeneration) wallpaperFeedback.textContent = error.message; }
  finally { if (local) URL.revokeObjectURL(originalSource); if (generation === wallpaperLoadGeneration) { wallpaperLoading = false; updateWallpaperPreview(); } }
}
wallpaperForm.addEventListener("submit", event => event.preventDefault());
wallpaperForm.addEventListener("input", updateWallpaperPreview);
document.getElementById("wallpaper-load").addEventListener("click", () => {
  const source = document.getElementById("wallpaper-url").value.trim();
  if (!/^https?:/.test(source) || !validWallpaperSource(source)) { wallpaperFeedback.textContent = "Enter a direct HTTP(S) image URL without credentials."; return; }
  loadWallpaperDraft(source);
});
document.getElementById("wallpaper-file").addEventListener("change", event => {
  const file = event.target.files[0]; if (!file) return;
  if (!/^image\/(png|jpeg|webp|avif|gif)$/.test(file.type) || file.size > 20*1024*1024) { wallpaperFeedback.textContent = "Choose a PNG, JPEG, WebP, AVIF or GIF image under 20 MB."; return; }
  loadWallpaperDraft(URL.createObjectURL(file), true);
});
document.getElementById("page-background").addEventListener("click", () => {
  wallpaperDraft = { ...pageWallpaper }; wallpaperDraftImage = pageWallpaperImage; wallpaperFeedback.textContent = "";
  wallpaperDialog.showModal(); fillWallpaperForm();
  if (wallpaperDraft.mode === "image" && wallpaperDraft.image && !wallpaperDraftImage) loadWallpaperDraft(wallpaperDraft.image);
});
document.getElementById("background-cancel").addEventListener("click", () => wallpaperDialog.close());
wallpaperDialog.addEventListener("close", () => { wallpaperLoadGeneration++; wallpaperLoading = false; });
document.getElementById("background-reset").addEventListener("click", () => {
  wallpaperLoadGeneration++; wallpaperLoading = false; wallpaperDraft = { ...WALLPAPER_DEFAULTS }; wallpaperDraftImage = null; wallpaperFeedback.textContent = ""; fillWallpaperForm();
});
wallpaperSave.addEventListener("click", () => {
  if (wallpaperSave.disabled) return;
  const enteredUrl = document.getElementById("wallpaper-url").value.trim();
  if (wallpaperDraft.mode === "image" && enteredUrl && enteredUrl !== wallpaperDraft.image) { wallpaperFeedback.textContent = "Click Load image to preview this URL before saving."; return; }
  const next = normalizeWallpaper(wallpaperDraft);
  if (!storage.set(PAGE_BACKGROUND_KEY, JSON.stringify(next))) { wallpaperFeedback.textContent = "Could not save. Browser storage may be full or blocked. Try a smaller image or an image URL."; return; }
  applyPageWallpaper(next); wallpaperDialog.close();
});
addEventListener("resize", () => { if (wallpaperDialog.open) updateWallpaperPreview(); });
wallpaperMotion.addEventListener("change", () => { if (wallpaperDialog.open) updateWallpaperPreview(); });
