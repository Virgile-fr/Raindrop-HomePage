function computeDominantColor(image) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(image, 0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;

  return { r, g, b };
}

function applyFilterBackground(filter, color) {
  const clamp = (value) => Math.min(255, Math.max(0, Math.round(value)));
  const luminance =
    (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;

  const isTooDark = luminance < 0.35;

  const adjustedColor = isTooDark
    ? {
        r: clamp(color.r + (255 - color.r) * 0.25),
        g: clamp(color.g + (255 - color.g) * 0.25),
        b: clamp(color.b + (255 - color.b) * 0.25),
      }
    : {
        r: clamp(color.r * 0.8),
        g: clamp(color.g * 0.8),
        b: clamp(color.b * 0.8),
      };

  const overlayOpacity = isTooDark ? 0.12 : 0.18;

  filter.style.background = `linear-gradient(rgba(0, 0, 0, ${overlayOpacity}), rgba(0, 0, 0, ${overlayOpacity})), rgb(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b})`;
}

function colorizeIconBackground(icon) {
  if (icon.dataset.colorized) return;

  const filter = icon.closest(".filter");
  if (!filter) return;

  const color = computeDominantColor(icon);
  if (!color) return;

  applyFilterBackground(filter, color);
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
