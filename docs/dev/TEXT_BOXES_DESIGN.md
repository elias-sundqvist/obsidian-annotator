# Typed text that stays on the PDF page: a design note

Written 2026-11-13, after 0.3.0, as a design. Built on 2026-11-15 on the branch
`feature/text-boxes`: section 12 at the end says what was built, where, and where it differs
from what follows. The request is todo
3.2 of [COMMUNITY_REVIEW.md](COMMUNITY_REVIEW.md) (board task `page-text-boxes`): place a
box anywhere on a page, type into it, and see the words on the page from then on. About
three people asked, 2024 to 2026.

Code is cited by file and function. "Unconfirmed" marks what was not checked in the code.
The sections already include the changes that the "Criticism" section at the end led to.

## 1. The smallest design

A kind is not stored in this code; it is read from the selectors (`annotationKind` in
`src/summary.ts`). A drawing is already "an area plus one thing": `drawingOf`
(`src/drawing.ts`) asks `areaOf` first, then looks for an `SvgSelector`. A text box can be
made the same way.

**(a) A new kind with a body of its own.** The words live in a new selector or field.
Annotator 0.2 and 0.3.0 would then show an empty area. `update` in `src/codec.ts` changes
only the comment and the tags, so editing the words needs a new checked writer for free
text inside the JSON. Search, the summary, per-annotation notes and the PDF export each
need a new field, the sidebar a new card. About twice the tests of (b).

**(b) An area whose note is also shown on the page.** The words are the note
(`annotation.text`). One new member says "show the note on the page, at this size". A tool
makes such an area and opens it for typing at once.

**Recommended: (b), offered as a tool of its own.** What handles a note or an area already
works: the card, search, tags, links, replies, the summary, moving, resizing, recolouring,
deleting with undo, and both older versions. It gives up a private comment beside the
words on one box (a reply serves) and rich text on the page.

## 2. Storage, in the unchanged format

Written as an area is (`saveArea` in `src/main.ts`), with one more top-level member, no
picture and no `words`:

```json
{ "target": [{ "source": "…", "selector": [{ "type": "FragmentSelector",
    "conformsTo": "http://www.w3.org/TR/media-frags/",
    "value": "page=3&xywh=percent:62,8.5,30,4" }] }],
  "nativePdf": { "version": 1, "page": 3 },
  "pageText": "medium" }
```

- The one selector is `areaSelector(area)` (`src/area.ts`). The words are the block's
  visible comment, the tags its tags line. `color` is written only for an ink other than
  the default, as today.
- `pageText` is `"small"`, `"medium"` or `"large"`. Absent or not a string: not shown on
  the page. Any other string reads as medium, so a later size does not break this version.
  The name is a proposal.
- It is top-level, beside `color`, because the one checked in-place writer there is
  (`Ink.set`, behind `recolor` in `src/codec.ts`) works on the top-level members. Toggling
  or resizing later is the same kind of write.
- It counts only where `areaOf` finds a region and `drawingOf` and `annotationQuote` find
  nothing: a new `textBoxOf` in TypeScript.

**No picture is saved.** Blank margin has nothing to show, a picture would repeat the
words, and fifty boxes would be fifty attachments. With no leading image, `ownPicture`
finds none, so moving or deleting touches no file.

**Annotator 0.2.** Its codec reads the block and keeps members it does not know. The test
"the original Annotator still reads a note that holds the kinds only this reader makes…"
(`test/anchoring-interoperability.test.mjs`) shows it for an area with `nativePdf` and
would get a text-box row. In the Markdown note the words are the block's comment. Where
the 0.2 sidebar lists an annotation with a selector but no quote is unconfirmed; a text
box is no different there from any 0.3.0 area.

**Annotator 0.3.0.** `areaOf` matches, so it is an area with a note: a frame in its ink
(`paintArea`), the note as tooltip, a card with the "Area" chip and the note, no picture.
Editing the note keeps the JSON bytes (`update`), moving rewrites one fragment
(`replaceFragment`), recolouring keeps other members (law `ink_write_preserves_others`).
Its PDF export writes a box with the words as a comment.

