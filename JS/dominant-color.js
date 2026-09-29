"use strict";

const dominantColorCache = new Map();
const ICON_COLORS_KEY = "iconSampledColorsV1";
const ICON_COLOR_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const savedIconColors = storage.readJSON(ICON_COLORS_KEY, {});
const iconColors = savedIconColors && typeof savedIconColors === "object" && !Array.isArray(savedIconColors)
  ? savedIconColors : {};
const pendingIconColors = new Map();

function validIconColor(color) {
  return color && [color.r, color.g, color.b].every(value => Number.isFinite(value) && value >= 0 && value <= 255);
}

function rememberIconColor(source, color) {
  iconColors[source] = { color, savedAt: Date.now() };
  const entries = Object.entries(iconColors)
    .filter(([, entry]) => entry && Date.now() - entry.savedAt < ICON_COLOR_MAX_AGE)
    .sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, 500);
  for (const key of Object.keys(iconColors)) delete iconColors[key];
  Object.assign(iconColors, Object.fromEntries(entries));
  storage.set(ICON_COLORS_KEY, JSON.stringify(iconColors));
}

function fetchReadableIconColor(source) {
  if (pendingIconColors.has(source)) return pendingIconColors.get(source);
  const request = new Promise(resolve => {
    const sample = new Image();
    sample.crossOrigin = "anonymous";
    sample.referrerPolicy = "no-referrer";
    let settled = false;
    const finish = color => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      sample.onload = null;
      sample.onerror = null;
      if (!color) sample.removeAttribute("src");
      resolve(color);
    };
    const timeout = setTimeout(() => finish(null), 8000);
    sample.onload = () => finish(computeDominantColor(sample));
    sample.onerror = () => finish(null);
    // Same artwork, no blur/tint/crop/resize: the original 12px sampling
    // algorithm below remains the sole source of the resulting gradient.
    sample.src = `https://wsrv.nl/?url=${encodeURIComponent(source)}&output=png`;
  });
  pendingIconColors.set(source, request);
  return request;
}

function clamp(value, min = 0, max = 255) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
    }

    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: clamp((r + m) * 255),
    g: clamp((g + m) * 255),
    b: clamp((b + m) * 255),
  };
}

function computeDominantColor(image) {
  const canvas = document.createElement("canvas");
  const sampleSize = 12;
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  const context = canvas.getContext("2d");
  if (!context) return null;

  try {
    context.drawImage(image, 0, 0, sampleSize, sampleSize);
    const { data } = context.getImageData(0, 0, sampleSize, sampleSize);

    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;
      if (alpha < 0.05) continue;

      r += data[i] * alpha;
      g += data[i + 1] * alpha;
      b += data[i + 2] * alpha;
      count += alpha;
    }

    if (count === 0) return null;

    return {
      r: r / count,
      g: g / count,
      b: b / count,
    };
  } catch (error) {
    return null;
  }
}

function applyFilterBackground(filter, color) {
  const { h, s, l } = rgbToHsl(color.r, color.g, color.b);

  const balancedSaturation = Math.min(0.62, Math.max(0.28, s * 0.9 + 0.12));
  const contrastBias = (0.5 - l) * 0.35;
  const baseLightness = Math.min(
    0.62,
    Math.max(0.32, l + contrastBias + 0.08)
  );
  const accentLightness = Math.min(
    0.68,
    Math.max(0.26, baseLightness + (l < 0.5 ? 0.08 : -0.08))
  );

  const baseColor = hslToRgb(h, balancedSaturation, baseLightness);
  const accentColor = hslToRgb(h, balancedSaturation * 0.92, accentLightness);

  const overlayIsDark = baseLightness > 0.5;
  const overlayOpacity = overlayIsDark ? 0.18 : 0.12;
  const overlayTone = overlayIsDark ? "0, 0, 0" : "255, 255, 255";

  filter.style.background = `linear-gradient(rgba(${overlayTone}, ${overlayOpacity}), rgba(${overlayTone}, ${overlayOpacity})), linear-gradient(135deg, rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b}), rgb(${accentColor.r}, ${accentColor.g}, ${accentColor.b}))`;
}

async function colorizeIconBackground(icon) {
  if (icon.dataset.colorized) return true;
  if (!icon.naturalWidth) return false;
  const filter = icon.closest(".filter");
  if (!filter) return false;
  const source = icon.currentSrc || icon.src;
  if (!source.startsWith("https://")) return false;
  const saved = iconColors[source];
  let color = dominantColorCache.get(source);
  if (!validIconColor(color) && saved && validIconColor(saved.color) &&
      Number.isFinite(saved.savedAt) && Date.now() >= saved.savedAt &&
      Date.now() - saved.savedAt < ICON_COLOR_MAX_AGE) color = saved.color;
  if (!validIconColor(color) && icon.crossOrigin === "anonymous") color = computeDominantColor(icon);
  if (!validIconColor(color)) color = await fetchReadableIconColor(source);
  if (!validIconColor(color)) return false;
  dominantColorCache.set(source, color);
  if (!saved || saved.color !== color) rememberIconColor(source, color);
  // A late sample must never recolor an icon that has since fallen back.
  if ((icon.currentSrc || icon.src) !== source) return false;
  applyFilterBackground(filter, color);
  icon.dataset.colorized = "true";
  return true;
}
