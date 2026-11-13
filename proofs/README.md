# The proofs

The rules that decide what Annotator writes into a note (the annotation
format, creating, editing and deleting a block, reading a changed note in
parts, the geometry of areas and of a line drawn by hand)
are written here in Bend, with laws that are proved for every input. The
plugin is built from these modules: `build.mjs` compiles them, and
`src/codec.ts` and its neighbours call them through the wrappers in this
folder. Nothing here writes to a vault.

## Run

With the installed Bend 2.0.40 and Node 26:

```sh
cd proofs
node verify.mjs
```

The verifier checks all 182 laws, requires 88 deliberately broken programs to
fail type checking, and runs 61 Node tests against the actual compiled Bend
modules. It also has the proofs checked a second time by Bend's small kernel
(`bend PROOF.bend --verdict`), which has its own proof in Lean and accepts
only defs that are valid proofs and rely on no `@unsafe` or foreign code.
That step must pass wherever it can run: where Lean v4.34.0 is installed (on
the PATH or in `~/.elan/bin`) or Bend has already built its kernel; elsewhere
the verifier says the step was skipped, and `BEND_VERDICT=1` makes its absence
a failure, as CI does. The kernel accepted all of PROOF.bend on 2026-11-13
(Bend 2.0.40, Lean 4.34.0). It disables the Bend launcher's telemetry/automatic updates for its
invocations. Set `BEND_BIN` if `bend` is not on PATH. Bend 2.0.40 is a single
binary with no Node import hook of its own, so the tests import `.bend` files
through `bend-loader.mjs`, which compiles each one with `bend file.bend -o
out.mjs`. In compiled modules a Bend `Nat` is a JavaScript number, not a
BigInt as it was under 2.0.5.

Proofs alone:

```sh
BEND_NO_TELEMETRY=1 bend PROOF.bend --check-only
```

Success reports `ALL PROOFS CHECK`. There are no unsafe definitions, proof holes,
foreign equality implementations, or assumed Boolean-to-equality conversions.

## Typed annotation data

The typed layer derives its contract from the pinned bundled Hypothesis client
and the plugin's actual local backend. It separates requests, stored data,
immediate responses and loaded values; types known selectors and metadata;
and retains unknown fields as JSON. See [ANNOTATION_CONTRACT.md](ANNOTATION_CONTRACT.md)
for exact types, provenance, normalization, examples and proof limits.

## Receipt-free creation/deletion

The real structural recognizer is now in `recognizer.bend`. It scans the complete
Markdown source, tracks supported outer contexts, extracts anchors and fields,
reports malformed candidates, and detects duplicate IDs. The JavaScript adapter
no longer contains the annotation recognizer or a deletion regex.

Ordinary deletion owns the annotation's first quoted line through its anchor,
including the anchor EOL if present. It never removes preceding whitespace.
Creation completes a blank-line boundary and appends a canonical annotation.
Existing characters are preserved; at most two LF characters are added to the
boundary. Existing CRLF/mixed endings remain exactly as they were.

For an accepted creation, the actual reparsed source operations establish:

```text
delete(create(d, a), a.id) = B(d)
B(B(d)) = B(d)
F(F(d)) = F(d)        where F(d) = delete(create(d, a), a.id)
```

`source_cycle_idempotent` quantifies over every full Bend String, ID, and raw
annotation body. Refused requests are explicitly lifted to unchanged source.
Each delete scans the complete created source again; the next cycle starts from
that resulting String. There are no session receipts or hidden ownership markers
in this law.

**How the proof connects to the real parser:** creation preflights its proposed
source through the real scanner/deleter, then a proof-producing full-string
comparison certifies that deletion returns exactly `B(d)`. Only then can it
construct a `CreationReady` value. The cycle performs deletion again, without
passing that certificate to deletion. The certificate is transient checked
program evidence, not persisted Markdown metadata or an undo receipt. This costs
extra full-source scans during creation, intentionally. See [RECOGNIZER.md](RECOGNIZER.md) for grammar, proof structure and limits.

```js
import { createAnnotation, deleteAnnotation, cycleAnnotation } from './bridge.mjs';
const created = createAnnotation(originalMarkdown, 'fresh-id', {
    comment: ['A new comment'],
});
const afterOne = deleteAnnotation(created, 'fresh-id'); // opens a fresh parse
const afterTwo = cycleAnnotation(afterOne, 'fresh-id');
// afterOne === afterTwo
```

## Other checked guarantees

- Full physical-source decode/encode preserves every character. Both three-step
  document cycles preserve the entire text, not just annotation fields.