## 3. Drawing it on the page

`paintArea` (`src/native-pdf.ts`) already places a button in page percentages in
`.annotator-native-areas`, a layer that is not blended. For a text box it adds a class and
one child whose `textContent` is the page words. Nothing stored is used as markup.

- **Place.** The words start at the box's top corner on the reading side, inset a quarter
  of an em. At rest the frame is a thin rule on the leading edge in the ink, plus the
  corner tab areas have; the whole frame shows on hover and in hand.
- **Words longer than the box.** The box grows. The fragment fixes corner and width; its
  height is a minimum (`min-height`, `height: auto`), down to the foot of the page, where
  the rest is hidden. This is CSS only: looking at a page writes nothing and reads no
  position. Text is never shrunk. Wrapping is `pre-wrap` with `overflow-wrap: anywhere`;
  typed lines stay.
- **Font and size.** `--annotator-box-font`, by default the theme's `--font-text`. Small
  9, medium 12, large 18 PDF points: a fixed table, so the export matches. On screen
  `font-size` is the points times the viewer's `--scale-factor`, which `startDrawing`
  already reads (fallback 96/72), so the words follow zoom without a repaint. That
  Obsidian's viewer always sets it, on phones too, is unconfirmed.
- **Changing the size.** Three buttons in the typing strip, as the drawing strip has three
  pens; "Text size" in a saved box's menu and its card's menu, beside the inks. The last
  size is remembered, as `lastInk` is.
- **Colour and the six inks.** The words take the page's ink, not the annotation's: the
  default ink is yellow, and yellow words on white cannot be read. The ink colours the
  rule, tab and frame, as on an area.
- **Light, sepia, dark.** The words follow the page, not the app: a light page in a dark
  theme needs dark words. `PdfAppearance.mark` (`src/pdf-appearance.ts`) sets
  `data-annotator-page` to `dark` or `light` only, so sepia is not told apart. It would
  also publish the paper it set and a text colour for it, `--annotator-page-ground` and
  `--annotator-page-ink`. `--annotator-box-ground` and `--annotator-box-text` default to
  them and go into `docs/STYLING.md` and Style Settings.
- **Over the page's own content.** An opaque ground in the paper's colour: unseen on blank
  margin, readable over print. While a box is dragged or resized (`is-moving`) the ground
  is see-through, so the reader sees what it will cover. "Hide highlights" hides text
  boxes with the other areas.
- **Markdown.** The page shows plain words. A pure `pageWords(text)` drops a leading
  picture embed, shows a link as its label and removes emphasis marks, like `noteGist`
  (`src/ink.ts`) but keeping lines. The sidebar shows the full rendered note.
- **Right-to-left and CJK.** `dir="auto"` as on cards, with `unicode-bidi: plaintext` so
  each paragraph takes its own direction; CJK breaks by the browser's rules. No vertical
  text.

## 4. Making and editing

- **Tool.** "Type on the page", icon `type`, command `type-on-page`, added by `addAction`
  beside "Mark an area" and "Draw on the page" in the `NativePdf` constructor. No header
  button on a phone: the command starts it there. No default shortcut; like every command
  it can be given a hotkey.
- **Mode.** Modelled on `startArea`: a strip under the PDF toolbar (`placeHint`) with
  words, three sizes, six inks and Cancel; keys only while in front (`inFront`); one box
  per use; it ends area marking and drawing, and they end it.
- **Click or drag.** A click places a box at the pointer, 30% of the page wide and one
  line high, shifted left where it would leave the page. A drag gives corner and width; a
  slip of the hand counts as a click. Every rectangle comes from `fitArea` or `spanShift`.
- **Typing in place** (desktop, tablet). A plain `textarea` in the box's font and size,
  showing the note's source. `Ctrl/Cmd+Enter` or leaving keeps; `Escape` drops;
  composition keys are left to the input method. Nothing is written until words are kept,
  so an empty box leaves nothing.
