# Fixed-page EPUB implementation gate

The synthetic `test-support/fixed-layout-fixture.mjs` packages two 800×600 XHTML
pages, positioned text/frame geometry, a complete EPUB 3 package/navigation,
stable identifier, and reciprocal links to selectable passages. Its fixed page
boundaries and positioned text are meaningful content, not optional decoration.
No external assets, scripts or publisher runtime are required.

Installed epub.js 0.3.93 parses `rendition:layout=pre-paginated` and `spread=none`.
Its Layout.format calls Contents.fit rather than columns. Contents.fit reads the
page viewport, retains 800×600 CSS dimensions and scales by min(width ratio,
height ratio): 400×300 gives scale .5. The package/layout regression executes
those installed implementations with a recorded presentation host. It does not
prove actual published Obsidian rendering; the installed dependency is not the
frozen published application oracle.

Native openPublication currently rejects this fixture. This remains a release
blocker under the no-feature-loss requirement until published behavior is checked
and equivalent native rendering/anchoring is implemented. The rejection test
records the gap; it must change when support lands, not become an acceptance
criterion that permanently excludes fixed layout.

Implementation requirements:

- Resolve package and spine-item layout overrides, declared page viewports,
  progression and spread policies. Do not infer fixed layout from incidental
  page dimensions or silently reflow an explicitly fixed page.
- Retain passive positioning/sizing in an isolated page coordinate space; current
  publisher style projection omits those declarations. Scope overflow, paint and
  stacking to that page so book CSS cannot position over application controls.
- Scale page presentation without changing source text/selector coordinates.
  Highlights, selection, links, page navigation and resize/orientation must use
  the same transform. Font-size controls cannot reflow fixed artwork.
- Preserve per-page boundaries in pagination and continuous modes, reading
  position and cross-page back links; then handle mixed fixed/reflowable spines.
- Prove both selector directions with the frozen published anchor, actual-host
  legacy/native screenshots, annotation CRUD, cold reopen, orientation and
  source/annotation byte audits. Invalid viewport metadata needs a visible error.

Fixture artifact:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-fixed-layout/Fixed Page Field Guide.epub`.
Two targeted fixture tests pass. No production capability or release version
changed in this investigation; broader fixed-layout and replacement gates remain.

## Layout metadata and fitting foundation — 0.0.51

`epub-layout.ts` resolves package layout and spine-item overrides, rejects
conflicting/unknown layout declarations, validates explicit numeric page
viewports and computes aspect-preserving page fit. Hidden/zero-sized reader
viewports return no fit, allowing deferred layout instead of invalid transforms.
These helpers do not change text or annotation coordinates.

Package loading now uses effective spine-item layout rather than only checking
a global meta flag. Previously a pre-paginated item in a reflowable package could
silently enter the reflowable renderer. It now receives an explicit fixed-page
error while rendering is unfinished. An all-reflowable overridden spine may
open; linked non-spine pages still inherit package layout and cannot bypass the
fixed-page gate. This is classification correctness, not fixed-page support.

Tests cover package inheritance, both override directions, conflicting values,
invalid/duplicate/missing viewport dimensions, zero available geometry, exact
half-scale fitting, mixed-layout rejection and linked inherited fixed pages.
Full suite: 263 tests passed; after final linked-page hardening, all 29 targeted
reader/fixture tests and the release build passed. The viewport/fitting helpers
are ready for renderer integration; no fixed-page UI is claimed yet.

## Native fixed-page rendering checkpoint — 0.0.52

This supersedes the earlier package rejection: effective fixed chapters now carry
validated viewport metadata and mount into clipped, isolated page slots. Their
inner content retains declared CSS dimensions and a transform with origin 0,0;
slot height follows the fitted page. The same projected source mapping is used
for fixed/reflowable text. Pagination advances one fixed page per chapter;
continuous mode retains independent page slots. Fixed-page text sizes stay at
publisher/default page sizes and the reader font-size control is disabled.

Publisher projection allows passive positioning/sizing and background shorthand
only for fixed pages. Absolute/relative/static positions remain inside the slot;
fixed/sticky declarations remain omitted. No publisher stylesheet/classes enter
the application. Page clipping/containment/isolation prevents positioned content
from drawing over the application chrome. Other unsupported styles still warn.

265 tests pass, plus release build. The actual EpubView test mounts the fixture,
checks fit/positioned text, captures a word, anchors its selectors through the
frozen published HTML engine, retains selection through font preference changes,
turns pages and restores the saved highlight. A separate style test checks opt-in
positioning and rejection of fixed/sticky UI. These are DOM/adapter tests, not
new Bend laws or proof of complete fixed-layout browser equivalence.

Android Obsidian 1.14.4/emulator-5554 rendered both pages with their frame,
positioned text and page background. Next page worked; cold restart retained
page 2; the fragment link opened page 1 and Back returned to page 2. Source EPUB
and annotation note were byte-identical. Original test configuration restored;
installed release artifact hashes matched dist. Main SHA256:
`f623673cc73889966a2b9718db52ebda5c6d3ad2ff696abf8f2bc4d0106580b4`.
Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-fixed-render/`.

