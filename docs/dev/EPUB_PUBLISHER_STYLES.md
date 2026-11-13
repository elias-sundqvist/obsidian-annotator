# Publisher typography checkpoint — 0.0.35

The native EPUB reader previously discarded publisher styles, classes and inline
formatting. It now reads local linked/embedded stylesheets and bounded local
imports, matches rules against the inert original chapter DOM, and applies
supported declarations to retained rendered elements. Original classes are not
copied and no publisher stylesheet is inserted into Obsidian's document. Source
DOM, chapter URIs, selectors, book bytes and annotation serialization stay intact.

Supported formatting includes text colors, background colors, font family/size/
weight/style, line and letter spacing, text alignment/indentation, quotation and
paragraph spacing, borders, table spacing/alignment and list markers. Passive
SVG/MathML elements can also receive these properties; plain SVG fills/strokes
are retained, while URL-based paints remain unsupported. Ordinary
selectors, structural pseudo-classes, inline declarations, specificity, source
order and `!important` participate in the retained declaration cascade. Common
margin/padding/border shorthands expand before resolving longhand precedence.
Repeated stylesheet links retain their cascade position while sharing archive
reads; recursive imports stop at cycles.

Unobfuscated packaged TTF/OTF/WOFF/WOFF2 fonts load from bounded archive bytes,
under names unique to each runtime/face family. The reader waits for font loading
before restoring chapter geometry. Faces are removed when their chapter leaves
the mounted window, on file replacement and on reader disposal. An asynchronous
font completion from a replaced chapter cannot enter the host font set.
Recognized obfuscated-font resources are explicitly refused until their specified
key transform is implemented; arbitrary encrypted bytes never reach FontFace.

Unsupported styling is reported in the reader status. This is a passive subset,
not full CSS parity. Remaining work includes obfuscated fonts, conditional rules
(`@media`, `@supports`), custom properties, font shorthand, CSS namespaces, generated
content/counters, dynamic/functional selectors, background images, positioned and
fixed layouts, vertical writing and full HTML-root/body inheritance semantics.
The current inherited HTML-root base does not reproduce a separate HTML box or
all relative-unit/cascade interactions. These are release gates where supported
books depend on them. Unsupported declarations are not evidence that the full
publication has been rendered faithfully. Theme contrast and reader font-size
controls need corpus validation when publisher colors and absolute sizes coexist.

CSS references are archive-only. URL-bearing values, remote imports/fonts,
positioned UI, scripts and arbitrary host properties are not applied. Limits:
2,000,000 stylesheet characters per mounted chapter, import depth 8, 5,000 rules,
10,000 retained styled elements, 2,000,000 selector matches, 250,000 declaration
applications, 12 font definitions, and 24,000,000 bytes per font and in
accumulated font resources per mounted chapter (updated in 0.0.127). Cap-related omissions are visible. These bounds need representative corpus
measurements before release. The parser uses documented lightweight CSSTree
entry points; its full validation dictionary is excluded from the release bundle.
The MIT notice ships as `CSS_TREE_LICENSE.txt`.

## Validation

212 tests pass, including publisher cascade/import/network omission, font name
isolation, stale completion/disposal, archive font validation, real styled fixture
and compiled EpubView mount/eviction cleanup. The synthetic fixture generator
`test-support/publisher-fixture.mjs` packages Liberation Sans and its original SIL
OFL notice from the pinned PDF.js development fixtures. It is not a production
runtime dependency or a modified font.

On emulator-5554 / Obsidian 1.14.4 the complete fixture displayed publisher heading
colors, italic introduction, quotation border, spacing and a packaged-font sample.
No unsupported-styling warning appeared on this fixture. Selecting “Liberation”
in that sample and choosing Highlight wrote one ordinary annotation. After
force-stop/cold reopen, the styling and highlight returned; annotation bytes did
not change on reading. The source EPUB was unchanged and the original note prefix
survived creation. The frozen published parser found the saved annotation, and
the frozen published selector engine anchored its exact word in the original
chapter. This is parser/selector evidence; actual published EPUB UI remains open.