- **The editor and repaints.** Each paint rebuilds the areas layer of a page that has an
  area, and the viewer empties a page it redraws (unconfirmed for Obsidian's build). So
  the editor is a layer of its own, named in `ownMutation` like `.annotator-drawing-live`.
  The mode holds its words and caret and puts them back; the saved box hides meanwhile, as
  `editingDrawing` does for a drawing.
- **Phone.** Typed in the existing sheet (`FloatingComposer`, `sheet: Platform.isPhone` in
  `syncComposer`), headed "Text · page N"; the box shows the draft. On any device the
  card's Edit opens the usual note editor for links, tags and ink, the same way.
- **Keeping.** New: one `createMany`. Changed: `update` (comment only) and, if the
  measured height changed, `replaceFragment`, in one rewrite as `moveArea` does. A notice
  says when words run past the page's foot.
- **Moving, resizing, opening.** `areaHandles` unchanged: grips, arrows, `Shift`+arrows,
  `Alt` for fine steps, all through the proved `moveArea` and `resizeArea`. Narrowing
  reflows the words. A click selects box and card; `Enter` on the focused box, or a
  double-click, opens it for typing, as for a saved drawing.
- **Deleting and undo.** The card's Delete and its Undo notice, unchanged. A box kept with
  no words is deleted the same way, as a drawing with no strokes is (`changeDrawing`). In
  the editor, the browser's undo. A move has no undo, as for areas (unconfirmed that none
  exists).
- **Touch, pen, keyboard only.** A tap or pen tap places a box; in the mode a finger does
  not scroll the page (`touch-action: none`, as in area mode). Without a pointer, `Enter`
  places a box in the middle of the page being read, arrows move it, `Shift`+arrows size
  it, and `Enter` starts typing.
- **Any area.** An area's card menu gets "Show note on the page". It turns an area that
  0.3.0 took in from a PDF's text box into one, and back.

## 5. Sidebar, search, tags, links, exports

- **Card.** The area chip (`annotator-card-area` in `src/sidebar.ts`) with icon `type` and
  label "Text", then the rendered note and tags. No picture.
- **Order and tabs.** As an area: on its page by its top edge (`place` in
  `src/native-pdf.ts`), under Annotations (`regionNote`).
- **Search and tags.** The words are the note, so `text:` and plain search find them.
  `quote:` does not: there is no quote and no `areaWords` (`src/annotation-search.ts`).
  Tags are unchanged.
- **Links.** "Copy annotation link" and `[[note#^id]]` are unchanged; `land` scrolls to
  and flashes any mark that carries the id.
- **Summary and Markdown.** `annotationKind` gains `'text'`, labelled "Text". A callout
  reads "Text, Page 3" with the words as its body. `{{kind}}` is "Text", `{{image}}` and
  `{{quote}}` are empty, `{{note}}` is the words. Per-annotation notes
  (`src/annotation-notes.ts`) follow.

## 6. PDF export and taking in

**Today.** `planExport` (`src/pdf-export.ts`) writes every area as `kind: 'square'`.
`noteObjects` (`src/pdf-write.ts`) knows highlight, square, text (a sticky note) and ink:
FreeText is written nowhere. `describeAnnotation` (`src/pdf-read.ts`) reads a FreeText's
`Rect`, `C`, `Contents`, author and date, not its default appearance. `planImport`
(`src/pdf-import.ts`) makes it an area in its last branch, and `importPdfAnnotations`
gives it a picture where its page is on screen.

**Writing** a new `FreeTextNote`:

- `/Subtype /FreeText`; `/Rect` from the region by `pagePoint`, grown down if the lines
  need it; `/Contents` the page words alone; `/DA (/Helv 12 Tf 0 g)`; border width 0; no
  `/C`, which other programs take as a FreeText's fill.
- An appearance stream: white ground, the rule in the ink's `LINE_RGB`, the lines in
  Helvetica (a standard font, nothing embedded), clipped to the box and filled by
  Helvetica's widths (section 7). On a turned page the form's matrix sets the words
  upright.
