# Native EPUB archive background artwork — 0.0.56

Publisher background/background-image declarations can now use archive image
resources. URLs resolve relative to their declaring stylesheet (including local
imports) or the chapter for inline styles. The existing book.image adapter checks
raster signatures and reconstructs SVG images through the passive SVG projection.
Only URLs created from those returned assets can pass background-value evaluation;
external/data/foreign-blob/root-escaping references remain omitted. Fragment
references are currently omitted rather than silently dropping their fragment.

Background shorthand expands to independent longhands for cascade specificity and
resets, including color/image/position/size/repeat/origin/clip/attachment. Passive
background presentation applies to fixed and reflowable chapters. Viewport-fixed
attachment stays omitted. Styles/classes from the book are not installed in the
application; presentation object URLs never enter annotation selectors or notes.

Each mounted chapter caches references by archive path and owns its object URLs.
Disposal revokes them. A stale image completion cannot create a late URL; prior
successful resources remain owned by the returned style handle for cleanup.
New resource bounds: 32 referenced paths and 32 MiB of returned image bytes per
mounted chapter, in addition to the existing per-resource archive limits. These
are encoded/sanitized asset bytes, not a decoded-bitmap memory budget. Exceeded
limits produce styling omissions and need corpus measurement before release.

276 tests and release build pass. Coverage includes stylesheet/inline relative
resolution and URL reuse, shorthand color specificity, external/escaping/missing
assets, stale completion, count limits and cleanup. Actual EpubView coverage
loads a packaged SVG background, retains source selection and releases resources
on chapter change/disposal. No Bend storage contract or formal theorem changed.

Android Obsidian 1.14.4/emulator-5554 displayed the packaged SVG artwork on both
fixed pages. Selecting `selectable` created an ordinary highlight. Navigating to
page 2 and back restored artwork and the highlight at identical bounds. The
actual saved record was found and anchored in original XHTML by frozen published
parser/HTML-anchor code. Source EPUB byte-identical; original test note/workspace,
plugin data and enabled-plugin list restored and verified. Installed artifacts
matched dist. Main SHA256:
`a8f5f1286c700f26ea19a887291aff307fbb7a521714f2fc5fcce9b415b8d4ea`.
Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-fixed-backgrounds/`.

Remaining gates include URL-bearing custom properties, gradients/image-set,
fragment/data resources, conditional-resource loading behavior at limits, bitmap
memory/large-book budgets, real reflowable corpus/UI, desktop/iOS and broad
published-reader visual equivalence. Local CSS assets are preloaded within the
bounds; this is not lazy per-visible-rule image fetching. Background support does
not close complete publisher-CSS or native-replacement parity.

## URL-bearing background variables — 0.0.57

This supersedes the earlier URL-variable limitation. Background URLs substituted
from publisher custom properties resolve against the consuming background
declaration's stylesheet/chapter base. Custom-property definitions remain raw
publisher tokens; the definition stylesheet does not select the image path.
Reference: [CSS Variables 1 §2.1](https://www.w3.org/TR/css-variables-1/#defining-variables).

Variable backgrounds use the same chapter-owned image cache and 32-path/32-MiB
asset limits. Queued and loaded paths share the count bound. Initial style loading
waits for selected images; responsive refreshes can acquire newly selected local
assets and repaint through the existing reader callback. Pending loads do not
produce unsupported-style warnings. Acquisitions are serialized to avoid parallel
archive decompression spikes. Disposal stops queued work from creating URLs and
revokes successful resources. No publisher custom property enters host CSS.

282 tests and release build pass. Coverage checks differing definition/use paths,
inline consumption, fallback/cycles, unsafe variable URLs, media-driven image
changes, late disposal, serial acquisition, queue bounds and the real EpubView
projection retaining source selectors and selection during preference refresh.
The resource caps still require broad corpus/decoded-memory validation.

The synthetic variable-artwork book deliberately includes different images at the
definition and consumption paths. Android Obsidian 1.14.4/emulator-5554 displayed
the expected blue/green/purple artwork. Word highlight creation and exact final
artifact cold reopening passed; the saved annotation file was byte-identical on
cold read. Frozen published parser/anchor resolved the real saved word in original
XHTML. Source EPUB unchanged; original note/workspace/plugin settings/enabled
plugins restored and verified. Installed artifacts matched dist. Main SHA256:
`80edfa335814f221a11900ef82d25168b59f02e84db568ae495082d74916367c`.
Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-background-variables/`.

Actual mobile responsive-variable image switching, larger resource/cascade
corpora, remaining image-value forms, desktop/iOS and complete published-reader
visual equivalence remain open. Direct URL resources retain their earlier bounded
preload behavior; variable resources are acquired when selected by the cascade.
