# Security — Raindrop HomePage

## Credentials

Enter your Raindrop test token in the browser prompt or use **token**.
Never place a real token in `token.js`, a commit, or a shared URL. The app sends
it only to `https://api.raindrop.io` as an Authorization Bearer header.

Legacy UUID tokens in the URL path are accepted and removed from the current
address using `history.replaceState`. This does not remove the initial request
from server logs, previously saved bookmarks, browser sync, or other records.
Pasting the token in the prompt is preferred.

## Local data

The token remains in `localStorage`. Bookmark URLs, titles, cover URLs and creation
dates are also cached locally for up to 24 hours. The cache is associated with a
SHA-256 fingerprint of the token to avoid showing another credential's cached
list. This is account separation, **not encryption**. Usage counts and display
preferences are retained under the existing storage keys.

A successful refresh replaces the cache, changing tokens discards the previous
cache, and 401/403 errors remove cached bookmarks. A network failure may leave
the last successful list visible with an explicit status message.

These values are accessible to scripts on the same origin and browser extensions
with the relevant access. GitHub Pages projects under the same hostname share
an origin. Use a trusted browser profile.

To remove this application's local data, run the following in its browser console
and close the tab (other applications' storage is preserved):

```js
for (const key of [
  'token', 'raindropFavoritesCacheV1', 'favoriteUsageCounts',
  'googleFaviconPriority', 'iconApiProvidersV1', 'switch'
]) localStorage.removeItem(key);
```

## Rendering and network policy

- Cards use DOM elements and `textContent`; bookmark titles are never parsed as HTML.
- Bookmark and cover URLs must have an HTTP or HTTPS scheme. Executable schemes
  such as `javascript:` are rejected.
- Scripts are local and deferred. CSP `script-src 'self'` blocks inline handlers
  and third-party scripts; Font Awesome's external JavaScript is no longer used.
- Inline styles remain allowed for dynamically calculated favicon gradients.
- New-tab links use `noopener noreferrer`; requests use a no-referrer policy.
- Favicon services receive bookmark hostnames; cover hosts receive image requests.
  Those third parties do not receive the Raindrop token.
- Google favicons are displayed without CORS and are not read through canvas.
  Vemetric and Favicon.im images use anonymous CORS for background-color extraction. Each
  fallback explicitly resets the CORS attribute for the new provider.

## Reporting

Do not post tokens or private bookmark data in public issues. Report security
problems privately to the repository maintainer with reproduction steps and the
expected impact.
