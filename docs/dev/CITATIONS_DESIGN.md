# Citations on the page in view: design

Status: design, not built. Written 2026-11-13, after the 0.3.0 release. It
was reviewed once by a critic before anything was built;
[what the critic found](#what-the-critic-found-and-what-changed) is at the
end, and the text above it is the design after those changes.

While reading a paper, a reader meets `[12]` or `(Vaswani et al., 2017)` and
wants to know what that is without leaving the page, and sometimes wants a
note for that work, to read it later. This design adds a panel that lists the
works cited on the PDF page in view, in order of appearance, and makes or
opens a note for a cited work, linked back to the source that cites it.

The idea comes from the fork `sparthaje/obsidian-references`, which did this
on the old reader. The idea is taken; the code is not.

Everything is read from the PDF the reader already has open. Nothing is
looked up online, the PDF is not changed, and the annotation note's format is
not touched.

## What was looked at first

Before designing, the PDF library inside Obsidian (pdf.js 5.3.34 in Obsidian
1.15.1) was asked what it reports for three LaTeX papers kept in the test
vault (single column and two columns, 9 to 27 pages), for three small papers
set with Typst (numbered, author–year, raised numbers), and for the 900-page
test PDF.

| Found | Consequence |
| --- | --- |
| All six papers link each citation to its reference. The link is a PDF link annotation on the citing page; its destination is a point at the top of the entry in the reference list. | Where the PDF has these links, the PDF itself says which entry a citation means. |
| Over all 244 citation links of the three LaTeX papers, the entry's first line was between 1.0 and 1.4 line heights below the landing point, exactly one labelled line was in that window each time, and no link to a figure, section, table or footnote landed in such a window. In one two-column paper the last line of the entry before sits exactly at the landing point's height. | A landing point selects the entry whose first line is just below it, never the line at it. But see the next row. |
| These are six PDFs from two programs, all made by their authors. None is a publisher's PDF, made with Word or InDesign, a book, or a scan with recognised text. | The numbers above are not yet rules. A link is therefore never the only reason a work is named (see [Naming a work](#naming-a-work)), and the first step of building is a wider survey (see [Tests](#tests)). |
| In one paper half of the citation links cover only part of a longer text run (`[38, 24, 15]` is one run with three links). | The text under a link's rectangle cannot be cut out exactly. Markers are found in the text first; a link is then attached to the marker it lies over. |
| In the numbered Typst paper the reference list links back to the places that cite it. A footnote mark is a link too, to the foot of its own page. | A link that starts inside a reference list is not a citation. A footnote's link does not land in a list. |
| In the author–year Typst paper two entries read "Smith, J. (2019)", and the two citations `Smith, 2019` link to different ones. | Text alone cannot always tell entries apart. Then the link may decide between them, or the panel says that several fit. |
| In the Typst paper with raised citation numbers, the raised digits are reported with the same baseline and size as the words around them (the font raises them itself). The page text reads `recurrence1. Earlier`. | Raised numbers cannot be told from ordinary digits by position. They are recognised only where the PDF links them. |
| The page text the reader keeps has no break between lines; a list reads `…dropout.References[1] Jimmy Lei Ba…`. The text runs, asked for again with their positions, give lines, columns and sizes. | Lines are built from positioned runs, for the pages of a reference list and for the page in view. |
| Reading the link annotations of all 900 pages took 0.18 s in total; the named destinations of a 27-page paper, 2 ms; the positioned text of 21 pages, 0.26 s. The library does this work in its own worker. | The cost is small and none of it holds the interface's thread. See [Cost](#cost). |

## Words

- A **marker** is one citation as written on a page: `[3–5]`, `[2, 35]`,
  `(Vaswani et al., 2017; Wu, 2016)`, a raised `12`.
- A marker has one or more **items**, each meaning one work: `[3–5]` has
  three.
- The **reference list** is the part of the PDF that lists the works, as
  **entries**. A PDF may have several lists (one per chapter).
- An item **fits** an entry when the entry carries the item's label, or its
  first author and year. This is decided from the text of both.
- A **link** is the PDF's own link annotation from a marker to a point in a
  list.

## What is recognised

| Written as | With the PDF's links | Without links |
| --- | --- | --- |
| `[12]`, `[2, 35]`, `[3–5]`, `[3-5, 9]`, `[12, p. 4]`, `[12, Theorem 3.1]` | yes | yes: each number must be a label of the list |
| `[Vas17]`, `[VSP+17]` (letter labels) | yes | yes: each must be a label of the list |
| `(Vaswani et al., 2017)`, `(Smith and Jones, 2019a; Wu, 2016)`, `(Smith, 2019, 2020)`, `Smith (2019a,b)`, `Vaswani et al. (2017)`, `[Vaswani et al., 2017]`; with "see", "e.g.," before and a page after | yes | yes: when exactly one entry fits |
| Raised numbers (`…as shown.12,13`) | yes | no (see above) |
| Numbers in round brackets, `(12)` | yes | no: they are also equation numbers and list items |

Ranges are expanded (`[3–5]` is 3, 4, 5) up to a width of 50. A wider range
is shown as its marker with "range too wide to list".

**Where a list is linked, only linked markers count.** If the PDF links
citations into a list, a bracket or a name-and-year in the text that no link
lies over is not a citation of that list: `t ∈ [1, 2]`, `a[1]`, a Python
list. A marker counts as linked if a link lies over any of its items (in
`[3–5]` often only 3 and 5 are linked). Where a list has no links into it,
a bracket straight after a letter, a digit, `)` or `]`, or after `∈` or
"in", is not a marker.

### What is not recognised, and what the panel says

The panel has one status line at its top. It says one of these when it
applies, and the panel lists no guesses:

| Case | The panel says |
| --- | --- |
| A scanned PDF (pictures of pages, no text) | "This PDF has no text to read (it is a scan), so its citations cannot be listed." |
| No reference list is found: footnote-style citations (the reference written out in a footnote, "ibid."), a list under a heading the reader does not know and with no links into it | "No reference list was found in this PDF." |
| The list is found but cannot be divided into entries with confidence | "The reference list on page 45 could not be divided into entries. Citations are listed as written, without their works." Each row is then only the marker. |
| A numbered list read with gaps | Rows are shown for what was read. The status line says "Entry 38 was not found in the reference list (37 is followed by 39)." |
| The page cites numbers beyond what was read | "The reference list was read up to entry 37; this page cites up to 52." |
| A bracketed label or a linked marker fits no entry | The row shows the marker and "Not found in the reference list." |
| An item fits several entries and no link decides | The row shows the marker and "Two entries fit:" with both, each with its own actions. |
| A link and the text disagree | The row shows the marker and "The PDF's link and the text point to different entries." with both. |
| A link lands in a list but what it lies over is not a marker the reader knows | The row shows the words under the link, "Linked to the reference list", and the button that goes there. No work is named. |
| Several lists, no link, and no list begins after the citing page | The row shows the marker and "Which reference list this belongs to is not certain." |
| Name-and-year wordings that fit no entry ("(May, 2019)", "(Table 2, 2020)") | Not rows. One line at the foot: "3 other places on this page look like citations but fit no entry." It opens to show them. |
| A page with no citations | "No citations on this page." |
| The source is not a PDF | "Citations are read from PDFs." |

For every case where recognition fails there is a way by hand: select a
reference in the PDF and run **Make a reference note from the selection**
(see [The reference note](#the-reference-note)).

Also not recognised, and not reported case by case: citations inside
pictures; "ibid." and "op. cit."; author–year citations with no year ("in
press", "n.d."); an author's name written differently in the citation and
in the list beyond case, accents and ligatures; lists in right-to-left
scripts (they are found by heading but refused at division); the type marks
of GB/T 7714 lists are read as part of the entry.

## Finding the reference lists

When the panel is first shown for a PDF, the link annotations of every page
are read (about 0.2 ms a page as measured, in slices). That tells, once and
for the whole PDF, where links land. Lists are then found in two ways:

1. **By heading.** A line that, with spacing and case set aside (so that a
   small-capitals `R EFERENCES` is read), is one of: References, Reference
   List, References Cited, References and Notes, Bibliography, Selected
   Bibliography, Works Cited, Literature Cited, Supplementary References,
   Literatur, Literaturverzeichnis, Références, Bibliographie, Referencias,
   Bibliografía, Referenser, Litteratur; alone on its line, with or without a
   section number before it. A heading counts only if the lines after it
   divide as entries (below); a contents line or a running head does not
   pass that. Candidates on consecutive pages with nothing but entries
   between them are one list (a book whose running head is "References").
2. **By links, where no heading is found.** A run of pages on which links
   from at least three other pages land, each just above a line that begins
   an entry, is a list, from the highest such landing point. Links to
   figures, sections and equations land on lines that do not divide as
   entries.

A list is read (its pages asked for with positions, its lines built and
divided) only when a citation in view needs it. A book with thirty lists has
one read at a time.

A list ends at the first of: a line in a larger size than the entries or
outside their columns; the end of the PDF; for a labelled list, the end of
the last entry of the sequence. If the last entry would run past 14 lines,
the list ends at its 14th: lines after that belong to no entry (they are
most likely acknowledgements or an appendix set in the same size).

Which list a marker without a link belongs to: with one list, that one. With
several, the first list that begins on or after the citing page, if the
citing page comes after the end of the list before it; the row then says
"from the list on page 45" in plain sight. Otherwise no list is chosen (see
the table). This rule can still be wrong where a chapter's own list was not
found; saying which list was used is how the reader can tell.

## Dividing a list into entries

Lines are built from the positioned runs: columns are told apart by their
left edges and read left to right whatever order the PDF gives them in; a
line is the runs of one column on one baseline, where a run raised or
lowered by less than half its size (a superscript in a title) belongs to the
line beside it. A line has its text, left edge, size, the gap above it, page
and column.

Left out before dividing: lines that are only a page number at the head or
foot of a page; lines that repeat at the same height on the next or the
previous page, whether or not that page belongs to the list (running heads);
lines outside the columns of the list or in another size (a float that
drifted onto the page, line numbers of a review copy, the stamp in the
margin).

Which lines begin an entry is decided by the first of these the list
supports:

1. **Labels.** Lines that begin with `[1]`, `1.`, `(1)`, a bare `1` followed
   by a wider space, or a letter label in brackets, where the labels (which
   may be set flush right, so `[9]` begins to the right of `[10]`) are
   numbers that go up by one from the first.
2. **Landing points.** Where links from anywhere in the PDF land in the
   list, each landing point begins an entry. All pages' links are known
   before any list is divided, so this does not change as pages are read.
3. **Layout.** Two left edges (a hanging indent, or the reverse); or, with a
   single left edge, a gap above a line that is larger than the usual one.

The division is then checked, and a list that fails is refused with the
status line above:

- Labelled: the labels are `m, m+1, …, n` in order (a list may continue
  another's numbering). Missing labels are reported; labels out of order or
  twice mean the division is wrong.
- Not labelled: author–year lists are in alphabetical order. Entries are
  compared by their first word with the language's own collation (so `Ö`
  and `O`, `Mc` and `Mac` do not count as disorder), an entry that begins
  with a dash ("———. 2019.", the same author again) takes the author of the
  entry before it, and at least nine in ten neighbouring pairs must be in
  order.
- An entry longer than 1,500 characters is taken to hold more than one
  reference. It stays in the list, marked, and names no work.

An entry's text is its lines joined with a space, except after a hyphen at a
line end, where nothing is added and the hyphen stays: the rule the reader
uses to show a highlight.

From each entry a **key** is read, for matching only:

- its **label**, if the list is labelled;
- its **authors' surnames**, from the author part only (the text before the
  title: before the year in brackets, the quoted title, or the first full
  stop that does not end an initial). Whether surnames come first
  ("Vaswani, A.") or last ("Ashish Vaswani") is decided once for the whole
  list, from all its entries, and the surname is taken from that place only,
  so "(Chen et al., 2020)" does not fit "Chen Sun";
- its **years**: four-digit years from 1500 to next year that stand in the
  place the list's style puts the year (after the authors, or at the end of
  the entry), and never inside an arXiv number, a DOI, a page range, a
  volume or the name of a conference.

Case, accents and ligatures are set aside in keys (`Sch¨olkopf`, as old
LaTeX fonts write it, is `scholkopf`).

## Naming a work

There is one rule, and every row goes through it.

For each item of a marker, the entries of its list that **fit** are found:

- a number or letter label fits the entry with that label;
- a name and year fit an entry when the item's first surname is the entry's
  first surname, every other surname the item names is among the entry's
  surnames, and the year is among the entry's years (a year with a letter,
  `2019a`, must be there with its letter; "et al." names no one).

Then:

| The item fits | A link over the item | The row |
| --- | --- | --- |
| one entry | none, or lands on that entry, or lands at no point that can be read | names that entry |
| one entry | lands on another entry | "The PDF's link and the text point to different entries." Both are shown; none is named. |
| several entries | lands on one of them, and this page's links are trusted | names that one |
| several entries | none, or not trusted, or lands on none of them | "Two entries fit:" with all of them |
| no entry | any | "Not found in the reference list." (or the foot line, for name-and-year wordings without a link) |

A bare number under a link (a raised number, a number in round brackets)
has only its link to say it is a citation at all. It names an entry only if
its link lands on the entry with that label.

**A link names nothing alone.** It lands on an entry when exactly one
entry's first line begins in the window below its landing point in the
landing point's column (for a destination that gives a height but no left
edge, in any column, if only one entry qualifies; a destination that gives
no point lands on nothing). If two entries begin in the window (one-line
entries), it lands on nothing. The window is whatever the survey supports;
the six PDFs so far give 1.0 to 1.4 line heights.

