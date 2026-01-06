// 💧 Enter Your Raindrop Token here 👇 //
// ⚠️ ATTENTION SÉCURITÉ:
// - Ne JAMAIS commiter un vrai token dans Git
// - Utiliser plutôt la méthode du prompt ou de l'URL
// - Si vous utilisez cette méthode, créez un fichier token.local.js
let raindropToken = "XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX";

const findTokenInPath = () => {
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  if (!pathSegments.length) return null;

  const candidate = decodeURIComponent(pathSegments[pathSegments.length - 1]);
  // Validation plus stricte du format du token
  const looksLikeToken = /^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/.test(candidate);

  return looksLikeToken ? candidate : null;
};

const urlToken = findTokenInPath();
let token;

if (urlToken) {
  // ⚠️ Token trouvé dans l'URL - sera stocké en localStorage
  console.warn("Token détecté dans l'URL. Pour plus de sécurité, évitez de partager cette URL.");
  localStorage.setItem("token", urlToken);
  token = urlToken;
} else if (raindropToken !== "XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX") {
  token = raindropToken;
} else if (
  !localStorage.token ||
  localStorage.token === "null" ||
  localStorage.token === "undefined"
) {
  const localToken = prompt(
    "🏠 Welcome to Raindrop HomePage\n\nPlease enter your test token\nIf you don't know how to get it, please visit:\n\nℹ️ https://github.com/Virgile-fr/Raindrop-HomePage"
  );
  if (localToken && localToken.trim()) {
    localStorage.setItem("token", localToken.trim());
    token = localStorage.token;
  } else {
    console.error("No token provided. The application cannot function without a valid token.");
  }
} else {
  token = localStorage.token;
}