The fixture still reports omitted publisher styling (including non-inherited
html declarations); broad CSS fidelity is not established. Spreads/cover alignment,
SVG/image spine resources, transformed publisher artwork, mixed-layout visual
corpora, desktop/iOS, orientation, actual live selection/CRUD/highlight alignment,
continuous fixed-page windowing and published-app UI comparisons remain gates.
This basic XHTML fixed-page path does not close full fixed-layout parity.

## Actual Android fixed-page highlight lifecycle — 0.0.52

Long-press selected `selectable` in the first positioned page. Native Highlight
created one ordinary annotation at `http://localhost/?loc=one.xhtml`, containing
Range/TextPosition/TextQuote selectors. Its saved record was found by the frozen
published parser at that exact URI and the frozen HTML anchor resolved the word
in the original XHTML. This is actual saved-data compatibility, not a published
application UI pass.

The mark visually covered the word in portrait and landscape. Accessibility
bounds changed from `[194,826][343,866]` to `[291,695][409,727]` with page fitting.
After force-stop/cold restart back in portrait, the exact original mark bounds
returned. Opening the mark displayed its native annotation card. Editing the
comment through Save changes retained its ID, selectors and document metadata.
Confirmed deletion removed the mark and left zero records; whole-document bytes
matched the codec's expected deletion output. Deletion retained one additional
trailing newline versus the initial note, consistent with the existing separator
normalization rule; this is not a claim of exact create/delete inversion.

The source EPUB stayed byte-identical. Original test note, workspace, plugin data,
enabled plugins and emulator rotation preferences were restored and verified.
Artifact hashes matched the same 0.0.52 release. Evidence (screenshots/XML,
before/create/edit/delete notes, compatibility/storage audits and config backups):
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-fixed-annotations/`.

An attempted Android Ctrl+Enter keycombination did not save; the explicit Save
button did. Hardware shortcut routing remains unverified/needs investigation.
Live replies/page notes, continuous/mixed/spread layout, published-app UI and
broader device/content gates remain open.

## Facing-page pagination — 0.0.53

Per-chapter spread policy now inherits package `rendition:spread` and accepts
spine overrides; physical left/right/center placement supports the prefixed and
historical unprefixed aliases. Unknown/conflicting values fail explicitly.
Grouping keeps logical spine order separate from physical slots, including RTL,
blank facing slots and centered pages. `auto` uses landscape reader geometry;
explicit `both`, `none`, `landscape` and deprecated `portrait` are retained.
Metadata/placement reference: [EPUB 3.3 §8.2.2.3–4](https://www.w3.org/TR/epub-33/#sec-spread).

Pagination mounts both chapter projections in a spread and uses a common fit
scale, physical CSS ordering and centered presentation. Page turns skip the whole
spread. Geometry changes regroup around the requested chapter. Continuous mode
still uses independent vertical fixed-page slots; it does not synthesize spreads.
The inherited reflowable column gap is explicitly cleared in flex spreads to
avoid overflow on width-constrained readers.

269 tests passed. They cover policy/placement, cover-like blank slots, RTL slots,
second-page source selectors and portrait/landscape regrouping retaining the
requested chapter. Final zero-gap hardening passed 28 targeted EPUB/fixture tests
and release build. No Bend storage contract changed.

On actual Android Obsidian 1.14.4/emulator-5554, the landscape-policy fixture showed
one page in portrait and two facing pages in landscape. Selecting `selectable`
on the right page created a record at `?loc=two.xhtml`; the frozen published parser
found it and its HTML anchor located the exact word in original second-page XHTML.
The mark was aligned in the spread and returned on portrait page 2 navigation.
Source EPUB unchanged; original note/configuration/rotation restored and verified.
Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-fixed-spreads/`.
Those UI captures/artifact hashes predate final column-gap hardening; they are not
an exact final-artifact UI pass. Reinstall/final UI validation remains required.