**When links are trusted.** On the page in view, at least two links lie over
items that fit one entry each, and every such link lands on the entry its
item fits. Then links on that page may decide between several entries that
fit. A producer that puts its landing points elsewhere fails this on every
page, and its links then decide nothing; its citations are still named
wherever the text alone fits one entry.

**Attaching links to markers.** Markers are found in the page's text. Each
item has a span of characters; within its text run, that span is given a
span across the page in proportion to the characters before and in it. A
link lies over an item when its rectangle is on the item's line and covers
at least half of the item's span or the item covers at least half of the
rectangle. A link rectangle that reaches over two lines is treated as one
rectangle per line. Links that lie over no item are bare numbers (the number
token they cover by the same half rule) or "Linked to the reference list".

Works on a page are listed in the order their first markers appear. A work
cited several times on the page has one row, with a count. Each row says in
small print how it was matched: "Linked in the PDF", "Matched by its
number", "Matched by author and year".

What this rule guarantees: a named entry fits the marker's own text; nothing
is picked among several without a link that has shown itself right on that
page. What it does not guarantee: that the entry was divided and keyed
correctly. If the true entry was lost in division and one other entry fits,
that other entry is named. The checks on division are what stand against
this.

## The interface

### Where it lives

A view of its own, **Citations**, opened in the right sidebar **under** the
Annotations view (its own split), so both show while reading. It is opened
by the command *Citations: show the works cited on this page* and by
**Citations on this page** in the Annotations sidebar's menu (shown for
PDFs). The reader can move it like any Obsidian view.

