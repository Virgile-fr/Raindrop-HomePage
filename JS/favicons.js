const DUCKDUCKGO_FAVICON_PRIORITY_KEY = "duckduckgoFaviconPriority";

function extractDomain(address) {
  try {
    return new URL(address).hostname;
  } catch (error) {
    try {
      return new URL(`https://${address}`).hostname;
    } catch {
      return null;
    }
  }
}

function extractHost(address) {
  try {
    return new URL(address).host;
  } catch (error) {
    try {
      return new URL(`https://${address}`).host;
    } catch {
      return null;
    }
  }
}

function favicon(adress) {
  let splitadress = adress.split("/");
  splitadress = splitadress.slice(0, 3);
  splitadress = splitadress.join("/");
  return (newadress = splitadress + "/favicon.ico");
}

function duckduckgofavicon(adress) {
  const domain = extractDomain(adress);
  if (!domain) return null;

  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
}

function vemetricfavicon(adress) {
  const domain = extractDomain(adress);
  if (!domain) return null;

  return `https://favicon.vemetric.com/${encodeURIComponent(domain)}`;
}

function statvoofavicon(adress) {
  let splitadress = adress.split("/");
  splitadress = splitadress.slice(0, 3);
  splitadress = splitadress.join("/");
  return (newadress = "https://api.statvoo.com/favicon/?url=" + splitadress);
}

function isDuckDuckGoFaviconPriority() {
  return localStorage.getItem(DUCKDUCKGO_FAVICON_PRIORITY_KEY) === "true";
}

function setDuckDuckGoFaviconPriority(isDuckDuckGoFirst) {
  localStorage.setItem(DUCKDUCKGO_FAVICON_PRIORITY_KEY, isDuckDuckGoFirst);
}

function getFaviconPreference(address) {
  const vemetricIcon = vemetricfavicon(address);
  const duckduckgoIcon = duckduckgofavicon(address);

  if (isDuckDuckGoFaviconPriority()) {
    return { primary: duckduckgoIcon, fallback: vemetricIcon };
  }

  return { primary: vemetricIcon, fallback: duckduckgoIcon };
}

function allowsCrossOriginLoading(url) {
  if (!url) return false;

  // Allow CORS for external favicon services
  const faviconServices = [
    "favicon.vemetric.com",
    "icons.duckduckgo.com",
    "api.statvoo.com"
  ];

  try {
    const hostname = new URL(url).hostname;
    // Allow CORS for known favicon services and any external domains
    return faviconServices.some(service => hostname.includes(service)) ||
           hostname !== window.location.hostname;
  } catch {
    return false;
  }
}

function updateFaviconPriorityIndicator() {
  const toggleIcon = document.querySelector(".favorite-priority-toggle");

  if (!toggleIcon) {
    return;
  }

  toggleIcon.classList.toggle("duckduckgo-priority", isDuckDuckGoFaviconPriority());
  toggleIcon.setAttribute(
    "title",
    isDuckDuckGoFaviconPriority()
      ? "Icônes DuckDuckGo en priorité (cliquer pour inverser)"
      : "Icônes Vemetric en priorité (cliquer pour inverser)"
  );
}

function toggleFaviconPriority() {
  const newPriority = !isDuckDuckGoFaviconPriority();
  setDuckDuckGoFaviconPriority(newPriority);
  updateFaviconPriorityIndicator();

  if (typeof toggle !== "undefined" && !toggle.checked) {
    deleteGrid();
    fetchCardsIcons();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleIcon = document.querySelector(".favorite-priority-toggle");

  if (!toggleIcon) {
    return;
  }

  updateFaviconPriorityIndicator();
  toggleIcon.addEventListener("click", toggleFaviconPriority);
});
