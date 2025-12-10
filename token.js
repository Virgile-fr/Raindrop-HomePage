// 💧 Enter Your Raindrop Token here 👇 //
let raindropToken = "XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX";

const findTokenInPath = () => {
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  if (!pathSegments.length) return null;

  const candidate = decodeURIComponent(pathSegments[pathSegments.length - 1]);
  const looksLikeToken = /^[A-Za-z0-9_-]{30,}$/.test(candidate);

  return looksLikeToken ? candidate : null;
};

const urlToken = findTokenInPath();
let token;

if (urlToken) {
  localStorage.setItem("token", urlToken);
  token = urlToken;
} else if (raindropToken !== "XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX") {
  token = raindropToken;
} else if (
  localStorage.token == "null" ||
  localStorage.token == "undefined" ||
  localStorage.token == undefined
) {
  const localToken = prompt(
    "🏠 Welcome to Raindrop HomePage\n\nplease enter your test-token\nif you dont know how to do it, please visit the url below\n\nℹ️ https://github.com/Virgile-fr/Raindrop-HomePage"
  );
  localStorage.setItem("token", localToken);
  token = localStorage.token;
} else {
  token = localStorage.token;
}
