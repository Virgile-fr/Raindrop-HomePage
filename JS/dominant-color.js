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
  const darkened = {
    r: Math.round(color.r * 0.9),
    g: Math.round(color.g * 0.9),
    b: Math.round(color.b * 0.9),
  };

  filter.style.background = `linear-gradient(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.12)), rgb(${darkened.r}, ${darkened.g}, ${darkened.b})`;
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