Screenshots 01–04, original note, annotation after creation/reopen, installed
artifact and integrity audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-publisher-styles/`.
Final bundle SHA-256:
`17eb34e515cf97d8f238647bd5ce1b3d611b9b1923f18fc7a1461c68e4af7533`.
The final native bundle is 1,256,519 bytes and excludes legacy/test runtime inputs.
Desktop/iOS font rendering, font decode failures across engines, large-book memory,
full published-reader interoperability and the remaining content/layout gates
above are unfinished.

## Obfuscated fonts — 0.0.36

The archive reader now supports the IDPF and Adobe font transforms selected by
`META-INF/encryption.xml` for each resource. IDPF uses the package's designated
identifier, removes only XML whitespace, hashes its UTF-8 bytes with SHA-1 and
XORs the first 1040 font bytes with the repeating key. Adobe uses the designated
UUID's 16 bytes and a 1024-byte prefix. Remaining font bytes are unchanged. Key
material is derived lazily once per algorithm, in memory; no source archive,
identifier alias or annotation selector is rewritten. This replaces 0.0.35's
obfuscated-font refusal described above.

Sources: [W3C EPUB 3.3 §4.4](https://www.w3.org/TR/epub-33/) and the pinned
[Readium Adobe transformer](https://github.com/readium/r2-shared-js/blob/7290c47baddc2a8e2cabb17b8d00dcfc274f403a/src/transform/transformer-obf-adobe.ts).
No first-identifier, archive-hash or alternate-key guessing occurs. Missing or
ambiguous package pointers, invalid UUID keys and invalid decoded font signatures
return a font omission; malformed cipher metadata, duplicate resource entries and
unknown algorithms remain explicit archive errors. Native FontFace still checks
the actual decoded font structure before registration. Existing size caps apply
before transforming. Legacy identity aliases retain their previous trimming
behavior; only key derivation uses the raw identifier, including non-XML Unicode
whitespace.

218 tests pass. Independent Node-crypto fixture encoding checks complete decoded
byte arrays and untouched tails for both algorithms, short resources, mixed
algorithms in one archive, wrong first identifiers, XML whitespace, non-ASCII and
NBSP identifiers, missing/ambiguous pointers, bad keys and malformed metadata.
The complete synthetic styled-book generator can emit `idpf` and `adobe` variants;
both recover the original licensed Liberation Sans bytes.

Independent W3C fixtures `ocf-font_obfuscation` and `ocf-font_obfuscation_bis` were
assembled into ZIPs from unchanged files at epub-tests commit
`54092b4233253e9aac80e93ec4782b380b4b3403`. The first decoded a 101,356-byte font;
the deliberately wrong-key second refused it. On emulator-5554 / Obsidian 1.14.4,
the correct-key sample rendered in the expected cursive font alongside its image
reference. The wrong-key sample displayed fallback text and the styling-omission
message, as the test expects. The Adobe synthetic fixture loaded its packaged
font/publisher styles without an omission message. All three EPUBs and annotation
notes were byte-identical before/after inspection; installed 0.0.36 matched the
release artifact.

Screenshots 01–03, pinned W3C provenance and raw fixture files, installed artifact,
unchanged-file copies and audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-obfuscated-fonts/`.
Bundle SHA-256:
`11ff092786585f98d7e6155df86829f4155deb25080c3734140c26bf82809133`.

This verifies these font workflows, not the full EPUB test suite. Desktop/iOS,
published-reader UI, protected/scripted content and historically reversed
compression/obfuscation order remain unverified. Conditional CSS, fixed layout,
vertical writing and the other reader/release gates remain open.

## Conditional typography and font shorthand — 0.0.37

Primary references: [font shorthand and resets](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font), [media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using).

Local `@media`/`@supports` blocks, stylesheet `media` attributes and media-qualified
imports now retain their source order and conditions. Width/height, orientation,
aspect-ratio and resolution comparisons support common feature and range syntax,
comma alternatives and nested boolean conditions. Pane dimensions drive layout
queries; unsupported pane-value syntax remains an explicit omission. Other media
features and feature queries use the host's parsing APIs. Explicit reader themes
supply color-scheme preferences; system mode follows the host. Device/preference
media changes notify the view even when its pane does not resize. The view removes
those listeners when a chapter closes.

Refresh updates retained declarations and font registrations in place, removing
rules that no longer match. Source text nodes, original selection coordinates and
capture identity survive. Conditional fonts are registered only while active;
changes rebuild the active set in source order, so an earlier reactivated face
cannot accidentally outrank a later same-family face. Bounded font bytes are
preloaded during chapter preparation, including inactive conditional faces; this
has a performance cost that still needs large-book measurement. An inactive font
failure does not warn until its condition is relevant. CSS, fonts and annotations
never leave their existing archive/store paths.

`font` shorthand now expands retained constituent/reset properties before the
cascade, preserves per-longhand `!important` priorities and remaps packaged font
families. Font variant, kerning, feature/variation settings and other retained
font resets participate. CSS-wide inherit/initial/unset values are retained;
engine-dependent system-font expansion remains conditional on the host CSSOM.
Viewport-relative lengths in supported declarations resolve against the reading
pane, including inside calculations and font shorthand, instead of the full
Obsidian window. Each refresh starts from original parsed tokens, preventing
cumulative unit conversion. Common media-query em/rem thresholds currently use a
16px initial font basis. A reader with a different initial browser font preference
needs additional coverage. Full HTML-root/body inheritance and rem semantics
remain open.