- Bodies are written as ASCII, so letters above it go as WinAnsi escapes. Words outside
  WinAnsi (CJK, Arabic, Cyrillic, emoji) go out as today, a box with a comment, and the
  export's notice says how many.
- Readers that draw the appearance stream show the words as written; one that rebuilds it
  uses its own font and breaks. How other programs behave is unconfirmed, as is which two
  readers the export tests use.
- Lost on the way out: the theme's font and the screen's line breaks; the ink, except as
  the rule; tags and replies (kept in the notes); Markdown.

**Taking in.** A FreeText becomes a text box: region from `Rect`, `Contents` as the note,
`pageText` the size nearest the font size in `/DA` (medium where none), no picture.

- A one-line box can be thinner than `AREA_LEAST`; `fitArea` then gives nothing and
  today's code makes a spot. It is widened instead (section 7).
- Ink: nearest to the text colour where it has one; the default for black, grey or white.
  `C` is no longer used for these.
- Lost on the way in: font, exact size, alignment, rich text, rotation, callout lines,
  border, fill.
- The PDF's own copy stays under ours, as the README says; the opaque ground covers it
  where the rectangles agree.
- What 0.3.0 took in as an area stays one: its key is known, so it is not taken again. The
  README's table row for text boxes changes.

## 7. Pure logic and its laws

A new `proofs/pagetext.bend`, laws in `LAWS.bend`, proofs in `PROOF.bend`:

- `Size` with `key`, a total `parse` and `points`: `pagetext_key_roundtrip`.
- `get`, `set`, `clear` over the JSON members, shaped like `Ink.get` and `Ink.set`:
  `pagetext_read_after_write`, `pagetext_read_after_clear` (also with duplicate members),
  `pagetext_write_preserves_others`, `pagetext_clear_preserves_others`,
  `pagetext_last_write_wins`, and with ink both ways, `pagetext_keeps_ink` and
  `ink_keeps_pagetext`.
- `fill(room, widths)`, lines of words of known widths for the exported appearance:
  `fill_keeps_words` (the lines joined are the words in order), `fill_fits` (a line is
  within the room or is one word), `fill_no_empty_line`.
- `Area.widen(full, least, span)`, a span at least `least` long around a short one:
  `area_widen_within`, `area_widen_roomy`, `area_widen_holds`. `drawingArea` does this by
  hand today and could use it.

Reused unchanged: `Area.fit`, `Area.move`, `Area.resize` and their laws. Click placement
is `Area.later` through `spanShift`; growing down is `Area.resize` with `Down`.

