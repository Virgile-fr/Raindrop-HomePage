const ICON_PROVIDER_STORAGE_KEY = "iconProvider";

function getIconProvider() {
  const provider = localStorage.getItem(ICON_PROVIDER_STORAGE_KEY);
  return provider === "google" ? "google" : "vemetric";
}

function toggleIconProvider() {
  const newProvider = getIconProvider() === "google" ? "vemetric" : "google";
  localStorage.setItem(ICON_PROVIDER_STORAGE_KEY, newProvider);
  return newProvider;
}

function getIconSources(address) {
  const provider = getIconProvider();
  const primaryIcon =
    provider === "google" ? googlefavicon(address) : vemetricfavicon(address);
  const fallbackIcon =
    provider === "google" ? vemetricfavicon(address) : googlefavicon(address);

  return {
    primaryIcon: primaryIcon ?? fallbackIcon ?? "",
    fallbackIcon: fallbackIcon ?? "",
  };
}

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

function favicon(adress) {
  const domain = extractDomain(adress);
  if (!domain) return null;

  return `https://${domain}/favicon.ico`;
}

function googlefavicon(adress) {
  const resolution = 256;
  const domain = extractDomain(adress);
  if (!domain) return null;

  return `https://www.google.com/s2/favicons?sz=${resolution}&domain=${domain}`;
}

function vemetricfavicon(adress) {
  const domain = extractDomain(adress);
  if (!domain) return null;

  return `https://favicon.vemetric.com/${encodeURIComponent(domain)}`;
}

function duckduckgofavicon(adress) {
  const domain = extractDomain(adress);
  if (!domain) return null;

  return `https://icons.duckduckgo.com/ip2/${domain}.ico`;
}

function statvoofavicon(adress) {
  const domain = extractDomain(adress);
  if (!domain) return null;

  return `https://api.statvoo.com/favicon/?url=https://${domain}`;
}