Why not a third tab inside the Annotations sidebar:

- That tab row is the annotation list's own: its two tabs divide the
  annotations between them (a checked law, `shelf_tabs_partition`), and the
  search field, the ink filter, the sort and the counts beside it all act on
  annotations.
- Selecting text and composing a note bring the Annotations view to the
  front. A reader looking at citations in a tab of it, or in a view sharing
  its group of tabs, would be moved away with every highlight. A split of
  its own is not.
- The row is already full in a narrow sidebar and on a phone.

What it costs: one more thing to open, and height shared with the
annotations. The menu entry and the command are how it is found.

### What it shows

```
┌──────────────────────────────────────────────┐
│ Attention Is All You Need     page 2/15   ⏸  │  the source, the page, hold
│ [ On this page ]  All references             │
├──────────────────────────────────────────────┤
│ [35]  Ilya Sutskever, Oriol Vinyals, and     │
│       Quoc V Le. Sequence to sequence        │  the entry as the PDF has it,
│       learning with neural networks. In …    │  three lines until opened
│       Linked in the PDF          ⌖  ⇲  ＋    │  show on page · go to entry · note
│ [2]   Dzmitry Bahdanau, Kyunghyun Cho, …  ×2 │
│       → Bahdanau et al. 2014 - Neural …      │  its note exists: a link
│ [5]   Kyunghyun Cho, Bart van Merrienboer, … │
│ (Wu, 2016)   Two entries fit: …              │
│ 3 other places look like citations …       ▸ │
└──────────────────────────────────────────────┘
```

