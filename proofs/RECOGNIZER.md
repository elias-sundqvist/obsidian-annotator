# Source recognition and stable create/delete cycles

## Boundary ownership

An annotation owns exactly its first quoted opening marker through its anchor
line, including that anchor's EOL when present. Leading whitespace is document
content. Ordinary deletion never attempts to recover whitespace provenance.

`boundary.bend` computes a suffix of zero, one or two LF characters. It appends
only the terminators needed for a completed blank line, except that an empty
source needs no separator. It never trims or rewrites old characters.

| Original source `d` | `B(d)` |
| --- | --- |
| `""` | `""` |
| `"Text"` | `"Text\n\n"` |
| `"Text\n"` | `"Text\n\n"` |
| `"Text\n\n"` | unchanged |
| `"Text\n  "` | `"Text\n  \n"` |
| `"Text\n  \n"` | unchanged |
| `"Text\r\n"` | `"Text\r\n\n"` |

The new-terminator policy is deliberately fixed LF, including after CRLF source.
An adaptive EOL policy would require a separate stability proof. Canonical new
annotation bodies use LF too. Existing mixed endings are preserved as bytes by
the adapter tests and as characters by the source theorem.

## Operational grammar

The scanner consumes physical lines from the proved whole-source codec. A
supported top-level annotation starts with a quoted `%%` marker and then a quoted
three-backtick `annotation-json` fence. Whitespace after the three backticks and
around the info string is accepted. A JSON fence with four or more backticks is
not part of this annotation protocol, even though outer Markdown example fences
may have arbitrary lengths of at least three.

Zero through three spaces before a top-level quote/anchor are accepted. Four-space
and tab-indented code remain raw. Contextual candidates nested in tracked lists
are diagnosed as unsupported. A quoted line starts with `>`; a single optional
formatting space is stripped from payload lines **only if the opening marker
uses `> %%` style**. For the original `>%%` style, payload-leading spaces are
content and are not removed. Mixed formatting is not guessed from comment text.
Marker comparisons tolerate their surrounding whitespace; field content does not
get globally trimmed.

After the JSON closing fence, a quoted closing `%%` marker is required. JSON may
span physical quoted lines. JSON syntax/object shape and a conflicting embedded
ID are validated by the adapter, not by the Bend structural recognizer.

The remaining structure accepts a multiline starred display, an optional link
line beginning `%%LINK%%`, an optional standalone `%%COMMENT%%` section, and an
optional tags suffix. A JSON-only body with no visible sections is accepted.
The anchor is a nonempty literal alphanumeric/hyphen ID after `^`, with an
optional final LF/CRLF. Lookup compares literal IDs; no ID is interpolated into
a regex. Duplicate IDs are unsafe for mutation.

The tags suffix is recognized from the anchor backwards: its final quoted value
line follows a standalone `%%TAGS%%` marker. Marker-like lines earlier in a
canonical comment stay comment data. On legacy blocks without explicit section
presence, this deterministic last-pair interpretation is the protocol: textual
intent cannot distinguish a comment ending with those exact two lines from a
tags section. Raw source remains unchanged until an explicit mutation.

A second full opening-marker/annotation-header pair within one candidate is
ambiguous with a missing anchor followed by another annotation. It is diagnosed
rather than silently merging blocks. Literal nested annotation examples in comment
content must avoid that full unescaped pair; individual marker-like lines remain
allowed. This is an explicit conservative grammar restriction.

Missing link/comment/tags sections are recorded as absent, not rewritten to empty.
The adapter's semantic view falls back to JSON text/tags when a corresponding
visible section is absent. A present empty comment clears that visible value.
Unknown JSON properties and embedded selector exact text are retained.

## Contexts and error policy

The scanner tracks top-level fenced code (backtick/tilde and opening length),
quoted fenced examples, first-line YAML frontmatter (including BOM), HTML
comments, and standalone-line Obsidian `%%` comments. Examples in those contexts
remain raw. Unclosed supported contexts reject mutation. Inline/nested Obsidian
comment semantics and all Markdown container combinations are not implemented.

Raw HTML blocks outside the supported comment form are conservatively diagnosed
as unsupported; examples there are not exposed as annotations. Bullet/ordered
list contexts conservatively diagnose indented annotation candidates. The
implementation does not claim a complete CommonMark block parser. Indented,
nested, inline-comment and unusual HTML forms should be considered unsupported,
not inferred safe by a permissive regex.

A lone `>%%` without a following annotation fence is ordinary raw text. A recognizable
annotation fence without an opener, a malformed candidate body, a missing/invalid
anchor, conflicting JSON ID, or a duplicate ID produces a located diagnostic.
`inspectDocument` retains the full raw source and valid blocks alongside these
diagnostics. `parseDocument` and mutations refuse ambiguous/unsafe documents.
A malformed candidate is never turned into a silent update-as-create operation.

