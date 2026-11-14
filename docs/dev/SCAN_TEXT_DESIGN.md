# Recognising the text of scanned PDF pages: design

Written on 2026-11-13, after the 0.3.0 release, for the plan's task
`scan-text-recognition` (issue 397 asks for it). This is phase 1: a design
for the owner to accept, change or refuse. Nothing has been built, and
nothing was downloaded to write it: sizes were read from the packages'
public file listings, licences and dates from the projects' repositories,
Obsidian's policy from its developer documentation.

Megabytes are millions of bytes. An estimate is called an estimate. A first
draft of this note was criticised by a second reader working against the
code; section 10 says what was found and what changed. The largest change:
the draft had one way to make recognised words selectable, and this note
has two and recommends the other one.

## 1. What is asked, and what is already settled

A scanned PDF is pictures of pages. Today the reader says so and offers
areas and drawing (`sidebar.ts`, "No selectable text here"); the README
lists "no OCR" among its limits. The wish: the words on such pages can be
selected, highlighted, quoted, found and exported like any other PDF's.

Settled before this design:

- **Optional.** A reader who never asks for it gets nothing new: nothing
  fetched, no worker started, no cost at start.
- **Started by the reader, per document.** Never on its own.
- **Offline once set up.** Recognition runs on the device. No page, picture
  or word is sent anywhere.
- **The original PDF is not changed.**
- **Done once.** The result is kept.
- **The note format does not change.**
- The plugin is 1.5 MB and proud of it.

## 2. The recogniser

| | Tesseract, as tesseract.js 7.0.0 | Tesseract, as tesseract-wasm 0.11.0 | PaddleOCR (PP-OCRv5 mobile) on ONNX Runtime Web | Scribe.js 0.18.2 | The operating system's |
| --- | --- | --- | --- | --- | --- |
| Engine, WebAssembly | 2.86 MB | 1.84 MB | 11.21 MB | not published; carries its own PDF renderer and fonts | none |
| Engine, JavaScript | 0.20 MB (glue 0.09, worker 0.11) | 0.19 MB (library 0.10, worker 0.09) | 0.05 MB and up | | |
| Language data | English 2.95 MB; German 1.33, French 0.71, Spanish 2.10, Swedish 2.50, Simplified Chinese 1.72 (gzip, "best, integer") | English 4.11 MB; German 1.53, French 1.13, Spanish 2.29, Swedish 4.17, Simplified Chinese 2.47, Japanese 2.47, Russian 3.86 ("fast", as stored) | detection 4.7 MB plus recognition: English 7.5, Latin scripts 14, Chinese and mixed 16 | Tesseract's | the system's |
| First use, English | **6.0 MB** | **6.1 MB** | **23.5 MB** | more than Tesseract alone | 0 |
| Languages | 126 files in Tesseract's data | the same data | about 40 to 50, in script groups | Tesseract's | varies |
| Gives | words with boxes and confidence, lines, paragraphs | words with boxes and confidence, lines | lines with boxes; no word boxes | words with boxes | varies |
| Takes | an encoded picture (PNG, JPEG); raw pixels are not supported | an `ImageBitmap` | pixels | pictures and PDFs | |
| Licence | Apache-2.0 | BSD-2-Clause build, Apache-2.0 engine and data | Apache-2.0 models, MIT runtime | AGPL-3.0 | closed |
| Android, iOS | plain WebAssembly in a worker; faster with SIMD (Chrome 91, Safari 16.4). **Not proven inside Obsidian mobile:** an OCR plugin in the directory (Text Extractor) says its OCR does not work on mobile | the same | one thread only (its threads need cross-origin isolation, which Obsidian does not give); holds over a gigabyte for a batch in its own benchmark | its files must come from the page's own origin, which a plugin cannot arrange | no script API in either WebView |
| Kept up | 38.8 thousand stars; 7.0.0 in December 2025 | by the Hypothesis client's maintainer; 0.11.0 in October 2025 | active | active | |

The operating systems' recognisers, one by one: macOS and iOS (Vision, Live
Text) have no script API, and in Electron would need a native module or a
helper program; Windows (`Windows.Media.Ocr`) the same; Android (ML Kit) is
for native apps; Chromium's `TextDetector` is a draft behind the
experimental flag, not on in Electron or Android's WebView and absent from
WebKit. A helper program would have to be installed, which Obsidian's rules
forbid, and would leave the phones out. That road is closed.

