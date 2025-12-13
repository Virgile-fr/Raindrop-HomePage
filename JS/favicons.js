const GOOGLE_FAVICON_PRIORITY_KEY = "googleFaviconPriority";

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

function googlefavicon(adress) {
  let resolution = 256;
  const domain = extractHost(adress);
  if (!domain) return null;

  return `https://www.google.com/s2/favicons?sz=${resolution}&domain=${domain}`;
}

function vemetricfavicon(adress) {
  const domain = extractDomain(adress);
  if (!domain) return null;

  return `https://favicon.vemetric.com/${encodeURIComponent(domain)}`;
}

function duckduckgofavicon(adress) {
  let splitadress = adress.split("/");
  splitadress = splitadress.slice(2, 3);
  splitadress = splitadress.join("/");
  return (newadress =
    "https://icons.duckduckgo.com/ip2/" + splitadress + ".ico");
}

function statvoofavicon(adress) {
  let splitadress = adress.split("/");
  splitadress = splitadress.slice(0, 3);
  splitadress = splitadress.join("/");
  return (newadress = "https://api.statvoo.com/favicon/?url=" + splitadress);
}

function isGoogleFaviconPriority() {
  return localStorage.getItem(GOOGLE_FAVICON_PRIORITY_KEY) === "true";
}

function setGoogleFaviconPriority(isGoogleFirst) {
  localStorage.setItem(GOOGLE_FAVICON_PRIORITY_KEY, isGoogleFirst);
}

function getFaviconPreference(address) {
  const vemetricIcon = vemetricfavicon(address);
  const googleIcon = googlefavicon(address);

  if (isGoogleFaviconPriority()) {
    return { primary: googleIcon, fallback: vemetricIcon };
  }

  return { primary: vemetricIcon, fallback: googleIcon };
}

function allowsCrossOriginLoading(url) {
  if (!url) return false;

  const blockedHosts = ["www.google.com"];
  try {
    const hostname = new URL(url).hostname;
    return !blockedHosts.includes(hostname);
  } catch {
    return false;
  }
}

function updateFaviconPriorityIndicator() {
  const toggleIcon = document.querySelector(".favorite-priority-toggle");

  if (!toggleIcon) {
    return;
  }

  toggleIcon.classList.toggle("google-priority", isGoogleFaviconPriority());
  toggleIcon.setAttribute(
    "title",
    isGoogleFaviconPriority()
      ? "Icônes Google en priorité (cliquer pour inverser)"
      : "Icônes Vemetric en priorité (cliquer pour inverser)"
  );
}

function toggleFaviconPriority() {
  const newPriority = !isGoogleFaviconPriority();
  setGoogleFaviconPriority(newPriority);
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
