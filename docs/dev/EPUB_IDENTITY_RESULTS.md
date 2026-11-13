# EPUB identity and cross-reader validation — 0.0.7

Implemented and checked 2026-10-31 on `experiment/obsidian-native-pdf`.

## Identity and resolution

The native reader and bundled Hypothesis sidebar share an EPUB identity adapter.
Native records emit standard `document.dc`, `documentFingerprint`, `document.link`,
URI and selectors. The Dublin Core recipe reproduces the installed epub.js hooks
and pinned Hypothesis HTMLMetadata, including duplicate metadata and the legacy
link/meta quirk. epub.js uses the first DC identifier in OPF metadata, which can
differ from the package's `unique-identifier`; both identities are retained.

A chapter URI and manifest id are aliases. A text annotation still has to anchor
against the chapter content. Missing, conflicting or reused aliases can recover
only a unique passage within the explicitly associated publication. Stale offsets
cannot select between duplicate passages across chapters. Normalized recovery is
reported separately. Chapter notes require identity; replies inherit their parent.
Unresolved records remain stored and visible. Archive SHA-256 is a revision signal,
not a veto when a passage survives repackaging.

The legacy local search API loads records from the associated note and supplies a
transient `$epubRoute` after the same content check. Stored URIs and selectors are
never rewritten. The sidebar waits for the correct guest, navigates to unloaded
chapters, and resends after frame replacement or reconnection. Guest payloads
contain only tag, URI and targets; comments, document metadata and routing hints
are not sent to book frames. The client's existing HTTP serializer strips `$`
properties before storage.

## Validation

- Native build/typecheck and 48 reader tests pass, including differential tests
  against actual epub.js metadata hooks and pinned Hypothesis code, renamed and
  reused ids, conflicting aliases, duplicate passages, replies, normalized
  recovery, storage preservation and actual FrameSyncService lifecycle behavior.
- Three root legacy Jest tests pass. The root Rollup bundle and the Hypothesis
  development client bundle build successfully. Full legacy typechecking still
  reports dependency/Preact errors; none reference the modified client files.
- Existing Bend verification passes unchanged (92 laws, 15 negative controls,
  30 bridge checks). These proofs concern storage, not DOM identity resolution.
- Live Obsidian 1.14.5 in the isolated test vault: an unchanged historical EPUB
  annotation resolves and paints in the native reader despite the downloaded
  EPUB's renamed resource. The bundled Hypothesis UI also retrieves it, navigates
  from its sidebar to the unloaded chapter, and paints it.
- A comment edit in Hypothesis appears in the native reader; a native edit appears
  in Hypothesis. A new native chapter note appears in Hypothesis Page Notes and is
  editable there. A storage audit confirms the historical record's id, URI,
  target and entire document metadata remain equal, with no persisted routing hint.
- Personal vault notes and books are not modified. Private screenshots, copied
  notes and the live audit are kept outside the repository in the test validation
  directory. The synthetic fixtures in the tests contain no personal data.

The live checks required fixing two legacy startup defects: use Cheerio's
parsing-only entry point to avoid initializing Node fetch dependencies, and skip
missing CodeMirror link elements in SourceViewObserver. A full Obsidian restart
was required to clear failed module initialization from the earlier bundle.

This is local cross-reader interoperability with the bundled Hypothesis client.
It does not automatically upload records to the public Hypothesis service.