Remaining gates include larger mixed/unequal-sized/spread-placement corpora,
continuous policy equivalence, pending selections during orientation regrouping,
actual RTL/cover UI, exact final artifact UI, desktop/iOS, and frozen published-app
comparison. This advances spread support without completing fixed-layout parity.

## Cold-start spread restoration and exact artifact — 0.0.54

The exact 0.0.53 recheck exposed a startup gap: initial chapter mounting could
precede measurable viewport geometry. A landscape cold start then kept one page,
even though rotation-based grouping tests passed. Restoration now compares its
mounted chapters with the spread required by visible geometry before completing;
if they differ, it remounts while retaining the requested chapter/fragment/offset.
The hidden-startup regression verifies requested page 2 survives and both pages
mount when landscape geometry appears. 270 tests and release build pass.

Actual Android Obsidian 1.14.4/emulator-5554 cold-started directly in landscape on
0.0.54 with both pages and the saved right-page highlight aligned. The inherited
column gap is absent. Portrait page-2 navigation restored that mark. This closes
the exact final-artifact check for this fixture, superseding 0.0.53's pending check.
It does not establish the remaining broad spread/device/selection workflow gates.

The saved annotation file and EPUB stayed byte-identical throughout reading and
rotation. Original note/configuration/rotation settings were restored and verified.
Installed main.js/manifest/styles matched dist. Main SHA256:
`c5d0be71a17eeb7a7ef221ae58ed808a1f9deacf75e6b9f02910d997cd77fbca`.
Failed 0.0.53 startup capture, corrected screenshots/XML, artifact copies, backups
and audit: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-fixed-spreads-final/`.

## Publisher 2D transforms — 0.0.55

Fixed-page fit now belongs to a dedicated canvas wrapper; the inner projection
retains publisher body transforms as well as descendant transforms. Allowed 2D
matrix/translate/scale/rotate/skew functions and transform-origin are opt-in for
fixed pages, with existing passive-value and numeric limits. Unsupported 3D,
resource-backed or arbitrary functions still produce omission warnings. Page
clipping/containment remains on the outer slot. Source DOM/text coordinates and
stored selectors are unchanged by presentation transforms.

272 tests and release build pass. Style tests cover opt-in transform scope,
unsupported function/resource omission and exact source mapping. The actual
EpubView fixture composes a translated body, rotated heading and rotated passage
with independent page fit; selection/published anchoring and font-preference
changes preserve the selected source word.

Android Obsidian 1.14.4/emulator-5554 displayed the translated body and rotated
heading/paragraph. Long-press selection and Highlight saved `selectable`; the
mark covered that word. Its actual record was found by the frozen published
parser and anchored in original XHTML by the frozen HTML engine. Highlights use
axis-aligned browser range rectangles; arbitrary glyph-shaped transformed
highlight fidelity is not established.

Source EPUB byte-identical; original note/workspace/plugin data/enabled-plugin
list restored and verified. Installed artifacts matched dist. Main SHA256:
`97ed200266d0605e43f3f41a50273508719ba457d3ea35949d6eb2dd52add73f`.
Screenshots, original/saved note, source/artifact copies and audits:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-fixed-transforms/`.
Broader affine/layout/3D corpora, transformed-text rotation/reopen and complete
published-app/device verification remain open; full fixed-layout parity is unfinished.