Existing resource/rule/match/application caps still apply, plus conditional nesting
32 and at most 128 device media listeners per mounted chapter (overflow warns).
Responsive media evaluation and style refresh are cached by condition state and
pane dimensions when viewport-relative values require them. Performance and all
media features/units are not universally verified. Custom properties, cascade
layers, container queries, namespace/dynamic selectors, generated content,
positioned/fixed layouts and vertical writing remain separate gates. Browser
feature-query support does not bypass the passive declaration whitelist.

228 tests and the release build pass. New tests cover query combinations/ranges,
unsupported evaluation, responsive rule removal, conditional import/source order,
conditional font ordering and disposal, preference listener cleanup, shorthand
resets/priorities, original-token viewport lengths and a compiled reader resize
that retains its original text selection and capture identity.

On emulator-5554 / Obsidian 1.14.4, the complete synthetic responsive fixture showed
blue headings and italic paragraphs in portrait. Selecting “passage” created an
ordinary highlight. Landscape changed the heading to green, removed the narrow
italic styling and added green paragraph borders; the highlight still covered
the same word. Returning to portrait removed the wide border and restored the
blue/italic styling. Force-stop/cold reopen restored the highlight and typography.
The source EPUB was unchanged; the original note prefix survived creation and
annotation bytes did not change on rotation/reopen. The frozen published parser
found the saved record and its selector engine anchored the original word.
Original emulator rotation settings were restored. This is actual Android
geometry evidence, not a complete device, corpus or published-reader UI claim.

Screenshots 01–06, before/after notes, installed release and integrity audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-responsive-css/`.
The earlier screenshot 03 shows the annotation drawer after saving; 04 shows the
uncovered landscape reader. Bundle SHA-256:
`e4af68cf3b7dab9ac46ff97348ec11b35ca1eddf56b35f3f4e92325d445c7f64`.

The separate published-reader EPUB rehearsal was retried while the Mac was
briefly available. The unchanged 0.2.11 artifact restored the note before metadata
was ready and showed its old missing-target message. A reload was invoked after
indexing, but the Mac locked before the EPUB could be inspected. That UI gate is
still open; no anchoring success or failure is inferred from this interruption.

## Unchanged published reader on Android — compatibility gate still open

On emulator-5554 / Obsidian 1.14.4, an isolated rehearsal disabled the native
plugin and installed the unchanged published 0.2.11 main.js and manifest under
the original plugin ID. The installed bundle matched the pinned SHA-256
`aa08182b6fac314af098ef692702987ff11a02c490a140009d67fa86c815a938`.
The entire test-vault Obsidian configuration was copied before staging.

After switching Annotation/Markdown mode twice following startup, the published
reader rendered Publisher Styles Field Guide, including its chapter text and
packaged typography. Its presentation was broken: icon ligatures appeared as
large text, reader content overlapped Obsidian chrome, and the annotation-sidebar
control occupied the Android status-bar area. Touch/keyboard navigation did not
produce a reliable annotation sidebar inspection. No published edit was made.
This establishes publication loading on that host, not annotation anchoring,
missing annotations, cross-editing, or a diagnosed cause of the layout failure.

Both the EPUB and annotation note remained byte-identical. The native plugin
configuration, workspace and settings were restored from their exact saved
files, the temporary original-ID plugin removed, and Obsidian restarted.
Screenshots, raw accessibility trees, complete configuration backup, installed
published artifact, before/after documents and hash audit are preserved at
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-published-epub-android/`.
Actual published EPUB sidebar/anchor/edit/reopen verification remains required;
use an unobstructed desktop session or first establish a working published
Android layout without patching the frozen compatibility artifact.

## Published EPUB frame-routing correction — 0.0.39

Keyboard focus reached the obstructed published sidebar without modifying its
artifact. It loaded the native “Liberation” record as an orphan. Editing that
record through the published UI succeeded. A highlight created by the unchanged
published UI on the same word anchored correctly and exposed the decisive
difference: its URI/target source was `http://localhost/?loc=chapter.xhtml`,
whereas the native record used the HTTPS demo-reader URL. The original frozen
sidebar's `frameForAnnotation` uses exact URI equality and otherwise chooses the
outer reader, regardless of matching Dublin Core publication/chapter metadata.

New native section identities now use the live Obsidian document's origin and
pathname, matching the pinned published integration's canonical-URI expression.
Detached/null-origin documents retain the prior demo fallback. Existing stored
records are not migrated or rewritten. Native recovery continues to accept old
URI variants and publication fingerprints. The corrected frozen-oracle tests
cover actual Android localhost and desktop app-scheme hosts, nested/Unicode
chapter paths, and expose the previous demo-host-only test's false confidence.
234 tests and the release build pass.