There is no way to distinguish an unfenced example written in this exact protocol
from an intended annotation. Authors should put examples in a supported fence.

## Duplicate IDs

`Recognizer.errors` (and so `safe`) and `Recognizer.diagnostics` walk the parts
once, from the last to the first, carrying the IDs of the later parts in a
character trie (`Seen`). An annotation whose ID is already in that set is a
duplicate, so every block whose ID occurs again later is reported at its own
line and the last block with that ID is not. The cost is linear in the number
of parts: about 6 ms for each check at 4,000 annotations on Node 26, where the
pairwise comparison takes about 2.2 s (both measured on the compiled
definitions, with IDs that share a long prefix).

The pairwise definitions stay in `recognizer.bend` as the specification
(`errors_pairwise`, `diagnostics_pairwise`, built on `has_id`). Checked laws:
the trie is a set under `String.eq` (`recognizer_seen_empty`,
`recognizer_seen_add_has`), and for every part list the one-pass results equal
the pairwise ones (`recognizer_errors_pairwise`, `recognizer_safe_pairwise`,
`recognizer_diagnostics_pairwise`): same verdict, same diagnostics, same lines,
same order. The proofs rest on Base's bit-level definition of `U32`; that the
compiled JavaScript compares characters the same way is the compiler's
contract, exercised by an adapter test in `bridge.test.mjs`, not proved here.
`video_document.bend` still uses its own pairwise check.

## Cost of a scan

Compiled Bend walks a string one character at a time (about 10 ns each on
Node 26); it has no native substring, trim or split. The scan is therefore
written so that a line is walked a small, fixed number of times:

- **Marker and prefix tests** (`is_marker`, `starts_trimmed`) first test the
  untrimmed start of the line and evaluate the trimming definition
  (`is_marker_exact`, `starts_trimmed_exact`; `String.trim` reverses the line
  twice) only when that test passes. A trimmed line that equals or starts with
  a marker has the marker right after its leading blanks, so the answer is the
  same: laws `recognizer_is_marker_exact` and `recognizer_starts_trimmed_exact`,
  for every line and marker.
- **A prefix that does not end in a blank** needs no trimming at all once the
  untrimmed start has it: trimming the end of a line only removes blanks
  (`starts_trimmed_tight`, covered by the same law). **The display's closing
  `*`** is tested with one reversal instead of three (`ends_trimmed`, law
  `recognizer_ends_trimmed_exact`).
- **The header test** inside a candidate body runs only on the line after a
  marker (`header_after`, law `recognizer_header_after_exact`).
- **CR stripping** (`clean`) reverses a line only when it ends in CR. Law
  `recognizer_clean_exact` proves it equal to `clean_exact` for every line;
  `recognizer_clean_choice`, `recognizer_clean_strips_cr` and
  `recognizer_clean_exact_strips_cr` say how: it returns either the line or
  what `clean_exact` returns, and both strip the CR of every line that ends in
  one. (`clean_exact` matches the character literal `'\r'`; the proof that it
  leaves any other line unchanged decides that match bit by bit.)
- **The line decoder** (`Document.decode`) reads the source forwards once
  instead of reversing it first; law `document_decode_exact` proves it yields
  the same lines as `decode_exact`.
- **The creation certificate** (`source-crud.bend`) holds the equations
  `String.eq(..) == True` instead of equalities built bit by bit while a note
  is written. `string_same` in `PROOF.bend` proves, once, that such an
  equation means the two strings are equal, and the laws about a creation
  still state that equality. The candidate is scanned once, by the delete
  whose result the certificate compares.


A scan of 5,000 annotations (5.45 MB) takes about 0.25 s where it took 2.5 s;
`video_header.bend` still uses the bit-by-bit `Evidence.string`.

## Loading the annotations a scan finds

Each annotation's JSON is checked by the schema, merged with its visible
fields and handed to the host. That is separate from the scan and costs about
63 µs an annotation on Node 26: 0.32 s for 5,000. (It would be about 43 µs
with the fast context below, which is not turned on.)

- **Schema lookups stop at the match.** `AnnotationSchema.member` and `known`
  compared a key with every member or every known name, because `Bool.pick`
  and `Bool.or` have both of their answers computed. They now stop at the
  first match; the exhaustive definitions stay as `member_exact` and
  `known_exact`, and laws `schema_member_exact` and `schema_known_exact` prove
  the answers equal for every list and key.
