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
  let splitadress = adress.split("/");
  splitadress = splitadress.slice(0, 3);
  splitadress = splitadress.join("/");
  return (newadress = splitadress + "/favicon.ico");
}

function googlefavicon(adress) {
  let resolution = 256;
  let splitadress = adress.split("/");
  splitadress = splitadress.slice(0, 3);
  splitadress = splitadress.join("/");
  return (newadress =
    "https://www.google.com/s2/favicons?sz=" +
    resolution +
    "&domain=" +
    splitadress);
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
