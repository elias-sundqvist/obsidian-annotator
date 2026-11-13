# Landscape sidebar interaction check — 2026-11-02

The earlier upgrade rehearsal's landscape failure came from tapping accessibility
bounds below the visible drawer viewport. It did not establish that annotation
actions were unreachable. The exact unchanged native 0.0.64 artifact now has an
actual Android scroll/edit/save/delete-cancel check for the same kind of EPUB card.
No product code or CSS change was needed for this case.

On emulator-5554 / Obsidian 1.14.4, Edit initially had physical bounds
[1834,832][1953,950], below Obsidian's drawer controls beginning around y=735.
A swipe inside the annotation content moved Edit to [1834,527][1953,645]. Edit,
Delete, Reply and Copy link were then all visibly above that chrome. Clicking the
visible Edit action opened the editor. Typing repositioned its content; using a
fresh capture, Save changes at [1278,614][1588,735] stored the intended comment.
An earlier stale-coordinate tap reached Bold; that draft formatting was cleared
before saving. Screenshots retain that failed attempt as well.

The actual saved comment is “Landscape edit via scrolled drawer.” The complete
note equals the codec's expected update from its original text. Only projected
text and updated time change; ID, selectors, metadata and other fields remain
equal. The frozen published parser returns the same record. The source highlight
remains aligned after editing and the EPUB bytes remain unchanged.

Clicking visible Delete opened confirmation and initially focused Cancel.
Escape dismissed it and returned actual Android focus to Delete. The annotation
note stayed byte-identical to its saved version and no recovery drafts remained.
This verifies Edit/Save and Delete cancellation. Reply/Copy were visible but their
operations were not exercised here. IME, assistive technology, video panels and
broader device/layout workflows remain separate gates.

Evidence directory:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-landscape-sidebar/`.
03–04 show actions before/after scrolling; 05–08 show the editor and coordinate
correction; 09 records successful saving; 10–11 deletion cancellation; 12 the
aligned source highlight. geometry-audit.json records positions/focus;
storage-audit.json the whole-note and frozen-parser checks; audit.json installed
hashes and restoration. Main.js SHA256:
`50502696afb2283b4b515a168fe8e93ad2a0d0bcca43ee6fb7c48a7461c940d4`.

Original workspace, enabled plugin list, plugin data and rotation were restored
and verified, and synthetic book/note files removed. The same experimental
release remains installed in the isolated vault. Personal vault and physical
tablet were untouched. The prior 304-test/release result applies to this unchanged
artifact; no new automated or formal-proof result is claimed.