- The original canonical block codec round-trips its typed logical-line model.
- Position-resolved CRUD has exact prefix/suffix behavior, read-after-write,
  unchanged reads/rejections, C/D and D/C inverses, and update/restore identity.
- Local undo receipts restore every complete segment document and arbitrary
  finite histories; rendering the rollback restores the entire original text.
- Boundary completion preserves the original source as an exact prefix, adds at
  most two LF terminators, and is idempotent.

[CRUD.md](CRUD.md) documents the positional core and its distinction from source
operations. Session undo is a separate stronger facility: it can remove the
boundary added by creation. **Ordinary deletion has the same boundary behavior
in a session and after reopening.**

## Recognition and diagnostics

The reader accepts LF/CRLF/mixed endings, EOF anchors without a final newline,
`>` and consistent `> ` formatting, multiline JSON/display, and optional legacy
link/comment/tags sections. Missing visible fields remain distinct from present
empty fields. JSON text and unknown properties are retained; semantic validation
still uses `JSON.parse` in the adapter.

```js
import { inspectDocument, parseDocument } from './bridge.mjs';
const inspected = inspectDocument(markdown); // valid blocks plus diagnostics
const safe = parseDocument(markdown);       // throws on unsafe/ambiguous input
```

Reads can inspect valid blocks alongside located diagnostics. Mutations refuse
malformed candidates, conflicting IDs, duplicates, unclosed supported contexts,
and explicitly unsupported contexts. Notes/examples inside supported fences,
frontmatter, HTML comments, and standalone-line Obsidian comments stay raw.
This is a specified structural protocol, not a claim of full CommonMark/Obsidian
renderer equivalence. See the precise restrictions in RECOGNIZER.md.

## Validation and remaining boundaries

The tests cover both real fixtures, byte-preserving print, source-level cycles
with independent reopening, 30 repeated C/D cycles, quoted formatting, multiline
and optional fields, CRLF/EOF, outer contexts, located errors, duplicate IDs,
local receipt undo, raw/annotation/EOF CRUD slots, an 80-operation history,
generated malformed-source conservation, and long Unicode comparisons.
Negative controls include accumulating newlines and a recognizer that never
deletes; a checked concrete successful-creation witness prevents a vacuous
reject-everything implementation from satisfying the new tests/proof gate.

The source cycle theorem uses checked executable certification; it does **not**
establish recognizer soundness/completeness against all Markdown grammars or
prove that every plausible note is accepted. Scanner token conservation has
regression/property-style tests, not yet an independent universal parser theorem.
The original positional proofs also do not establish semantic reparse correctness
for arbitrary raw payloads.

Raw JSON parsing and full-schema serialization, the JS adapter and its source/byte conversion,
compiler/runtime, and actual filesystem/concurrent writes remain outside the
formal boundary. Changed annotation updates may canonicalize formatting within
that block; untouched source spans are preserved. No plugin build wiring or
format migration is included.

## Sources

- https://bend-lang.org/
- https://github.com/bendlang/bend/blob/main/guide/GUIDE.md

## Reader logic: inks, list arrangement, export

`ink.bend`, `shelf.bend` and `digest.bend` hold the decisions behind the native
reader's highlight colours, the arrangement of its annotation list and its
Markdown export. `reader.mjs` is the only host boundary; the plugin's
TypeScript converts values and draws, and decides none of this itself.

| Module | Decides | Laws (in `LAWS.bend`, proved in `PROOF.bend`) |
| --- | --- | --- |
| `ink.bend` | Which ink a stored `color` denotes; how an ink is written into an annotation's JSON members | `ink_key_roundtrip`, `ink_shortcut_roundtrip`, `ink_read_after_write`, `ink_write_preserves_others`, `ink_last_write_wins` |
| `shelf.bend` | Which tab an entry is on; what a colour filter keeps; where section headings go | `shelf_tabs_partition`, `shelf_empty_filter_shows_all`, `shelf_filter_sound`, `shelf_headings_keep_cards`, `shelf_headings_lead` |
| `digest.bend` | Quoting of exported passages and notes; single-line titles; block layout | `digest_line_roundtrip`, `digest_lines_roundtrip`, `digest_title_is_one_line`, `digest_block_roundtrip`, `digest_body_passage_then_note`, `digest_body_passage_only`, `digest_body_note_only` |

In words: recolouring an annotation changes its `color` member and nothing
else, whatever else the annotation contains; reading it back yields the chosen
ink; the last colour wins without growing the JSON. Every entry is on exactly
one tab; a colour filter never shows another colour; headings are purely
additive (the cards between them are exactly the entries, in order) and a
non-empty grouped list opens with one. Exported text is quoted reversibly, so
a passage or note cannot end its block or reach the next entry.