## Packaged background artwork — 0.0.56

Archive-backed background images now render on native fixed pages (and are
available to reflowable publisher styling). Android artwork/highlight/page-turn
checks passed with original selectors and byte-identical source. 276 tests and
release build pass. See EPUB_BACKGROUNDS.md for resource ownership, shorthand
cascade, explicit bounds, exact artifact and the still-open fidelity/device gates.

## Selection across spread regrouping — 0.0.60 (2026-11-02)

Orientation-driven spread regrouping now retains common chapter mounts rather
than calling showChapter and rebuilding the whole group. Mount generations,
source selectors, actual text nodes and the browser selection remain intact on
the retained page. If a non-collapsed selection is on the other spread page,
that page becomes the requested chapter before narrowing. Missing neighbors
load through the existing resource lifecycle; removed pages are disposed as
before. Book, annotation and wire-format data are not rewritten.

A pending regroup recomputes desired membership after resource loading, so a
second rotation is authoritative. Reader epoch checks prevent old completion
from removing or replacing chapters after navigation or disposal. Existing
cold-start zero-geometry reconciliation remains unchanged.

Three actual EpubView regressions cover selected node/capture retention through
portrait/landscape/portrait, selecting the opposite page, frozen published
anchoring after regroup, a second rotation during delayed image loading, and
navigation during that loading. Full suite: 288 passing tests; release build
passes. Logs: /tmp/annotator-spread-selection-final-tests.log and
/tmp/annotator-spread-selection-release.log.

This checkpoint has no new installed-device UI evidence. Physical orientation,
mobile text selection handles and full shared-sidebar draft interaction still
need live verification. An unselected pending capture for a removed page remains
invalid, as required by the 0.0.59 mount-lifetime policy.

### Actual Android selection and draft rotation — 2026-11-02

The exact 0.0.60 release passed on emulator-5554 / Obsidian 1.14.4 using a
synthetic two-page fixed XHTML book with landscape-only spreads. A long press
selected “selectable” on page two. Portrait → landscape → portrait retained the
visible selection and Android handles, with both pages mounted in landscape.
Annotate then opened the shared sidebar with that quote. A typed comment survived
two further rotations, and held Ctrl+Enter saved exactly one annotation. A cold
process restart restored the page-two highlight; another landscape rotation
placed it over the same word in the facing spread.