Actual Android Obsidian 1.14.4: native reopened the published-created highlight
and published-edited comment; native 0.0.39 then created “the” in the next
paragraph with the localhost URI. After a cold switch back to unchanged 0.2.11
and the old reader's metadata-readiness toggle, both the published “Liberation”
and new native “the” highlights appeared in the book. Tapping “the” opened its
matching card; editing/saving through the published UI succeeded. Screenshots
30–33 and before/after notes document this. The original demo-URI record remains
an orphan in published UI; its native recovery remains available. The synthetic
EPUB itself stayed byte-identical throughout.

This closes the demonstrated same-host URI-routing failure, not the entire
EPUB compatibility gate. Frozen published routing remains host-specific: a
desktop app-scheme record can route to the outer frame on Android, and vice
versa. Metadata aliases retrieve records but do not repair that frozen routing.
Cross-device old-reader interoperability, earlier experimental demo-URI records,
multi-chapter timing, page notes/replies/delete/restart/corpus coverage and an
actual desktop host check remain explicit release gates. No automatic URI
migration, duplicate-record workaround or patched reference application is used.

Evidence directory is the Android rehearsal directory above. Native release
main.js SHA-256: `4644e604c18ed4f098e87ba5cadbc45ec15f40a7ba6b84d6f77e39633e0f8b93`.

Final native cold reopen retained all three highlights and displayed “Native to
published to native EPUB check.” on the new record. The final native read left
the published-edited note byte-identical. The original test workspace, enabled
plugin list and native settings were restored; the temporary original-ID plugin
was removed. Native 0.0.39 remains installed. Screenshot 36 and
`host-routing-audit.json` record the final read and artifact/document integrity.

## Scoped publisher custom properties — 0.0.41

The earlier custom-property omission is now replaced by bounded book-local
resolution, including inheritance, fallbacks/cycles, computed-value invalidity,
conditional refresh and private font aliases. Actual Android comparison pairs,
rotation/highlight evidence, limits and remaining CSS gates are documented in
[Publisher CSS variables](EPUB_PUBLISHER_VARIABLES.md).

## Publisher gradient backgrounds — 0.0.81

Publisher background/background-image values now allow linear, radial, conic
and repeating gradient functions. The allowance is restricted to background
values; existing URL ownership, numeric limits, unknown-function rejection,
variable substitution and browser declaration validation still apply. No raw
author stylesheets or external image URLs enter the host.

Two regressions cover all six gradient forms, variable/shorthand cascade,
background sizing, original/rendered text-range equality, unknown nested functions
and mixed external image layers (zero image fetches). The positive regression
failed before the change. The test DOM cannot parse full background-position/size
shorthand with gradients, so that form was checked in the actual host.

Android Obsidian 1.14.4 cold-opened a synthetic grid-derived EPUB with a visible
linear blue gradient and variable radial purple gradient using full background
shorthand. The source EPUB and complete note remained byte-identical. Original
isolated workspace/community/plugin settings were restored; synthetic files
removed. Evidence, screenshot and installed hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-gradients/`.
`test-support/gradient-layout-fixture.mjs` deterministically reproduces its
decompressed contents; ZIP directory timestamps are normalized in the generator.

All 328 tests, release build, original-ID rehearsal packaging and diff checks
pass. Conic/repeating visual checks, dark themes, pagination and annotation CRUD
on this fixture remain open. This is bounded background support, not complete
publisher CSS parity. No Bend theorem or personal-vault content changed.

## Text-decoration shorthand cascade — 0.0.82

Text-decoration now expands to line, thickness, style and color before declaration
weights are compared. Complete values are checked against the bundled CSS-tree
grammar; omitted components use their initial values. Global values apply to all
components. Invalid declarations are omitted, while invalid variable substitution
masks earlier components using unset. Passive-value/number checks still run
before expansion. This follows [CSS Text Decoration 4](https://www.w3.org/TR/css-text-decor-4/#text-decoration-property).

Two host regressions cover mixed shorthand/longhand specificity, important color,
omitted-value resets, absent variables, inherit and invalid declarations. No
source selectors, annotation storage or Bend laws changed. Actual EPUB visual
checks (underline/strike-through, dark theme, font metrics and highlighted text)
remain open; this checkpoint is cascade evidence, not complete decoration parity.
No installed artifact or personal-vault content changed.

0.0.82 validation: all 330 tests, release build, original-ID rehearsal packaging
and diff checks pass.

## Actual Android text-decoration cascade — unchanged 0.0.82

The final 0.0.82 release cold-opened a synthetic grid-derived EPUB on Android
Obsidian 1.14.4. The purple heading displays a blue wavy strike-through from an
important line override and color longhand; the blue heading displays the red
wavy underline from the more-specific shorthand. Both survive a later weaker
text-decoration:none declaration. Raw screenshot 02-ready.png records the render.

EPUB and complete annotation-note bytes remained equal. Original isolated
workspace/community/plugin settings were restored and fixtures removed. Exact
installed-artifact hashes and audit are retained at
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-decorations/`.
The deterministic `test-support/decoration-layout-fixture.mjs` reproduces the
fixture. Runtime remains 0.0.82; no source or CSS fix was required after the visual
check, and no additional unit test was added. The preceding runtime checkpoint
passed 330 tests and release/rehearsal builds. Dark theme, pagination, highlighting
interactions, desktop and broader decoration corpus remain open. No personal
vault or physical tablet was used.

