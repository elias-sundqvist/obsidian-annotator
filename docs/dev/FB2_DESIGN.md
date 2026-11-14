# FictionBook (FB2) in the book reader: investigation and design

Written 2026-11-14 for issue 263 ("Ability to watch fb2/fb3 files", 2022,
"and maybe MOBI later"), which [ISSUE_PLAN.md](ISSUE_PLAN.md) had as "decline
or defer: convert to EPUB with Calibre".

**Recommendation: build it.** An FB2 file can be turned into exactly what the
book reader already consumes, at one call, and everything after that call
(reading controls, contents, find, highlights, notes, picture notes, reading
position) works unchanged. A prototype on this branch does it; section 9 says
what it does and what was tried. The stored note format is not touched.

## 1. The format as it is found

### What was read

- The schema: [FictionBook.xsd](https://github.com/gribuser/fb2/blob/master/FictionBook.xsd)
  in the format author's repository (target namespace
  `http://www.gribuser.ru/xml/fictionbook/2.0`), and its per-element
  documentation at [data2type](https://repository.data2type.de/FictionBook/v_2.1/html/el.FictionBook.html).
- Descriptions: [MobileRead wiki, FB2](https://wiki.mobileread.com/wiki/FB2),
  [Wikipedia, FictionBook](https://en.wikipedia.org/wiki/FictionBook).
- Two readers' source, for how they treat files that do not follow the schema:
  [foliate-js `fb2.js`](https://github.com/johnfactotum/foliate-js/blob/main/fb2.js)
  (the JavaScript reader most FB2-capable web readers are built on) and
  [pandoc's FB2 reader](https://github.com/jgm/pandoc/blob/main/src/Text/Pandoc/Readers/FB2.hs).
- FB3: the [gribuser/fb3](https://github.com/gribuser/fb3) repository and the
  [FB3 Perl module](https://metacpan.org/pod/FB3).
- Two real books, fetched as test material and kept outside the repository
  (public-domain texts from the Lib.ru classics library, `az.lib.ru`):
  Chekhov, *The Lady with the Dog* (a 124 KB `.fb2` inside a 37 KB `.fb2.zip`,
  7 sections) and Tolstoy, *War and Peace*, volume 1 (1.31 MB, 74 sections,
  3,520 paragraphs, links to web addresses).

What is said below about files "in the wild" beyond those two books comes from
the schema, the two readers' source and the descriptions, not from a corpus.
Both sample books come from one generator, are UTF-8, flat (no section inside
a section) and hold no pictures or notes. **A corpus of a few hundred real
files was not examined; that is the largest gap in this investigation**
(section 7 prices it).

### Structure

One XML file. The root `FictionBook` holds, in order:

| Part | What it is |
| --- | --- |
| `stylesheet` (0..n) | CSS that almost no reader honours. Ignored here. |
| `description` | `title-info` (genre, author, `book-title`, `annotation`, `coverpage` with `image`s, `lang`, translator, sequence), `document-info` (who made the file, `program-used`, `date`, `src-url`, **`id`**, `version`, `history`), optional `publish-info` (publisher, year, `isbn`) and `custom-info`. |
| `body` | The text: optional `image`, `title`, `epigraph`s, then `section`s. |
| a second `body name="notes"` | Footnotes: one `section id="…"` per note, its `title` the note's number. The schema allows one; real files also have `name="comments"` and unnamed extra bodies. |
| `binary id="…" content-type="…"` (0..n) | Pictures, base64 text. Referenced as `#id`. |

A `section` has an optional `title`, `epigraph`s, `image`, `annotation`, and
then **either** sections **or** content, never both (the schema makes it a
choice). So a book is a tree whose inner nodes carry only headings and whose
leaves carry the text. Content is `p`, `poem` (`title`, `epigraph`, `stanza`
of `v` lines, `text-author`, `date`), `subtitle`, `cite` (with `text-author`),
`empty-line`, `table` (`tr` of `th`/`td` with `colspan`, `rowspan`, `align`,
`valign`) and block `image`. Inside a paragraph: `strong`, `emphasis`,
`strikethrough`, `sub`, `sup`, `code`, `style name="…"`, inline `image`, and
`a` with `xlink:href` (and `type="note"` for a footnote reference). An `id`
may sit on `section`, `p`, `v`, `subtitle`, `text-author`, `poem`, `cite`,
`epigraph`, `annotation`, `table`, `td`, `th`, block `image` and `binary`.

What real files do that the schema does not say, as the two readers handle it:

- The namespace is `…/fictionbook/2.0` in the schema; both sample books say
  `…/fictionbook/2.1`. Readers match elements by local name and ignore the
  namespace. The XLink prefix is `l:` in most files, `xlink:` in others.
- `binary` content types lie (`image/jpg`; a PNG declared as JPEG). Readers go
  by the bytes or pass the type through.
- Files that are not well-formed XML exist (a bare `&`, `&nbsp;`, control
  characters, an unclosed tag). foliate-js does not check and shows an empty
  book; pandoc stops with an error. How common they are was not measured.
- Text written straight into a `section`, paragraphs mixed with sections,
  links inside links, elements borrowed from HTML.

### Encodings

The encoding is declared in the XML declaration (`<?xml version="1.0"
encoding="windows-1251"?>`) or by a byte order mark; with neither, XML means
UTF-8. Russian files made before about 2010 are commonly `windows-1251`;
`koi8-r` and UTF-16 occur. foliate-js decodes as UTF-8, reads the declared
encoding and decodes again. The platform's `TextDecoder` knows every label a
FictionBook is written in: `windows-1251`, `koi8-r`, `koi8-u`, `ibm866`,
`iso-8859-5`, `windows-1252`, `utf-16le/be` (checked in Node 26; these are
required labels of the WHATWG Encoding Standard, which Chromium 91 and iOS
Safari 15, the oldest the plugin supports, implement). **No decoding library
is needed.**

### `.fb2.zip`

Nothing inside an FB2 is compressed, so libraries serve it zipped: one `.fb2`
in a zip, named `book.fb2.zip` (also `.fbz`). Every FB2 reader opens these.
The Lib.ru download of both sample books is a `.fb2.zip`. The plugin already
bundles an unzipper (`jszip`, loaded when a book is opened).

### FB3

FB3 is a different format, not a newer FB2: a zip package in the manner of
Office Open XML (the repository carries `opc-contentTypes.xsd`,
`opc-relationships.xsd`), with the text in `fb3/body.xml`, the description in
`fb3/description.xml`, pictures as files, and relationships resolving
references. Its body markup is close to FB2's with lists, `div`s and notes
added. It is LitRes's format (announced 2017). Wikipedia states that as of
August 2025 the public specification had not moved since its 2008 beta and
that no popular reader supports it; nothing found in this investigation
contradicts that. See section 8.

## 2. Where FB2 enters the reader

### The seam

`src/epub-book.ts` defines `Publication`: `chapters` (`idref`, `href`, `path`,
`title`, `linear`), `nav`, `title`, `language`, `pageDirection`,
`identifiers`, `legacyIdentifier`, `hash`, `text(path)` giving a chapter's
HTML, `image(path)` giving a picture's bytes, optional `font(path)`.
`openPublication(bytes, doc)` builds one from an EPUB. Everything else
consumes only that interface:

- `publicationSections` and `EpubResolver` (`src/epub-resolver.ts`): parse
  each chapter with `inertHtml`, give it its identity, anchor annotations.
- `EpubView` (`src/epub.ts`): `mountChapter` copies a parsed chapter into the
  page through `projectHtml` (`src/dom-source.ts`), which asks `book.image`
  for pictures and hands links back; `openContents` reads `nav`; `matches`
  (find), `capture`/`payload` (highlights), `startFigure` (picture notes),
  `updateProgress` read the parsed chapters.
- `applyPublisherStyles` (`src/publisher-styles.ts`): reads the stylesheets a
  chapter links, through `book.text`.

So the smallest seam is the one call in `EpubView.onLoadFile` that makes the
`Publication`. An FB2 converter is a second function with the same result
type, `openFictionBook(bytes, doc): Promise<Publication>`
(`src/fb2-book.ts`), chosen by the file's name. In the prototype the change to
`src/epub.ts` is that choice and nothing else.

### What assumes EPUB, and what becomes of it

| Assumption | Where | For FB2 |
| --- | --- | --- |
| The file is a zip with `META-INF/container.xml`, an OPF package, a manifest and a spine | `openPublication` | Not called. `openFictionBook` reads one XML file (unzipping first if the bytes begin `PK`). |
| DRM and font obfuscation (`rights.xml`, `encryption.xml`, `fontKey`) | `openPublication` | FB2 has neither. `font` is left out; `Publication.font` is already optional. |
| A chapter is a resource with a path inside the archive; pictures and stylesheets are found by resolving relative paths | `archivePath`, used by `mountChapter` (pictures, links), `EpubResolver.pictureSource`, `applyPublisherStyles` | Kept, with made-up paths: chapters are `s3-2.xhtml`, pictures `images/<binary id>`, the built-in stylesheet `fb2.css`. `archivePath` works on any such path. |
| A chapter's address in an annotation is `…?loc=<manifest href>` | `chapterUri` | The made-up `href` (`s3-2.xhtml`). Section 3. |
| A chapter's identity is `dc.identifier` = manifest id, `dc.relation.ispartof` = the first `dc:identifier` of the package | `epubDC` (`src/compat/epub-identity.js`), called by `publicationSections` with `chapter.idref` and `book.legacyIdentifier` | `idref` is the section's address (`s3-2`), `legacyIdentifier` the FB2's `document-info/id`. `epubDC` adds them to any parsed chapter that has a `head`; nothing in it is EPUB-specific. |
| Which chapter an annotation belongs to | `epubCandidates`, `EpubResolver.locate` | Unchanged: same fields, same rules. |
| The contents come from a nav document or an NCX | `openPublication` | Built from the section tree. |
| Chapters outside the spine are `linear: false` and reached only by links | `openPublication`, `EpubView.readingOrder` | Used as is for the notes body. |
| Fixed-layout pages, spreads, SVG spine items, vertical writing | `epub-layout.ts`, `epub-svg.ts`, `fixedSpreads`, `chapterWritingMode` | Never triggered: FB2 chapters have no `viewport`, no `mediaType`, and the built-in stylesheet sets no writing mode. |
| Publisher CSS, checked and applied to the copy | `applyPublisherStyles` | Used to carry the built-in FB2 stylesheet (section 4). |
| CFI-compatible positions for notes Annotator 0.2 wrote | the frozen epub.js modules under `test/compat`, `chapterUri`'s host-specific base | Nothing to honour: 0.2 never opened an FB2, so no note anywhere holds an FB2 position. New notes use the same selectors as EPUB notes. |
| The words "EPUB" in the interface | `EpubView.buildToolbar` (`aria-label`s), `onLoadFile` ("Opening EPUB…"), `KIND_LABEL` in `src/library.ts`, command and setting names in `src/main.ts` | Wording work, listed in section 7. The prototype changes only the opening message. |
| The stored extras of a picture note are under `nativeEpub` | `figureOf` (`src/area.ts`), `saveFigure` (`src/main.ts`) | Kept under that name. It is the book reader's key in the stored format, which does not change. |
| A remote book is a PDF or an EPUB | `remoteKind`, `validateRemote` (`src/remote-source.ts`), `downloadSource` | Not extended: an FB2 is annotated from a file in the vault. A decision (section 10). |

### How a kind is decided today

By the view Obsidian opens for the file. `main.ts` registers one book view
(`registerView(EPUB_VIEW, …)`) and one extension
(`registerExtensions(['epub'], EPUB_VIEW)`); PDFs are Obsidian's own view;
`bindSources` binds every open `pdf`, `EPUB_VIEW`, `markdown` and `webviewer`
leaf. `annotation-target-type` matters only for `video` and for remote
addresses (`remoteKind`). An annotation note's local target is opened with
`leaf.openFile(source)`, so the registered extension decides. The file menu's
**Annotate** tests `/^(pdf|epub)$/` on the extension.

## 3. Anchoring, storage and identity

### What is stored

Exactly what is stored for an EPUB passage, by the same code
(`EpubView.payload`, `describeHtml` in `src/html-selectors.ts`,
`EpubResolver.identity`):

```json
{
  "uri": "app://obsidian.md/index.html?loc=s7.xhtml",
  "document": {
    "title": ["Война и мир. Том 1"],
    "dc": { "identifier": ["s7"], "relation.ispartof": ["samlib67b2fbf2c29910.96013760"] },
    "documentFingerprint": "urn:x-dc:samlib67b2fbf2c29910.96013760/s7",
    "link": [{ "href": "…?loc=s7.xhtml" }, { "href": "urn:x-dc:…/s7" }, { "href": "urn:sha256:30cf3b7d…" }]
  },
  "target": [{ "source": "…?loc=s7.xhtml", "selector": [
    { "type": "RangeSelector", "startContainer": "/p[4]", "startOffset": 12, "endContainer": "/p[4]", "endOffset": 61 },
    { "type": "TextPositionSelector", "start": 1840, "end": 1889 },
    { "type": "TextQuoteSelector", "exact": "…", "prefix": "…", "suffix": "…" }
  ]}]
}
```

A picture note stores a `CssSelector` path and `nativeEpub.src`
(`images/<binary id>`), as for an EPUB. No new field, no new selector type, no
change to `proofs/`.

### What the anchor depends on, and the two rules that fix it

For an EPUB the chapter's HTML is the publisher's. For an FB2 the reader
writes it, so **the converter's output is part of the anchoring**: the
chapter an annotation is in, and the text the selectors count through. Two
rules fix both, and they are the part of this design that cannot be changed
after a release without weakening notes already made.

**Rule 1: a chapter is a section that has no sections inside it.** Chapters
are those leaves, in the book's order. What a section says before its first
inner section (title, epigraph, picture, annotation) opens the chapter of the
first leaf inside it, so no text is without a chapter. A chapter's address is
the path of section numbers down to it: `s3-2` is the second section of the
third section of the first body. Each body after the first (notes, comments)
is one chapter, `body2`, `body3`, outside the reading order.

Why leaves and not top-level sections (what foliate-js does): files nest
differently for the same book (chapters at the top; parts holding chapters; one
section wrapping everything), and the leaf is the unit the book's maker
marked as "text starts here" in all of them. Top-level sections make a book
with one wrapping section a single chapter of a megabyte, which the reader's
page layout handles slowly.

One guard: a book with more than 2,000 leaves (the reader's existing limit on
a spine) is read by its top-level sections instead, with inner sections laid
out inside them; still more than 2,000, and it is refused with a message.

**Rule 2: a chapter's text is the book's text, character for character.**
The text an annotation is anchored in is the text of every FB2 text node
that sits inside a paragraph-level element (`p`, `v`, `subtitle`,
`text-author`, a title's line, a table cell), in document order, unaltered.
The converter adds only: one line break after each paragraph, heading, verse
line and table row, and one tab after each table cell (so a quote that runs
over two paragraphs reads as two). White space between blocks, which is how
the file happens to be indented, is not text. Words written straight into a
section (invalid, but found) become a paragraph; an element the format does
not name is read through and its words kept in place. **No text of a body is
dropped, reordered or rewritten.** Attribute text (a picture's `alt` and
`title`) is not chapter text.

Consequences:

- Re-indenting or pretty-printing a file between blocks moves nothing.
- A later version of the converter may change tags and classes (how a poem is
  set), which changes `RangeSelector` paths; `resolveHtml` then falls to the
  position, and then to the quote with its context, both of which depend only
  on rule 2. Changing rule 2 itself would leave only the quote.
- Rule 1 decides the chapter. If a new edition of the file adds or removes a
  section, the address shifts and `EpubResolver.locate` does what it does for
  an EPUB whose files were renamed: a passage that is in the book exactly once
  is found by its quote ("Recovered unique passage"); one that occurs more
  than once is kept and reported, never guessed.

Both rules are pure functions of the parsed file and can be stated as laws:
*text conservation* (the concatenated text of the chapters of a body, less
the added separators, equals the concatenated paragraph-level text of the
body) and *address is a bijection* (every leaf has one address and each
address names one leaf). The prototype has them in TypeScript with tests,
including a generated-book test of conservation. Section 7 counts moving the
planning (the tree walk that assigns leaves, heads and addresses) into
`proofs/` with those two laws; the escaping and DOM walking around it are not
law-shaped and stay TypeScript.

### The book's identity

`document-info/id` is FB2's own answer: the schema requires it, and it names
*this FB2 document* (one person's or one library's making of the book), with
`version` counting its revisions. It becomes `legacyIdentifier` and the one
entry of `identifiers`, and so `dc.relation.ispartof` in every annotation.
With it:

- **The same document downloaded again** has the same id. Annotations are
  found by chapter address and verified by text. Both sample books were
  downloaded twice and were byte-identical.
- **A newer version of the same document** (same id, `version` raised, typos
  fixed): chapter by address, passage verified; where the text around it
  changed, by the reader's existing fallbacks. The file's hash differs, which
  the reader reports as a different revision, not as a different book.
- **Zipped or not**: the hash is taken of the `.fb2` bytes, not of the zip, so
  `book.fb2` and `book.fb2.zip` are the same revision.
- **A different FB2 of the same work** (another library's file, another id):
  by the reader's standing rule ("explicit book association supplies scope,
  never title/author similarity", `EpubResolver.locate`) this is a different
  publication, and the annotations are kept and shown in the list as "Different
  publication identity; annotation retained", not painted. This is what
  happens today with two EPUB editions of one book. For FB2 it will be met
  more often, because the same novel circulates as many independent files. It
  is the owner's decision whether to add a way to say "these notes are for
  this book too" (section 10); the design does not guess from title and
  author.
- **No id, or an empty one** (invalid, found): there is no publication
  identity, as for an EPUB without an identifier. `epubCandidates` then
  matches by chapter address alone and every passage is still verified by its
  text.

An id shared by two different books (a tool's default) does no harm: a note
is tied to its book by the note's `annotation-target`, and identity is only
ever a reason to refuse, never to adopt.

## 4. What does not carry over, or needs deciding

**Styling: poems, epigraphs, citations, titles.** `projectHtml` deliberately
copies no classes from a book into Obsidian's page, so a class in the
converter's HTML cannot be styled from `styles.css`. The channel that exists
is the publisher's stylesheet: `applyPublisherStyles` evaluates a chapter's
linked CSS against the inert parsed chapter and applies a checked set of
properties to the copy. The converter therefore links one built-in sheet
(`fb2.css`, served by `book.text`) from every chapter, written within that
set and saying nothing of colour or typeface: titles centred, epigraphs set
in from the start, verse lines with a hanging indent, stanzas apart,
`text-author` at the end, note references small and raised. The theme's
colours and the reader's Typeface, Line spacing, Width and Justify apply over
it as over any publisher's sheet. Not done by this route: tuning from a CSS
snippet (`--annotator-*` variables for, say, the epigraph's inset). That
needs a small reader change (a marked part name copied through `projectHtml`)
and belongs to the full build, with a line in `docs/STYLING.md`.

**Footnotes.** A reference becomes a link to `body2.xhtml#n1`. The reader's
existing link handling (`mountChapter`'s `link`) goes to the note, shown
alone because the notes chapter is `linear: false`, and **Back** in the bar
returns. So "jump and back" needs no new interface, and a note's own text can
be highlighted. A pop-up over the reference is nicer for reading and is new
interface (a card in Obsidian's menu style, like the contents list); it would
serve EPUB footnotes (`epub:type="noteref"`) equally. Proposed: ship jump and
back, add the pop-up afterwards for both formats.

**Cover and pictures.** The first `coverpage` image that resolves becomes a
first chapter, "Cover". Block and inline `image`s become `img` with paths
`images/<binary id>`; the bytes are decoded from base64 when a chapter is
shown, checked by how they begin (PNG, JPEG, GIF, WebP; SVG made passive as
for EPUB), 12 MiB each as for EPUB. A reference with no binary shows the
reader's "[Image unavailable]". A web address is never fetched. Picture notes
work as in an EPUB: the binary's id is the picture's file name. The book's
`annotation` (its blurb in the description) is not shown; it is metadata, as
an EPUB's `dc:description` is.

**Tables.** `table`, `tr`, `th`, `td` with `colspan`/`rowspan` are HTML
tables; `align` is honoured, `valign` and `style` are not. Text in cells is
highlighted like any text.

**Several bodies.** The first is the book. Every later one is a chapter
outside the reading order, listed at the end of the contents under its own
title, else its `name` ("Notes", "Comments").

**Right-to-left.** The book's `lang` (`ar`, `he`, `fa`, `ur`, `yi`, …) puts
`dir="rtl"` on each chapter; `EpubView.rtlPages` then turns pages the right
way. Per-element `xml:lang` is not carried in the prototype; it should be
(one attribute).

**Very large books.** Limits, in the reader's existing manner: 64 MiB of
`.fb2` (the EPUB archive limit), 2,000 chapters, 32 MiB of chapter text
(`publicationSections`), 12 MiB a picture. The whole file is parsed at once,
and an FB2's pictures are text inside it, so opening holds the bytes, the
decoded string and the XML tree together: several times the file size for a
moment. Measured on the 1.31 MB sample: 194 ms to convert and 191 ms to index
in Node with jsdom. A picture-heavy 30 MB book on a phone is the case to
measure before release; if it is too heavy, binaries can be cut out of the
string before parsing (they cannot contain markup), which is an optimisation
to prove safe, not to assume.

**Malformed XML.** The converter is strict: a file that is not well-formed is
refused with the parser's message and a pointer to Calibre. A repair pass
(bare `&`, HTML's named entities, control characters) is possible and is the
first thing a corpus would tell us whether to build. It is not in the
estimate's core.

**Damaged or mislabelled encoding.** Bytes that do not fit the declared
encoding are shown as replacement characters; the encoding is never guessed.

**Opening `.fb2` files by default.** Today the plugin registers `epub` and
nothing else. Proposed: register `fb2` and `fbz` for the book view, each in
its own `try`. This matters: Obsidian's `registerExtensions` **throws** if
another plugin has the extension (read in the installed app's code:
"Attempting to register an existing file extension"), and at least four
community plugins read FB2 today (FB2 Reader, Book Reader, Qiaomu Reader,
Oxill Read Book). Unguarded, Annotator would fail to start beside any of
them. When the extension is taken, the book is still opened in Annotator from
the file menu's **Annotate** and from its annotation note, because both open
the book view by name. `.fb2.zip` cannot be registered at all (its extension
is `zip`), and is opened the same way. (The existing `epub` registration has
the same hazard beside another EPUB plugin; that is a separate fix.)

## 5. Phones and tablets, and what it costs everyone else

Nothing the converter uses is desktop-only: `DOMParser` for XML,
`TextDecoder` with legacy labels, `atob`, `crypto.subtle`, and the unzipper
already used for EPUB. The reader it feeds is the one that already runs on
phones and tablets. Not yet tried on a device or in the iOS Simulator
harness; memory on a phone with a large illustrated book is the open
question (section 4).

For a vault with no FB2 files:

- **Start-up**: two more `registerExtensions` calls. The converter is behind
  `await import('./fb2-book')` in `EpubView.onLoadFile`, as the unzipper is
  behind `import('jszip')`; none of its code runs until a FictionBook is
  opened.
- **Size**: `dist/main.js` grows from 1,391,638 to 1,405,843 bytes, +14.2 KB
  (1.0%), of which the converter is 12.2 KB minified.
- **Dependencies**: none added.
- **Behaviour**: `.fb2` and `.fbz` files, which Obsidian otherwise hands to
  the system, open in the reader.

## 6. Tests

Fixtures are written by hand in the tests as strings (as the EPUB tests build
their archives in code), so nothing with a licence enters the repository.

| Fixture | Covers |
| --- | --- |
| A nested book: body title and epigraph, a part holding chapters, a flat chapter, stray text in a section, an unknown element | Rules 1 and 2, contents, chapter names |
| The same book re-indented, and with a section added | Whitespace between blocks is not text; recovery by quote when addresses shift |
| The same text as `windows-1251`, `koi8-r`, UTF-16 with a byte order mark, UTF-8 with one, and with no declaration | Decoding |
| An unknown encoding label; bytes that do not fit the declared encoding | Refusal; replacement |
| `.fb2.zip` with one book, with a book and a cover file beside it, with two books, with none | Unzipping |
| A notes body, references with and without `type="note"`, a dangling reference, a web link, a link inside a link | Footnotes and links |
| Binaries: PNG, a JPEG declared as PNG, an id with spaces and Cyrillic, a missing one, base64 broken over lines, an oversized one, an SVG | Pictures |
| A cover; a book without one | Chapter order |
| Poem, epigraph, cite, subtitle, table with spans | Markup and the built-in stylesheet passing `applyPublisherStyles` |
| Malformed XML, an entity declaration, no body, no `FictionBook` | Refusals, each with its message |
| A book with `lang` `he` | Direction |
| 2,001 leaves under 3 top-level sections | The chapter guard |

Tests, by name (those marked ● are in the prototype, `test/fb2.test.mjs`):

- ● a FictionBook's chapters are its sections that hold no sections, in order, each with the headings of the sections around it
- ● a chapter's text is the book's text: nothing dropped, reordered or rewritten, however the file is indented
- ● generated books: the chapters' text together is the body's text (the conservation law, over random trees)
- ● the contents follow the section tree, and a chapter no section names is named by how it begins
- ● the declared encoding is read: windows-1251, koi8-r, UTF-16, a byte order mark; an unknown one is refused by name
- ● a zipped book opens as the book inside it and is the same revision as the bare file
- ● a footnote reference leads to its note in the notes body and Back returns; a dangling reference is not a link
- ● pictures are the book's binaries by id, known by their bytes; a missing or oversized one is unavailable, never fetched
- ● the cover is the first chapter where the book has one
- ● a highlight made in a FictionBook is stored as a book annotation, and is restored when the book is closed and opened again
- ● the same document in a new version keeps its highlights; with a section added they are found by their words; a different document's are kept and not painted
- ● a picture of a FictionBook can be kept with a note and is found again
- ● find, the chapter list and the reading position work on a FictionBook as on an EPUB
- ● files that are not FictionBooks are refused with a reason: malformed XML, entity declarations, no body
- ● the built-in stylesheet is applied by the publisher-style checker with nothing omitted
- ● a right-to-left book's chapters say so
- ● a book cut into more than 2,000 sections is read by its outermost sections
- ● the plugin starts when another plugin already opens `.fb2`, and opens a zipped book in the book view by name
- ○ every row of the fixture table not marked above (spans in tables, SVG binaries, nested links)
- ○ a live check in Obsidian on desktop, Android and iOS, with screenshots, as the EPUB results notes have
- ○ the iOS Simulator harness with an FB2 in its fixture vault
- ○ proofs: the two laws of section 3, with their negative controls

## 7. Estimate and recommendation

In the board's points (1 = an hour or two, 8 = several days), with the
prototype as the starting point:

| Part | Points | What |
| --- | --- | --- |
| Converter | 5 | Done in the prototype: planning, rendering, encodings, zip, pictures, links, cover, limits. Left: `xml:lang`, review against a corpus of real files (2 of the 5), and whatever the corpus shows. |
| The two rules in `proofs/` | 5 | The section-tree planning in Bend with the conservation and bijection laws, negative controls, the JavaScript wrapper. |
| Reader and plugin changes | 3 | Done: the one call, extension registration, opening by name, the library's kind. Left: wording ("EPUB" in labels, settings and commands where a FictionBook is on screen), a part name through `projectHtml` for theme-level styling and `STYLING.md`, the `epub` registration guard. |
| Tests and documentation | 5 | Done: the ● tests. Left: the ○ tests, README ("Books (EPUB and FB2)", limits), CHANGELOG, live checks on three platforms with evidence. |
| Optional, after a corpus: repair of malformed XML | 3 | |
| Optional, for both formats: footnote pop-up | 3 | |

About 18 points to a release-quality feature, of which roughly 8 are spent in
the prototype; 6 more for the two optional pieces.

**Build it**, as scoped: `.fb2`, `.fb2.zip`, `.fbz` from the vault; strict
XML; footnotes by jump and back. The alternative answer, "convert to EPUB
with Calibre", stays true and stays useful for FB3, MOBI and malformed files,
but it asks a reader with a shelf of FB2 files to convert each and to keep
two copies, and the conversion decides the chapter boundaries, so notes made
on the converted EPUB do not follow to another conversion. Reading the FB2
itself makes the notes belong to the file the reader actually has. The cost
to everyone else is 14 KB and no start-up work.

A reduced version (no zip, no notes body, no pictures) saves little: those
parts are small and already written. The part that could be dropped to save
real work is none of the format; it is the corpus review, and dropping it is
how a first release would meet files it refuses. Better to do it.

## 8. MOBI and FB3

**MOBI.** A different kind of job. A MOBI/AZW file is a Palm database of
compressed records (PalmDOC LZ77 or Huffman/CDIC), holding old-style HTML
with positions as byte offsets (`filepos`), or, in KF8/AZW3, a second
EPUB-like book packed into the same records; books bought from Amazon are
DRM-protected and cannot be read at all. Reading it means a binary parser and
two decompressors (foliate-js has them, MIT-licensed), a conversion whose
output is much less regular than FB2's, and an anchoring story for text that
has no sections to address. The seam is the same `Publication`, so it is
possible; it is several times the FB2 work for a format Amazon itself has
retired: its publishing service stopped taking MOBI for ordinary books on 1
August 2021 ([its help page](https://kdp.amazon.com/en_US/help/topic/GULSQMHU5MNH4EZM))
and Send to Kindle stopped accepting it at the end of 2023. The description
of the format here is from memory of its documentation, not from work done in
this investigation. Recommended answer: not planned; Calibre
converts unprotected MOBI to EPUB well.

**FB3.** A zip package with relationships, a body in a dialect of FB2 with
lists and blocks added, and pictures as files. The converter here could be
extended to it (another container reader, the body walk reused with more
element names): perhaps 5 points. But the public specification is a beta from
2008, the format is in practice one shop's, readers do not support it, and no
FB3 file was found to test with in this investigation. Recommended answer:
not planned until someone brings files; say so on the issue. The issue's
title asks for both; FB2 is the one people have shelves of.

## 9. The prototype

On this branch: `src/fb2-book.ts` (the converter, `openFictionBook`), the
one-call change in `EpubView.onLoadFile` (`src/epub.ts`), registration and
opening by name in `src/main.ts` (`openSourceFile`), the book kind in
`src/library.ts`, three helpers in `src/epub-book.ts` (`fictionBookName`;
`pictureMime` and `bounded` exported, behaviour unchanged),
`test/fb2.test.mjs` (the ● tests of section 6) and one test in
`test/plugin-boundary.test.mjs`. The stored note format, `proofs/` and the
frozen references are untouched.

**What it does.** Opens `.fb2`, `.fb2.zip` and `.fbz` in the book reader with
the book's own contents, cover, pictures, footnotes (jump and Back), poems,
epigraphs, citations and tables; find, highlights, notes, picture notes and
the reading position work as for an EPUB; a highlight is written to the
annotation note in the unchanged format and is found again after the book is
closed and reopened.

**What was run.**

- `npm run test:reader`: 611 tests pass (594 before, 16 in
  `test/fb2.test.mjs`, 1 in `test/plugin-boundary.test.mjs`).
  `npm run lint` and `npm run format:check` are clean.
- The two real books through the converter and the resolver in Node with
  jsdom: 7 and 74 chapters, contents of 6 and 73 entries, 67,726 and 726,747
  characters of chapter text.
- The built plugin (`dist/main.js`) in Chromium 156, in the repository's
  harness page (`test/support/ios`, served by `serve.mjs`; its stand-in for
  Obsidian, **not Obsidian**), with a vault outside the repository holding the
  two real books and a hand-made one (windows-1251, cover, two pictures, a
  poem, a table, two footnotes): each opened; the 1.31 MB book opened in
  214 ms; a highlight made from the selection bar was written to
  `Handmade.fb2.annotations.md` and, after the page was reloaded and the book
  reopened, was restored ("Highlight restored · Verified passage") at the
  remembered chapter; a footnote reference went to its note and Back
  returned; the `.fb2.zip` opened in the book view by name. The page ran in a
  pane that was not on screen, so animation frames were replaced by timers for
  the run. Screenshots: [evidence/fb2](evidence/fb2).

**What was not tried.**

- **Obsidian itself**, on any platform. The installed desktop app's
  command-line interface is switched off, and switching it on is the owner's
  setting to change. So untested in the real app: `registerExtensions` with
  `fb2`/`fbz`, a click on an `.fb2` in the file explorer, **Annotate** in the
  file menu, `setViewState` for a `.fb2.zip` and what a restored workspace
  does with it, the sidebar beside an FB2, a rename of the file.
- Phones and tablets, including the iOS Simulator harness.
- Pages layout, the reading controls, RTL page turns and the annotation
  sidebar with an FB2 on screen (they are the reader's own and are not
  format-specific, but were not looked at).
- A picture note end to end in a browser (it is covered in jsdom).
- Real files with pictures, footnotes, legacy encodings or nesting: both real
  books are flat UTF-8 text. Those features were exercised on hand-made files
  only.
- Memory and time on a large illustrated book.

## 10. Decisions for the owner

1. **Build it at all**, at about 10 more points (section 7).
2. **Open `.fb2`/`.fbz` in Annotator by default**, or only from **Annotate**
   and annotation notes. Proposed: by default, guarded.
3. **A different FB2 of the same book**: keep the strict rule (kept, not
   painted) or add an explicit "these notes are for this book too". Proposed:
   strict for the first release; the explicit command if people ask.
4. **Malformed files**: strict with a message (proposed), or a repair pass.
5. **Footnotes**: jump and back now, a pop-up later for both formats
   (proposed), or wait for the pop-up.
6. **Remote FB2 addresses** as `annotation-target`: not supported (proposed).
7. **The two rules of section 3 are the release's contract.** Leaf sections
   as chapters, and text character for character. They should be agreed
   before anything ships, because notes will depend on them.
8. **What to say on issue 263** about FB3 and MOBI (section 8).