- **Header.** The source's name (as the Annotations sidebar shows it),
  "page 2/15", and **Hold**: a toggle that keeps the list on its page while
  the reader scrolls.
- **On this page / All references.** The second lists the whole reference
  list (the one this page cites) in its own order, with a field to narrow it
  by words. It shows the reader how the list was divided.
- **A row** is a list item, not a button. It has the marker as written, the
  entry's text as the PDF has it, "×2" when cited more than once on the
  page, how it was matched (small print, not a tooltip), and its buttons.
  If a note for the work exists, the row has a link to it: an ordinary
  internal link with Obsidian's hover preview and its usual ways of opening.
- **The entry's text** is three lines; a disclosure button on the row
  (`aria-expanded`) opens it in full. Nothing depends on hovering.
- **Show on the page** brings the marker into view and flashes it, as an
  annotation's passage is flashed; again for the next place. On a phone the
  sidebar's drawer is closed first, since it covers the page.
- **Go to the entry** moves the PDF to the entry in the reference list and
  flashes it there. It is recorded as a followed link, so the reader's own
  **Back to page N** returns. The panel then lists that page's entries, with
  the entry asked for marked.
- **Make a note** / the note's link. See below.
- **The row's menu**: Copy reference; Link this note to the source (when a
  note exists that does not yet name the source).

When the page in view is part of a reference list, the panel lists the
entries on that page.

### Following the page

While the view is showing, it asks the reader which page is in view every
400 ms, as the Annotations sidebar does. A page must stay in view for 250 ms
before its citations are read. The list **holds** (does not follow) while
Hold is on, while a note's form is open, while the keyboard's focus is in
the panel, and while the pointer is over it: a list must not change under a
hand. A form's contents are kept if the panel is redrawn.

### Looks

The view uses the Annotations sidebar's own surface, header, card,
icon-button and empty-state classes and its `--annotator-*` variables, so a
theme or snippet that styles one styles the other. It adds classes for the
marker, the count and the small print (`annotator-citation-marker`,
`-count`, `-witness`), documented in `docs/STYLING.md`. No colour is fixed.
The keyboard reaches rows' controls with `Tab` in order, as in the
annotation list; the status line is announced politely to screen readers;
touch targets are the sidebar's. Phones and tablets are part of the hand
tests, with screenshots.

## The reference note

**Making it.** *Make a note* opens the row into a small form, in the panel,
as an annotation's draft opens in the sidebar: Title, Authors (one to a
line), Year, DOI, and the note's name, each filled in from the entry and
each editable. `Ctrl/Cmd+Enter` or **Create** makes the note; `Escape` or
**Cancel** closes the form. After Create the reader stays on the paper: the
row now shows the note's link, which opens it. The form is there because
reading a title and names out of a reference is the least certain thing the
panel does, and a wrong guess would otherwise become a file name.

**By hand.** The command *Citations: make a reference note from the
selection* opens the same form for whatever reference text is selected in
the PDF. It needs nothing recognised and works on any PDF with text.

**Its name.** `<First author's surname> <year> - <title>`; "et al." after
the surname with three or more authors, "A and B" with two. Without a title,
`<surname> <year>`; without those, the first 80 characters of the entry.
Characters a file name or a link cannot hold (`\ / : * ? " < > | # ^ [ ]`)
become a space, runs of spaces become one, and the name is at most 180
bytes, does not begin or end with a full stop or a space, and is not a name
Windows reserves. The name is a proposal the form shows; the reader may
change it.

**Where.** Where Obsidian puts new notes, unless a folder for reference
notes is named in Annotator's settings (one new setting).

**What is in it.**

```markdown
---
title: Layer normalization
author:
  - Jimmy Lei Ba
  - Jamie Ryan Kiros
  - Geoffrey E Hinton
year: 2016
reference: "Jimmy Lei Ba, Jamie Ryan Kiros, and Geoffrey E Hinton. Layer normalization. arXiv preprint arXiv:1607.06450, 2016."
cited-by:
  - "[[Attention Is All You Need.pdf.annotations]]"
---
```