## Publisher list shorthand and inheritance — 0.0.83

Passive list-style declarations now expand to marker type, position and image
reset before cascade ranking. Omitted values reset to disc/outside/none; an
explicit none sets the type to none unless a separate type was supplied. Global
values affect all components, and invalid variable substitution masks earlier
components using unset. List properties are included in inherited root styles.
Complete shorthands use the bundled CSS-tree grammar; URL/image-marker acquisition
is not enabled by this change. See [list-style reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/list-style).

Two regressions cover specificity, omitted-value resets, none ambiguity,
position-only shorthand, root inheritance, variable failure, blocked URL markers
with zero image reads, and original/rendered list-text mapping equality.
Actual marker visuals, counter styles, image bullets, pagination, list start/
reversed/value attributes and device corpus remain open. This is automated host
evidence; no installed artifact, annotation format or Bend theorem changed.

0.0.83 validation: all 332 tests, release build, original-ID rehearsal packaging
and diff checks pass.

## HTML list numbering and marker hints — 0.0.84

Projection preserves ol start/reversed/type, li value/type and ul type attributes
on their list elements. Raw numeric/boolean attribute values are retained so the
browser uses the same parsing and counter behavior as the original DOM, including
negative and long start values. A derived case-preserving marker hint plus reader-
scoped CSS restores marker presentation against host defaults; publisher inline
styles can override it. This avoids HTML type selectors' case-insensitive matching
collapsing lower/upper Roman or alphabetic hints.

Host tests compare source/rendered list properties, exact attribute values, text
and range mappings. Shipped-CSS tests distinguish a/A/i/I and check inline style
overrides. All 334 tests, release build, original-ID rehearsal packaging and diff
checks pass. A deterministic fixture is in test-support/list-layout-fixture.mjs.

Actual Android Obsidian 1.14.4 verifies V, IX, VIII for a reversed/restarted list
and square markers from publisher shorthand. The first candidate showed decimal
markers despite retained type attributes; screenshot 04-markers-ready.png shows
the corrected final artifact. Source EPUB and complete annotation-note bytes
remain equal. Original isolated workspace/community/plugin settings were restored
and test files removed. Evidence and installed hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-lists/`.

Host marker colors remain dim; margin-block in the fixture is omitted and triggers
the publisher-style warning. Those are recorded remaining gaps. Image markers,
counter definitions, dark theme, pagination, list annotation CRUD and broader
platform checks remain open. No personal vault, physical tablet or Bend source
was changed.

## EPUB list marker color — 0.0.85

Reader-scoped li::marker now inherits the list item's color instead of the host's
muted UI marker color. The actual Android Obsidian 1.14.4 screenshot shows dark
Roman and square markers alongside the dark book text, preserving the reversed
V/IX/VIII sequence. This corrects the dim-marker finding in 0.0.84.

Source EPUB and complete note bytes stayed equal. Original isolated workspace/
community/plugin settings were restored and temporary fixtures removed. Raw
screenshot and exact installed hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-list-marker-color/`.
Release type checking/build, original-ID rehearsal packaging and diff checks pass.
No new unit test was added for this CSS-only change; the preceding runtime
checkpoint passed 334 tests. Dark theme, contrast measurement, publisher marker
pseudo-element rules and desktop checks remain open. Logical spacing remains
omitted in the fixture. No personal vault or physical tablet was used.

## Logical spacing and alias cascade order — 0.0.86

Publisher margin-block, margin-inline, padding-block and padding-inline now
validate against the bundled grammar and expand to their start/end longhands.
Global values and computed-invalid variables affect both sides. Invalid multi-
value declarations remain omitted. Winners carry source order and are emitted
from weaker/earlier to stronger/later cascade weights. This preserves ordering
when physical and logical properties alias the same browser-resolved edge,
without hardcoding direction or writing-mode edge mappings.

