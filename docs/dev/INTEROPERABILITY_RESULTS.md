# Cross-reader implementation and verification

Implemented on `experiment/obsidian-native-pdf`, 2026-10-30–31. These are adapter,
client-code and DOM tests, not a claim of full production feature parity or new
formal proofs of browser behavior.

## Implemented

- The embedded Hypothesis backend and native UI now write/delete through the
  same ahead-of-time compiled Bend store. Ordinary reads still have independent
  legacy and Bend implementations for differential checking. The legacy reader
  accepts CRLF and hyphenated IDs; newly generated native/import IDs remain
  alphanumeric so the unmodified old reader also recognizes them.
- Existing-record writes patch intended fields, retaining omitted extensions
  and unchanged typed JSON subtrees, including numeric lexemes. Native comment
  and tag edits keep embedded JSON bytes intact. Full selector edits refresh
  the visible quote. Strict recognition rejects malformed/duplicate blocks
  before returning a mutation.
- Both vault adapters await writes; existing-note writes use `Vault.process`
  so separate annotation updates do not race through read/modify pairs. Native
  edits/deletes additionally reject stale record snapshots. The old client API
  does not carry a revision precondition: competing edits to the *same* record
  from that client still follow last-writer behavior. Automatic multiwriter
  merging has not been implemented.
- Native-created PDF annotations carry `urn:x-pdf:<original fingerprint>` URI,
  target source and fingerprint document metadata matching the pinned client's
  metadata/search protocol. New UI-created records include creation timestamps.
  Legacy records are not rewritten on open.
- The native sidebar supports tags, page notes and replies as well as highlights
  and comments. Replies retain their ancestor IDs. Deletion removes only the
  chosen record, matching the pinned service/local backend; remaining replies
  retain references and the native sidebar labels an unavailable parent.
- PDF quote context is checked across concatenated pages. Mapping the verified
  match into the rendered page uses page-local context, avoiding rejection when
  Hypothesis's prefix/suffix spans a page boundary. Imported annotations with an
  unverified source or different fingerprint remain visible and unresolved.
- Native locator hints are optional and are not used as authority for matching.

## Hypothesis JSON exchange

Two native commands import/export JSON for the current PDF annotation note:

- **Import Hypothesis JSON into current PDF annotations** opens a JSON picker.
  The full batch validates before modifying the existing note. The original file
  is retained verbatim next to the note under a content-hashed filename. A failed
  final note transaction can leave this harmless archive behind.
- **Export current PDF annotations as Hypothesis JSON** writes a new JSON vault
  file with a unique filename. It does not overwrite an earlier export.

