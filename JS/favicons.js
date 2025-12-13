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

  return `https://favicon-api.vemetric.com/v1/?domain=${encodeURIComponent(domain)}`;
}

function vemetricfavicon(adress) {
  let splitadress = adress.split("/");
  splitadress = splitadress.slice(2, 3);
  splitadress = splitadress.join("/");
  return (newadress = `https://favicon-api.vemetric.com/v1/?domain=${splitadress}`);
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