The saved note equals codec creation from the original note and the raw creation
payload, preserving its prior prefix. The independently frozen published parser
returns the same record, and the frozen published HTML engine anchors its selectors
exactly to “selectable” in OPS/two.xhtml. Cold reading did not change a note byte;
the EPUB stayed byte-identical. No recovery draft remained after saving. The raw
JSON retains original context spaces while the historical visible context overlay
trims them; the creation audit uses the raw payload, not that parsed overlay.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-spread-selection/`.
Screenshots 03–05 show live selection through rotation; 07–08 show the retained
comment; 09 shows saving; 12–13 show cold-restored highlights. storage-audit.json
records parser/anchor/whole-create checks; audit.json records installed hashes
and restoration. Main bundle SHA256:
`ad60ddc3e90ff4383156351125d5b6381c1debb8b6db40456ed74ee072ec195a`.

Original workspace, community plugin list, plugin settings and rotation were
restored and verified; temporary synthetic files were removed. The current release
remains installed in the isolated vault. The personal vault and physical tablet
were untouched. This closes the single-fixture Android selection/draft rotation
check above, not broad publisher/device parity, actual opposite-page selection,
text-handle dragging, IME or the remaining release gates.

## SVG document foundation (not yet enabled in the reader)

`epub-svg.ts` now parses an SVG page as XML and retains its namespace, authored
viewBox (including a nonzero origin), text nodes and source document. It derives
page dimensions from viewBox width/height as required by
[EPUB 3.3](https://www.w3.org/TR/epub-33/#sec-fxl-icb-svg), rather than interpreting
SVG pages as HTML or guessing dimensions from width/height attributes. It rejects
malformed XML, foreign roots, DTD/entities, oversized source and invalid viewBox
lists/nonpositive or nonfinite dimensions. Parsing is not sanitization: only the
existing passive projection can produce host content.

Regressions preserve Unicode text across SVG/tspan boundaries through passive
projection and back to the original, verify script omission from the projection
without mutating the parsed source, and reject invalid documents/viewports.
This module is preparatory and only enters the test build at this checkpoint.
SVG spine items are still rejected by openPublication. Package media-type routing,
XML-root annotation selectors, publisher styles/resources, viewport fitting,
frozen published-reader compatibility and live device evidence must be integrated
before SVG reader support can be claimed. No Bend proof changed.

## Mixed SVG reading order — 0.0.95

SVG spine documents now enter the publication loader and annotation resolver.
The original root is the XML `svg`, rather than a fabricated HTML body. Source
range/index helpers accept an Element root, and projection can reconstruct the
root itself. SVG publisher root declarations apply to the reconstructed SVG;
HTML's existing inherited-root handling remains separate. SVG links route through
the same chapter/fragment navigation callback. Unspined SVG image assets are not
silently added to the reading order or required to have page viewports.

SVG pages keep viewBox coordinates and use the fixed-page fit/spread machinery.
The final implementation sizes the SVG canvas to its fitted dimensions and lets
viewBox scale the content, while XHTML retains its original CSS canvas transform.
An actual Android check found that transforming the HTML parent caused SVG text
to enlarge relative to shapes and overflow. Disabling mobile text autosizing did
not help and was removed. Native viewBox scaling fixed the final rendering.

The synthetic `test-support/svg-spine-fixture.mjs` combines one XHTML page, one
SVG page with a nonzero viewBox origin and Unicode/tspan text, and an unspined
SVG image without a page viewport. Frozen published Hypothesis anchoring modules
accept native selectors on the original SVG root, and native resolution accepts
their selectors. XML SVG metadata does not acquire an invented HTML head/DC
fingerprint. Publisher root/descendant CSS, passive projection, routed links,
source bytes and both fit paths are covered. All 352 tests pass, including
TypeScript/build. Release/original-ID rehearsal packaging and diff checks pass.
These are anchoring-module tests, not the complete published reader application.

Android Obsidian 1.14.4 rendered the final pages in portrait scroll mode, followed
XHTML→SVG and SVG→XHTML passage links, and opened a native draft from the selected
SVG word `passage`. The draft was cancelled. Archive/note bytes remained exactly
unchanged, no fixture draft remained, and original workspace/community-plugin/
plugin-data settings were restored. The experimental installed files match
0.0.95. Private screenshots and audit are under
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-svg-spine`.
Screenshots 01–04 show unsuccessful rendering candidates; 05–10 show the final
viewBox implementation and selection/navigation checks. Read-only Android WebView
DOM/CSS inspection helped diagnose geometry; no page script was injected and the
temporary localhost ADB forwarding was removed. No personal vault was touched.

Remaining gates include actual saved SVG annotation CRUD/highlight/reopen,
unchanged published reader UI interoperability, desktop/pop-outs, pagination and
spread/device corpus, accessibility, linked non-spine SVG documents, active SVG,
external XML stylesheets and the existing bounded passive SVG/CSS feature set.
Cold restoration requested chapter two but landed on chapter one in this scroll
fixture; links worked afterward. The saved-position issue remains to investigate.
This does not establish full SVG or native-replacement parity. No Bend law changed.

## Restoring pages with invisible leading text — 0.0.96

The SVG cold-start failure recorded above was caused by the leading `title`
text node. It remains part of the selector-compatible original/rendered text
index, but has no visible text rectangle. Using its zero rectangle clamped the
scroll to the beginning of the whole continuous window, which included the prior
chapter. Scroll restoration now uses the owning chapter's origin when the text
rectangle is absent/empty. The same fallback covers an image-only chapter with
no indexed text. Visible text retains precise offset restoration; disclosure
content is still revealed before measuring. Pagination keeps its chapter-start
behavior.

