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
    console.warn("Unable to compute dominant color", image?.currentSrc || image?.src, error);
    return null;
  }
}

function getColorKeyFromIcon(icon) {
  const src = icon?.currentSrc || icon?.src || "";
  try {
    return new URL(src).hostname;
  } catch (error) {
    return src;
  }
}

function vibrantFallbackColor(icon) {
  const key = getColorKeyFromIcon(icon);
  if (!key) return null;

  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 0.74;
  const lightness = 0.52;

  return hslToRgb(hue, saturation, lightness);
}

function canSampleIcon(icon) {
  if (typeof allowsCrossOriginLoading !== "function") return false;
  return allowsCrossOriginLoading(icon?.currentSrc || icon?.src || "");
}

function applyFilterBackground(filter, color) {
  const { h, s, l } = rgbToHsl(color.r, color.g, color.b);

  const balancedSaturation = Math.min(0.82, Math.max(0.38, s * 1.05 + 0.18));
  const contrastBias = (0.5 - l) * 0.42;
  const baseLightness = Math.min(0.67, Math.max(0.34, l + contrastBias + 0.06));
  const accentLightness = Math.min(
    0.72,
    Math.max(0.28, baseLightness + (l < 0.5 ? 0.1 : -0.1))
  );

  const baseColor = hslToRgb(h, balancedSaturation, baseLightness);
  const accentColor = hslToRgb(h, balancedSaturation * 0.95, accentLightness);

  const overlayIsDark = baseLightness > 0.5;
  const overlayOpacity = overlayIsDark ? 0.24 : 0.16;
  const overlayTone = overlayIsDark ? "0, 0, 0" : "255, 255, 255";

  filter.style.background = `linear-gradient(rgba(${overlayTone}, ${overlayOpacity}), rgba(${overlayTone}, ${overlayOpacity})), linear-gradient(135deg, rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b}), rgb(${accentColor.r}, ${accentColor.g}, ${accentColor.b}))`;
}

function colorizeIconBackground(icon) {
  if (icon.dataset.colorized) return;

  const filter = icon.closest(".filter");
  if (!filter) return;

  const canUseCanvas = canSampleIcon(icon);
  const color = canUseCanvas ? computeDominantColor(icon) : null;
  const finalColor = color ?? vibrantFallbackColor(icon);
  if (!finalColor) return;

  applyFilterBackground(filter, finalColor);
  icon.dataset.colorized = "true";
}

function refreshIconFilterColors() {
  const icons = document.querySelectorAll("img.icon");

  icons.forEach((icon) => {
    const applyColor = () => colorizeIconBackground(icon);

    if (icon.complete && icon.naturalWidth > 0) {
      applyColor();
    } else {
      icon.addEventListener("load", applyColor, { once: true });
    }
  });
}
