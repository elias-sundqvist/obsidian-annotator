# Publisher flex layout — native 0.0.61

The reader now projects publisher flex layouts onto its own retained chapter
elements. It previously omitted display, flex properties and sizing outside fixed
pages, turning layouts into ordinary blocks. Source styles remain evaluated only
in the inert source tree; no publisher stylesheet, class or custom property is
installed in the Obsidian document.

Supported declarations include display; flex, grow/shrink/basis; flex-flow,
direction/wrap; order; justify-content and align-items/self/content; gap and its
row/column components; width/height and min/max variants; and box-sizing. Existing
numeric bounds, function/resource restrictions, selector/cascade evaluation,
variables and responsive conditions apply. Positioning and transforms retain
their existing fixed-page policy.

Flex, flex-flow and gap expand into individual properties before cascade weight
comparison. This lets important longhands win against later shorthands and makes
omitted shorthand components reset correctly. flex-flow and gap expansion uses
parsed values because CSSStyleDeclaration implementations differ in exposing
those longhands. Computed-invalid variable shorthands mask earlier declarations.
The browser performs layout on the retained elements, preserving source text
order and the original selector coordinate system even with visual reordering.

The implementation follows the flex container/item and shorthand behavior in
[CSS Flexible Box Layout Level 1](https://www.w3.org/TR/css-flexbox-1/).
No extra remote resource or execution mechanism is added.

## Validation and limits

292 tests pass; release build passes. New regressions cover container/item styles,
wrapping, gaps and sizing; important longhand/shorthand precedence and resets;
responsive block/flex changes; refused resources/oversized values; unchanged
source text order; and exact selector anchoring in the frozen published HTML
engine. jsdom rejects global keywords on flex-grow/shrink, so that reset test also
inspects declarations sent to the real projected element's style API. It does
not claim jsdom provides browser layout geometry.

Logs: `/tmp/annotator-flex-final-tests.log` and
`/tmp/annotator-flex-release.log`. No new installed-device screenshot is claimed
for 0.0.61. Native 0.0.60 remains the latest Android live-tested artifact.
Actual flex wrapping/fragmentation, visual reordering with selection, large
publisher corpora, prefixed legacy flex declarations, grid track layout and
vertical writing remain validation/implementation gates.

## Standalone SVG spine investigation

The installed epub.js 0.3.93 source has HTML-head metadata hooks on spine sections
and constructs Contents with document.body. A standalone SVG document has neither
HTML head nor body. Executing Section.load with the actual Spine hooks logs three
head-related errors but still resolves because Hook.trigger catches synchronous
exceptions. Section.load alone therefore proves neither successful rendering nor
failure of the complete published reader. No full-app standalone SVG parity claim
is made. Native still explicitly rejects unsupported spine resource types; this
remains open pending actual published-reader evidence and a compatible source-root
projection. Inline passive SVG in XHTML is already handled separately.

## Actual Android responsive layout and highlight — 2026-11-02

Exact 0.0.61 on emulator-5554 / Obsidian 1.14.4 rendered the checked-in
`test-support/flex-layout-fixture.mjs` EPUB in scroll mode. Its purple panel comes
second in the source but has order:-1. Android showed purple above blue in portrait
and purple left of blue in the landscape row; captured UI bounds independently
confirm both arrangements. The reader reported no omitted-style warning for this
fixture. This supersedes the earlier checkpoint's lack of 0.0.61 UI evidence.

A long press selected “compatibility” in the visually first purple panel, then
Highlight created one record. The stored selectors still refer to the original
second source panel. A cold process restart restored the highlight in portrait;
another rotation showed it aligned over the word in the landscape row. The actual
saved note equals codec creation from the original note and raw creation payload,
and its prior prefix remains unchanged. The frozen published parser returns the
same record; its HTML anchoring engine resolves the quote exactly in chapter.xhtml.
The book and cold-read note stayed byte-identical and no drafts remained.

Evidence directory:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-flex-layout/`.
Screenshots 02 and 04 show stacked/row layout; 05 shows selected reordered text;
09 and 11 show cold-restored portrait/landscape highlights. geometry-audit.json,
storage-audit.json and audit.json retain bounds, parser/anchor/create checks,
installed hashes and restoration. Exact installed main.js SHA256:
`d7583291a3fe57ad531f51fe69e0d28ff7fd24e20307083712b5bd2a989d5baf`.

Workspace, community plugin list, plugin settings and rotation were restored and
byte/value verified; synthetic test files were removed. The exact release remains
installed in the isolated vault. Personal vault and physical tablet were untouched.
This is one scrolling fixture, not pagination/fragmentation, exact reading-position
fidelity under visual reordering, long selection/handle dragging, broad corpus or
all-platform parity. Those gates remain open.

## Visually leading reading positions — 0.0.62

Reading positions used to choose the first source-order node intersecting the
viewport. With publisher order/reverse flex flow, this can choose a lower panel
while an earlier visual passage is still visible. Publisher style evaluation now
reports whether the winning order/reverse-flow declarations can reorder content.
For those chapters and positioned fixed pages, the reader compares visible text
rectangles to select the leading passage in visual reading direction, then keeps
its original source offset. Rectangles outside either viewport axis are excluded.
Ordinary unreordered chapters retain the existing first-match geometry scan.
Responsive style changes update the reorder flag from the current cascade.

294 tests and release build pass. The new actual EpubView regression places the
second source panel visually above the first, checks saved/restored original
offsets, excludes an earlier offscreen node, and still anchors an annotation in
the frozen published HTML engine. A style regression checks changing responsive
order and reverse flex direction. No stored annotation format or selectors change.

### Actual Android visual reading-position cold reopen — 2026-11-02

The exact 0.0.62 artifact passed on emulator-5554 / Obsidian 1.14.4. In the
responsive fixture, text size 155% allowed the purple heading to sit partly at
the top of the portrait reading viewport while the earlier source-order blue
panel remained visible below. The persisted position was chapter 0, offset 223:
the purple heading's original text start, not the blue heading's offset 103.
A cold process restart restored the purple heading at physical y=514, the reading
viewport's top. Before and after positions both remained 223. This preserves a
text anchor; the original partial-line pixel displacement is not promised.

The entire annotation note and EPUB stayed byte-identical. No drafts remained.
Original workspace, plugin settings, community plugin list and rotation were
restored and verified, and temporary synthetic files were removed. Personal
vault and physical tablet were untouched. The exact release remains installed
in the isolated vault. Main.js SHA256:
`ccb05edaf085b257ce98f74372cc85ef36b65f4f182bdd4f7aeac2e7dbdd5434`.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-visual-reading-position/`.
Screenshot 06 shows purple above the simultaneously visible source-first blue
panel; 08 shows the cold-restored heading. source-offsets.json, before-cold-data.json,
after-data.json, position-audit.json and audit.json retain source coordinates,
geometry, installed hashes and verified restoration. The initial shorter-font
screenshots did not have enough scroll range to isolate the reordered panels;
the final check explicitly used 155% text through the reader's own control.

This closes one portrait scrolling case. Pagination, arbitrary reverse wrapping,
long mixed-bidi passages, transformed glyphs and large-book scan performance
remain broader validation gates; no full reader or platform parity is claimed.