The regression checks one/two-sided expansion, physical/logical emission order
under specificity and source-order ties, invalid arity and variable unset. All
335 tests, release build, original-ID rehearsal packaging and diff checks pass.
These ordering tests do not themselves establish actual RTL/vertical geometry.

Final Android Obsidian 1.14.4 cold-opened the unchanged list fixture with its
margin-block spacing applied and the publisher-style omission warning gone.
The reversed Roman and square markers remain visible. Source EPUB and complete
note bytes were identical; original isolated workspace/community/plugin settings
were restored and fixtures removed. Screenshot, raw UI and installed hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-logical-spacing/`.
Actual RTL/vertical physical-edge competition, pagination, dark theme and wider
layout corpus remain open. No personal vault, physical tablet or Bend source
was changed.

## Actual LTR/RTL physical/logical alias geometry — unchanged 0.0.86

A synthetic four-paragraph EPUB now checks both directions and both stronger
property types. Specific logical start margins compete with weaker physical
edges; specific physical edges compete with weaker logical starts. Actual Android
Obsidian 1.14.4 displays the intended right edge in RTL and left edge in LTR.

Screenshot blue-border samples, converted using the emulator's 420 dpi density
(2.625 device pixels/CSS pixel), measured 40.00px for each logical winner,
59.81px for the RTL physical winner and 60.19px for the LTR physical winner.
All are within one CSS pixel of the expected 40/60px. This establishes actual
horizontal alias precedence for these cases, beyond serialized-style tests.
The deterministic fixture is test-support/logical-spacing-fixture.mjs.

Source EPUB and complete note bytes remained identical. Original isolated
workspace/community/plugin settings were restored and fixtures removed. Raw PNG,
accessibility bounds, pixel geometry and installed artifact hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-spacing-aliases/`.
No runtime change/version bump was needed; the existing 0.0.86 artifact is used.
Its preceding checkpoint passed 335 tests and release/rehearsal builds. Vertical
writing, pagination, inheritance/revert edge cases, annotations on this fixture
and desktop remain open. No personal vault or physical tablet was used.

## Projected table header relationships — 0.0.87

Passive table projection now keeps valid th scope values and abbreviated header
labels. Cell headers references are resolved after the projection is complete,
rewritten to prefixed reader IDs, deduplicated and limited to retained th elements
in the same source table. Missing, cross-table and host-only references are not
linked. Forward references work without adopting original/book DOM nodes.

The host regression checks row/column scope, abbreviations, forward references,
missing/duplicate/cross-table header references, text equality and original/
rendered cell-range mapping. Actual TalkBack/VoiceOver header announcements,
complex multi-level/merged tables, duplicate source IDs and broader table styling
remain open. Existing span-size restrictions also remain. This is semantic DOM
coverage, not full table accessibility parity or a new Bend proof. No installed
artifact or personal-vault content changed.

0.0.87 validation: all 336 tests, release build, original-ID rehearsal packaging
and diff checks pass.

## Table span attributes — 0.0.88

Cell colspan/rowspan and col/colgroup span are now preserved on their relevant
elements. The previous three-digit filter dropped longer values, and column
spans were omitted entirely. Keeping raw passive values lets the browser apply
the same integer parsing and clamping as the original source DOM, including
rowspan=0, instead of a separate projection-specific numeric grammar.

The host regression compares source/rendered DOM span properties and raw values
for zero, long and noncanonical numeric spellings, with unchanged cell text and
range mappings. All 337 tests, release build, original-ID rehearsal packaging and
diff checks pass. Actual merged-table rendering, very large-table memory/layout,
screen-reader announcements and broader device checks remain open. This is
structural DOM evidence; no installed artifact, personal-vault content or Bend
theorem changed.

## Actual Android merged-table rendering — unchanged 0.0.88

A deterministic synthetic EPUB now exercises a two-level header, grouped column
heading, rowspan=0 body header, explicit header references, column spans and a
full-width footer. Android Obsidian 1.14.4 renders the expected merged geometry
in portrait scroll mode. Screenshot 02-ready.png shows both body rows under Q1
and the Measurements heading spanning Quantity/Quality. No runtime fix was
needed after the visual check. The fixture is test-support/table-layout-fixture.mjs.

