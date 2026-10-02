<img src="./readme.png" alt="Raindrop Homepage preview">

# Raindrop Homepage

A lightweight, unofficial start page for your Raindrop.io favorites. Static HTML, CSS and JavaScript; no build step or runtime dependencies.

[Open the homepage](https://virgile-fr.github.io/Raindrop-HomePage/)

## Setup

Create a test token from your app in [Raindrop integrations](https://app.raindrop.io/settings/integrations), then paste it into the homepage prompt. Use **token** in the footer to replace it. Never publish a token in source code.

Legacy UUID tokens in the URL path are still accepted. The app removes them from the current address, but cannot erase hosting logs or browser history/sync. Prefer the prompt and never share a token URL. See [SECURITY.md](SECURITY.md).

Set the clean page URL as your browser homepage. New-tab replacement depends on your browser or an extension. On iOS, Add to Home Screen provides a convenient entry point.

## Favorites and previews

- All favorites are retrieved with pagination, sorted by local usage and creation date.
- The last complete list is cached for 24 hours and scoped to a token fingerprint. Each page load refreshes it; failed network refreshes preserve saved data, while authorization failures clear it.
- The switch selects favicon or cover view. Changing views or icon settings reuses loaded bookmarks.
- Favicon cards show white HTML/CSS initials immediately. Their background color is derived directly from the hostname; no image conversion, decoding or pixel analysis is needed for initials.
- Real favicons load near the viewport and replace initials after decoding and color extraction. Domain requests are shared across cards and search engines, with at most six resolution jobs running concurrently.
- Cover cards retain their geometry while loading. After 2.5 seconds, initials replace the loading surface; a cover arriving within the 15-second request window can still replace them.
- Cards reveal individually with a staggered entrance. Pointer position drives the 3D hover. A short touch tap gives 140 ms of feedback before same-tab navigation; reduced-motion users navigate immediately. Scrolling, long presses and modified clicks retain native behavior.

## Search

Type on the page or press Ctrl/Cmd+K to focus search. Editing another field, open dialogs, text selection, shortcuts and input composition are respected. The page does not open a mobile keyboard on load.

Search matches bookmark titles and URLs without case or accent sensitivity. Up to eight bookmark suggestions appear, followed by enabled search engines. Arrow keys select a suggestion; Enter opens it. With no matching bookmark, Enter uses the first enabled engine. Disabling all engines leaves favorites-only search.

Default shortcuts are a letter followed by a space:

| Letter | Engine |
| --- | --- |
| g | Google |
| y | YouTube |
| i | Google Images |
| b | Brave Search |
| h | Hugging Face |
| x | X |
| s | Spotify |

A prefix selects its engine inside the pill. Backspace in an empty engine field returns to Favorites; Escape or Clear resets search. Ctrl/Cmd+Enter opens a new tab. Mobile and narrow layouts also provide engine buttons, including image search. Search terms leave the page only when submitted.

Use **search engines** in the footer to enable, disable, reorder, edit, remove or add engines. The catalog contains 25 sources, including documentation, code, research, maps and image services. Custom engines need an HTTP(S) search URL containing `%s`, a name, and optionally a unique one-letter shortcut. Up to 60 engines can be saved. Changes apply on Save; Cancel discards the draft.

## Icon providers and colors

Use **icons api** to enable and reorder Vemetric, Google, Favicon.im and Icon Horse. Vemetric → Google is the default order. The header star cycles enabled providers' priority. At least one icon provider must remain enabled.

Vemetric metadata identifies its generated default icon. Google's known generic globe is compared against a stored reference through a readable image relay. Unknown placeholder variants and other providers' generic icons may not be recognized. Detection does not rely on byte size.

Real icons share a dominant-color algorithm and card gradient. Providers without readable pixels use a copy through wsrv.nl for color extraction; this relay receives the public favicon URL, never the Raindrop token. If color extraction fails, the initial background remains. Provider availability, upstream caches and quota accounting are outside this project's control; the app does not guarantee a particular request cost.

## Cache and reset

Resolved icon results are keyed by hostname and provider order:

- Successful icons: seven days. Readable images are stored as PNG data; others retain their URL and depend on browser HTTP caching.
- Confirmed missing icons: one day. Failed provider requests: fifteen minutes.
- Temporary on-screen initials are never cached as a completed result.
- At most 500 results and approximately 2 MB of encoded result data are persisted, with batched writes and quota-aware eviction.
- Sampled colors last 30 days; placeholder metadata lasts 24 hours. Each cache is bounded to 500 entries.

**reset cache** clears bookmark, icon, color and placeholder caches, then reloads with a new icon URL revision. Token, usage counts, view and provider/search settings are preserved. Ctrl+Shift+R / Cmd+Shift+R does the same when the browser delivers the shortcut to the page. Browser-reserved refresh actions cannot reliably be intercepted; the footer action is the explicit reset. Upstream CDN caches cannot be cleared by this app.

The first load after upgrading the icon-cache format resolves icons again. Initials remain immediately available. Storage is best effort; blocked or full browser storage can prevent persistence.

## Development and hosting

Serve the repository as static files, for example:

```sh
python3 -m http.server 8000
```

Deploy the same files to GitHub Pages or another static host. If the deployment path changes, update the base path in `404.html`, which supports legacy token URLs. Keep `404.html` aligned with `index.html` apart from that base element.

The existing Node test suite is historical and contains assumptions that no longer match the application interfaces. It has not been run or updated during the current static review, at the owner's request. Its presence is not evidence that these changes pass automated checks. See [CODE_REVIEW.md](CODE_REVIEW.md) for the review scope and remaining uncertainties.

This project is not affiliated with or endorsed by Raindrop.io.

## Card effects

Open **card effects** in the footer. Combine Glass, Holographic, Holo beams, Cosmos, Radiant, Rainbow, Gold or Etched silver with no pattern, Fine stripes, Crosshatch, Dots, Sparkle grain or Engraved rings. These are original interpretations inspired by [Simon Goellner's demonstration](https://poke-holo.simey.me/), not copies of each Pokémon card treatment.

Adjust iridescence, pattern intensity, light reflection, 3D depth and glass lift/scale. The preview responds to pointer movement or touch; sliders and selects also work with the keyboard. Save applies the draft to all cards and stores it locally; Cancel or Escape discards it. Restore defaults updates the draft only. Default iridescence is 30% and pattern intensity 50%. Reduced-motion preferences override animated effects. Icon-cache reset preserves these settings.

The appearance controls also adjust hover-shadow strength and softness, luminous edges, card/glass corners and color saturation. Inactive cards have separate foil, saturation, brightness and shadow settings. Switch the preview between **Hover** and **At rest** to compare them. Existing saved settings receive neutral defaults for the new controls.

Controls are organized into **General**, **Hover** and **At rest** tabs. Hover movement can go up, down or stay centered; vertical travel (0–30 px) and card enlargement (0–20%) are independent of tilt strength (up to 300%). The icon glass has separate shadow strength/softness, outline and opacity controls. The preview and grid share the same motion/style calculations and spring response; the preview stays engaged for editing.
