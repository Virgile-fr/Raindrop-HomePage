# Static consistency review — 2026-10-01

## Scope and method

Source review of the HTML entry points, CSS, JavaScript modules, storage and network flows, documentation, package metadata and existing test assumptions. No tests, browser sessions, syntax execution, benchmarks or live provider checks were performed, as requested by the owner. Findings below describe code changes, not verified runtime results. This review cannot guarantee the absence of bugs or visual regressions.

## Corrections in this change

| Finding | Correction |
| --- | --- |
| Initials required canvas generation, image decoding and color sampling | Render local text with CSS and derive the existing card gradient directly from its deterministic color |
| Temporary initials could suppress a valid favicon through the cache | Cache only final image/missing results; migrate to `iconResultsV2` |
| Cache keys included titles, duplicating work for one domain | Share keys and pending requests by hostname and ordered provider list |
| Icon loads and engine icons followed different loading paths | Use one visibility observer, one bounded resolution queue and one cache |
| Failed relay/metadata promises could live for the entire tab session | Release settled pending entries; keep only explicit persistent results |
| Detached icon targets could accumulate across UI changes | Remove disconnected observer targets |
| A slow cover could be replaced permanently by initials | Keep its request alive within a bounded window and accept a late decoded cover without changing geometry |
| Entrance animation could outlive removed cards or interfere with focus | Cancel on re-render/focus and honor reduced-motion changes |
| Changing credentials could wait for or race an old paginated request | Abort the old request, capture credentials and reject stale generations |
| Touch navigation differed when a card was entering or motion was reduced | Keep same-tab short-tap behavior, with feedback only when appropriate |
| Context menu/back navigation could leave touch motion state behind | Reset pending navigation/motion on relevant lifecycle events |
| Icon preference writes could silently fail while reporting success | Keep existing preferences and report persistence failure |
| Malformed engine registries and editor states were inconsistent | Validate IDs and booleans, recover invalid records, validate shortcuts and restore focus after removal |
| Narrow-layout search behavior disagreed with its CSS | Use the same narrow/coarse-pointer condition and update hints on changes |
| Hidden controls, focus styling and switch touch targets were inconsistent | Apply a global hidden rule, extend focus styles and enlarge the switch hit area |
| Light-theme variables depended on a media query and a CSS variable was misspelled | Provide root defaults and consistently rename the variable |
| Entry-point script order and duplicate HTML could drift | Order dependencies before consumers and align the legacy 404 entry point |
| Documentation contradicted the cache, initials and configurable search behavior | Consolidate README and update local-data removal/security notes |

## Remaining limitations and follow-up

- The historical tests assume older script counts, French errors, DOM mocks and the former image-based favicon interface. They were preserved and neither run nor rewritten. Updating them requires a separate testing pass authorized by the owner.
- `package.json` declares MIT but the repository has no standalone LICENSE file. The maintainer should confirm the intended license and copyright notice before adding one.
- No timing, animation smoothness, touch behavior or accessibility outcome has been measured in a browser during this review.
- Provider endpoints, quotas, placeholder variants and search templates have not been live-checked. Unknown default icons can still pass through; relay failure can prevent sampled colors.
- URL-backed icons still depend on browser/provider caching. A local result cache cannot promise zero network requests or a particular Icon Horse credit cost.
- Browser-reserved refresh shortcuts cannot reliably trigger the application's reset logic. The footer reset action is the supported explicit reset.
- Cache migration discards old generated-initial image results once. The next visit resolves real icons again while displaying immediate text initials.
- GitHub Pages projects on the same hostname share origin storage. Existing storage keys are retained for compatibility; the local cache is not encrypted.