`verify.mjs` carries eleven negative controls for these modules (a recolour
that drops a neighbour, a filter that leaks, a heading that swallows a card, an
export that drops the note, …); each must be rejected by the checker.

Not proved: the JSON text ↔ value boundary (`parseJson`/`stringifyJson` in
`typed-annotations.mjs`, tested), sorting by location (TypeScript, tested),
and anything that draws.

## Cost of a note

One file per annotation was prototyped here (`leaves.bend`: a note split into
a hub and one leaf per annotation, with six laws) and then not taken up; the
module, its laws and its five negative controls were removed on 2026-11-13
and are in the history before that. The design note is
[PER_ANNOTATION_NOTES.md](../docs/dev/PER_ANNOTATION_NOTES.md). What it left
behind is the measuring it prompted:

`Recognizer.safe` and `Recognizer.diagnostics` and `Recognizer.diagnostics`
compared each annotation's ID with every later one, so both were quadratic in
the number of annotations in a note (about 2.2 s each at 4,000 on Node 26).
They now make one pass over the parts with the IDs met so far in a character
trie (about 6 ms each at 4,000), and are proved equal to the pairwise
definitions for every part list; see "Duplicate IDs" in `RECOGNIZER.md`.

The scan itself, the line decoder and the creation certificate were then made
cheaper without changing what they compute (each fast definition is proved
equal to the one it replaced); see "Cost of a scan" in `RECOGNIZER.md`. The
bridge also keeps the last three inspections, frozen all the way down, so one
save does not scan the same text several times.

A note is scanned in stretches, and a changed note reuses the stretches around
the change (`inspections.windows`, ON as shipped): Bend puts the stretches
together (`segments.bend`) and the law `segments_assemble` proves the result
is the scan of the whole text, for every list of stretches. JavaScript only
chooses where to cut and compares the text Bend returns with the note; only
segments Bend made are ever used. As shipped, one note takes, through the
reader's codec (`test/support/codec-bench.mjs`, 1.5 kB
per annotation; Node 26, Bend 2.0.40):

| Annotations | Open | Edit a comment | Create |
| ---: | ---: | ---: | ---: |
| 200 | 52 ms | 2.5 ms | 5.5 ms |
| 1,000 | 214 ms | 6.4 ms | 17 ms |
| 5,000 | 0.9 s | 32 ms | 74 ms |

With the scan in stretches off (every text scanned whole) the edit column is
29 ms, 135 ms and 680 ms, and the create column 96 ms, 460 ms and 2.1 s. At
`ca15c18` the last row was 3.2 s, 11.8 s and 29.9 s. Creating and deleting are
given the note's stretches too (`inspections.operations`, on as shipped). That
is proved as well: the laws `segments_create` and `segments_delete` say the
answers are the ones `SourceCrud.create` and `Recognizer.delete` give for the
whole note. A deletion with the read after it takes 2 ms, 7 ms and 45 ms
(30 ms, 130 ms and 0.7 s when given the whole note). See
"Inspecting a changed note in stretches" in `RECOGNIZER.md`.

## Lines drawn by hand

`stroke.bend` holds the rules for a freehand line; the drawing code
(`src/drawing.ts`) only converts the pen's samples to whole numbers and back.

- `stroke_held_on_page`, `stroke_held_keeps`: a point held on the page is on
  the page, and holding moves nothing that was on it.
- `stroke_thin_leaves_out`: a thinned line is the hand's line with points left
  out: the same points in the same order, none moved, none added.
- `stroke_thin_starts`, `stroke_thin_ends`: it starts at the hand's first point
  and ends where the hand ended.
- `stroke_thin_fast_same`: `thin` says what thinning is, one point at a time,
  which a long line cannot afford (it would exhaust the stack: 8000 points
  already do). `thin_fast` goes along the line once and is proved to give
  exactly what `thin` gives; it is what runs (60 000 points in 13 ms).
- `stroke_box_holds`: the box around a line holds every one of its points.

What stays in TypeScript: turning the pen's fractions and pressure into whole
numbers, the curve that rounds a fast hand's corners, and the SVG text. Those
are arithmetic on fractions and string building, and are tested, not proved.

## How far through a book

`book.bend`: a book is its chapters' lengths, a place is a chapter and how far
into it. `book_place_exact` says the place found for a character has exactly
that many characters before it (or the whole book, when more were asked for
than it has); `book_place_real` says it is a chapter the book has and no
further in than the chapter is long. The reader shows the percentage with
`before` and resumes from a percentage with `place` (`src/progress.ts`), so
the two agree. The definitions walk chapter by chapter; `reader.mjs` hands
them a book 2000 chapters at a time and only ever passes over whole chapters.