- **The visible quote context could be read from the display's start, but is
  not yet.** `annotation_visible.bend` trims and reverses the whole display to
  drop its last character before looking for the markers (`context_exact`,
  which is what runs). `context_fast` looks for the markers from the start and
  reverses only the text after the last one; `typed.test.mjs` compares the two
  on generated displays (truncated markers, missing closing characters,
  repeated markers). This module has no laws, so nothing proves them equal,
  and a fast path is turned on only once a law covers it: `context` becomes
  `context_fast` when `context_fast(d) == context_exact(d)` is proved for
  every display.
- **The loaded value is built directly** (`nativeJson` in
  `typed-annotations.mjs`) instead of being written as JSON text and parsed
  back; `typed.test.mjs` requires the same value, key order and own property
  names, including repeated keys and `__proto__`.

What is left is the schema's remaining key comparisons (14 µs), the visible
fields (35 µs; 15 with `context_fast`), building the typed JSON tree from the stored text (6 µs) and
building the result (5 µs).

## Inspecting a changed note in stretches

**On as shipped** (`inspections.windows` in `bridge.mjs`): it is proved, so it
runs. `inspections.operations` (create and delete on the note's stretches) is
proved too, below, and is on as shipped as well.
A native line split was tried and removed: a check in Bend that the host's lines are the note's lines
walks every character, which is the cost the split was meant to save.

With `windows` on, a note is scanned in stretches, and a changed note reuses
the stretches of the earlier text before and after the change. The splice is
Bend's, in `segments.bend`:

- A **segment** is a stretch of text with its scan. `Segments.opening(text)`
  runs the scanner from the start of a note; `Segments.following(text)` runs
  it as if at line 1 with nothing before it, through a checked run that stops
  if a line finds the scanner in a state the proof does not cover. Each
  segment holds, as a field, the proof of what its state is, and the
  evidence that its text ends in a line feed when it does. Nothing but those
  two functions makes a segment.
- `Segments.assemble(segments)` puts a list together. A later segment's
  state is moved by the number of lines before it and set on the parts
  before it. It refuses a list whose first segment is not an opening one, a
  segment followed by another that does not end in a line feed or does not
  leave the scanner in its Neutral mode, and a following segment at line 0.
  It returns the text the list stands for and its scan.

**The law** (`segments_assemble`): for every list of segments that
`assemble` accepts, the scan it returns is `Recognizer.scan` of the text it
returns: same parts, same line numbers, same closed flag. There is no
hypothesis about where the segments came from, so stretches kept from an
earlier note, in any combination, are covered. Diagnostics and `safe` are
then the ordinary proved functions on that scan.

What the proof rests on (all in `PROOF.bend`): for each scanner function, a
step taken on moved parts set on other parts, at a moved line, is the plain
step moved and set on those parts (`mv_step` and the lemmas before it); a
run over appended lines is one run after the other (`run_append`); and a
text that ends in a line feed decodes apart from what is appended to it
(law `document_decode_append`). The scanner treats line 0 differently (BOM,
frontmatter), which is why a following segment is scanned at line 1 and the
opening one is kept apart. The three things the lemmas need of a state
(something above an AfterAnnotation mode, a line number above 0, a fence
opener that opens a fence) are checked by the run, not argued.

What JavaScript still does, none of which can change an answer: it chooses
where to cut a note (after an annotation's anchor line and the blank line
it owns; a cut Bend refuses is joined to the next piece), finds the common
start and end of the old and new text to choose which segments to keep,
keeps the last three results, and compares the text `assemble` returns with
the note by one `===` before using the scan. `bridge.test.mjs` still
compares the result with a whole scan on 700 random edits; that is now a
test of this JavaScript, not the argument for the result.

One assumption is the adapter's own: a segment is used exactly as Bend made
it. The proofs a segment carries do not exist at run time, so the laws speak
of the values Bend returned and of nothing else. `bridge.mjs` never builds or
copies a segment, freezes each one all the way down when Bend returns it and
hands Bend only segments it recorded then; `bridge.test.mjs` checks that one
cannot be altered or forged, that segments in another
order, with one dropped or for another text are refused, and that a note cut
at every position is either refused or inspected exactly as a whole scan.

**Create and delete** (`operations`, on as shipped, proved). A
note that was inspected in stretches is given to Bend as those stretches,
not as its text.

- `Segments.delete(assembled, id)` is `Recognizer.delete` without its scan:
  the same safety check and the same removal, on the scan `assemble`
  returned. Law `segments_delete`: for a list `assemble` accepts, it equals
  `Recognizer.delete` of the text.
- `Segments.create(init, last, id, body)` takes the stretches before the
  last, and the last. It assembles the note and asks `SourceCrud.allowed` of
  that scan (ID syntax, closed context, no candidate error, no duplicate ID);
  works out the boundary's line ends from the last stretch alone; makes the
  last stretch again with those line ends and the new annotation appended;
  assembles the candidate; deletes the new ID from the candidate's scan and
  compares the result with the note plus its line ends; and checks that the
  candidate ends ready for the next annotation. It returns the note's text
  and the candidate. Law `segments_create`: whenever it returns them,
  `SourceCrud.create` of that text, ID and body succeeds with exactly that
  candidate. So the duplicate-ID check, the delete-back comparison and the
  stable boundary are the whole note's, and the certificate
  `SourceCrud.create` would build exists for the whole note without being
  built. It returns nothing when a check fails or when it cannot tell (an
  empty last stretch, a candidate stretch that cannot be placed); the bridge
  then asks `SourceCrud.create` of the whole note, so every refusal and its
  message come from there.

What these proofs rest on: the text `assemble` returns is its stretches'
texts in order; after a line feed the boundary reads on in the same way
whatever came before, so the end state of a note is the end state of its
last stretch when the stretches before it end in a line feed and the last
has a character; `Boundary.run` over appended texts is one run after the
other (existing law); and `SourceCrud.create` makes its candidate when each
of its own checks passes. `SourceCrud.check_deleted` was restated for the
last of these, with the same type and the same answer: the comparison alone
decides whether there is an answer, and the equation about the delete is
carried inside it.

The comparison of the deleted candidate with the note is
`Segments.same_text`: each text contains the other. Compiled Bend searches
natively in `String.contains`, so this is one native comparison where
`String.eq` walks every character (6 ms against 220 ms for 5.8 MB); the law
`segments_same_text` proves it means equality.

JavaScript's part: it passes the segments it kept, compares the note text
Bend returns with the note by one `===`, and, for the session's undo
bookkeeping only, reads the boundary off the returned source (which starts
with the note and ends with the annotation); `commitCrud` compares the
session's text with that source as before.

Timings (Node 26, loader build, one note; the read before and after a save
included). 5,000 annotations (4.2 MB) open in about 1.0 s either way. Edit a
comment, create, delete: 0.9 s, 2.5 s and 1.4 s with both switches off; 30 ms,
1.5 s and 0.5 s with `windows` alone; 31 ms, 36 ms and 34 ms with `windows`
and `operations`, as shipped. With 200 annotations: 41, 96 and 52 ms with both
off; 2, 3 and 2 ms as shipped.

## The checked source-level theorem

The implementation is `source-crud.bend`, not a wrapper returning cached input:

1. Scan the original and check context safety, diagnostics, fresh valid ID.
2. Compute `base = B(original)` and append the proposed annotation/anchor.
3. Scan the candidate, refusing ambiguity or malformed structure.
4. Delete the literal ID through **another complete scan**.
5. Run `evidence.bend`'s proof-producing exact String comparison on the deletion
   output and `base`. Only a real equality witness permits `CreationReady`.
6. The actual cycle invokes deletion again from the created String. Deletion
   accepts only current text and ID, never the witness or an undo receipt.

The equality checker compares Char words structurally and combines proofs. It
uses no assumed reflection axiom or foreign `===`/hash implementation. Its
continuation form also avoids JavaScript stack growth on long sources. The
certificate is a transient typed invariant; no marker/ownership metadata is
stored in the Markdown.

`source_cycle_result_cases` proves every cycle result is either the unchanged
original (rejection) or exactly `B(original)` (accepted creation). Together with
`boundary_idempotent`, this gives the unconditional full-String law:

```text
source_cycle_idempotent:
  F(F(source, id, body), id, body) = F(source, id, body)
```

Every fresh cycle starts from String source, with parsing between create/delete
and again on the next creation. There is no assumption that a prior token tree
survives reopening. Invalid requests are total unchanged-source operations in F;
the adapter's standalone create API instead reports refusal by throwing.

The concrete law `source_creation_accepts_example` proves a real creation is
accepted. Negative controls require a never-delete recognizer and an extra-newline
cycle to fail checking. Thus the gate cannot satisfy the theorem merely by
refusing every request.

## What the theorem does and does not establish

The executable guard is intentional: recognizer mistakes cannot silently violate
the accepted source-cycle contract; they cause a creation refusal. This costs
several full scans and a full-string comparison per creation. An independently
proved scanner composition/completeness theorem could later remove this guard.

The theorem certifies the actual total source-cycle function, including every
possible String/ID/body input. It is not a completeness proof for the accepted
legacy grammar or a formal model of the entire Markdown renderer. Parser raw-token
conservation and the supported acceptance variants are currently tested. JSON
validation, semantic selector merging, adapter/UTF-8 conversion, compiler/runtime,
and filesystem/concurrency behavior are outside the theorem.

Ordinary delete consistently retains a boundary, so a receipt-free cycle can add
a bounded separator once. Session undo remains different: its local receipt also
records a separately inserted boundary Raw segment and can restore the exact
original, including removal of that added separator. This does not change the
behavior of ordinary delete before/after reopening.