Source EPUB and complete note bytes remained equal; original isolated workspace/
community/plugin settings were restored and test files removed. Raw UI, PNG and
installed hashes: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-tables/`.
Runtime remains 0.0.88, whose preceding checkpoint passed 337 tests and release/
rehearsal builds. This verifies small merged-table rendering, not screen-reader
header announcements, huge-table memory, pagination, dark theme, annotation CRUD
or complete desktop/mobile table parity. No personal vault or physical tablet
was used.

## Native disclosures and hidden-passage navigation — 0.0.89

Projection retains authored details open state and disclosure group names. Group
names are scoped per projection, even when callers reuse an ID prefix, so book
controls cannot group with host UI or another projected chapter. Native summary
interaction remains browser-managed.

EPUB annotation activation, chapter search and fragment navigation reveal closed
ancestor disclosures before scrolling to hidden content. A visible summary does
not force its own disclosure open; nested content opens outer ancestors first.
RangePainter listens for captured toggle events and schedules a geometry repaint,
including cases where the outer reader size does not change. Disposal removes
the listener. Source text, selectors and stored annotations are not rewritten.

Tests cover authored/scoped state, separate projection groups, summary/content
reveal, nested/idempotent reveal, original/rendered range equality, actual EPUB
activation/search call order, repaint scheduling and listener cleanup. All 340
tests, release build, original-ID rehearsal packaging and diff checks pass.
Actual disclosure UI, grouped behavior on supported host versions, highlight
geometry after toggles, cold progress into collapsed content, snapshot navigation
and assistive-technology announcements remain open. This is automated host
evidence, not a new installed artifact or Bend theorem.

## Saved offset inside collapsed disclosure — 0.0.90

The range-based EPUB offset restoration path now reveals enclosing disclosures
before measuring the target text rectangle. Previously a reopened reader could
measure hidden content and restore to the wrong geometry. The existing offset
indexing, chapter-start guard and browser scroll calculation remain in place.

The compiled-reader regression failed before this change and checks a saved
nonzero offset in collapsed text: the disclosure is open when geometry is read,
the scroll position is correct and the original text offset is retained. All 341
tests, release build, original-ID rehearsal packaging and diff checks pass.
Actual cold-start geometry, pagination, zero-offset disclosure intent and manual
open-state persistence remain open. This is host-assumption evidence, not a Bend
proof or a new installed artifact. No personal-vault content changed.

## Ruby placement and alignment — 0.0.104

The bounded publisher cascade now retains `ruby-position` and `ruby-align`, including inheritance from the inert HTML root and normal specificity/important ordering. Their inheritance and positioning semantics follow the [W3C CSS Ruby module](https://www.w3.org/TR/css-ruby-1/). Passive projection preserves explicit `rb` and `rtc` elements, retaining their original source-to-rendered mapping. No source text or selectors are rewritten.

A regression failed on the prior projection, then passed grouping preservation, root inheritance, important positioning, alignment and base/reading selector round trips. All 368 tests pass, as do release and original-ID rehearsal builds. `test-support/browser-ruby-check.mjs` exercises actual projection/style modules in fresh Chromium 151.0.7922.34: ordinary ruby readings appear above/below their base according to publisher styles; original Japanese reading selectors restore the exact text into a CSS Highlight; source markup remains unchanged. Evidence and screenshot: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-browser-ruby/passed`.

Scope: horizontal ruby placement and alignment only. The explicit `rtc` example retains its element and CSS, but this Chromium version lays its reading inline; the screenshot and geometry record that limitation rather than claiming multi-level ruby support. Vertical writing, cross-line ruby fragmentation, spanning/merged annotations and actual Obsidian/Android ruby interaction remain open. The initial browser fixture omitted a UTF-8 declaration; that fixture encoding was corrected. Geometry checks compare reading/base positions rather than assuming font bounding boxes cannot overlap. No installed artifact, personal vault, annotation storage format or Bend theorem changed.

### Ruby pointer selection and published anchoring — 2026-11-02