**Accuracy and speed are not measured here**, since nothing was downloaded.
Generally reported: Tesseract's LSTM models read clean print scanned at
about 300 dots per inch with a few wrong characters in a hundred or fewer,
do worse on tilted, faint or low-resolution pages, photographs and tables,
and do not read handwriting. PaddleOCR is stronger on photographs and
Chinese and about equal on clean print. **Estimate** for Tesseract in one
WebAssembly thread: 1 to 4 seconds a page on a recent desktop, 5 to 15 on a
phone.

**Recommendation: Tesseract.** It is the smallest engine that does the job,
it gives word boxes, its licence sits inside the plugin's AGPL, and it is
what the fork reached for. PaddleOCR is four times the download and gives
no word boxes.

**Which of the two builds is decided by a spike, not here.** The criteria:
it accepts its engine and language as bytes handed to it (no address of its
own to fetch from, no cache of its own); it takes the page's pixels without
a second encoding; it runs inside Obsidian on a phone; time and memory for
a page. tesseract-wasm fits the first two on paper and is a third less
code; tesseract.js is more used. The engine sits behind one interface
(`recognise(picture, language) → lines of words with boxes and
confidence`), so nothing else depends on the answer.

## 3. How the engine and the language data arrive

The plugin does not carry them. They are **fetched on first use, with the
reader's consent, and checked**, as the owner also said while this was
being written.

- **When.** Only when the reader presses the button of a dialog that names
  each file, its size and its host. Never at start, never in the
  background, never to look for a newer one.
- **What is fetched: the WebAssembly engine and the language data. No
  JavaScript.** The 0.2 MB of JavaScript that drives the engine is built
  into `main.js` as text, the way the logic worker's source is, and only
  becomes a worker when recognition starts. So everything that can touch
  Obsidian, the vault or the network is in the reviewed `main.js`; what is
  fetched can only compute inside a worker, with the imports that reviewed
  code gives it. `main.js` grows from 1.35 MB to about 1.55 MB.
- **From where.** The release assets of this repository: `github.com`,
  which hands the download to GitHub's own file host (an address under
  `githubusercontent.com`); both are named in the dialog and the README. These are the hosts the plugin itself is installed from. The
  files are byte-for-byte those of the published npm packages, with their
  licence texts beside them.
- **Checked.** Each file's SHA-256 is written in the plugin's source. A
  file is hashed after download and again each time it is loaded; a
  mismatch is deleted and refused, in words. A test compares the pinned
  hashes with the packages named in `package-lock.json`. A different engine
  can only arrive with a new version of the plugin.
- **Kept** in the plugin's folder
  (`<vault>/<config>/plugins/obsidian-annotator/recognition/`). The
  settings list what is there, how large, with **Remove**. Uninstalling the
  plugin removes it.
- **By hand, where GitHub cannot be reached:** the same files put into that
  folder are accepted if their hashes match. A language file whose hash is
  not known is offered too, labelled as unchecked and untested.

### Obsidian's policy

Obsidian's developer policies say plugins must not "install or update
themselves or their dependencies", and allow network use that the README
explains. Language data is data. A WebAssembly engine is code, even when it
is pinned by hash and never updated outside a release. An OCR plugin in the
directory today (Text Extractor) ships a 3.0 MB `main.js`, too small to
hold its engine, so there is precedent, not permission.

| | Plugin size | Under the policy |
| --- | --- | --- |
| 1. JavaScript in `main.js`; engine and language fetched (**recommended**) | 1.7 MB | no script is ever fetched; the engine is, pinned. Arguable. |
| 2. Everything fetched | 1.5 MB | fetches script: the weakest reading |
| 3. Engine inside `main.js`; language fetched | 5.5 MB for everyone, read at every start | clean |
| 4. A companion plugin in the directory that holds the engine | 1.5 MB here, about 5 MB there, only for those who install it | clean under any reading; a second repository and a second review |
| 5. No engine: read text another program made (hOCR) | 1.5 MB | clean; useful to few |