- **Only properties, written by Obsidian** (`processFrontMatter`). No word
  from the PDF is written as Markdown, so nothing from a PDF can become a
  link, an embed, a tag or code in the note, or fetch anything. (The rule
  the annotation note's visible line follows, `proofs/display-text.mjs`,
  does not cover links, embeds and tags, so it is not used here.) The body
  is left empty for the reader's own words.
- `title`, `author`, `year` and `doi` are the names **Add the PDF's details
  to the note** uses, so one Base lists both kinds of note and export
  templates read both. A property is written only when the form has a value
  for it; `doi` only when the entry prints one.
- `reference` keeps the entry exactly as the PDF has it.
- `cited-by` is a list of links to the sources that cite the work. The link
  goes to the citing source's annotation note, the note the README calls
  the source's property sheet. If the source has none yet, the form has a
  ticked box, "Also make this PDF's annotation note (the link goes to
  it)". Unticked, the link goes to the PDF file itself, or, for a source
  that is not a file in the vault, is left out, and the form says so. No
  note is made that the form did not show.
- Links are written with the link text Obsidian gives for that file from
  that note (so two files of one name are told apart), and an existing
  `cited-by` is compared by the files its links lead to, not as strings.

**When a note for the work already exists.** Looked for among the vault's
notes (their properties, from Obsidian's metadata cache):

- A note **is** the work's note when its `doi` is the entry's DOI (compared
  without case and without a resolver's address before it), or when its
  title, year and first author's surname are all present and equal to the
  entry's (case, accents, punctuation and spaces set aside; a title of
  fewer than 12 letters never counts). The row then shows its link.
- A note whose title alone is equal is only a suggestion: the row says
  "Possibly: …" with the link, and **Make a note** stays.
- A DOI that reaches the end of a line in the PDF may be cut
  (`10.1016/j.neunet.` then `2019.01.012` on the next line). It is shown in
  the form, marked "may be incomplete", and is never used to find a note.

This finds annotation notes too: if the cited paper is already in the vault,
annotated and with its details added, the row links to its note, and
opening that opens the paper.

Opening never writes. **Link this note to the source** adds the source to
`cited-by` of a note that is the work's note, on that click. Obsidian
rewrites the note's properties when it does this (comments in them and
their layout are not kept; the text below is untouched); if the properties
cannot be read, nothing is written and the panel says so. A note is never
overwritten: if a file of the chosen name exists at **Create**, the form
says so and nothing is written.

A reference note is an ordinary note. If the reader later gets the paper,
adding an `annotation-target` to it makes it that paper's annotation note.

**Reading title, authors and year out of an entry** is a proposal for the
form and nothing more. Four shapes are tried in order: a title in quotation
marks (IEEE, Chicago); authors, a year in brackets, the title (APA);
authors, a full stop, a year, the title (ACM, ACL); authors, a full stop
that does not end an initial, the title (the usual LaTeX styles). The year
is the one in that shape. Authors are divided by a rule written for
reference lists (not the one `pdf-details.ts` uses for a PDF's own author
line): with surnames first, at the comma after an author's initials; with
surnames last, at commas and "and"; "et al." is no one. One repair is made
and said: an accent written beside its letter (`¨o`) becomes the letter
(`ö`). A hyphen at a line end inside a lower-case word is left and marked
in the form. Where no shape fits, the title is empty and the entry is in
the form to copy from.

## What is checked, and how

`CONTRIBUTING.md` asks that logic which decides what is stored be written in
Bend with laws and proofs, and that a shortcut around checked logic stay
off. Here the same care is owed to what the panel *claims*. A new module
`proofs/citations.bend` holds the decisions. It is given short, plain
values (the inside of one bracket, keys, lists of labels and page numbers),
never a page of text: places in the text are found in TypeScript, in
JavaScript's own string positions, and a list longer than the stack allows
is handed over in parts.

