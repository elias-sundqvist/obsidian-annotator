# Hypothesis cross-compatibility contract

Required for the native PDF/EPUB/web replacement. Added 2026-10-30 on
`experiment/obsidian-native-pdf`. This is a release requirement, not a claim that
the current PDF prototype already meets every item below.

## Scope

Cross-compatibility means ongoing two-way use, not only importing old notes.
Treat compatibility as covering both:

1. Existing Obsidian Annotator Markdown notes written by our embedded Hypothesis
   client and local backend. They must open in place without mandatory conversion.
2. An explicit import/export path for Hypothesis JSON exports, including
   preservation of their source identities and metadata.

Reading and writing remain local. Neither path requires a Hypothesis server in
the annotation loop. Account authentication, live cloud synchronization and
publishing annotations to Hypothesis are separate features, not implied here.

Hypothesis documents JSON as its reimportable export format. Its current official
importer changes imported authorship to the importing user and excludes replies.
We can preserve original provenance/thread data locally, but must not promise
that Hypothesis's importer preserves every field or recreates an entire thread.
[Official export/import behavior](https://web.hypothes.is/help/exporting-and-importing-annotations/).

## Bidirectional CRUD and alternating readers

The native UI and the pinned embedded Hypothesis client must operate on the same
Markdown annotation store. Neither reader owns a one-way migrated copy. For each
supported PDF, EPUB and website annotation kind, require these workflows:

| Workflow | Required result |
| --- | --- |
| Create in Hypothesis, open in native UI | Same identity, passage, comment, tags and thread relationships |
| Create in native UI, open in Hypothesis | Same identity and behavior using selectors the Hypothesis client understands |
| Edit in either reader, reload in the other | Intended edits visible; unrelated fields, annotations and prose preserved |
| Delete in either reader, reload in the other | Annotation absent; surviving identities/references follow the explicit shared deletion policy; no resurrection from cached data |
| Alternate create/read/update/delete across readers repeatedly | No duplicate annotations, progressive newline growth, stale native locators or silent metadata loss |

This contract covers highlights, comments, tags, page notes and replies supported
by the embedded client. Missing native UI for one of these is an implementation
gap, not permission to narrow compatibility to highlights. Unknown future kinds
must remain losslessly stored with an explicit unsupported status.

Native-only locator hints must be dispensable, and must be validated or ignored
after the other reader edits selectors. Correctness cannot depend on the old
client retaining an unknown extension field. Test both extension retention and
extension removal. Required interoperable selectors and source identities belong
in the shared representation; private accelerators cannot substitute for them.

Define the shared deletion policy from actual legacy behavior, especially parent
annotations with replies, before implementing native thread deletion. If the
legacy operation loses unrelated information, revise the shared local adapter
and test both clients rather than declaring that loss acceptable compatibility.
Alternating use requires reload/reparse after each operation. Simultaneous
writers additionally need conflict detection; this does not promise automatic
multiwriter merging or cloud synchronization.

For the public Hypothesis service, require bidirectional exchange of supported
annotation content through the supported import/export boundary, with stable
local provenance mappings and explicit service-assigned identities. This is a
separate integration gate from shared-store interoperability. It cannot promise
that an external service preserves IDs/authorship it deliberately transforms.

## Three distinct compatibility requirements

| Requirement | Acceptance criterion |
| --- | --- |
| Data preservation | Known and unknown fields, identities and selectors survive supported local reads/edits/exchange; no silent loss |
| Anchor compatibility | On the original supported document, native readers locate the same quoted passage as the pinned Hypothesis client |
| Bidirectional operation compatibility | Both readers create, read, update and delete shared annotations, including alternating operations, without depending on native-only locator fields |

Passing the first does not establish the other two. A changed website, different
PDF text extraction or different EPUB edition can make a previously valid anchor
unresolvable. That must be a visible status attached to retained annotation data,
not silent deletion or a highlight placed on a guessed occurrence.

## Existing Markdown notes

- Preserve annotation/block IDs, note paths, backlinks, source/uri values,
  target selectors, comments, tags, references and unknown JSON members.
- Opening/reanchoring is read-only. It must not rewrite selectors, formatting,
  default fields or entire documents just to satisfy the new renderer.
- Comment edits retain the original embedded JSON bytes. Visible comments/tags
  retain the local adapter's precedence rules. Untouched blocks/prose keep their
  bytes; supported create/delete cycles retain the checked newline-idempotence law.
- Keep TextQuoteSelector, TextPositionSelector and RangeSelector representations.
  Positions/XPaths are hints that must be checked against text/context. Preserve
  unknown selectors as data with a visible unsupported status.
- Native locator metadata is additive and optional. Existing annotations must not
  need a native locator to be readable; new annotations must retain the ordinary
  selectors needed by the old reader where that reader supports the source.
- Page notes and replies remain accessible as notes/threads even if there is no
  passage to highlight. Preserve references instead of inventing a text target.

For EPUB, first capture the actual pinned client's wire payload and saved note on
controlled books. Its current ?loc= chapter addressing and use of CFI for
navigation do not establish that stored annotations use CFI. Resolve original
DOM selectors before mapping into sanitized chapter content; preserve originals
when using a new locator as an optimization.

For PDF/web, include source URI aliases, document metadata/fingerprints and actual
client document filtering in the old-reader check. The native prototype's ability
to read a note is not proof that the old client will display every newly written
annotation with its current source URI choices.

## Hypothesis JSON exchange needs a separate boundary

Do not feed imported records blindly through the local adapter's normal write
normalization. That deliberately forces flagged=false and omits group, user,
permissions and user_info in stored JSON. Loaded local defaults also force the
local world group. Those are real legacy local rules, not a lossless Hypothesis
exchange format.

Before implementation, derive the current export envelope/record shape from an
actual export fixture and source. Do not assume it is identical to an API search
response or our pinned client's incomplete Annotation typedef. Use a separate
Hypothesis exchange DTO with preserved unknown data and raw original input.

The import design must retain original author/group/permission values, timestamps,
source/document metadata, links, references and unknown fields without routing
them through lossy local defaults. Keep an immutable copy of the export and an
explicit, portable provenance/identity mapping in vault data. Local comment/tag
edits can be represented as intended edits against that original, so export
never substitutes Obsidian User or __world__ for the original identities.
This is provenance preservation, not an undo receipt required by ordinary CRUD.

Separate the original Hypothesis ID from the local block anchor when necessary.
Our current block recognizer accepts letters, digits and hyphens; arbitrary
external IDs must not be silently stripped or rewritten into that namespace.
Create a collision-checked local anchor and retain the original ID/link and
reply-reference mapping. Existing local block IDs remain unchanged. Deduplicate
repeat imports by explicit source identity, not by quote text.

An importer must report unsupported records, ID collisions and local-versus-
incoming edits, while retaining the original record. Unsupported element/media
selectors or future fields must not disappear because this renderer cannot paint
them. JSON-number lexemes and explicit missing/null/empty distinctions must not
be lost by a comment-only edit or an unnecessary JS object reserialization.

Do not promise server ID/group/author preservation after a real Hypothesis
service import: that service applies its own documented import rules. Our
exchange export must be tested with the official importer for the supported
record types and produce a clear account of any service-side transformations.

## Compatibility corpus and release gate

Create a versioned corpus of original documents, original annotations, pinned
client version, expected text spans and raw serialized records. Include:

- The two existing Markdown fixtures plus new notes emitted by the native UI.
- Actual pinned-client PDF, EPUB and web fixtures: simple passages, repeated
  quotes, Unicode/ligatures/RTL, multiline selections, source aliases and replies.
- Actual current Hypothesis JSON exports: highlights, Markdown comments, tags,
  page notes, available thread/reference data, user/group/permission metadata,
  external IDs and unknown extension fields.
- Both directions of create/read/update/delete for each supported source and
  annotation kind, including Hypothesis → native → Hypothesis and native →
  Hypothesis → native sequences with reparsing between operations.
- Old-reader reopening and editing of newly written notes, with native metadata
  absent, present and removed by the other reader; stale locator hints, cache
  invalidation, duplicate imports and parent/reply deletion cases.

Run differential anchoring against the pinned client on the same original
content, not just JSON equality tests. Keep imported originals immutable and
verify comment-only updates, deletes and exports against the retained data.
Every supported case must render at the right location or have a specific
expected unsupported/unresolved result; do not let a reject-everything reader
satisfy the tests. Resolve support gaps before switching the production reader.

Planned additional checked laws, after exchange/locator schemas are specified:
semantic import/export preservation for supported validated records; unknown-
field preservation; stable identity/reference mapping; idempotent repeated
imports; and unchanged complete documents on rejected imports/edits. Byte-exact
archival copies are an additional tested I/O guarantee, not a substitute for
semantic compatibility or browser anchoring tests.

## Current status

Shared-store cross-reader CRUD, PDF source identity, native tags/page notes/replies,
and provenance-preserving JSON import/export are implemented experimentally.
See [INTEROPERABILITY_RESULTS.md](INTEROPERABILITY_RESULTS.md) for exact behavior,
source pins, commands, independent-reader/real-client DOM checks and limitations.
The original Bend core laws remain, with an added creation-boundary law; the
exchange/host integration is tested, not formally proved. Full native EPUB/web anchoring, a larger real-export corpus,
current-service import testing, an interactive old-client UI comparison and
simultaneous same-record conflict handling remain open release gates. Native UI
and local exchange checks now have live screenshot evidence.

## Standalone SVG: published metadata boundary (0.0.97 validation)

The mixed-SVG tests demonstrate selector compatibility with frozen Hypothesis
anchoring modules. They do not demonstrate the unchanged published application's
ability to display/route SVG annotations. We now have a separate exact-release
regression for the EPUB metadata step instead of assuming an HTML engine's
successful range lookup proves the complete reader works.

`compat/published/legacy-epub-hooks.mjs` contains the unmodified `m0`, `L0`, `B0`,
`M0` and `R0` bodies from the SHA256-pinned Annotator 0.2.11 release artifact.
The fixture retains the FuturePress license notice. These are its element-query helper, base/canonical/DC metadata replacements and
hook runner. The extraction script verifies the complete release checksum,
requires unique symbols, copies balanced source bodies without rewriting them,
and verifies the resulting fixture checksum. `lock.json` and the normal oracle
build guard pin that fixture. Re-extract with
`node compat/published/extract-epub-hooks.mjs` after obtaining the verified bundle
using the existing `compat/published/fetch.mjs`. No remote code is shipped or
executed in the native reader by this test fixture.

The HTML control case creates the base URL, canonical link and DC identifier as
expected. A standalone SVG XML document has no HTML head/body. Each of those
three published metadata hooks throws `No Element Provided`; the exact published
hook runner catches/logs all three errors, so hook completion alone is not success.
No canonical/DC elements are added, and SVG's DC fingerprint remains absent.
The native SVG path consequently retains the original root and URI without
inventing a fingerprint that the published metadata code cannot produce.

The frozen client's `annotator/index.js` also passes `document.body` to its
injector/Guest, and `Adder` immediately appends to that root. This is an additional
source-inspected HTML assumption, not a full published SVG UI execution result.
Actual unchanged published reader startup/frame/search behavior remains a gate.
In particular, cross-device SVG routing cannot be inferred from same-root
selector tests or from XHTML's DC fingerprint aliases. Existing ordinary EPUB,
PDF/web and Bend compatibility evidence retains its separately documented scope.

Validation: all 356 tests, TypeScript/build, release build and diff checks pass.
The exact extraction reproduces fixture SHA256
`355158611ad0703cf1bd134d74631ef874515c711eb3f8f030dcc6fada786561`
from release SHA256
`aa08182b6fac314af098ef692702987ff11a02c490a140009d67fa86c815a938`.
No production behavior, installed plugin, vault contents or Bend theorem changed
in this evidence step. This does not close the full native-only release goal.
