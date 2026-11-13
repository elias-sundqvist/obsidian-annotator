# One Markdown file per annotation

> **Not taken up.** The owner decided on 2026-11-13 to skip one file per
> annotation: storage stays one note per source. The prototype described below
> (`src/annotation-files.ts`, `proofs/leaves.bend` with its laws, their tests)
> was removed the same day and is in the history before that. This note stays
> as the record of what was tried and measured.

A design for storing each annotation as its own note, with a working
prototype of the part most likely to go wrong: converting between that layout
and today's single annotation note, in both directions, without losing a byte.

Nothing here changes how the reader stores annotations today. The single
annotation note is untouched, `codec.ts` and `main.ts` are untouched, and no
command uses the new code yet. One thing in the shared codec did change
because of the measurements below: the recognizer finds duplicate IDs in one
pass instead of comparing every pair. It is proved to give the same verdicts
and the same diagnostics as before, for every input (see "Duplicate IDs" in
`../bend-codec/RECOGNIZER.md`).

## Recommendation

**Offer it as a per-source choice. Keep the single note as the default and as
the interchange format. Do not replace it.**

- The single note is the only thing the original Annotator plugin can read,
  and reading it is a hard requirement for migration. It stays the format
  every source starts in and can always return to.
- A source can be *split* into one file per annotation and *combined* back
  into one note. A split is never lossy: it is refused, or it combines back
  to the same bytes (proved, law 1). That real notes are accepted, and that
  the files written around the blocks combine back, is tested on every
  fixture, not proved (laws 6 and 7). So choosing is not a commitment, and
  nothing is converted behind the user's back.
- Split sources get what the idea promised: a Base over all annotations, a
  real note per annotation to link to, no sync conflict when two devices
  annotate the same source, and edits that cost the same at 5,000 annotations
  as at 5.
- The existing "export each annotation as its own note" command stays as it
  is for now: a one-way snapshot for people who only want a table. Once the
  split layout is used in earnest it should adopt the same property names, or
  be retired in favour of the Base described here.

