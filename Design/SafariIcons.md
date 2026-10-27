# Safari extension icons

## Inventory and integration

Both targets are **Safari Web Extensions** (`com.apple.Safari.web-extension`),
not legacy Safari App Extensions. Neither extension has an asset catalog,
`SFSafariToolbarItem`/PDF icon, or an icon entry in its Info.plist. Both copy
the shared `Resources/images` folder. There is no extension popup or popup icon;
the Options Page does not contain a logo. The container app's Icon Composer
packages and launch-screen assets are separate and unchanged by this work.

| Surface | Source/reference |
| --- | --- |
| Extension settings / management | Manifest `icons` PNGs: 48, 64, 96, 128, 256, 512 px |
| Light/Dark management icons on supporting Safari versions | Manifest `icon_variants`: self-contained `images/icon.svg` / `images/icon-dark.svg` |
| Toolbar / action menu | `browser_action.default_icon`: `images/toolbar/on-{16,19,32,38}.png` |
| Enabled/disabled, normal/inverted toolbar states | Existing `background.js` `setIcon()` paths: `on`, `off`, `oni`, `offi` |
| Debug and Beta management icons | Same manifest fields, prefixed `images/beta/` at build time |
| Release management icons | Unprefixed silver Glass artwork |

`scripts/prepare_extension_manifest.py` is the sole producer of the bundled
manifest in both extension targets. Its sandboxed build phase declares inputs
and output. It changes only the management icon paths for Debug/Beta, matching
the container app's existing configuration mapping. All permissions, scripts,
toolbar references and behavior remain unchanged. Source `manifest.json` also
works directly as a Release-style unpackaged extension. No runtime theme or
configuration detection is added.

The old block-I toolbar artwork was replaced in-place; no obsolete PNG paths
remain. No app icon, native setting, or extension behavior was removed.

## Artwork and compatibility

Run `sh scripts/generate_icon_assets.sh` from the repository root to regenerate.
`rsvg-convert` is required for regeneration only, not for an Xcode build.

`scripts/generate_safari_icons.py` composes the existing `Design/AppIcon` vector
layers into four self-contained SVGs. It also derives the monochrome toolbar
geometry from exactly the same I and ribbon paths. Generated SVG headers identify
their source; do not edit the generated SVGs or PNGs by hand. The validator
recomputes SVG content and, when librsvg is available, compares direct PNG renders.

Management icons retain the I, wide translucent silver/blue band and subtle
reflections. Beta retains its white outline I and blueprint grid. Static extension
artwork cannot reproduce Icon Composer's native interactive refraction/material;
the existing source gradients are used instead. No native material is falsely
promised for PNG/SVG icons. No fake rounded system mask is baked in.

The toolbar is deliberately different: pure black/transparent, or white/transparent
for the existing inverted setting. It has no tile, gradient, blur or shadow.
Transparent separation around the filled band keeps the I and band legible under
a single system tint. The disabled state remains an I without the band, preserving
the previous state distinction. Four native/Retina PNG sizes retain compatibility
with iOS 15/macOS 12. Safari controls its own toolbar rendering; the existing
inverted option is retained for interfaces that use the supplied RGB colors.

Only the supported `icon_variants`/`color_schemes` mechanism selects management
appearances. Older Safari versions that do not understand it use the ordinary
`icons` PNG set (light artwork, also on a dark interface). No unsupported
`theme_icons`, CSS-media-query assumption or legacy Safari App Extension plist
key is used. The manifest remains version 2; deployment targets are unchanged.

References:

- [Apple: Creating a Safari web extension — icon uses and PNG sizes](https://developer.apple.com/documentation/safariservices/creating-a-safari-web-extension)
- [Apple: STP 204 — support for icon_variants](https://developer.apple.com/documentation/safari-technology-preview-release-notes/stp-release-204)
- [W3C WebExtensions proposal — icon variants and color schemes](https://github.com/w3c/webextensions/blob/main/proposals/dark_mode_extension_icons.md)

## Verification and manual Safari review

Automated: `scripts/run_tests.sh` checks all 31 PNG sizes, generated/source parity,
four management SVGs, monochrome toolbar geometry, both target resource phases,
all three manifest configurations, and configuration switching. Existing filter,
broker, Options and public-page tests remain unchanged.

Build Debug/Beta/Release for macOS and iOS, including their embedded extensions,
and run both existing XCTest suites. Inspect the **bundled**, not only source,
manifest to confirm `images/beta/` in Debug/Beta and `images/` in Release.

Implementation verification (2026-10-27, Xcode 27.1, signing disabled):

- Asset validator: 31 PNG sizes and four SVG appearances passed.
- Filter fixtures 123/123; broker, Options mode and public-page tests passed.
- macOS XCTest 19/19; iOS Simulator XCTest 19/19 (iPhone 18 Pro, iOS 27.0).
- macOS and iOS device Debug/Beta/Release builds: all six passed.
- All six built manifests and their referenced icon files matched the expected
  configuration and source bytes.
- Native macOS `WKWebExtension` loaded the Debug, Beta and Release bundles without
  parse/icon errors; management Light/Dark and action icons rendered successfully.
- Rendered management variants and toolbar assets at 16/19/32/38 px were visually
  inspected on light/dark preview surfaces. This is not an installed Safari test.

Before release, perform these manual checks using a properly signed development
build on Mac, iPhone and iPad. Automated XCTest does not drive Safari's extension
chrome; successful builds or WebKit icon renders are not a Safari UI test:

1. Run the containing app, enable the extension, and check Safari's extension
   settings/management list and action menu. If a previous install is cached,
   relaunch Safari and verify the installed build/version before judging assets.
2. Check Release silver vs. Debug/Beta blueprint icons, each with Light and Dark
   appearance; on older Safari expect the light PNG fallback.
3. Check the toolbar at normal display size and Retina scale in Light and Dark,
   including active, inactive, inverted and on-demand states. Confirm no square
   tile and a readable I/band with adequate contrast.
4. Toggle filtering and the existing inverted option. Confirm the icon updates
   without affecting filtering, counters or settings.
5. In on-demand mode, click/tap the action once and verify the page filters and
   its active icon appears. Check the action menu on both iPhone and iPad.
6. Compare 16/19 px and 32/38 px toolbar variants at their intended sizes, not only
   enlarged. Check the 48/64 px management icons as well as the larger previews.

Do not change Safari security settings or register a new installation merely to
obtain a screenshot. A signed, real Safari/device review remains a release check.