In TypeScript, and why: painting, pointers, keys and the editor (the DOM); the measured
height (layout is the browser's); `pageWords` (it decides nothing stored; tested);
printing and reading the fragment (`src/area.ts` already); reading `/DA` and writing PDF
bytes (tested by reading back); the Helvetica width table (data).

No fast path: the member changes only through the checked `set` and `clear`, never by
splicing the JSON string, and pages with text boxes get no paint cache of their own.

## 8. Cost

**No text boxes.** No listeners (the mode adds them on start and removes them on stop, as
`startArea` does), no layer, no style read, no timer. `textBoxOf` runs only in
`paintArea`, so only for areas. Everyone gets one header button (not on phones), one
command, about twenty CSS rules, a small Bend module in the bundle (size unconfirmed), and
two custom properties set when the page appearance changes.

**Fifty on a page.** Each paint of that page rebuilds its areas layer, as today: about a
hundred elements, placed in percentages, sized by CSS, no position read per box. Typing
touches one element; keeping is one rewrite through the logic worker. A box adds about 400
bytes to the note, and a dictionary and a short stream to the export. To be measured on
the Android emulator against fifty plain areas, for `docs/MEASUREMENTS.md`.

## 9. Tests and fixtures

In a new `test/text-box.test.mjs` unless a file is named:

- a text box is an area whose note is shown on the page: one more member beside its
  fragment, read back exactly; a drawing or a passage is not one
- a size this version does not know reads as medium; a value that is not a string, as not
  shown
- showing, hiding and resizing each rewrite one member, every other byte stays;
  recolouring keeps the box and resizing keeps the ink
- the words on the page are the note without its markup; lines stay lines
- a box kept with no words is deleted and can be brought back
- a text box is exported in reading order, named Text, without a picture; it is found by
  its words and has no quote
- the original Annotator and 0.3.0 read a text box as an area with a note and keep the
  member they do not know (interoperability file)

In `test/native-pdf-lifecycle.test.mjs`:

- a text box is painted as its words in its region, never from stored markup; fifty are
  painted without reading a position
- a click places a box, a drag gives its width, Enter places one without a pointer; an
  area, a drawing and a text box are not made at once
- typed words are kept by Ctrl/Cmd+Enter or by leaving, dropped by Escape; composition
  keys do neither
- the box being typed in survives its page being drawn again
- a saved box moves and resizes like an area and opens by Enter
- a PDF with no text box pays nothing: no listener, no layer, no style read

Elsewhere:

- the words follow the page, not the app (`test/design.test.mjs`); each new variable is
  one Style Settings offers (`test/style-settings.test.mjs`)
- written as FreeText with a default appearance and a stream drawing the same lines;
  upright on a turned page; words outside the standard font go out as a box with a comment
  (`test/pdf-export.test.mjs`, `test/pdf-write.test.mjs`)
- a PDF's text box comes in as one, at the nearest size, without a picture; a thin one
  gets the least height; one 0.3.0 took in stays an area (`test/pdf-import.test.mjs`; "a
  PDF annotated in another program comes in whole…" changes)
- each new law, its bridge test and a broken program refused (`proofs/`)

Fixtures. Exists: `test/support/fixtures/annotated-elsewhere.pdf`, with a FreeText made by
PDFKit. Needed: FreeTexts with `/DA`, one line high, and without an appearance stream, as
bytes in the test the way `test/pdf-write.test.mjs` builds its PDFs; a frozen note with a
text-box block; Helvetica's widths (licence to copy them unconfirmed); a by-hand browser
check for wrapping, right-to-left, CJK and zoom.

## 10. Risks, and what to leave out

- Viewer internals: `--scale-factor`, what a redrawn page keeps, and how the viewer's own
  annotation layer stacks with ours.
- Fonts differ by device, so line breaks do; the stored height is one device's, though the
  box grows to fit on each screen.
- An opaque box over print hides it, on screen and in the exported copy.
- The export does not look like the screen, and some scripts do not go out as text.
- iOS is unverified on a device, as the README says of the whole reader.
- Obsidian plans PDF annotation of its own; a text tool there would make this redundant.
  The notes and the FreeText export would still hold.
- Scope: a text tool invites fonts, bold, alignment, arrows.

Left out of a first version: font choice; bold, italic or rendered Markdown on the page;
alignment; a text colour apart from the ink; rotation; callout lines; borders; a tool that
stays on; copying boxes; text boxes in books, web pages and videos; converting taken-in
areas in bulk; FreeText for scripts outside the standard fonts; tags and replies in the
exported box.

## 11. Decisions for the owner

1. **Build it at all?** Recommended: not yet. Three requests in three years is thin, the
   review says "only if more people ask", and Obsidian plans PDF annotation of its own.
   Build when two more people ask after the 0.3 announcement, or when Obsidian's tool
   ships without text. Alternative: build now, since (b) is small and changes nothing for
   anyone else.
2. **Colour of the words.** Recommended: the page's ink, with the annotation's ink on rule
   and frame. Alternative: the words in the ink, darkened toward the page's ink; closer to
   other apps, harder to read.
3. **Ground behind the words.** Recommended: opaque paper. Alternative: none, as in
   handwriting apps; unreadable over print, and a PDF's own text box would show through
   one taken in from it.
4. **Where the tool sits.** Recommended: a header button beside the other two (not on
   phones). Alternative: no button, a "T" in the drawing strip and the command; less
   clutter, harder to find.
5. **Words outside the standard fonts, in the export.** Recommended: a box with a comment,
   said in the notice. Alternatives: a FreeText with no appearance stream (some readers
   may then show nothing; unconfirmed), or a picture of the words.

## Criticism

1. **"The page shows plain words but the note is Markdown; page and card disagree."**
   Kept, made smaller: `pageWords` removes only a leading picture, link syntax and
   emphasis marks. In the editor the source shows, as on the active line of Obsidian's own
   editor.
2. **"A box that fits on a desktop is cut off on a phone, and a view that fixes it would
   write on its own."** Changed: the height is a minimum and the box grows by CSS, so
   looking never writes. A line clamp computed for each box was dropped.
3. **"An opaque box is a white-out; the original must not change."** Kept: the file is
   untouched, the export is a copy, and any reader can hide or remove the box. Changed:
   the ground is see-through while a box moves.
4. **"A fourth header button for three requests."** Changed in part: none on phones, where
   space is least and typing is in the sheet. Kept elsewhere, because one asker had
   expected to find the tool. Decision 4.
5. **"The repaint loop will destroy an editor in the page."** Changed: the editor is its
   own layer, known to `ownMutation`, its state held by the mode and put back after a
   redraw; a test is named.
6. **"The laws copy the ink laws; the hard parts are unproved."** Kept, with the limit
   said: what decides stored bytes is proved, line filling has three laws, the rest is
   tested by reading back. A trivial law about rows went with the line clamp.
7. **"New text boxes and those 0.3.0 took in as areas will differ."** Changed: "Show note
   on the page" is on every area, either way. Nothing is converted unasked: that would
   rewrite notes nobody meant to change.

## 12. What was built

Built on 2026-11-15 as option (b), following sections 1 to 9 and the criticism, with the
changes below. Checked by the reader suite and the proofs; **not tried in a running
Obsidian**, on a phone, or in another PDF program by hand.

**Where it is.**

| Part | Where |
| --- | --- |
| The member, its sizes, the words shown | `src/text-box.ts` (`textBoxOf`, `pageTextOf`, `pageWords`, `nearestSize`, `TEXT_POINTS`) |
| Writing and taking away the member | `proofs/pagetext.bend`, laws `pagetext_*` in `LAWS.bend`, proofs in `PROOF.bend`, wrapper `pageTextJson` in `proofs/reader.mjs`, `setPageText` in `src/codec.ts` (run in the worker, `src/logic.ts`) |
| Painting, placing, moving | `src/native-pdf.ts`: `paintTextBox`, `setTypedBox`, `startTextBox` (one frame mode shared with `startArea`), `areaHandles` |
| Typing, saving, menus, the command | `src/main.ts`: `typeTextBox`, `syncTypedBox`, `save`, `addTextBoxItems`, `setPageText`, command `add-text-box` |
| Card, composer, scan prompt | `src/sidebar.ts`, `src/floating-composer.ts` (`placeholder`) |
| Page paper and ink | `src/pdf-appearance.ts` (`data-annotator-paper="sepia"`), `styles.css` ("Text boxes") |
| Export | `src/pdf-export.ts` (`fillLines`, Helvetica widths), `src/pdf-write.ts` (`FreeTextNote`, `winAnsi`) |
| Import | `src/pdf-read.ts` (`defaultAppearance`), `src/pdf-import.ts` (`textbox`), `src/native-pdf.ts` (`importPlan`) |
| Summary, notes, drafts | `src/summary.ts` (kind `text`, "Text box"), `src/annotation-notes.ts` (`kind: text-box`), `src/drafts.ts` |
| Tests | `test/text-box.test.mjs`; additions to the lifecycle, interoperability, export, write, import, appearance, design and plugin-boundary tests; `proofs/reader.test.mjs` |

**Where it differs from the design, and why.**

1. **Typing is in the composer, not in a text area on the page** (section 4, "Typing in
   place", "The editor and repaints", "Phone"). The words are the note, so they are typed
   where notes are typed: the card beside the box on a desktop or tablet, the sheet above
   the keyboard on a phone, the sidebar for someone who writes notes there. The box on the
   page shows the words as they are typed: a new box in a layer of its own
   (`.annotator-text-draft`, named in `ownMutation`, put back after every paint, so a
   redrawn page keeps it, as criticism 5 asked), a saved one in place of its note's words.
   One editor then serves links, tags, ink, input methods, undo and unfinished drafts, on
   every device, and there is no editor in the page for a repaint to destroy. What follows
   from it: keeping is the composer's Save (or `Ctrl/Cmd+Enter`); `Escape` closes the
   composer, and words typed are kept as an unfinished draft (with the box) rather than
   dropped, as for any note; a box with no words cannot be saved ("Type the words of the
   text box first"), and closing one leaves nothing.
2. **Inks are chosen in the composer**, not in the placing strip; the strip has the three
   sizes and Cancel.
3. **The height is not rewritten after typing** (section 4, "Keeping"). The stored height
   stays what was placed; the box grows to fit its words by CSS on every screen (section
   3), down to the foot of the page. Where the page ends first, the words are cut off and
   the box shows an ellipsis in its ink (`.is-clipped`). Knowing that needs one height read
   per text box, made once after every box of the paint is placed; a PDF without text boxes
   reads nothing.
4. **Fewer laws than planned** (section 7). Built: `pagetext_key_roundtrip`,
   `pagetext_read_after_write`, `pagetext_write_preserves_others`,
   `pagetext_last_write_wins`, `pagetext_read_after_clear`, `pagetext_clear_preserves_others`,
   with three refused broken programs. Not built: `pagetext_keeps_ink` and
   `ink_keeps_pagetext` (they need a lemma that two different literal keys never compare
   equal for an unknown name; the bridge test checks both ways on real JSON); the `fill`
   laws (line filling decides the bytes of an exported copy, not what is stored in a note,
   so it is TypeScript, `fillLines`, tested over many words and widths for "every word kept
   in order" and "every line fits or is one character"); `Area.widen` (a thin box taken in
   is widened in TypeScript, `textRegion`, and the result still goes through the checked
   `Area.fit`, which is what makes it storable).
5. **Names.** The tool is **Add text box** (command `add-text-box`, "Add text box (PDF)"),
   not "Type on the page"; the card and the summary say **Text box**, a per-annotation note
   `kind: text-box`. The scan prompt in the sidebar offers it beside areas and drawing.
6. **The page's paper** reaches the box through CSS, not variables published by script:
   `pdf-appearance.ts` now also sets `data-annotator-paper="sepia"`, and `styles.css` sets
   `--annotator-page-ground` and `--annotator-page-ink` for a light, a sepia and a dark page
   (the theme's own surface in a dark theme). `--annotator-box-ground` and
   `--annotator-box-text` override them and are documented in `docs/STYLING.md`; they are
   not in Style Settings, whose settings need one fixed default, and these follow the page.
   Style Settings has `--annotator-box-font` and a class `annotator-box-clear` (no ground,
   decision 3's alternative).
7. **Keys on a saved box.** As an area's, plus: `Enter` (or a double click, or pressing a
   selected box again, which is what a finger can do) opens its words; `Escape` puts back a
   move or resize not yet saved. `Escape` while dragging a grip puts the region back for
   every area, not only for text boxes.
8. **Taking in.** A FreeText with no words is taken in as an area, as before, rather than
   as an empty box. The ink of one with words comes from the colour in its `/DA` when that
   colour is not black, grey or white; its `/C` is not read for it.
9. **Export.** As section 6, with `/DS` beside `/DA` for readers that rebuild the
   appearance from it, and `/Rotate` on a turned page beside the form's matrix. The
   Helvetica widths are Adobe's published metrics for the standard fonts, as numbers.

**Not done.** The measurement of fifty boxes on the Android emulator (section 8) and the
by-hand browser check of wrapping, right-to-left, CJK and zoom (section 9) were not made;
that Obsidian's viewer sets `--scale-factor` on every device is still unconfirmed (the box
falls back to 96/72); how Preview, Acrobat and pdf.js show the exported FreeText was not
looked at by hand, only read back by this reader.