Why not replace: a split source looks empty to the original plugin until it
is combined again; a vault gains one file per annotation; and the write path
for split sources (below) is designed and tested as pure functions but not
yet wired into the reader. Why not stay export-only: the export cannot be
edited or read back, so it goes stale, and it does nothing for sync
conflicts or for the cost of large notes, which turned out to be severe
(see [Performance](#performance-at-5000-annotations)).

## What exists now

| Piece | File | State |
| --- | --- | --- |
| Split and merge, with proofs | `../bend-codec/leaves.bend`, laws `leaves_*` in `LAWS.bend`, proofs in `PROOF.bend` | Checked by `node verify.mjs` |
| Host boundary | `../bend-codec/leaves.mjs` | Tested (`leaves.test.mjs`) |
| File names, properties, the Base, reading a file back | `annotation-files.ts` | Tested (`annotation-files.test.mjs`, 55 tests, part of `npm test`) |
| Measurement script | `test-support/annotation-files-bench.mjs` | Run by hand |
| Vault commands, reader read/write path, sidebar | — | Not built |

## The layout

A split source is a **hub** and a set of **annotation files**.

```
Reading/
  Paper.pdf
  Paper.pdf.annotations.md          ← the hub: today's annotation note, minus the blocks
  Paper.pdf.annotations/            ← default folder for this source's annotation files
    Trace-based Just-in-Time Type Specialization fo 0559f564.md
    Dynamic languages such as JavaScript are more d b01dbb42.md
    Native reply to published page note. Edited bac 8a4a15e2.md
Annotations.base                    ← one Base for the whole vault
```

### The hub

The hub is the single annotation note with each annotation block replaced by
one reference line. Everything else (the `annotation-target` frontmatter, the
user's headings and prose between annotations, blank lines) stays exactly
where it was.

```markdown
---
annotation-target: Published CRUD QA/Paper.pdf
---

# Native PDF annotation test

Draft comments remain in memory.

![[Reading/Paper.pdf.annotations/Trace-based Just-in-Time Type Specialization fo 0559f564#^ff2dce49f39c4195ad9ba2ac0559f564]]
![[Reading/Paper.pdf.annotations/Dynamic languages such as JavaScript are more d b01dbb42#^1045d8adf0c041ada1e417b3b01dbb42]]
```

(Real output of `splitNote` on `fixtures/published-orphan-page-note.md`, as
is the file below.)

- A reference line is `![[link#^id]]` alone on its line. In Obsidian it is a
  block embed, so the hub still reads as a page of annotations.
- The **ID after `#^` identifies the annotation**. The link is only where
  Obsidian should look; Obsidian rewrites it when the file is renamed or
  moved, and merging never depends on it.
- An embed of the same note's own block (`![[#^id]]`), a plain link, an
  aliased embed, or a line with other text on it is prose, not a reference.
  The grammar is pinned by the law `leaves_reference_examples`.
- The hub keeps the `annotation-target`. It is still the note that
  `noteMatchesSource`, `loadNote`, collections and the library scan find, so
  none of that logic changes. Annotation files deliberately do **not** carry
  `annotation-target`: if they did, the reader would see thousands of notes
  claiming one source ("Multiple annotation notes target this source") and
  the original plugin would open each as a one-annotation note.

### An annotation file

```markdown
---
annotation-id: "ff2dce49f39c4195ad9ba2ac0559f564"
annotation-of: "[[Reading/Paper.pdf.annotations]]"
annotation-source: "[[Reading/Paper.pdf]]"
annotation-kind: annotation
annotation-passage: "Trace-based Just-in-Time Type Specialization for Dynamic"
annotation-comment: "**Persistent native highlight.** Clicking the PDF highlight opens this saved comment. Native upgrade rehearsal edit. Published rollback edit."
annotation-color: yellow
annotation-color-name: "Key idea"
annotation-section: "Page 1"
annotation-page: 1
---

>%%
>```annotation-json
>{"text":"…","target":[{"source":"Native PDF test.pdf","selector":[{"type":"TextQuoteSelector",…},{"type":"TextPositionSelector","start":0,"end":56}]}],"nativePdf":{"version":1,"page":1,"units":"document-utf16"}}
>```
>%%
>*%%HIGHLIGHT%%Trace-based Just-in-Time Type Specialization for Dynamic*
>%%LINK%%[[#^ff2dce49f39c4195ad9ba2ac0559f564|show annotation]]
>%%COMMENT%%
>**Persistent native highlight.**
>…
>%%TAGS%%
>
^ff2dce49f39c4195ad9ba2ac0559f564
```

**The body is the record. The properties are an index.**

The body is the annotation's block exactly as it stood in the single note:
the same bytes, from its first quoted line through its anchor, the anchor's
line ending and the blank line it owns. That one decision carries most of the
design:

- **Selectors, anchors and unknown hypothes.is fields are retained
  losslessly because they are never re-encoded.** They stay in the
  `annotation-json` text, with the original key order, number spellings
  (`1e400`, `12345678901234567890123`) and escapes. Nothing is translated to
  YAML and back.
- **The existing codec reads and edits the file unchanged.** `readAll`,
  `update`, `recolor` and `create` work on an annotation file as they do on a
  note with one annotation, with all their existing laws. There is no second
  parser to write, prove or keep in step.
- **Obsidian can rewrite the properties freely.** Its property editor and
  Bases re-serialise YAML (quoting, order, added keys). No annotation data
  is ever read from the properties, so that cannot damage an annotation. The
  tests replace the whole frontmatter, and delete it, and the merge is still
  exact. One property would be *followed*, never parsed for content:
  `annotation-of`, the link by which a file no reference line mentions is
  found (see "How a source finds its annotations"). Losing it can hide a newly created
  annotation from its hub until the link is restored; it cannot change one.
- The comment is ordinary Markdown inside the block, so its links, tags and
  embeds are indexed by Obsidian as they are today. Tags already live in the
  block as real `#tags`, which is why the Base shows `file.tags` and the
  properties do not duplicate them.

The alternative considered was a "prettier" file: the comment as plain body
text, the quote as a callout, and the JSON (or the selectors as nested YAML)
in a property. It was rejected for the storage layout. Nested YAML loses
number spellings and key order the moment Obsidian rewrites it; a multi-kB
JSON string in a property is hostile in the properties UI; and an exact
conversion back to the single note would need every block's display line,
link line, line endings, quote style and section presence stored somewhere
anyway. It would also need a new recognizer with its own proofs. The
one-way export keeps that prettier shape, where exactness does not matter.

#### Properties

All derived from the block on every write; none is read back. Names are
prefixed because an Obsidian property has one type per vault: a bare
`created`, `page` or `color` would collide with the user's own.

| Property | Type | Value |
| --- | --- | --- |
| `annotation-id` | text | The annotation ID (also the block anchor). Marks a file as an annotation file. |
| `annotation-of` | link | The hub note. Obsidian updates it when the hub is renamed or moved. |
| `annotation-source` | link or URL | The annotated file when it is in the vault, else its URL. |
| `annotation-kind` | text | `highlight` (passage, no comment), `annotation` (passage and comment), `note` (page note), `reply`. |
| `annotation-passage` | text | The quoted passage on one line, at most 240 characters. |
| `annotation-comment` | text | The comment on one line, at most 240 characters. |
| `annotation-color`, `annotation-color-name` | text | The ink key, and the user's name for it. Passages only. |
| `annotation-section`, `annotation-page` | text, number | Where it is in the source, when the reader can tell. |
| `annotation-thread`, `annotation-parent` | text | For replies: the root's ID and the direct parent's ID. |
| `annotation-created`, `annotation-updated` | text | ISO timestamps as stored. Text, so they sort correctly and Obsidian never reformats them. |

Because properties are an index, editing one in a Base does not edit the
annotation; the next save by the reader restores it. That is a deliberate
first step, not the end state. Making `annotation-color` and the tags
editable from a Base needs a three-way rule (which side changed since the
reader last wrote?) and therefore a stored digest of the last written values.
It is pure logic and belongs in Bend with laws (no change means no write; a
one-sided edit wins; reconciling twice changes nothing). It is listed under
[Open](#open).

#### File names

`fileNames` builds `<first 48 characters of the passage or comment> <last 8 of the ID>.md`:
readable in tabs, backlinks and the graph; free of `\ / : * ? " < > | # ^ [ ]`
and control characters; NFC; no leading dot; unique without regard to case
(falling back to the whole ID, then a counter). A name is chosen once, when
the file is created, and never changed by the reader afterwards. The user can
rename or move a file at will, because nothing identifies an annotation by
its file name.

## How a source finds its annotations

By **links and IDs, not folders**.

1. Source → hub: unchanged (`annotation-target`, associations, collections).
2. Hub → files, primary: the hub's reference lines. Obsidian's metadata cache
   already lists them as the hub's embeds, in order, in time proportional to
   the hub.
3. Hub → files, secondary: files whose `annotation-of` links to the hub and
   which no reference line mentions. This is how a newly created annotation
   is found (below), and what makes a damaged hub harmless.

The folder is only where new files are put.

| Event | What happens |
| --- | --- |
| Annotation file renamed or moved | Obsidian rewrites the hub's embed. If it did not (edited outside Obsidian), the file is still found through `annotation-of`, and matched by ID. Tested: merge with every file renamed and reordered is exact. |
| Hub renamed or moved | Obsidian rewrites `annotation-of` in each file. Reference lines are unaffected. |
| Annotation file deleted in the file explorer | The annotation is gone; its reference line stays in the hub as a broken embed until removed. Merging keeps the line as written, so its place is not lost if the file comes back. |
| A file has not synced yet | Same as deleted, and it lands in its place once it arrives (tested). Law `leaves_join_without_leaves`: with no files at all, merging returns the hub unchanged, for any hub text. |
| Two devices annotate the same source | Each creates its own file. No file is written by both, so there is nothing to conflict. Today both rewrite the one note. |
| Two devices edit the same annotation | A conflict in that one file. With a sync tool that makes conflict copies, two files then hold the same ID: the reader must refuse to edit *that* annotation and name both files (`mergeNote` does: "A and B both hold annotation X. Keep one of them."). In the reader as designed, every other annotation stays usable; that part is not built, and the prototype's `mergeNote` refuses the whole combine until one copy is removed. Today a duplicate ID makes the whole note read-only. |
| The hub's reference line is lost in a sync merge | The annotation is still found through `annotation-of`; only its position among the prose is lost, and it is listed after the others. |
| A conflict copy of the hub | Two notes target the source, exactly as today; the existing "Multiple annotation notes target this source" path applies. |
| Text added to an annotation file beside the block | The reader shows the annotation normally. Combining refuses, naming the file, rather than silently drop or move the text. |
| The original plugin opens a split hub | It sees no annotations, and anything it creates is written into the hub as an ordinary block. That mixed state is legal: merging a hub that holds some blocks inline is exact (tested), so nothing is lost. The user should combine before going back to the original plugin, and the split command should say so, the way the auto-open setting already warns about running both. |

## Replies and page notes

One file per annotation, uniformly. In the hypothes.is model a reply is an
annotation with `references`, and a page note is an annotation whose target
has no selector; both already are ordinary blocks in the single note.

- A **page note** is a file with `annotation-kind: note` and no passage.
- A **reply** is a file with `annotation-kind: reply`,
  `annotation-thread` (the root's ID) and `annotation-parent`. IDs rather
  than links, because the fixtures include replies whose root or intermediate
  parent is missing (`published-missing-root-replies.md`,
  `published-missing-intermediate-reply.md`) and an ID still groups them.
- Threads are assembled as today by `annotation-threads.ts`, from records. It
  does not care where a record was read from.

Putting a whole thread in one file was considered and rejected: properties
could describe only the root, orphan replies would need their own files
anyway, and a reply written on one device would conflict with an edit to the
root on another.

Video notes (`annotation-target-type: video`) use a different block codec and
are out of scope here.

## The sidebar and the Base

**One Base for the vault**, `annotationsBase()`. It selects files that have
an `annotation-id` property, wherever they are, and has four views:

- **This source**: annotations that link to `this.file`. Embedded in a hub
  note (`![[Annotations.base#This source]]`) it lists that hub's annotations
  through `annotation-of`. Open in the right sidebar, where `this` is the
  active file, it follows whichever PDF or EPUB is in front through
  `annotation-source`. That is the idea's "sidebar that behaves like a Base"
  with no custom code at all.
- **All annotations**, grouped by source.
- **By colour**, grouped by the user's ink names.
- **Recent notes**, newest comment first.

Columns: where, passage, note, colour, tags (`file.tags`, so tags written in
comments count).

**The reader's own sidebar keeps its cards** (STYLING.md: Obsidian's own
classes and variables, no bespoke chrome). What changes for a split source:

- A card is a file. "Open note" opens it; dragging a card gives a link to the
  file; the card menu gains "Reveal in file explorer".
- The list can be drawn from the metadata cache alone (ID, kind, passage,
  comment, colour, section are all properties), without reading any file.
  Bodies are needed only to anchor highlights, and can be read for the pages
  in view.
- Tabs, colour filter and section headings stay in `shelf.bend`; they take
  entries, not notes.
- A header button opens the Base, scoped to this source.

Obsidian 1.10 lets a plugin register its own Bases view
(`registerBasesView`). Registering the card list as a view type would make
the annotation cards available inside any Base. That is the natural last
step and is not designed here.

## Conversion laws

`split` turns a single note into a hub and files; `merge` turns them back.
Stated for the Bend functions in `leaves.bend` (`split`, `join`), where a
*leaf* is an annotation's block bytes.

| # | Law | Status |
| --- | --- | --- |
| 1 | **Split then merge returns the original note byte for byte.** For every string `s` and every choice of links: `split(s)` is either refused, leaving `s` as it is, or `join(hub, leaves) = s`. | **Proved** for all strings: `leaves_split_join_exact`. It holds because `split` merges its own result and returns it only with evidence that the merge equals the source (the same runtime certification creation uses). So it says a split is never lossy; it does not say a given note is accepted (laws 4 and 6 are the evidence for that). |
| 2 | **Merge then split returns the same files.** Splitting the merged note again yields exactly the same hub and the same leaves, in the same order. | **Proved** for every layout `split` produces: `leaves_split_stable`. A corollary of law 1. |
| 3 | **Missing files cannot damage a hub.** `join(hub, []) = hub` for every string. | **Proved** by induction over the hub's lines: `leaves_join_without_leaves`. |
| 4 | Split is not vacuous: a concrete note is accepted, with exactly this hub and this leaf. | **Proved** by computation: `leaves_split_accepts_example`. |
| 5 | The reference-line grammar. | **Proved** by computation on examples: `leaves_reference_examples`. |
| 6 | Laws 1 and 2 hold on real notes: all five native fixtures and both original-plugin test notes (30 annotations), each also with CRLF endings and without a final newline. | **Tested**, both suites. |
| 7 | The file around a leaf (properties, blank line) reads back to the same bytes and the same annotation; properties, file names and file order do not affect the merge. | **Tested**; and `splitNote` re-reads every file and re-merges before returning, so it cannot hand out files that do not merge back. |
| 8 | Editing or recolouring an annotation in its own file, then merging, equals editing or recolouring it in the single note. | **Tested** for every annotation in every fixture. |
| 9 | Creating an annotation as one new file, without touching the hub, then merging, equals creating it in the single note. Two created on different devices merge in creation order. | **Tested** on every fixture. |
| 10 | Deleting a file and its reference line, then merging, equals deleting the annotation in the single note. | **Tested** for every annotation in every fixture. |

What "proved" means for law 1, precisely. `split` computes a hub and leaves,
merges them again with the real `join` (which scans the hub text afresh),
and compares the result with the source using the same proof-producing
string comparison that certified creation already uses. It returns a layout
only together with that evidence. So the theorem holds for every possible
input without assuming anything about the recognizer. What the theorem does
*not* say is that every note is accepted. A split is refused when the note is
malformed or has duplicate IDs (as every mutation is today), when its prose
already contains a reference line for one of its own annotations, or when a
supplied link is not a plain name. Acceptance of real notes is law 6, tested.

One limit sits outside the proof, at the JavaScript boundary. Bend strings
are sequences of Unicode scalar values, and an unpaired UTF-16 surrogate is
not one; Bend 2.0.40 replaces it with U+FFFD on the way in. `splitNote` and
`mergeNote` therefore refuse text that contains one, by name, instead of
returning something altered (tested). Text decoded from a UTF-8 file cannot
contain one, so this does not arise for notes read from a vault.

Negative controls in `verify.mjs` (each must be rejected by the checker): a
merge that drops a placed leaf's bytes; a missing leaf that erases its
reference line; a split that leaves the annotation in the hub as well; a
split that loses an annotation's bytes; a same-note embed taken for a
reference.

Not proved, and not true in general: merge-then-split for a layout that
`split` did not produce. A hand-edited hub or a file with text beside its
block is either refused or normalised. `join` itself puts a file's bytes
where its line was and adds nothing, so a file that lost its final line
break would run its anchor into the following line; `mergeNote` therefore
reads the merged note again and refuses unless it holds exactly the
annotations that went in (tested; the check is in TypeScript, not in a law).
Three behaviours are held only by tests, not by a law or a negative control:
a file no line mentions is appended, files are matched by ID, and the
reference line keeps the note's line ending. Laws 8 to 10 are properties of the
existing codec applied to a smaller document plus `join`; they are tested,
not proved, and proving them needs the recognizer conservation theorem the
codec's README already lists as missing.

The merged text is the *value* of a split source. Anything that hashes,
diffs, backs up or exports an annotation note today (upgrade backup, remote
revision review, hypothes.is exchange) can run unchanged on
`mergeNote(hub, files)`.

## Operations on a split source

Designed and tested as pure functions (laws 8 to 10); not wired into
`main.ts`.

| Operation | Single note today | Split source |
| --- | --- | --- |
| Open a source | Read and scan the note | List from the metadata cache; read file bodies for anchors |
| Create | `vault.process(note, create)`: rewrite the whole note | `vault.create(file)` with `create(properties, annotation)`. **The hub is not written.** |
| Edit, recolour | `vault.process(note, update)` | `vault.process(file, update)`, then refresh its properties |
| Delete | `vault.process(note, remove)` | Trash the file, then remove its line from the hub |
| Split | — | Write all files, verify, then replace the note's text with the hub in one `vault.process` |
| Combine | — | `vault.process(hub, merge)`, then trash the files |

Creation not touching the hub matters. The obvious design appends a
reference line to the hub on every create. That makes the hub a file every
device writes, which brings the sync conflict straight back; and computing
the right blank-line boundary for the appended line needs the tail of the
merged text. Instead a new file is an *unreferenced* leaf, which `join`
appends after a complete blank-line boundary, exactly as single-note
creation does (law 9). Reference lines exist only to remember where an
annotation sat among the user's prose in a note that was split.

Split and combine are the only multi-file operations. Both are designed to
be safe to interrupt (the vault code that would do this is not built): split writes the hub last, and until then the single note is
intact and the new files are duplicates of blocks it still holds; combine
writes the merged note first, after which the files are duplicates of blocks
the note now holds. Either way the leftover is detected by ID: `mergeNote`
refuses a file whose annotation the note also holds, and names it, so a copy
is never merged in twice. While such a duplicate exists the block in the
note is the one the reader should show.

## Performance at 5,000 annotations

Measured with `test-support/annotation-files-bench.mjs` on the real compiled
codec (Bend 2.0.40, Node 26, Apple silicon, one synthetic source of 5,000 annotations,
5.45 MB as a single note, 1.5 kB per annotation file). File I/O and
Obsidian's own indexing are not included.

| Operation | Single note | One file per annotation |
| --- | ---: | ---: |
| Open the source: read every annotation | 1.2 s | 1.1 s for all bodies; 0.1 ms each |
| Edit one comment (codec only) | 1.2 s | 0.1 ms |
| Create one annotation | 11.6 s | 0.8 ms |
| Convert: split (certified) | 11.7 s, once | |
| Convert: combine (with its read-back check) | | 3.4 s, once |

Two consecutive runs on an otherwise idle machine agreed within 2%. An
earlier run of the same script, while other work was using the machine, was
two to ten times slower (3.3 s, 11.6 s and 29.7 s for the first three rows),
so read these as orders of magnitude.

These are the numbers after the recognizer's duplicate-ID check was made
linear, which this measurement prompted. Before, `Recognizer.safe` and
`Recognizer.diagnostics` compared every annotation's ID with every later one:
about 2.2 s each at 4,000 annotations, against about 6 ms each now (measured
on the two definitions side by side; the pairwise ones remain in
`recognizer.bend` as the specification). The one-pass check is proved equal
to the pairwise one for every part list (laws `recognizer_errors_pairwise`,
`recognizer_safe_pairwise`, `recognizer_diagnostics_pairwise`). Timings
taken before that fix, on Bend 2.0.5, were several times higher again; that
compiler is no longer installed, so they cannot be re-run and are not quoted.

Three things to take from this.

1. **The single note is still slow to write at this size, and the reason is
   now structural, not a bug.** Every operation parses the whole note, about
   1.2 s here. Creation also compares the entire source character by
   character, twice, to produce its checked evidence, which is why it costs
   ten times an edit.
   All of it is linear, so a few hundred annotations in one note stay
   comfortable; thousands do not. Fewer passes per operation would help, but
   the cost of a write will always grow with the note.
2. **Per-file writes do not depend on how many annotations a source has.**
   Every write touches one 1.5 kB file.
3. **Per-file moves the cost to the number of files.** 5,000 annotations in
   a vault are 5,000 more notes for Obsidian to index at startup, show in
   the file explorer and quick switcher, and sync one by one. That was not
   measured here and should be, on a phone, before this becomes a default
   for anyone. It is the main reason the recommendation is "per source, by
   choice". The annotation folder can be excluded from the quick switcher and
   graph with Obsidian's own "Excluded files" setting.

The merge proper takes well under a tenth of a second at 4,000 annotations;
the rest of the time to combine is reading 5,000 files back through the
codec. Splitting is
dominated by its certificate: the full-source comparison, then reading every
written file back.

## Trade-offs

| | Single note | One file per annotation |
| --- | --- | --- |
| Original plugin | Reads and writes it | Sees an empty note until combined |
| Bases, Dataview, properties | No | Yes, live |
| Link to an annotation | `[[note#^id]]` | `[[file]]`, and `[[file#^id]]` still works |
| Reading everything on one page | The note itself | The hub (embeds) or the Base |
| Sync, two devices, same source | Whole-note conflict | No shared file |
| A malformed or duplicated annotation | Whole note read-only | That one file (as designed; the prototype's combine refuses until it is fixed) |
| Cost of an edit | Grows with the note | Constant |
| Files in the vault | One per source | One per annotation, plus the hub |
| Annotating a new passage | One write | One new file |
| Portability outside Obsidian | One self-contained file | A folder of files; the hub's embeds mean nothing elsewhere, but each file is a complete legacy block |

## Open

Decisions for the owner:

1. Property names: prefixed (`annotation-passage`), as built, or short
   (`passage`) as the current export writes. Prefixed is safer; short is
   nicer to type in a Base formula.
2. File names: readable with an ID suffix, as built, or the bare ID.
3. Whether the reference line should be an embed (renders, heavier with
   thousands) or a plain link.
4. Whether to align the existing export with these properties now.

Work not done:

- Vault commands "Split into one file per annotation" and "Combine into one
  note", with a confirmation that names what the original plugin will see.
- The reader's read path for a split hub (records from inline blocks plus
  files), then the write path in the table above.
- The sidebar drawing from the metadata cache; lazy bodies; the Base button.
- Making colour and tags editable from a Base (needs the reconcile logic in
  Bend, with laws).
- To verify in Obsidian itself: that `file.hasLink(this.file)` counts links
  in properties; that `sort:` in a `.base` view is honoured as written (the
  current export relies on it too; it is not in the public typings); that
  `![[Annotations.base#This source]]` embeds that one view; how
  5,000 block embeds in one hub render; startup and sync with 5,000 extra
  files on mobile.
- Follow-ups outside this design: the video codec (`video_document.bend`)
  still has the pairwise duplicate-ID check the annotation recognizer had;
  and the single note's edit and create make several full passes over the
  note where fewer would do.
