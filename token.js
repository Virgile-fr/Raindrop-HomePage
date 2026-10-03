"use strict";

// This page only needs a personal test token, not the app's client secret.
const tokenDialog = document.createElement("dialog");
tokenDialog.id = "token-dialog";
tokenDialog.setAttribute("aria-labelledby", "token-title");
tokenDialog.innerHTML = `<h2 id="token-title">Connect Raindrop</h2>
<div class="icons-dialog-actions"><button id="token-cancel" type="button">Cancel</button><button id="token-save" type="submit" form="token-form">Connect</button></div>
<p>Connect your Raindrop account to show your favorites here.</p>
<ol class="token-steps"><li>Open your Raindrop integrations and sign in.</li><li>Create an app for this homepage, or open one you already created.</li><li>In the app settings, create or copy the <strong>Test token</strong>, then paste it below.</li></ol>
<p><a class="token-link" href="https://app.raindrop.io/settings/integrations" target="_blank" rel="noopener noreferrer">Open Raindrop integrations ↗</a></p>
<form id="token-form"><label for="token-value">Test token<input id="token-value" type="password" required autocomplete="off" spellcheck="false" placeholder="Paste your test token" aria-describedby="token-note"></label></form>
<p class="icons-note" id="token-note">Use the Test token, not the Client ID or Client secret. It is stored in this browser. Keep it private.</p>`;
document.body.append(tokenDialog);
let pendingTokenRequest = null;
function requestToken() {
  if (pendingTokenRequest) return pendingTokenRequest;
  pendingTokenRequest = new Promise(resolve => {
    const field = document.getElementById("token-value");
    field.value = "";
    tokenDialog.returnValue = "";
    tokenDialog.addEventListener("close", () => {
      const value = tokenDialog.returnValue === "connect" ? field.value.trim() : null;
      field.value = "";
      pendingTokenRequest = null;
      resolve(value || null);
    }, { once: true });
    tokenDialog.showModal();
  });
  return pendingTokenRequest;
}
document.getElementById("token-form").addEventListener("submit", event => {
  event.preventDefault();
  const field = document.getElementById("token-value");
  if (!field.value.trim()) { field.setCustomValidity("Paste your test token."); field.reportValidity(); return; }
  tokenDialog.close("connect");
});
document.getElementById("token-value").addEventListener("input", event => event.target.setCustomValidity(""));
document.getElementById("token-cancel").addEventListener("click", () => tokenDialog.close("cancel"));

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
if (token) storage.set("token", token);
if (urlToken) {
  const cleanPath = window.location.pathname.replace(/[^/]+\/?$/, "");
  window.history.replaceState(null, "", cleanPath + window.location.search + window.location.hash);
}

document.addEventListener("DOMContentLoaded", () => { if (!token) document.getElementById("change-token").click(); });
