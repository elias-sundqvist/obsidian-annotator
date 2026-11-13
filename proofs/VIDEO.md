# Video timestamp storage checkpoint

`video_block.bend` defines a distinct `Fields` datatype: title, raw timestamp
lexeme, and unquoted comment lines. It introduces no fabricated account/date/tag,
reply or Hypothesis selector fields. Numbers such as `0012.500`, `1e3`, or `oops`
remain text. The host projects a separate finite nonnegative `seekable` value.

`video_document.bend` now scans complete Markdown documents. It shadows the
existing Bend Markdown context machine so code fences, comments, frontmatter and
Hypothesis payloads are not claimed as video annotations. Hypothesis blocks remain
opaque and their IDs participate in duplicate detection. Raw prose, foreign
blocks and malformed candidates retain their bytes. Candidate diagnostics and
unsafe context/duplicate checks prevent mutation. The recognized video grammar accepts canonical and noncanonical physical-line
headers, with ASCII alphanumeric anchors and LF endings. `video_header.bend`
retains the prefix, title, marker spacing, raw timestamp and trailing header
whitespace independently. ECMAScript whitespace and greedy delimiters are
matched against the frozen parser. CRLF/EOF candidates and unsupported comment
line separators are visible diagnostics, not silently repaired. The full unusual
newline-spanning whitespace behavior of the historical regex remains a gate.

Separator ownership is explicit. One preceding LF blank belongs to the video;
one following blank also belongs to it unless it is the sole separator before
another video. Lookahead permits adjacent old records without sharing ownership.
New creates add their own leading/trailing blank boundaries after the existing
idempotent boundary normalizer. Unrelated blank lines are preserved.

`video_source_crud.bend` creates then reparses/deletes the candidate and obtains
checked equality with the boundary-normalized original. The certificate is
transient; no receipt or metadata is stored. Deletion itself receives only the
current source and literal ID. The additive laws in `LAWS.bend`/`PROOF.bend`
establish **F(F(document)) = F(document)** for arbitrary whole-source strings,
IDs and body strings, with refusals returning unchanged source. Positive empty
and nonempty acceptance witnesses exclude a refuse-everything implementation.
As with the existing Hypothesis cycle law, this is stabilization after at most
one normalization, not an exact original-byte inverse for every input.

`video_update.bend` refuses missing/stale/unsafe records and reparses replacements.
Every accepted result carries a checked equality of the entire document with
only the selected video record masked out. It retains that record's separator
shape. These checks do not prove all semantic round trips, every accepted field
projection, raw recognizer reconstruction, or full CRUD algebra. Those remain
separate proof obligations. The earlier five body/field laws remain unchanged.
Six additional header laws establish exact re-emission of accepted header syntax,
layout/unrelated-field preservation on edits, and positive noncanonical acceptance.
The header certificate compares the reconstructed input in checked Bend; it is
transient and adds no stored receipt.

The pure JS boundary `video-crud.mjs` is exposed through the plugin's
precise `VideoRecord`, `VideoInput` and `VideoPatch` interfaces in `video-codec.ts`.
Only title, comment and seconds can be authored; unknown fields are refused.
Comment edits retain existing raw timestamp spelling. No-op edits return exact
original bytes, including unsupported raw times. New/edited numeric times must
be finite and nonnegative. The adapter checks a source-derived published comment
projection and refuses newly authored trailing-whitespace loss with the draft
intact. Editing a title/time retains pre-existing comment bytes, including the
header-only/no-comment-line form and existing trailing spaces. Comment edits
retain the header formatting exactly; explicit timestamp edits replace its value
while keeping surrounding marker spelling. No-op edits leave these forms intact. Expected
raw record arguments are ordinary stale-write snapshots, not formatting receipts.
This boundary is tested rather than formally proved; file/target transaction
checks must still be added when wiring it to the UI.

Tests cover malformed and mixed-format sources, context exclusion, duplicate IDs,
adjacent records, full-document reconstruction, repeated/interleaved create/delete
cycles, stale updates, unchanged edits, raw time preservation and edits alternating
with the checksum-pinned published video codec. Verification includes negative
controls for a growing cycle, omitted separators, disabled deletion, universal
header refusal and lost header formatting. Header comparison covers 320 spelling
combinations plus ECMAScript whitespace; native mutation checks cover 108 header
layouts and additional absent-body/pre-existing-whitespace cases. The module
filenames use underscores because the installed Bend JS compiler produces invalid
identifiers for imported hyphenated module names.

The video codec is development-built but **not wired into the native reader/UI**.
The current release runtime is unchanged. No live video playback, player capture,
seek, transcripts, desktop UI or mobile video behavior is claimed. Follow the
[video plan](../docs/dev/VIDEO_ANNOTATIONS_PLAN.md) for those remaining gates.

## Cost of a video note

Measured through the reader's codec (Node 26, Bend 2.0.40), one note with so
many video annotations, before and after the changes below:

| Annotations | Read | Create | Edit | Delete |
| ---: | ---: | ---: | ---: | ---: |
| 200 | 12.7 → 7.4 ms | 89 → 42 ms | 89 → 50 ms | 26 → 15 ms |
| 500 | 49 → 20 ms | 315 → 109 ms | 289 → 123 ms | 99 → 39 ms |
| 1000 | 156 ms → linear | 937 ms → linear | 812 ms → linear | 314 ms → linear |

- **Duplicate IDs in one pass.** `errors_pairwise` compares every ID with every
  later one and is what an error *is*; it took a second for 3000 parts. `errors`
  walks the parts once with the recognizer's set of IDs (6 ms for 3000) and the
  law `video_errors_pairwise` proves the two agree for every list of parts.
- **Certificates by one comparison.** A create and an edit each carry a
  certificate that two texts are equal. It used to be
  built character by character, bit by bit (`Evidence.string`); it is now the
  equation `String.eq(..) == True` (`Evidence.same`), which costs one string
  comparison, and `string_same` in PROOF.bend proves that it means equality.
  The laws state the same equalities as before.
- An edit scans the edited text once, not twice.

What remains is the scan itself, about 40 µs for each annotation, made several
times for one change (the text before, the text after, and the deletion that
certifies a creation). The note codec passes one scan along instead
(`segments.bend`); the video codec does not yet.