A host regression supplies a preceding page and a later SVG chapter, exercises
invisible title versus visible text offsets, then replaces the latter with an
image-only page. All 353 tests pass, including TypeScript/build. Live verification
is recorded separately below. No selectors, source archive or Bend law changed.

Android 0.0.96 live verification: cold opening the mixed fixture at chapter two,
offset zero now lands on the SVG page. Creating a highlight on `passage`, stopping
the Obsidian process and reopening restores that highlight at the same SVG text.
Tapping it opens its sidebar card. Editing its comment to `SVGverified` saves and
renders the comment; confirmed deletion removes the card and painted mark.
A second create/delete cycle was also completed through the native UI.

The immutable published parser's exact URI search finds the actual saved record,
and the frozen published HTML anchoring engine resolves its selectors against the
original SVG root. This remains module-level cross-compatibility evidence, not a
full published app UI check. Storage audits establish: created/reopened Markdown
is byte-identical; the edit changes only the visible comment bytes; first deletion
leaves exactly one extra separator newline after the original note; second full
create/delete leaves the whole document byte-identical to the first cycle result.
No claim of initial-document equality is made. Archive bytes stayed unchanged.

Private screenshots, saved/edited/deleted notes, parser/anchor and storage audits:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-svg-reopen`.
Screenshot 04 shows the cold-restored highlight, 08 the saved comment, and 10/18
the deleted state. One intermediate second-cycle tap copied the synthetic
annotation link after the accessibility bounds shifted; it did not edit storage.
Deletion was subsequently confirmed through freshly inspected controls. Original
workspace, plugin data and community-plugin settings were restored exactly,
synthetic files removed, and installed 0.0.96 files verified against the release.
No personal vault or physical tablet was used.

Release/original-ID rehearsal packaging and diff checks pass. This closes this
one SVG Android create/read/update/delete/cold-reopen path and the metadata-offset
restoration bug. Broader SVG corpus, complete published reader UI, replies,
pagination/spreads, desktop, accessibility and the remaining native-only release
gates stay open. No Bend theorem changed.

## Linked non-spine SVG documents — 0.0.97

Explicit page anchors and navigation entries can now open manifest SVG documents
outside the spine, including recursive SVG anchors with `xlink:href`. Discovered
pages retain manifest href/id identity and are marked non-linear, so they do not
appear in ordinary continuous scrolling. SVGs referenced only by images or CSS
remain assets. Canonical archive paths deduplicate aliases and break link cycles;
external/unsafe links do not introduce archive chapters. The graph retains the
2,000-document and 32 MiB annotation-text bounds. Discovery parses source
chapters when there are unspined SVG candidates; large-book scan cost still needs
performance measurement. SVG pages retain the existing required viewBox/passive
SVG restrictions rather than claiming support for arbitrary SVG files.

The `svgSpineBook({linked:true})` fixture removes the SVG page from the spine while
retaining its navigation and source links. Automated cases also cover encoded
paths, recursive xlink anchors, duplicate/cyclic links, image-only references,
external/traversal links and document-cap enforcement. All 355 tests, TypeScript/
build, release/original-ID rehearsal packaging and diff checks pass.

Android Obsidian 1.14.4 portrait scroll mode shows only the linear XHTML page in
the original flow. Its link opens the non-spine SVG passage, the SVG return link
opens the XHTML passage, and the reader Back button returns to the SVG page.
Archive and annotation note remain byte-identical. Original workspace, community
plugin configuration and plugin data were restored exactly, synthetic files
removed, and installed 0.0.97 files verified against the release.

Private screenshots, fixture, before/after bytes and artifact/configuration audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-linked-svg`.
No personal vault or physical tablet was used. Recursive/xlink/graph-limit behavior
is automated coverage, not an actual device corpus. Saved annotations on a linked
non-spine SVG, complete published reader UI, desktop, large-book performance,
accessibility and the broader native-only replacement gates remain open. No Bend
codec or theorem changed.