| Definition | Laws |
| --- | --- |
| `items`: the labels written inside one bracket, ranges expanded, or a refusal | `cite_items_print`: printing any non-empty list of labels and reading it back gives that list. `cite_items_written`: every label returned is written in the text, or lies between the two ends of a range written in it. `cite_items_refuses`: a text with any character outside the grammar is refused whole. `cite_range_exact`: a range `a–b` with `a ≤ b ≤ a+50` gives `a, a+1, …, b`; otherwise it is refused. |
| `fits`: whether an item's key fits an entry's key | `cite_fits_label`: a label fits exactly the entries with that label. `cite_fits_name`: a name and year fit only if the first surnames are equal, every other surname of the item is among the entry's, and the year is among the entry's years with its letter. |
| `decide`: the row for an item, from the entries that fit, where its link lands and whether links are trusted | `cite_decide_fits`: a named entry fits the item. `cite_decide_one`: with no link, an entry is named exactly when it is the only one that fits. `cite_decide_link`: among several that fit, an entry is named only if the link lands on it and links are trusted. `cite_decide_conflict`: if one entry fits and the link lands on another, none is named. `cite_decide_bare`: a bare number names an entry only if its link lands on the entry with that label. `cite_decide_total`: every combination has exactly one of the outcomes in the table above. |
| `trusted`: whether a page's links may decide | `cite_trusted`: exactly when at least two links could be checked and none of them disagreed. |
| `list_for`: which list a marker without a link belongs to | `cite_list_single`: with one list, that one. `cite_list_next`: with several, a list is chosen only if it begins on or after the citing page, no other list begins between them, and the citing page is after the end of the list before; otherwise none. |
| `sequence`: what a labelled list's labels say | `cite_sequence_complete`: "complete" exactly when the labels are `m, m+1, …, n`. `cite_sequence_missing`: a number is reported missing exactly when it lies between the first and last label and is not a label. `cite_sequence_disorder`: "wrong" exactly when a label is repeated or smaller than the one before it. |
| `split`: lines and the lines that begin entries, to a lead and entries | `cite_split_whole`: the lead followed by the entries' lines, in order, is the lines given, each once. `cite_split_starts`: every entry begins with a beginning line and holds no other; the lead holds none. |
| `works`: the works of a page in the order of their first markers | `cite_works_once`: no work is listed twice. `cite_works_all`: a work is listed exactly when some item on the page named it. `cite_works_order`: works are in the order of their first items. `cite_works_count`: a work's count is the number of its items. |
| `name`: a note's name from words | `cite_name_safe`: none of the characters a file name or a link cannot hold; no full stop or space first or last; at most 180 bytes; not a reserved name; not empty. `cite_name_stable`: naming a name gives the same name. |
| `same_work`: whether a note is an entry's note, from their keys | `cite_same_doi`: equal whole DOIs are the same work. `cite_same_all`: without that, the same work only if title, year and first surname are all present and equal and the title has 12 letters or more. `cite_same_cut`: a DOI marked as possibly cut never makes two the same. |
| `add_source`: a `cited-by` list with a source added | `cite_add_once`: the source is in the result once; adding it again changes nothing. `cite_add_keeps`: every other item stays, in order. |

Each law gets a deliberately broken program that the checker must refuse, as
the other modules have.

Every row passes through `fits`, `decide` and `works`; there is no other
way for a marker to become a work, with a link or without. `name`,
`same_work` and `add_source` are the only way a note gets its name, is
taken for an existing one, or has its `cited-by` changed.

What is not written in Bend, and why:

