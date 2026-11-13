# Annotation collection identity — native 0.0.21

Two notes may annotate the same physical PDF, EPUB or website without sharing a
collection. Previously `openNoteTarget` replaced a global source → note mapping;
all panes for that source could then show/edit the last selected note. Native
explicit opens now bind **source path/URL plus annotation-note path to the leaf**.
The source-only default association remains stable; opening a second explicit
note does not replace it or another pane's collection.

## Implementation

- `collection-context.ts` represents the pair with an internal, unambiguous key.
  It never changes a Hypothesis URI, selector, record ID, annotation body or
  source file. Reader adapters still receive their actual source path/URL.
- `hostFor` scopes captures and payload validation to a specific live binding.
  Newly captured selections carry a pane owner. Another pane, even one showing
  the same collection/source/revision, cannot take over a closed pane's capture.
  Unowned historical passage drafts remain recoverable but require re-selection.
- Every read/mutation resolves the selected note and verifies its current target.
  Existing Bend CRUD and stale-record checks stay in place. Concurrent unrelated
  prose remains handled by the existing vault transaction. These context checks
  are host assumptions, not additional formal proofs.
- Native view workspace state carries `annotatorCollection: {source, note}` while
  preserving ordinary file/page/zoom state. A reversible leaf state wrapper
  restores the hint before the reader opens. Malformed hints are ignored; a valid
  hint with a missing/retargeted note fails safely through normal collection
  loading. Later wrappers from other plugins are not overwritten on unload.
- Note/source renames remap collection keys, leaf hints, associations and retained
  draft references. Deletion clears only the affected collections' painted
  records. Metadata still has to resolve the note's real target before writing.
- Snapshot editor highlight clicks now include the editor instance so two reading
  panes cannot route solely by a shared Markdown path. Remote source revision
  selection retains the active annotation note instead of falling back to the
  source-wide default collection.

## Evidence and limits

162 native tests pass. The integration regression constructs two compiled native
PDF adapters with a simulated one-page PDF.js document, opens separate collection
notes, verifies read-only whole-document identity, creates a real Bend-backed
passage record in the first and edits the second, checking the opposite note
remains byte-identical. It closes the original captured pane while another pane
shows that collection and verifies no write occurs and the draft stays intact.
It exercises workspace hint restoration, source/note renames and deletion without
changing the other collection. Pure tests cover key identity/Unicode, original
selector preservation, cross-pane refusal and reversible workspace wrappers.

This is not a real PDF.js/Obsidian layout, cold restart, pop-out, device-sync or
mobile acceptance run. EPUB/web/snapshot lifecycle needs live multi-collection
checks. The Mac was locked on the computer-use check. No new screenshots exist.

The original plugin-ID upgrade and `pdf-annotator` workspace adapter are still
unfinished. Older native builds ignore the new hint and use their old source-wide
association behavior; do not call that a verified rollback experience. All actual
annotation Markdown/source files retain their existing format. No shipping root
manifest/build or personal vault was changed.

Release build/TypeScript check pass. Bundle SHA-256:
`18e28e4d0845e9d0f7e01dae4f971ba97eaab407f71d981a4220d8fc0600e91f`.
0.0.21 is staged in the isolated desktop vault with prior staged plugin files
backed up, two synthetic `Collection A/B test.md` notes targeting the same public
PDF fixture, and unchanged EPUB/local-PDF/video fixture note hashes. No reload or
live activation is claimed. Last live-verified version remains 0.0.18. The audit
is `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-collection-context/staging-audit.json`.
