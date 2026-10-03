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
and close the tab. The flag prevents pending application writes from restoring removed data (other applications' storage is preserved):

```js
resettingCache = true;
for (const key of [
  'token', 'raindropFavoritesCacheV1', 'favoriteUsageCounts',
  'googleFaviconPriority', 'iconApiProvidersV1', 'switch',
  'iconSampledColorsV1', 'vemetricMetadataV1', 'googlePlaceholderV1',
  'iconResultsV1', 'iconResultsV2', 'iconCacheEpoch', 'searchEnginesV1', 'cardEffectsV1', 'pageBackgroundV1'
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
  Vemetric and Favicon.im first use anonymous CORS for background-color extraction.
  On failure, the same image is retried without CORS before the next provider.
  Each fallback resets the CORS attribute. Where pixel access is unavailable,
  a PNG copy of the public favicon is requested through wsrv.nl and analyzed
  using the same canvas algorithm. The relay receives the favicon URL/domain,
  not the Raindrop token. Colors are cached locally for 30 days (500 URLs).
- Vemetric metadata is read with an unauthenticated request to identify its
  default placeholder and cached locally for 24 hours (500 URLs).

- Google placeholder detection fetches a readable image through wsrv.nl without
  credentials and compares it with a local reference. Results are cached for
  24 hours (500 URLs). The same response supplies the sampled color.
- Initials are local HTML/CSS text. Their color is computed from the hostname;
  no image conversion or third-party request is needed for this fallback.
- Resolved icons are cached as readable PNG data or provider URLs for seven
  days; missing results are cached for one day, or fifteen minutes after errors.
  Search engine settings and icon caches can reveal domains used in this profile.
  Search engine icon requests use only the engine origin, never query terms.

## Page backgrounds

Imported raster wallpapers are resized locally and stored in `pageBackgroundV1`; no upload is performed. HTTP(S) wallpaper URLs are loaded as images without a referrer; the remote host still receives a request. Temporary blob image URLs are allowed by the image CSP for local previews and revoked after decoding. Unsupported schemes are rejected. Icon initials mode still contacts configured providers to obtain colors unless the shared cache already contains a result.

## Reporting

Do not post tokens or private bookmark data in public issues. Report security
problems privately to the repository maintainer with reproduction steps and the
expected impact.