**The answer changes how phase 2 is built, so it should be had first.**
Asking the Obsidian team is the owner's to do (or to have drafted).

## 4. Two ways to make the words selectable

**A. A text layer of the plugin's own**, laid over each page picture, with
the recognised words kept in a file of the plugin's. This is what the plan's
note describes.

**B. A searchable copy.** The recognised words are written, invisibly, into
a *copy* of the PDF saved beside it (`Scan (searchable).pdf`), the way
**Export PDF with annotations** writes `(annotated).pdf`. The original is
not touched. The copy is a PDF with text, and from then on everything is
what it already is for such a PDF.

| | A. Own layer | B. Searchable copy |
| --- | --- | --- |
| Original PDF | untouched | untouched; its bytes are the copy's first bytes, and the addition can be taken off again |
| New code in the reader | a second way to capture, save, place, paint, find and export, beside the one for PDF text (`capture`, `payload`, `paint`, `wordsIn`, `matches`, `location` and more are all bound to pdf.js's layer and the document's text today) | none: the copy opens as a PDF with text |
| How a highlight is stored | a new shape (quote plus boxes among the reader's own details) | the ordinary one (quote and position), unchanged |
| Annotator 0.3.0, 0.2, other tools on the same note | cannot place it | place it, given the copy |
| Obsidian's own find bar and its link to a selection | do not see the words; the reader needs a Find of its own | work |
| Selecting on a phone | a custom layer whose long-press behaviour is unproven | pdf.js's own |
| What is kept besides the PDF | a file with the scan's whole text, keyed by the PDF's fingerprint (which page removal, reordering or another program's OCR do not change) | nothing: the text is in the copy |
| Pages become selectable | one by one while it runs | when the copy is written (at the end, or on Stop) |
| Space in the vault | 2 to 3 MB for 300 pages | the PDF a second time, until the reader deletes one |
| Useful outside Annotator | no | yes: any PDF program can search and copy from the copy |
| Recognising again differently | highlights keep their boxes | a highlight whose words are now read differently has to be found by its quote, and may not be |
| Risk | the reader's hottest file gains a parallel pipeline, kept forever | writing into PDFs: bounded, isolated in the writer, and checked by reading the result back with independent readers, as the export is |

**Recommendation: B first.** Three of the five serious faults the critic
found in the draft (the stored shape mishandled by released versions, the
text file keyed by a weak identity, the second anchoring pipeline) do not
exist in B. It asks the least of the reader's code, keeps every annotation
in the shape every version and tool understands, and gives the person a
better PDF. A stays possible later for those who do not want a second
file; nothing in B is in its way.

This departs from the plan's wording ("cached beside the source rather than
rewriting the PDF"). The fork rewrote the PDF in memory at every load. B
writes a separate file once, on request, and never opens the original for
writing.

## 5. B in detail: the searchable copy

**What is written.** The original's bytes, then one addition in the PDF's
own way of adding (an incremental update, as the export writes): for each
recognised page a small stream of invisible text (text that takes part in
selection and search and paints nothing), each word at its box; one tiny
font without glyphs, shared by all pages, that maps to Unicode; and a mark
on each such page saying which language it was read in. About 3 to 6 kB a
page, an estimate. `pdf-write.ts` already adds to page objects and writes
both kinds of cross-reference; text streams and the font are new.

**The copy is the same document.** The writer keeps the first half of the
file's identifier, and a file without one is known by its first bytes,
which are unchanged. So the copy has the original's fingerprint: its
annotation note, and every area, drawing and page note made before, belong
to the copy as they are. Area units are fractions of the page and do not
move.

**Which pages.** Pages with no text of their own. A page with a little text
over a scanned body (a library's stamp, a running header) may be included
by the reader; recognised words that fall on text the page already has are
left out, so nothing is there twice. A PDF whose pages carry a poor text
layer from an earlier recognition is not improved by this version: text
cannot be taken out of a page by adding to the file.

**After writing.** The copy opens in the tab in place of the original, and
the reader is asked once whether the annotation note should point at it
(one property, `annotation-target`). What they see from then on is a PDF
with text: select, highlight, note, quote, find, link, export, as ever.

**Coming back.** *Recognise more pages…* on the copy reads its marks, does
the pages still without text and adds to the copy. *Recognise again in
another language…* takes the earlier addition off (the copy records where
the original ended) and writes anew, so it works even if the original has
been deleted. Highlights are then found by their quotes, as after any
change to a PDF's text; one whose words came out differently is listed with
its quote and "could not be located". The dialog says so before starting.

**Not possible, and said in words:** an encrypted PDF (as with the export);
a file too large to hold twice in memory on that device (the writer builds
the whole file; the limit is measured in phase 2 and stated).

**If the app closes mid-run,** the pages done are remembered on the device
(in the app's own storage, like the remembered text of PDFs) until the copy
is written, then let go.

## 6. A in detail, as it would be after the critique

Kept short; this is the fallback if the owner prefers no second file.

- **Layer.** A sibling of pdf.js's empty text layer, one span per word,
  with what pdf.js's own layer needs to select well (an end-of-content
  element, a fixed place in the order of layers). Put back when pdf.js
  redraws a page; its class joins `ownMutation`.
- **A per-page text source.** Every place in `native-pdf.ts` that reads
  `.textLayer` or the document's text is listed and given the page's
  source: `capture` (and its page-break branch, which must refuse to mix
  the two texts), `payload`, `paint`, `matches`, `location`, `progress`,
  `wordsIn`, `areaWords`. The document's own text and its offsets are not
  touched.
- **Stored shape: the quote and the line boxes, and no area fragment.**
  Released 0.3.0 treats an annotation with an area fragment as an area in
  two places that do not check for a quote (the note editor's title, and
  deleting, which removes the picture a note leads with), so a fragment
  must not be written. Those two places are guarded anyway.
- **Always painted from its stored boxes**, on every device, so it looks
  the same everywhere and recognising again cannot move it. Recognised text
  is only for selecting, quoting and finding. Boxes of another copy of the
  PDF are not painted, as areas are not today.
- **Saved only when verified:** the layer's text must equal the page's
  text as the checked logic gives it, and the quote is whole words.
- **The text file** is kept with the PDF's size, page count and each page's
  size and turn, and is not used when they differ; the language and engine
  are recorded per page; it is written at the end and on Stop, merging by
  page with what is there; the settings list each file with the PDF it was
  made from and **Remove**.
- **Find** is one suggester over both texts of a PDF.
- **Hypothesis JSON** cannot carry the boxes; a highlight exported and
  brought back that way would be a quote without a place. Said in the
  README.

## 7. What the reader sees

Obsidian's own parts throughout: buttons, a Modal, Notices, a Setting list.

**The offer.** Where the sidebar says "No selectable text here", a third
action joins *Mark an area* and *Draw on the page*: **Recognise text…**.
Also in the sidebar's menu and the command palette for any PDF with a page
without text. On a PDF with all its text the command says why there is
nothing to do.

**The dialog,** each time:

- *Language:* one dropdown; those on the device are marked. First languages
  are Latin-script ones; others say "not tested".
- *Pages:* this page · from–to · all pages without text (with the count).
- What happens: "Reads the words on these pages on this device. Nothing is
  sent anywhere. Saves *Scan (searchable).pdf* beside the PDF; the original
  is not changed."
- If something must be fetched: "Needs, once: the recogniser (2.9 MB) and
  English (3.0 MB), from github.com. Kept in the plugin's folder." The
  button reads **Download and recognise**, otherwise **Recognise**.
- Without a network and nothing fetched: it says so, and how to add the
  files by hand.

**Progress.** A strip under the PDF's toolbar, where the area and drawing
modes put theirs, so a phone sees it without opening the drawer:
"Recognising text: page 37 of 212 · about 6 minutes left" and **Stop**.
The sidebar shows the same. The time is measured from the pages done. One
run at a time; starting another asks whether to stop the first. The run
belongs to its tab and stops if the tab or the app closes.

**Stop** asks: keep the 37 pages done (and write the copy), or discard.

**When it reads badly.** Each page has a mean confidence. If the first
pages are poor the strip says: "These pages are hard to read (handwriting, a
faint or tilted scan, or another language?). Stop, or carry on." The
closing Notice says how many pages were hard to read. Words the recogniser
hardly believes (specks, rules, stains) are left out.

## 8. Cost and limits

**Nothing here is measured. Phase 2 measures before the README promises
anything**, and the numbers go into `docs/MEASUREMENTS.md`:

- seconds per page on five kinds of scan (clean, tilted, faint, two
  columns, a photograph of a page) on a desktop, the Android emulator and
  the iOS Simulator;
- the longest task on the interface thread while a run is going and the
  reader scrolls (drawing a page of 8.7 million pixels and handing it over
  is the unknown; area pictures stop at 8 million, once per gesture);
- peak memory over 300 pages, with each page released after it is drawn;
- the largest PDF a copy can be written for, per device;
- `main.js` size and enabling time, before and after.

Estimates until then: 5 to 20 minutes for 300 pages on a desktop; 25 to 75
on a phone, where the dialog starts at "this page" and a whole document is
better done on a desktop, the copy travelling with the vault. A page is
drawn at about 300 dots per inch, at most 3600 pixels on its long side
(2400 on a phone); an A3 page then gets about 220. One worker. The engine
never runs on the interface thread: where a worker cannot start,
recognition is not offered. iOS before 16.4 (no SIMD): not offered.

Limits, to be written in the README:

- Print, not handwriting. Upright pages; a page scanned sideways is not
  turned. Horizontal text; vertical, right-to-left and CJK text are
  untested.
- A word broken over a line end stays as it is printed ("exam-", "ple").
- Pages with a poor text layer already are not improved.
- The copy doubles the PDF's space in the vault until one is deleted.

## 9. What is pure logic, and its laws

With B, nothing new is stored in a note, so the note codecs are untouched.
What is new and pure is which of a recogniser's words are kept. That is in
Bend (`proofs/scan_text.bend`, built; laws in `LAWS.bend`, proofs in
`PROOF.bend`), in the whole page units `area.bend` uses:

1. **Sifting** (`sift`): a word is kept only if the recogniser is at least
   `floor` sure of it and its box, held on the page, has some extent each
   way. The box is made by `Area.fit`, whose laws were already proved.
   - Every kept word is sound: sure enough, with a box that may be drawn
     (`scan_sift_sound`).
   - Corners in either order give the same word (`scan_sift_either_corner`).
   - Each word is judged alone and order is kept: sifting two lists one after
     the other is sifting them joined (`scan_sift_append`).
2. **A cap** (`first`): never more words than the most allowed, and they are
   still sound (`scan_first_capped`, `scan_first_sound`).
3. **Nothing twice** (`apart`): a word whose middle lies on text the page
   already has is left out.
   - No kept word's middle lies on such text (`scan_apart_clear`); with no
     text on the page every word is kept (`scan_apart_nothing`); leaving out
     twice is leaving out once (`scan_apart_once`); order is kept
     (`scan_apart_append`); what was sound stays sound (`scan_apart_sound`).
   - A word in the middle of a box does lie on it (`scan_covers_centre`), so
     the test is not one nothing passes.

Each law has a deliberately broken implementation that the proof check must
refuse (seven negative controls in `proofs/verify.mjs`).

**Not in Bend, and why.** The draft of this section also put the mapping to
the PDF's own coordinates and the stretch of a word into Bend. Those are
fractions in PDF units under a page's box and turn, which is float
arithmetic; Bend's laws here are over whole numbers. They are in
`src/pdf-searchable.ts` and tested instead, the way the export's `pagePoint`
is (and they use that same function, so recognised text and a marked area of
the same words coincide by construction): the written words are read back
from the bytes and compared with their boxes, on an upright page, a cropped
one and pages turned a quarter and three quarters; and the copy is read by
two other PDF readers. Taking the addition off again is tested to give the
original, byte for byte.

If A is chosen later, the logic also decides what is stored in a note (the
quote, the line boxes, reading untrusted boxes back from a note), and laws
for that would be added.

## 10. What the critic found, and what changed

A second reader was given the draft and the code and asked to find what
was wrong. Its claims were checked against the code before being accepted.

| Found | Changed |
| --- | --- |
| **The draft's stored shape (quote, area fragment, boxes) is mishandled by released 0.3.0**: the note editor titles it an area, and deleting it can delete the picture its note leads with, because two places test for an area without testing for a quote. Verified in `main.ts`. | B stores nothing new. A no longer writes a fragment, and the two places are guarded. |
| **The text file keyed by fingerprint alone can put wrong words under a page.** The fingerprint survives page removal, reordering and another program's OCR; the plugin's own text memory does not trust it alone. | B has no such file. A checks size, page count and each page's size and turn. |
| **"One question: which text layer?" hid a second anchoring pipeline** through eight or more places in `native-pdf.ts`, with unstated matters of layer order, redraws and selection in gaps. | The weight of it is why B is now recommended. A lists the places. |
| **Two painters** (word rectangles where the text is, line boxes where it is not) would show one highlight two ways, and the rule for placing after recognising again contradicted itself. | A always paints the stored boxes; the placing rule and its law are gone. |
| **The policy: the draft fetched JavaScript and named one host where two are contacted.** | No script is fetched; both hosts are named; a companion plugin and files placed by hand are added as options; the question goes to Obsidian before building. |
| tesseract.js takes encoded pictures and addresses, not pixels and bytes, and an OCR plugin in the directory says its OCR does not work on mobile. | The build is chosen by a spike on stated criteria; the phones are "not proven". |
| Nothing checked that the quote and the boxes describe the same words; the confidence filter sat outside the checked logic. | Cleaning is in Bend; A saves only verified, whole-word quotes. |
| Laws that full-page boxes would satisfy, a round trip that fails for boxes of no size, a cap that contradicted a round trip, "order kept" false after rounding. | Laws restated: tight bounds, a least size, non-strict order, cleaning as a proved step. |
| A line break inside a quote; hyphens; CJK joined with spaces; the reader's `normalize` drops all spaces and would make Find match across words. | With B the page text is pdf.js's as for any PDF. Limits name hyphens and untested scripts. |
| Cost claims with nothing behind them ("no task over 100 ms", "does not grow", two workers, phone times). | Section 8 is a list of what to measure; two workers are cut. |
| Stamped pages and poor earlier OCR made the feature silently absent; the command was hidden where it did not apply. | Stamped pages can be included; the command says why there is nothing to do; poor earlier OCR is a stated limit. |
| The text of a scan would outlive its deleted PDF under an opaque name; language recorded per file though runs are per page; rewriting a 3 MB file every ten pages. | B keeps no such file. For A: per-page records, a list with Remove, one write. |
| Redoing a language destroyed the only result; "two languages" against one dropdown; progress only in a drawer that is closed on phones; a run across tabs unspecified. | One dropdown; the strip under the toolbar; one run, bound to its tab; redo says what it may cost before starting. |
| A simpler first version exists, and "a searchable copy" deserved to be argued as the main alternative, not a footnote. | It was argued, and it won. |
| Checked and holds: a quote wins over an area in painting, cards, menus and export; the export keeps the identifier's first half; a blob worker has a precedent here; 35 MB for an A4 page at 300 dots per inch is right. | |

## 11. Phase 2, if agreed

Each download needs the owner's yes:

1. `tesseract-wasm@0.11.0` and `tesseract.js@7.0.0` with
   `tesseract.js-core@7.0.0` (npm, development only), for the spike that
   chooses between them; the loser is removed.
2. English language data for the chosen build, and the same for each first
   language, to test with and to pin hashes.
3. Later, with a release: putting the engine and languages up as release
   assets.

Order, with a stop after each of the first two:

1. **Spike:** each build in a blob worker, given bytes, in Obsidian on the
   desktop; then on the Android emulator and the iOS Simulator. Seconds and
   megabytes for a page. *Stop: report; the owner confirms the build, or
   that phones only read copies made elsewhere.*
2. **The writer:** invisible text into a copy, read back by independent
   readers; the Bend module and its laws. *Stop: a searchable copy made
   from the command line of the test suite, shown to the owner.*
3. Fetching, hashing and the folder; the dialog, the strip, Stop and
   Continue; opening the copy and pointing the note at it.
4. Measurements; README, CHANGELOG ("Unreleased"), SECURITY; the plan.

**There is no scanned page among the fixtures today**
(`test/support/fixtures/` holds one text PDF made by a script). One has to
be made: a page typeset, turned into a picture with a little tilt and
noise, and wrapped as a picture-only PDF by a script like the existing one
(nothing downloaded); or a real scan the owner is free to publish.

The security note (`docs/SECURITY.md`, "Recognising text in scans") will
say: what is fetched, with sizes and hashes, from which two hosts, only on
a click in a dialog that lists it; that no script is fetched and each file
is checked against the plugin's own code before every use; that the host
learns only that a download happened; that the engine runs in a worker
without the vault, the page or the network, is given pixels and returns
words; that recognised words are untrusted like any words from a source;
that a language file added by hand is unchecked; and that the searchable
copy holds the scan's text and is as private as the PDF. The README gains a
"Network use" paragraph, as Obsidian's policy asks.

## 12. Decisions needed

1. **Does it go into the plugin at all,** or stay an idea?
2. **Which way:** a searchable copy beside the PDF (B, recommended) or the
   plugin's own text layer (A).
3. **Which recogniser:** Tesseract (recommended; the build chosen by the
   spike) or PaddleOCR.
4. **How it arrives:** the driving script in `main.js` (+0.2 MB) with
   engine and language fetched on first use (recommended); everything
   fetched; the engine in `main.js`; or a companion plugin. And whether to
   ask the Obsidian team before building.
5. **From where:** this repository's release assets (recommended) or
   jsDelivr.
6. **Which languages first:** recommended English, Swedish, German, French
   and Spanish, each fetched only when chosen.
7. **The fixture:** a generated scan, or a real one the owner provides.
8. **A yes to each download** of section 11, when the time comes.

## 13. Decided so far, and what is built

**Decided by the owner (2026-11-13):** it goes into the plugin, as the
searchable copy (B); the engine and language data are fetched on demand, not
bundled. Still open: decisions 3 to 8 above, and a yes to each download.

**Built, without any download** (nothing a reader can reach yet):

- `src/pdf-searchable.ts`: writes a page's words into a copy as invisible
  text, marks each page, and takes the addition off again.
- `src/scan-words.ts` and `proofs/scan_text.bend`: from a recogniser's
  report to the words that are kept (section 9).
- `src/scan-files.ts`: the files a recogniser needs, kept in the plugin's
  folder and never used unchecked (section 3): fetched only from the address
  an entry names, checked before they are written and again at every read,
  deleted and refused when they are not what the plugin's code says. It has
  no list of files yet: that waits for the choice of build and host.
- `test/support/fixtures/scanned-pages.pdf`: a scan made by the script
  beside it (a tilted, grainy picture page; a page stored sideways; a text
  page), with where its words are.
- Tests: `test/pdf-searchable.test.mjs`, `test/scan-words.test.mjs`,
  `test/scan-files.test.mjs`, and the bridge tests in
  `proofs/reader.test.mjs`.

**Read back by two other readers, by hand**
(`test/support/searchable-copy-check.mjs`; the suite pins the copy they
were given by its checksum): pdf.js 5.3.34 as Obsidian ships it reports the
same document (same fingerprint), one run of text per printed line, in
order, each as wide as its print, also on the sideways page. Apple's PDFKit
reads the upright page line by line as printed and finds a phrase where it
is printed; on the sideways page it reads the same words in the same order
but breaks some lines in two.

**Found while building, and what was done:**

- *Apple's reader orders text by how high each run stands.* Words written
  each at its own height (as a recogniser boxes them), or along a line that
  leans even slightly, came out a word to a line and out of order in PDFKit.
  So the words of a line are set on one straight line, and a line that is
  nearly level is set level. A line that leans by more than half its height
  from end to end keeps its lean, so its words stay on the ink; in Preview
  and on iOS such a line may read out of order. pdf.js reads in the order
  written either way.
- *Apple's reader wants the font to say how far it descends.* A descent of
  zero made it read no text at all; the font says -1, as Tesseract's own
  does.
- *The space after a word fills exactly the gap to the next word,* so no two
  runs of text overlap.
- *A strongly tilted scan* is therefore the case to measure with the real
  recogniser before anything is promised about Preview and iOS.

**Not built:** the recogniser and its worker, the list of its files, where
the page's own text is (for pages with a stamp over a scan), the dialog,
progress, Stop and Continue, opening the copy and pointing the note at it,
the measurements of section 8, and the user documentation (README,
CHANGELOG, SECURITY), which waits until there is something a reader can use.