The Chromium ruby fixture now also uses a real mouse drag across the under-positioned Japanese reading, then a selection-preserving capture button. The native projection maps it to the original `/p[2]/ruby[1]/rt[1]`, offsets 0–5, with exact quote `とうきょう`. Native restoration returns the same reading. The frozen published HTML anchor module anchors those native selectors to the same original reading; its own describe output resolves through the native projection to that same text. This is browser selection plus pinned anchoring-module evidence in both directions, not full published application UI or storage CRUD certification. The initial fixture assertion incorrectly expected sibling ruby index 2 rather than paragraph index 2; the recorded original XPath corrected that assertion.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-browser-ruby-selection/published-checked`. The checked-in `test-support/browser-ruby-check.mjs` runs after the normal build, which verifies/extracts the pinned published oracle. No runtime, installed artifact, vault or Bend theorem changed in this verification-only step; the preceding complete suite remains 368 passing tests. The rtc, vertical-writing and device limits above still apply.

## Large real CJK font — 0.0.127

The former 8 MiB per-font decompression limit rejects the actual 16,467,736-byte NotoSansCJKjp-Regular.otf even though it fits the existing 24,000,000-byte chapter font budget. The new shared constant aligns the per-font loader with that same budget; the total publisher-font budget remains unchanged. A byte-level regression reproduces the earlier rejection, accepts a CJK-sized resource and still refuses 24,000,001 bytes. A separate exact-boundary publisher test accepts two 12,000,000-byte faces, refuses another byte, reports an omission and unloads both faces. This is a bounded compatibility improvement, not removal of all EPUB size limits.

The real reference is pinned in test-support/large-cjk-font-corpus.json: official notofonts/noto-cjk commit f8d157532fbfaeda587e826d4cd5b21a49186f7c, [font source](https://github.com/notofonts/noto-cjk/blob/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf), SHA256 68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5. Its SIL OFL1.1 license is included unchanged in the private synthetic EPUB. No font/book asset is checked in or shipped.

A fresh Chromium comparison loads that book through production openPublication/projectHtml/applyPublisherStyles. The native horizontal and vertical sample dimensions match an independent browser FontFace reference within one pixel, there are zero omissions, the source DOM is unchanged and the Japanese passage restores through both native and frozen published selectors. CSS font inspection confirms actual custom NotoSansCJKjp-Regular glyph use, rather than relying only on a requested family name. Repeatable harness: test-support/browser-large-font-check.mjs (synthetic EPUB path and evidence directory; Playwright module via ANNOTATOR_PLAYWRIGHT_MODULE).

Actual Android Obsidian1.14.4 / emulator-5554 opens and cold-reopens the same synthetic EPUB. Read-only DOM/CSS inspection confirms the packaged custom font renders 33 glyphs in the Japanese sample, horizontal/vertical writing modes are retained and status reports no omission. The cold screenshot was visually inspected. Note and EPUB bytes remain identical; installed 0.0.127 artifacts match dist. Original workspace/community-plugin/native settings restored exactly, temporary QA files/forwarding removed. No personal vault or physical tablet used.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-large-cjk-font/`, before.json/source.json, browser/audit.json and comparison.png, android/02-rendered-font.json and .png, android/03-cold-font.json and .png, source copies and android/audit.json. All 396 tests and release/rehearsal builds pass. This is one real font in a synthetic book; Android selection/CRUD, full published-reader UI, multiple large faces and wider memory/performance/corpus/device gates remain open. No stored annotation/Bend change.

## Archive image bullets — 0.0.137

Publisher list-style-image and list-style image tokens now resolve through the same passive archive-image boundary as backgrounds. Both uses share the chapter limit of32 assets/32MiB, deduplicate resource reads, and revoke owned URLs on disposal. Stylesheet-relative URLs, inline declarations, custom-property consumer paths and responsive changes retain their existing rules. External, escaping, foreign-blob, missing or unsupported resources remain omitted with the styling warning. No network image fetch or arbitrary publisher CSS is installed.

The shorthand expander now retains the image component while preserving type/position defaults, none handling, and subsequent shorthand resets. Behavior follows the [CSS Lists shorthand and image definitions](https://www.w3.org/TR/css-lists-3/#list-style-property). Bullet artwork stays outside source text and selector coordinates.

Three new regressions cover shared background/marker assets, stylesheet and inline-variable paths, specificity/reset behavior, source/range preservation, external/path rejection, combined asset-count limits, responsive loading and stale disposal. The pre-change source fails the image-marker regressions. All419 tests and release/original-ID rehearsal builds pass.

A fresh Chromium run opens the deterministic synthetic EPUB through production openPublication, projection and publisher styling. It decodes the16×16 sanitized SVG, verifies one shared image read, checks the text-bullet reset, and anchors source/native selections through frozen published functions. Desktop and390px screenshots are retained; these browser screenshots are not Android or Obsidian UI evidence. Reproduce with npm run build, then PLAYWRIGHT_MODULE set to an installed Playwright module and node test-support/browser-image-marker-check.mjs OUTPUT_DIRECTORY. The fixture is test-support/image-marker-fixture.mjs.

Separately, actual desktop Obsidian1.14.5 with native0.0.137 visually displays two archive shorthand diamonds, one inline-variable diamond, and the hollow-circle reset, without an unsupported-styling warning. The actual CUA screenshot was emitted and inspected in chat; no exported native PNG is claimed. Complete EPUB/note bytes remain unchanged, all three backed-up configurations were restored exactly, and the two known QA files were removed after closing only the test window. Installed native0.0.137 artifacts match dist.

Evidence: ~/Documents/obsidian-annotator-native-test-validation/2026-11-02-image-markers/ contains the EPUB, browser PNGs/audit, host artifact/cleanup audit, test/build logs, and negative-control result. This closes the previously recorded image-bullet implementation gap for supported passive image resources. Custom counter definitions, marker pseudo-element rules, broader image/corpus/platform/pagination behavior and actual full published-reader UI compatibility remain open. No Bend grammar, annotation format or proof changed.
