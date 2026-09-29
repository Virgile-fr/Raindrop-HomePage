"use strict";

// Never put a real token in this file. Enter it through the browser prompt.
function requestToken() {
  return window.prompt(
    "🏠 Welcome to Raindrop HomePage\n\nPlease enter your test token\n\nℹ️ https://github.com/Virgile-fr/Raindrop-HomePage"
  )?.trim() || null;
}

function findTokenInPath() {
  try {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const candidate = decodeURIComponent(segments.at(-1) || "");
    return /^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/.test(candidate) ? candidate : null;
  } catch { return null; }
}

const urlToken = findTokenInPath();
let token = urlToken || storage.get("token");
if (token === "null" || token === "undefined") token = null;
if (!token) token = requestToken();
if (token) storage.set("token", token);
if (urlToken) {
  const cleanPath = window.location.pathname.replace(/[^/]+\/?$/, "");
  window.history.replaceState(null, "", cleanPath + window.location.search + window.location.hash);
}
