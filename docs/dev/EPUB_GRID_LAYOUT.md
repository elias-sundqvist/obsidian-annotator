# Publisher grid layout — native 0.0.63

The EPUB projection now retains publisher grid tracks, named areas, implicit
tracks/flow and item placement. It uses the host browser's layout on reconstructed
chapter elements; it does not install book stylesheets or classes in Obsidian.
Original text order and selector coordinates stay in the inert source tree.

Supported declarations include grid and grid-template; their explicit and
implicit longhands; grid-row, grid-column and grid-area with their start/end
longhands; justify-items/self; and place-content/items/self. Track values retain
repeat(), minmax() and fit-content() only at the existing passive declaration
boundary, with grammar validation. The historical grid-gap/grid-row-gap/
grid-column-gap aliases share the existing gap/row-gap/column-gap cascade.

The new publisher-grid module validates grid/alignment values with the pinned
CSSTree property grammar, then expands shorthands before cascade comparison.
This preserves important longhands and the distinct resets of grid versus
grid-template, custom-name defaults of omitted item endpoints, implicit row/column
flow defaults, named-area row sizing and alignment shorthand defaults.
CSS-wide or computed-invalid variable shorthands reset all affected longhands.
Existing source-relative resources, numeric bounds, conditions and variable rules
remain in force. External resource functions are refused.

These rules follow [CSS Grid Layout Level 1](https://www.w3.org/TR/css-grid-1/)
and [CSS Box Alignment](https://www.w3.org/TR/css-align-3/). The browser still
validates support for a declaration before it is applied. Winning grid display
rules activate visual reading-position selection, since grid placement can reorder
content independently of source order.

## Automated validation

302 tests and the release build pass. Regressions cover repeat/minmax/fit-content,
explicit/implicit grid shorthands, named areas and lines, numeric/span/custom-name
item defaults, important longhands, variable invalidity, grammar/resource/numeric
refusal, alignment shorthands, historical gaps and responsive grid/block changes.
The actual EpubView regression loads the checked-in named-area EPUB fixture,
keeps the selected text and capture valid through responsive template changes,
and anchors its annotation in the frozen published HTML engine.

The grammar reuses the existing pinned css-tree and its mdn-data dependency;
MDN's CC0 notice now ships with the release notices. Native main.js is 1,416,894
bytes, 123,709 bytes above 0.0.62; no Hypothesis application/legacy frame resources
are introduced. Logs: /tmp/annotator-grid-final-tests.log and
/tmp/annotator-grid-release.log. No Bend theorem or stored annotation format changes.

## Remaining scope

Browser/device layout, pagination fragmentation, complex spanning/overlapping
items, nested/subgrid, vertical/bidi layout and large-grid performance need broader
corpus evidence. Grammar acceptance and source anchoring alone do not prove actual
layout fidelity or complete native replacement readiness.

## Actual Android named-area grid and annotation — 2026-11-02

On emulator-5554 / Obsidian 1.14.4, the checked-in grid fixture rendered its named
areas stacked in portrait and side by side in landscape, without omitted-style
warnings. The second source panel appeared visually first through grid placement.
A selected “compatibility” highlight was created there before the final keyword
hardening. The final exact release then cold-opened the same record, retained its
alignment in both orientations, and saved a comment edit through Ctrl+Enter.
The final comment was “Grid annotation survives”.

The actual initial note equals expected codec creation from its raw payload. The
final note equals expected codec update from that created note, retaining the ID,
selectors and complete document metadata. Both initial and edited records match
the frozen published parser and anchor exactly in its HTML engine. The EPUB stayed
byte-identical; reading after the intended edit did not change the note. No drafts
remained. This is parser/anchoring-engine evidence, not a full published-app UI test.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-grid-layout/`.
Screenshots 02–06 precede keyword hardening; 09 shows final-artifact cold restoration,
11 the final comment save, and 12 its aligned landscape highlight. keyword-hardening.json
records both artifact hashes. storage-audit.json, edit-audit.json,
final-parser-anchor-audit.json and geometry-audit.json record storage/anchor/bounds
checks. audit.json records the final installed hashes and restoration. Final main.js
SHA256: `d793cfd3ce3bd634f6f8b4e16d5eef081fe005a49a3e3b4603506d20c61c9dc9`.

Workspace, plugin settings, community plugin list and rotation were restored and
verified; synthetic book/note files were removed. The exact release and notices
remain installed in the isolated vault. Personal vault and physical tablet were
untouched. This closes one responsive named-area scrolling fixture; spanning,
pagination, nested/subgrid, bidi/vertical and large-grid/platform gates remain.