- **Lines from positioned runs, columns, left edges, gaps, sizes, the
  window under a landing point, which rectangle lies over which item.**
  Judgements about measurements with tolerances; a law would repeat the
  code. They are TypeScript, tested against what the PDF library reports
  for real PDFs. Their mistakes are met by the checks that follow them
  (`sequence`, the alphabetical check, `trusted`, `decide`'s conflict), all
  of which fail towards saying less.
- **Finding brackets and name-and-year wordings in running text; the
  heading words.** Patterns over natural language and Unicode letter
  classes; a specification would be the pattern. What they propose becomes
  a row only through `items`, `fits` and `decide`.
- **Reading an entry's key and the form's proposals out of its text.**
  Where the surname or the year stands is a matter of style with no law to
  state. This is the weakest link, and the document says so above: a wrong
  key can make `fits` true of the wrong entry. Tests on real lists are what
  it has.
- **The alphabetical check.** It uses the language's collation, which is
  the platform's.

Nothing parsed is saved between sessions. A saved copy of a divided list
would be a way round the checks on division, and is not built.

The checked functions run in the logic worker, beside the note codec
(`logic.ts`), not in the interface's thread. Before the scope above is
committed to, the compiled `items`, `fits` and `decide` are timed on a page
with 60 markers against a list of 400 entries, in the worker and in the
thread; if that is not well under a frame, the handing-over is changed, not
the laws.

## Cost

- **A PDF opened while the Citations view is not showing: nothing.** The
  view registers its type and two commands. The reader gains methods the
  view calls; none runs on its own, no timer or listener is added to a PDF,
  and no page is asked for anything. A test opens a PDF with a spy in place
  of the PDF library and requires no call for link annotations or
  destinations and no second request for a page's text.
- **Once the view is docked, it is open for every PDF read while it shows.**
  That is what showing it means, and the reader decides it. Behind another
  tab or in a closed sidebar it does nothing: no timer, and no listener on
  the vault (the index of notes is dropped when the view is hidden and
  built again when needed).
- **Showing, on a PDF:**
  1. All pages' link annotations are read in slices of 25 pages with a
     pause between (0.18 s for 900 pages as measured, in the library's
     worker).
  2. Headings are looked for in the page texts the reader already holds, in
     slices. If the reader is still reading the text, the panel says
     "Reading the PDF's text…" and waits.
  3. For the page in view: its positioned text is asked for once (about
     12 ms as measured, in the library's worker).
  4. The list that page cites is read when first needed: its pages one at a
     time with a pause after each. A 30-page bibliography is about 0.4 s
     during which the interface stays free; the status line says "Reading
     the reference list… 12 of 30 pages".
  5. Deciding runs in the logic worker.
  6. When the first row is shown, the vault's notes are looked through for
     `doi`, `title`, `year` and `author` in slices; the index follows the
     metadata cache's changes and the vault's renames and deletions while
     the view shows.
- **A change of page, PDF or tab while something is being read** drops it:
  each piece of work carries the number of the request it belongs to, as
  the reader's text indexing does.
- **Memory.** What was read of a PDF (links, lists, the last eight pages'
  citations) belongs to that PDF's reader and is freed with it. A test
  shows and hides the view fifty times and requires no timer or listener
  left behind.

## Tests

- **A survey first.** Before any constant is fixed, what the PDF library
  reports is recorded for 25–30 PDFs across those who make them
  (publishers' PDFs from several houses, Word, InDesign, LaTeX with and
  without links, a book with chapter lists, a scan with recognised text):
  kinds of destination, where landing points sit, headings, running heads.
  The window, the heading rule and the division rules are then set from
  that record, and whatever it does not support is cut from the first
  version. The record is kept as a results note. This needs PDFs that are
  not in the repository; see the third decision.
- **Proofs:** the laws above, their broken counterparts, and bridge tests of
  the compiled module.
- **Recognition, on what the PDF library reports.** For each fixture PDF,
  the positioned text and the link annotations with resolved destinations
  of the pages a test needs are frozen as JSON beside it (as
  `annotated-elsewhere.geometry.json` is), with the PDF library's version
  written in, by a support script that asks a running Obsidian and reports
  what differs from the frozen copy. Fixtures are papers written for the
  purpose, their sources in the repository, and freely licensed published
  papers if the owner agrees. At least: numbered with links, one and two
  columns; author–year with links, with two entries the text cannot tell
  apart; each of those with its links left out; raised numbers with links,
  with author affiliations and exponents on the page; letter labels; a
  mathematics page with intervals; a range with only its ends linked; a
  list per chapter; a list with a running head and a float on its page; a
  list followed by an appendix and a second list; a contents page linking
  to the references; a small-capitals heading; no heading; destinations
  without a point; a DOI broken across lines; accents written beside
  letters; a scan; no reference list; a right-to-left list (must be
  refused).
- **The view**, in the test DOM the sidebar's tests use: rows, order,
  counts, each status line, the form, holding, dropping stale work.
- **The note**, against the test vault: content, name, nothing overwritten,
  an existing note found by DOI and by title-year-author and not by title
  alone, a cut DOI not used, `cited-by` added once and compared by file,
  no note made without its box.
- **Cost:** the two tests named above; and that reading a long list gives
  the interface's thread back between pages.
- **By hand, in Obsidian:** the LaTeX papers of the test vault and the
  fixtures, on desktop and in the phone layout, with screenshots in
  `docs/dev/evidence/` and a results note.

## Not in this work

- Showing a reference when the pointer rests on a citation in the page.
- "Cited on pages 2, 5 and 9" for an entry (needs every page's text read).
- Raised numbers and round-bracket numbers without links.
- Citations in books (EPUB) and web pages.
- Looking anything up online; opening a DOI's address.
- A pattern for the note's name; a template for the note; citation keys and
  reference managers.

## What the critic found, and what changed

A subagent was given the first draft, the contributor rules and the code it
touches, and asked to find what would fail on real papers. It returned 24
findings. Three of its claims about the code were checked and hold (the
visible-line rule does not cover links, embeds or tags; the Annotations
view is brought to the front on selection; a Bend recursion over 8,000
steps exhausts the stack).

| Found | Changed |
| --- | --- |
| A link named a work through geometry and a weak check, outside the proved functions; a miss by one entry would pass a check on the year alone. | One rule ([Naming a work](#naming-a-work)): the text must fit; a link only decides among entries that fit, and only when the page's links have shown themselves right. `decide` and `trusted` are in Bend. |
| The claim that a wrong name-and-year proposal can only yield "not found" or "several" was false: `fits` took any four digits as a year, matched given names, and searched the whole entry. | Keys: surname position decided once per list, year only from the style's place, other authors only from the author part. The remaining weakness is stated, not denied. |
| In a PDF that links its citations, `[1, 2]` in a formula became two works. | Where a list is linked, only linked markers count; elsewhere a bracket after an identifier or "∈" is not a marker. |
| Raised numbers from text alone would list affiliations, exponents and isotopes. | Cut. The author's own probe (above) had shown the same from the other side. |
| A number without a link could name a work from another chapter's list. | `list_for`, in Bend, chooses a list only under stated conditions; the row says which list in plain sight; the remaining risk is stated. |
| "The marker is the text under the rectangle" cannot be computed: runs are merged. | Markers are found in the text first; links are attached by overlap, with a stated tolerance. |
| Headings: a running head made one list per page; a contents line was a list; small capitals, no-heading styles were missed; the fallback depended on the page in view. | A heading counts only if entries follow; consecutive candidates merge; spacing and case set aside; the fallback uses all pages' links. |
| Running heads on short lists, floats, line numbers and trailing sections got into entries; loss at the tail was invisible; lists that continue numbering failed; one status wording was untrue. | Lines compared with neighbouring pages; lines outside the columns or size dropped; sequences `m…n`; "read up to 37, this page cites up to 52"; the wording fixed. |
| Division gave up on columns out of order though positions are known; bare and flush-right labels, dash entries and collation were missed; landing points changed the division as pages were read. | Columns are sorted; those label forms are read; dash entries take the author before; collation; landing points come from all pages before dividing. |
| A DOI broken across lines became a wrong DOI, then a wrong "existing note". The sample note had a DOI its entry does not print. | A DOI at a line end is marked, shown, and never a key. The sample is corrected. |
| A title-only match would take a topic note ("Deep Learning") for the work's note, block **Make a note** and offer to write into it. | Only a whole DOI, or title and year and first author together, is "the note". A title alone is "Possibly: …" and blocks nothing. `same_work` is in Bend. |
| Making a reference note silently made the source's annotation note; the body's "Cited in" line went stale; links were hand-built strings. | A visible ticked box, with the PDF itself as the other target; no body line; links from Obsidian's own link text, compared by file. What Obsidian rewrites in properties is stated. |
| The visible-line rule cited for safety does not stop `![](https://…)`, `[[`, `#tag`. | No word from the PDF is written as Markdown at all: properties only, with the exact entry in `reference`. |
| Laws: `part_literal`, `admit_sound` and `choose` were vacuous; `scan_print` missed the property that matters; `split` laws contradicted each other and the 14-line cut; `sequence` had no outcome for disorder; `name_safe` missed trailing dots, reserved names and bytes. A scan over a whole page would not survive the stack, and Bend's character positions are not JavaScript's. | The table was redrawn: vacuous laws dropped; `items` works on one bracket's inside with `cite_items_written`; `split` has a lead; `sequence` has three outcomes; `name` is tightened; positions stay in TypeScript; a timing check comes before the scope is fixed. |
| An open form was lost when the page changed; the list changed under the pointer. | Holding: Hold toggle, open form, focus, pointer. Drafts kept. |
| Sharing the Annotations view's tab group had the very problem given against a third tab. Rows as buttons held buttons. Tooltips and hover do nothing on touch. Phones were not designed. | Its own split under Annotations. Rows are list items; the entry opens with a disclosure button; how a row was matched is small print; the drawer closes before a flash; phones are in the hand tests. |
| Clicking a row flashed what the reader had just read; Create took the reader away from the paper; going to an entry lost it among twenty. | Clicking opens the entry's text; Create stays; the entry is flashed and its row marked. |
| `names()` from `pdf-details.ts` mangles reference-list authors; shape 4 broke at an initial; "the last year" picked access dates; old-font accents were frozen into names. | A splitter for reference lists; shapes corrected; the year from the shape; one stated repair for accents. |
| Unmatched name-and-year guesses were shown as failures. Several forms were unspecified. | One foot line for them; "Not found" only for labels and linked markers; the forms are in the table. |
| Cost: a docked view is open for every PDF; all lists were read on opening; the vault listener ran while hidden and missed renames; caches outlived the PDF; the spy test was brittle. | Stated plainly; lists read when needed; listener only while showing, with rename and delete; caches owned by the PDF's reader; the tests reworded, and a leak test added. |
| Every "could not" left the reader with nothing to do. | **Make a reference note from the selection.** |
| Five PDFs from two programs carried every constant; frozen JSON pins one version of the PDF library. | The survey comes first and sets the constants; fixtures carry the library's version and the freezing script reports differences. |
| Over-built: the name-pattern setting, DOI menu items, a 50-page cache, the `order_free` law. | Cut. |

Not taken:

- *Cut division by layout and the alphabetical check from the first
  version.* Without it an author–year list that has no links cannot be
  read at all, and author–year papers are half of what was asked for. It
  stays, behind its check, and the survey decides its constants.
- *Cut the folder setting.* One setting stays: many readers keep reference
  notes apart from where new notes go by default.
- *Cut the non-English headings.* A shorter list stays; each word has a
  test of the matcher, and reading the list under it does not depend on
  language.
- *Use hyperref's destination names (`cite.<key>`) to identify entries.*
  A name says a link is a citation, not where its entry begins; and only
  one program writes such names. Under the one rule a link's part is small
  enough that this is not needed. The survey records the names in case it
  shows otherwise.
- *List every visible page under sub-headings.* Hold answers the same
  need with less.

## Decisions needed from the owner

1. **Where it lives.** Recommended: a view of its own, opened in a split
   under the Annotations view. The other choice is a third tab inside the
   Annotations sidebar (found without a command, but it shares that row's
   search, filters and counts, and every highlight would move the reader
   off it).
2. **What `cited-by` links to.** Recommended: the citing source's
   annotation note, made on **Create** if missing and its box is ticked
   (ticked by default), else the PDF file. The other choices: always the
   PDF file (never makes a second note; sources outside the vault get no
   link), or never offer to make the annotation note.
3. **PDFs for the survey and the fixtures.** The repository has no paper
   among its fixtures. Recommended: allow downloading 25–30 open-access
   PDFs for the survey (kept out of the repository; only the record of
   what the library reports is committed), write the fixture papers
   ourselves with Typst (already installed; sources committed), and commit
   three or four published papers under CC BY as real-world fixtures, each
   with its attribution. The lesser choice: no downloads; survey only the
   PDFs already in the test vault and self-made ones, and say in the
   results that publishers' PDFs were not tried.
4. **How much goes into Bend.** Recommended: the table above (the inside of
   a bracket, fitting, the one rule, trusting links, choosing a list, the
   label sequence, splitting, the page's order, the note's name, same-work
   and `cited-by`), with reading keys out of entries, geometry and the
   patterns over running text in TypeScript under tests, for the reasons
   given. If keys should be in Bend as well (tokens to surnames and years),
   that is perhaps a third more proof work and still leaves "where the
   style puts the year" unproved.
