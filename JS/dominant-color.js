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
  request.then(() => pendingIconColors.delete(source), () => pendingIconColors.delete(source));
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

async function resolveIconColor(image, source) {
  const saved = iconColors[source];
  let color = dominantColorCache.get(source);
  if (!validIconColor(color) && saved && validIconColor(saved.color) &&
      Number.isFinite(saved.savedAt) && Date.now() >= saved.savedAt &&
      Date.now() - saved.savedAt < ICON_COLOR_MAX_AGE) color = saved.color;
  if (!validIconColor(color) && image.crossOrigin === "anonymous") color = computeDominantColor(image);
  if (!validIconColor(color)) color = await fetchReadableIconColor(source);
  if (!validIconColor(color)) return null;
  dominantColorCache.set(source, color);
  while (dominantColorCache.size > 500) dominantColorCache.delete(dominantColorCache.keys().next().value);
  if (!saved || saved.color !== color) rememberIconColor(source, color);
  return color;
}

// Reference captured from the exact Google URL supplied by the user:
// https://www.google.com/s2/favicons?sz=128&domain=tidal.qqdl.site
// Its response was HTTP 404, image/png, 16x16, 726 bytes. Size alone is NOT used.
const GOOGLE_PLACEHOLDER_REFERENCE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAACiElEQVQ4EaVTzU8TURCf2tJuS7tQtlRb6UKBIkQwkRRSEzkQgyEc6lkOKgcOph78Y+CgjXjDs2i44FXY9AMTlQRUELZapVlouy3d7kKtb0Zr0MSLTvL2zb75eL838xtTvV6H/xELBptMJojeXLCXyobnyog4YhzXYvmCFi6qVSfaeRdXdrfaU1areV5KykmX06rcvzumjY/1ggkR3Jh+bNf1mr8v1D5bLuvR3qDgFbvbBJYIrE1mCIoCrKxsHuzK+Rzvsi29+6DEbTZz9unijEYI8ObBgXOzlcrx9OAlXyDYKUCzwwrDQx1wVDGg089Dt+gR3mxmhcUnaWeoxwMbm/vzDFzmDEKMMNhquRqduT1KwXiGt0vre6iSeAUHNDE0d26NBtAXY9BACQyjFusKuL2Ry+IPb/Y9ZglwuVscdHaknUChqLF/O4jn3V5dP4mhgRJgwSYm+gV0Oi3XrvYB30yvhGa7BS70eGFHPoTJyQHhMK+F0ZesRVVznvXw5Ixv7/C10moEo6OZXbWvlFAF9FVZDOqEABUMRIkMd8GnLwVWg9/RkJF9sA4oDfYQAuzzjqzwvnaRUFxn/X2ZlmGLXAE7AL52B4xHgqAUqrC1nSNuoJkQtLkdqReszz/9aRvq90NOKdOS1nch8TpL555WDp49f3uAMXhACRjD5j4ykuCtf5PP7Fm1b0DIsl/VHGezzP1KwOiZQobFF9YyjSRYQETRENSlVzI8iK9mWlzckpSSCQHVALmN9Az1euDho9Xo8vKGd2rqooA8yBcrwHgCqYR0kMkWci08t/R+W4ljDCanWTg9TJGwGNaNk3vYZ7VUdeKsYJGFNkfSzjXNrSX20s4/h6kB81/271ghG17l+rPTAAAAAElFTkSuQmCC";
const GOOGLE_PLACEHOLDER_KEY = "googlePlaceholderV1";
const storedGooglePlaceholders = storage.readJSON(GOOGLE_PLACEHOLDER_KEY, {});
const googlePlaceholders = storedGooglePlaceholders && typeof storedGooglePlaceholders === "object" && !Array.isArray(storedGooglePlaceholders)
  ? storedGooglePlaceholders : {};
const googlePlaceholderRequests = new Map();
let googleReferencePixels;

function loadAnalysisImage(source) {
  return new Promise(resolve => {
    const image = new Image();
    const timeout = setTimeout(() => finish(null), 5000);
    const finish = result => {
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      resolve(result);
    };
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = source;
  });
}

function iconPixels(image) {
  if (!image || image.naturalWidth !== 16 || image.naturalHeight !== 16) return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  const context = canvas.getContext("2d");
  if (!context) return null;
  try {
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, 16, 16).data;
  } catch { return null; }
}

function rememberGooglePlaceholder(source, isDefault) {
  googlePlaceholders[source] = { isDefault, savedAt: Date.now() };
  const entries = Object.entries(googlePlaceholders)
    .filter(([, entry]) => entry && Date.now() - entry.savedAt < 86400000)
    .sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, 500);
  for (const key of Object.keys(googlePlaceholders)) delete googlePlaceholders[key];
  Object.assign(googlePlaceholders, Object.fromEntries(entries));
  storage.set(GOOGLE_PLACEHOLDER_KEY, JSON.stringify(googlePlaceholders));
}

function isGoogleDefault(source) {
  const cached = googlePlaceholders[source];
  if (cached && typeof cached.isDefault === "boolean" && Number.isFinite(cached.savedAt) &&
      Date.now() >= cached.savedAt && Date.now() - cached.savedAt < 86400000) return Promise.resolve(cached.isDefault);
  if (googlePlaceholderRequests.has(source)) return googlePlaceholderRequests.get(source);
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      // Same relay already used for unreadable colors. Reuse its pixels for
      // both detection and color sampling, never a second icon provider.
      const response = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(source)}&output=png`, {
        signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer",
      });
      if (!response.ok) {
        const error = await response.text();
        // Only an explicit upstream missing-resource error counts as missing.
        // A relay outage, rate limit or CORS failure does not reject an icon.
        const missing = /(?:requested URL|upstream|remote server|server returned)[^\n]{0,150}\b(?:404|410)\b/i.test(error);
        if (missing) rememberGooglePlaceholder(source, true);
        return missing;
      }
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) return false;
      const dataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (!dataUrl) return false;
      const image = await loadAnalysisImage(dataUrl);
      if (!image) return false;
      const pixels = iconPixels(image);
      if (!googleReferencePixels) googleReferencePixels = loadAnalysisImage(GOOGLE_PLACEHOLDER_REFERENCE).then(iconPixels);
      const reference = await googleReferencePixels;
      if (!reference) return false;
      // Compare actual decoded pixels (including alpha), not bytes or dimensions alone.
      const isDefault = Boolean(pixels && pixels.every((value, index) => value === reference[index]));
      rememberGooglePlaceholder(source, isDefault);
      if (!isDefault) {
        const color = computeDominantColor(image);
        if (validIconColor(color)) {
          dominantColorCache.set(source, color);
          while (dominantColorCache.size > 500) dominantColorCache.delete(dominantColorCache.keys().next().value);
          rememberIconColor(source, color);
        }
      }
      return isDefault;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  })();
  googlePlaceholderRequests.set(source, request);
  request.then(() => googlePlaceholderRequests.delete(source), () => googlePlaceholderRequests.delete(source));
  return request;
}