The envelope follows the current upstream source at
[`a7b7400d0d706d4357ec37c2a3610b25dcca89d5`](https://github.com/hypothesis/client/blob/a7b7400d0d706d4357ec37c2a3610b25dcca89d5/src/sidebar/services/annotations-exporter.tsx):
`export_date`, `export_userid`, `client_version`, and `annotations`.
The corresponding
[upstream reader](https://github.com/hypothesis/client/blob/a7b7400d0d706d4357ec37c2a3610b25dcca89d5/src/sidebar/helpers/import.ts)
requires an object with an annotations array. Fixtures here are source-derived,
not captured exports from a user's account.

Every imported record retains portable `hypothesisExchange` provenance inside
its stored block: original ID, original typed record, envelope and local baseline.
The archive additionally retains the exact original file bytes, including a
possible UTF-8 BOM. Input must decode as UTF-8 JSON; invalid encodings are refused. A deterministic, injective UTF-16 encoding maps external
IDs to local alphanumeric block anchors; references use the same mapping. Local
identity defaults are kept separate from the original author/group/permissions.
Export applies intended changes against the preserved original and restores
original IDs/references instead of exporting local identity defaults.

Repeated import of an identical record is a no-op, retaining local edits.
Changed incoming records, ID collisions, reserved provenance fields and
unsupported local field values reject the batch with a diagnostic. Explicitly
reimporting a previously deleted record restores it; this is an import action,
not background synchronization. Multiple export envelopes can be combined with
fresh export metadata; conflicting unknown envelope fields are rejected rather
than discarded. Exact raw input remains archived independently.

Hypothesis's
[service importer](https://github.com/hypothesis/client/blob/a7b7400d0d706d4357ec37c2a3610b25dcca89d5/src/sidebar/services/import-annotations.ts)
selects a subset of record fields and creates new annotations. Local export
preserves original authorship/thread information, but cannot compel that service
to retain it. No cloud account writes or live synchronization were performed.

## Checks

- `npm --prefix experiments/native-pdf test`: **34 tests pass**, including:
  - Both directions of alternating CRUD with reparsing and exact whole-document
    stabilization over 20 mixed-reader cycles, plus batches of three creations
    followed by deletion in different orders over LF/CRLF/EOF boundary cases.
  - PDF, EPUB-addressed and website record storage. The latter two are synthetic
    storage cases, not native EPUB/web rendering tests.
  - Real bundled Hypothesis `AnnotationsService.save/delete/reply` against the local
    adapter, plus unmodified pre-integration reader comparisons. Source-only
    page-note targets make the pinned client's reply operation work; original
    empty targets in imported exports remain intact in provenance/export.
  - Real bundled PDF `describe/anchor` versus native DOM selection `capture`,
    payload generation and quote resolution in jsdom. Cases include astral text,
    ligatures, page-spanning context, second-page offsets and repeated quotes.
    Assertions check the same actual DOM text node and offsets.
  - Legacy fixtures, both captured live PDF notes, CRLF, tags, replies, deleted
    parents, absent native hints and lossless JSON exchange/edit cycles.
- `npm test -- --runInBand`: **3 legacy tests pass**. Jest is scoped to its own
  suite; Node's native adapter tests run under their own runner.
- `node experiments/bend-codec/verify.mjs`: **92 checked laws, 15 rejected mutation
  controls and 30 bridge tests pass**. The original 91 law statements remain; a
  new law requires every accepted create to return a boundary-normalized source.
  Its legacy oracle is now an immutable source snapshot from `9b8fe21`, so it
  cannot become a circular comparison against the newly integrated writer.
- `npm run quick-build`: succeeds for the legacy plugin. The existing dependency
  build needed a Cheerio namespace import; TypeScript excludes experimental and
  submodule sources, leaving their independent toolchains responsible for them.
  The old build still reports existing host-type and circular-dependency warnings.
- Native TypeScript check and browser bundling pass. Runtime compilation is not
  added to either reader. The experimental legacy manifest now requires Obsidian
  1.11.4, consistent with the native prototype and awaited `Vault.process` writes.

## Follow-up fixes found during live verification

Version 0.0.4 fixes two exchange cases: native/legacy exports now project visible
fields onto the original typed JSON recursively, preserving nested number
lexemes, including during legacy selector edits; reimport of our own native or mixed exports is a no-op against the
current store. A store containing only edited imported records also recognizes
its own current export. Divergent incoming edits still require explicit
resolution. Native card labels now show the comment instead of a long local ID.

Version 0.0.5 fixes a broader newline case that the original single-create/delete
law did not cover. Previously, three creates followed by three deletes grew a
short test document through lengths 9, 11, 13 and 15 over repeated batches.
The new **explicit separator-ownership rule** is:

- One physically empty line immediately after an annotation's closing anchor
  belongs to that annotation. Further empty lines and whitespace-only lines
  remain raw. No preceding prose or whitespace is consumed.
- Creation emits this trailing empty line. An update preserves the complete
  anchor ending and owned empty line; deletion removes both with the annotation.
- This changes deletion's whitespace ownership for existing notes that already
  have an empty line after an anchor. Merely opening/reparsing/printing them still
  preserves every byte. The initial boundary closure can still add at most two
  LF characters to an incomplete source; unrelated raw text is never trimmed.
- Successful creation now carries both the existing reparsed-delete certificate
  and a checked boundary-fixed certificate. This strengthens creation's contract;
  it does not turn deletion into receipt replay. A new negative control removes
  the owned separator and must fail the concrete acceptance proof.
- Session undo retains the exact original source even when adding a boundary to
  a legacy EOF anchor shifts that blank line into its parsed annotation span.
  The small host-side boundary receipt adjustment has its own regression test.

The new universal law is the creation-boundary property. The batch examples and
live cycles are regression/integration checks, not a claim that an arbitrary
batch theorem or the JavaScript exchange layer has been formally proved.

## Completed live checks

Obsidian **1.13.7**, macOS **26.6.2**, isolated vault
`obsidian-annotator-native-test`. Testing resumed after unlock on October 30 and
continued into October 31 (Europe/Stockholm). No personal vault was modified.

- v0.0.3: restored both original highlights (three rectangles), verified zero
  iframes, created a page note with two tags and its reply through the native
  controls, and imported the synthetic JSON fixture through the file picker.
- v0.0.4: edited the imported text/tags, used the actual export command and
  reimport picker with that source-shaped synthetic fixture, and checked
  exported original ID/author/group/permissions, large-number and negative-zero
  lexemes, and the byte-exact archived input.
- Reimported the mixed five-record export through the picker: zero imports,
  five records retained, complete Markdown unchanged byte-for-byte.
- Reloaded the app and restored all five records and three highlight rectangles.
  Deleted a parent; its reply stayed present with an unavailable-parent label.
- Wrote the temporary reply through the real legacy storage entry point on disk.
  The native list updated. Saving the stale native draft was refused; reopening
  the record and editing it natively succeeded. This is a live storage-adapter
  check, not an interactive test of the old iframe UI.
- v0.0.5: ran two live three-create/three-delete batches through the native save
  and delete handlers, with reparsing and real `Vault.process` writes. Each left
  the complete Markdown unchanged and retained the two original annotations.
  A further live check repeated a different deletion order and exported and
  reimported the remaining store with the complete source unchanged.
- Original highlights still opened their saved comments after the final reload.
  The final window contained three highlight rectangles and zero iframes.
- Temporary records were removed. The exact pre-test annotation note was restored;
  both original annotation records and PDF bytes are retained. Input archives and
  uniquely named export files remain in the isolated test vault as evidence.

[Cross-compatibility screenshots](evidence/cross-compatibility/) record each stage.
The first two screenshots show v0.0.3; screenshots 03–07 show v0.0.4; the final
checks/screenshots show v0.0.5. [interoperability-evidence.json](interoperability-evidence.json)
records final artifact hashes and live-test scope. The captured Markdown and JSON
fixtures under `fixtures/` are test data produced by this workflow.

The Mac locked again after these live runs. The final refinement shares the
numeric-projection helper between exchange and legacy full-selector edits; its
nested-number regression and all automated checks pass. That build is installed
in the isolated vault but could not be reloaded after the lock. Thus the final
live screenshots/checks establish v0.0.5's UI, exchange and separator behavior,
while the exact final binary's last numeric-preservation refinement awaits live
reload. Evidence records both the live-checked and installed hashes.

## Remaining release gates

Native EPUB and website readers remain planned adapters. Their storage is shared,
but this change does not implement their rendering or establish anchor parity.
A larger real-document corpus, real current Hypothesis account export fixtures,
current service import verification, multi-target/media selector support and
complete thread presentation remain release gates. The new exchange/host JS is
tested, not formally verified; existing Bend proofs cover their documented core
operations, not this entire integration.

## End-to-end migration check (2026-11-12)

Run in the design vault against notes written by the original Annotator
(`Existing annotations/`: three PDFs, one EPUB) and notes written by this
reader during the design round.

| Check | Result |
| --- | --- |
| Migration report (`Check annotation notes`) | 23 annotated sources, 70 highlights, 35 notes: every note readable as it is, nothing to convert, nothing changed |
| Original-plugin notes opened in the reader | 4/4, 21/21 (PDF) and 2/2 (EPUB) annotations located; note files byte-identical afterwards |
| One annotation whose note was re-pointed at another copy of its PDF | On 2026-11-12: retained and reported as belonging to another PDF fingerprint (the original plugin does not show it for that target either: its query is by exact URI). Since 2026-11-13 (owner's decision): placed by its words where the open file has them exactly once, and marked "made on another copy of this PDF"; this one is now painted on page 3. The note is not changed |
| Notes written by this reader, read by the original plugin's parser | All read with the same ids, text, tags and targets, and returned for the source's URI: passages, areas, drawings, book pictures, annotations taken in from a PDF, replies |
| Video note written by this reader, read by the original video parser | Read, with its time and quoted transcript text |

The fourth row is also a test (`anchoring-interoperability.test.mjs`). What
the original plugin does not do is place the kinds it does not know: an area,
a drawing or a book picture has no text quote, so its reader lists it without
a highlight. The note itself, and everything in it, stays intact when the
original plugin edits other annotations around it.
