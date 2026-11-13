# Changes

What changed for someone using Annotator. How to use each thing is in
[README.md](README.md).

## 0.3.1 (2026-11-13)

- A note whose property is nearly `annotation-target` (the colon typed into
  its name, `annotator-target`, another spelling) opened no source and
  nothing said why. Opening such a note now says which property was probably
  meant, with a button that renames it.
- **Make a Base of everything annotated** writes a Base that lists every
  annotation note with its source, progress, author, year and tags. One that
  is already there is opened, not written over.

## 0.3.0 (2026-11-13)

A new reader. Versions up to 0.2.11 showed the Hypothesis web client in a
frame; this one is built on Obsidian's own PDF view and editor, with its own
readers for books, web pages and video. Annotation notes are read and written
in the same format, settings and open tabs come along, and nothing needs
converting: see "Coming from Annotator 0.2" in the README.

### Smaller and quicker

Measured on the same vault; the method and the rest are in
[docs/MEASUREMENTS.md](docs/MEASUREMENTS.md).

| | 0.2.11 | 0.3.0 |
| --- | ---: | ---: |
| Plugin files on disk | 26.3 MB | 1.5 MB |
| Enabling the plugin at each start, desktop | 1.1 s | 0.014 s |
| The same on an Android emulator | 6.0–8.6 s | 0.05–0.13 s |
| First highlight of an annotated PDF, Android emulator | 2.0–2.7 s | 0.9–1.4 s |
| The same on a desktop | 0.32–0.48 s | 0.40–0.43 s |
| Memory kept after closing a 7.6 MB PDF | 9.7 MB | 0.2 MB |

### The reader

- **PDFs** open in Obsidian's own PDF view. Highlights in six inks, notes
  written in Obsidian's editor (links, tags and formatting work), replies,
  page notes, and a sidebar that sorts, filters and searches.
- **Books** have their own reader: scrolling or paged, the publisher's styles
  and fonts, fixed-layout books, right-to-left and vertical text.
- **Web pages** are read as a copy saved in the vault, or in Obsidian's Web
  viewer.
- **Videos** take notes by time, with transcripts where the video has
  captions.
- **Where it has been run:** macOS; Windows 11; Linux (Ubuntu 24.04); Android (16, and 12
  with the browser it shipped with, which lacks some newer features the
  reader used to need); the reader's own code in iOS WebKit in the Simulator.
- Nothing is loaded from the Hypothesis client; the plugin no longer ships
  it or a second copy of pdf.js.

### New

- **Areas.** Keep a picture of part of a PDF page with a note. The words
  inside the area are kept with it and found by search. A saved area can be
  moved and resized, by keyboard or by its grips.
- **Drawing on PDFs.** Freehand, with a pen's pressure, smoothing, an eraser
  and palm rejection. Stored as ordinary annotation JSON (a region and an SVG
  path). A saved drawing can be moved, and opened again to erase from it, add
  to it or change its ink. Areas and drawings can be recoloured from their
  cards.
- **PDF export with annotations.** A copy of the PDF that any PDF reader shows
  with the highlights, notes, areas, drawings and page notes. The original is
  never changed.
- **PDFs annotated elsewhere.** The highlights, notes, shapes and ink another
  program put into a PDF can be taken into your notes and worked on; exporting
  writes each back once, underlines and strike-outs as what they are.
- **Frame notes on video.** Freeze the frame, keep all or part of it, and
  write a note under it.
- **Audio files** open as recordings with timed notes.
- **Pictures in books.** Keep a picture of a book with a note: the picture's
  own file leads the note, and it is found again by the file it shows even if
  the chapter around it changes.
- **Pictures on web pages.** On a live page in Obsidian's Web viewer, keep a
  picture with a note as in a book: what the viewer showed of it is saved as
  an attachment, and the picture is framed in its ink on the page. Nothing
  is downloaded for it, and what the page reports is checked like a selection.
- **Books:** a contents card with annotation counts, find in the whole book
  with a list of results, and type controls (typeface, line spacing, width,
  justification).
- **Transcripts:** selecting words offers Highlight and Note, as on a page;
  quoted words are marked where they are said.
- **Video:** a new note is written under the picture while the video waits;
  timeline markers say what their note says and stack when they are close.
- **Exports:** a summary note from a template, one note per annotation with a
  Base, and `{{image}}` / `{{kind}}` for areas and drawings.
- **Sepia paper** and the strength of highlights on dark pages are styling
  variables.
- The sidebar can show only what has a note.
- With reading progress kept in the note, another device opens a source
  where this one left it.
- After following a link inside a PDF (a citation, a contents entry), a
  button in the tab's header and a command go back to where you were.

### Better

- Every tag of an annotation is a clickable tag in Live Preview of its
  note (#388). The tags line of a new or edited annotation is written
  `> #tag`, with a space after the quote mark; before, the first tag on the
  line was plain text there. Annotator 0.2 reads the line the same.
- A highlight made on another copy of a PDF (a paper downloaded again, a
  note pointed at another file) is shown where the open file has its words
  exactly once, and says it was made on another copy. The note is not
  changed; an area or a drawing from another copy stays unplaced.
- Dark PDF pages can darken their pictures too, so line drawings that
  vanished on a dark page show.

- Paged books: pages sit between their margins on every screen, are turned
  by a swipe or a tap at the side, and turning back over a chapter's start
  lands on the last page before it. Highlights show on a book's own white
  paper in a dark app.
- A PDF's highlights appear with the page: its text is remembered on the
  device from one opening to the next (and read again each time, to be
  sure), and on a first opening the highlights of the first pages are
  painted while the rest of the document is still being read, and finding
  each annotation's place no longer takes longer the longer the document is
  (300 annotations on a million characters: milliseconds, not minutes).
- Painting many highlights no longer makes the browser lay the page out
  once for each of them: a PDF with 2000 annotations opens in under half the
  time it took.
- Reading and writing notes happens in a worker, beside the interface and
  not in its way. What is computed there is written only if the note is
  still the text it was computed from.
- On a phone, opening an annotation note shows the document; the drawer with
  the annotations no longer slides over it.
- A long list of annotations is built as it is needed, and a PDF page keeps
  its highlights while nothing about them changed: a note with 2000
  highlights opens with 0.6 s of work on the interface's thread instead of
  7–8 s, and with 200 nothing there takes longer than 50 ms.
- A selection across a PDF page break is one highlight.
- A note with a damaged block still opens: the readable annotations are shown,
  the damaged part is named with its line, and nothing is written until it is
  repaired.
- Scanned PDFs say that there is no text to select, and offer what works.
- Notes and quotes in right-to-left scripts read the right way.
- Tooltips are Obsidian's own; Escape does one thing at a time.
- A failed download says why. A web page in GBK, Shift_JIS or another
  encoding it declares reads as written; an address that turns out to be a
  PDF says so and what to set; a file's address with a slash after its name
  is still that file.
- Opening a link to an annotation on a live web page scrolls the page to it
  once it has loaded.
- On a tablet the annotations are docked beside the page (once, when there
  is room; your own choice after that), notes are written beside the
  passage above the keyboard, and two sources can be read side by side.
- On a phone: selection bar above the navigation, sheets for page colours and
  contents, marking and drawing by touch without opening the drawers.
- Faster start (the plugin loads its CSS grammar and ZIP reader only when
  needed) and nothing runs on a timer while the reader is hidden.

### Proved

- Creating and deleting an annotation re-read only the changed stretch of the
  note; this is proved equal to re-reading the whole note, and on.
- The geometry of areas (fitting, moving, resizing within the page) is proved.
- A line drawn by hand: no point is ever off the page, thinning a line only
  leaves points out and keeps both its ends, and the box around a line holds
  every point. Proved, and proved again for the one-pass form that long lines
  need.
- How far through a book: the place found for a share of the book is exactly
  that share, in a chapter the book has, so the percentage shown and the
  percentage resumed from agree for every book.
- A video note's duplicate check walks the note once and is proved to give
  what comparing every ID with every other gives; saving a note in a video
  with 500 notes takes a third of the time it did.
- 182 laws, 88 negative controls, and the proofs accepted a second time by
  Bend's independent kernel; see [proofs/README.md](proofs/README.md).

### Not yet

- Areas of fixed-layout book pages, and inline vector drawings in books.
- Not yet run inside Obsidian for iOS on a real iPhone or iPad (it has been
  tested in the iOS Simulator).
- On iOS, YouTube may refuse to play inside the video view (its Error 153).
  The reader then offers **Open in YouTube**, also from a note's time; timed
  notes and the transcript work without the player.

## Earlier versions

The Hypothesis-based reader.

### 0.2.11 (2024-01-06)
* Fix issue with rendering annotator in Obsidian 1.5.3 and later (See issue #356)

### 0.2.10 (2023-01-09)
* Fix bug #284 Plugin didn't start on iOS

### 0.2.9 (2023-01-05)
* Click on annotation link in markdown causes an immediate jump to annotation in PDF (Thanks to @HardwayLinka)
* Fix broken drag-and-dropped link to highlight caused by line breaks. (See issue #267, Thanks to @HardwayLinka)

### 0.2.8 (2022-11-27)
* Fixed issue with "Annotate" button not appearing (See issue #253)
* Fixed issue with scroll getting stuck after clicking annotation link (See PR #259, Thanks to @HardwayLinka for the contribution)
* Partially fixed issue with annotation links not working (See PR #231, Thanks to @XSAM for the contribution)

### 0.2.7 (2022-10-31)
* Fixed issue with Latex Equations not rendering in annotations (See issue #228)
* Removed "sign-in/log-in" buttons (See issue #241)
* CSS Snippets can now be used to style the hypothesis sidebar

### 0.2.6 (2022-08-19)
* Fix bug #208 introduced in 0.2.5 It was impossible to open an internal link because of the plugin

* Internal changes
  * Use dataview package to communicate with dataview plugin

### 0.2.5 (2022-08-14)
* Move buttons 'Annotate', 'Toggle Dark Mode', 'Open as Markdown' to top of options menu
* Video annotation
  * fix [Video not found error](https://github.com/elias-sundqvist/obsidian-annotator/issues/198)
  * Temporary disable video annotation on mobile devices

* Internal changes
  * CodeMirror updated to v6
  * obsidian-api updated to 0.15.9
  * betterer was installed with strict typing settings to make plugin more stable and reliable in a future

### 0.2.4 (2022-07-23)
* Fix [plugin fails to start on iPad](https://github.com/elias-sundqvist/obsidian-annotator/issues/176)

### 0.2.2 (2022-05-14) *Minor improvement*
* hypothes.is updated up to v1.1055.0

### 0.2.1 (2022-03-06) **[BRAT](https://github.com/TfTHacker/obsidian42-brat) release** *Basic web and video annotation* 
* `annotation-target-type` can now take on the values `web` and `video`. 
  * With `web` the annotation target can (in theory) be any website. Some work better than others. Link navigation does not work. 
  * With `video`, only youtube links are supported. In order to use this feature, a link to a zip file with the annotator.tv resources must be provided in the plugin settings. It cannot be bundled with the plugin since that would most likely violate copyright. 
    * You can ask someone for a link, or generate it yourself by making an account at annotate.tv, signing in, going to https://annotate.tv/videos/620d5a42b9ab630009bf3e31#, and downloading the website using the [Save All Resources](https://chrome.google.com/webstore/detail/save-all-resources/abpdnfjocnmdomablahdcfnoggeeiedb?hl=en) chrome extension, uploading it to google drive, and [generating a direct link](https://sites.google.com/site/gdocs2direct/). 
  * Other improvements:
    * Some behind-the-scenes changes have been made so that the hypothes.is version can be more easily upgraded in the future. 

### 0.2.0 (2022-01-26) **[BRAT](https://github.com/TfTHacker/obsidian42-brat) release** *Improved markdown rendering, epub reader* 
* Markdown in the hypothesis sidebar should now fully support the regular obsidian syntax. (including links, embeds, custom codeblocks etc.)
* Several Epub improvements, Thanks to @aladmit for these!
  * New option added for font size scaling (See PR #127)
  * New "epub reader mode" setting added. Infinite scrolling is now supported! (See PR #114)
  * Reduced page padding so that maximum available space is used. (See PR #126)
  
### 0.1.9 (2022-01-17) *Minor fix* 
* Removed sentry logging, again, (See issue #97)

### 0.1.8 (2022-01-16) *Minor fixes, added default annotation mode setting* 
* Fixed issue with pane loading on startup
* Fixed some issues with epub highlighting
* Added setting to choose default annotation mode, Thanks to @aladmit for the PR! (See PR #113)
 
### 0.1.7 (2022-01-14) **[BRAT](https://github.com/TfTHacker/obsidian42-brat) release** *chinese file name support* 
* Fixed issue with chinese file names, as discussed in issue #53
 
### 0.1.6 (2022-01-12) **[BRAT](https://github.com/TfTHacker/obsidian42-brat) release** *Live Preview Drag and Drop fix + chinese character support* 
* Drag and drop should now work in live preview (See issue #103)
* Upgraded pdf.js to a newer version.
  * Improved character support. (Japanese and Chinese letters should now work), (See issue #53)
* Removed sentry logging (See issue #97)
 

### 0.1.5 (2021-12-19) *Quick fix*
* Apparently the previous update broke some of the old annotations for some people (See issue #95). This version hopefully fixes that.   

### 0.1.4 (2021-12-18) *Fix Issue With Ipad + Windows/Android compatibility.*
* See issue #70, Thanks to @jonasmerlin for the fix! 
 
### 0.1.3 (2021-09-12) *Basic CORS support for desktop*
* Added a basic workaround for CORS issues. This should make more links possible to view. (See issue #15)
  * Note that this workaround only works on the desktop version of obsidian.
 
### 0.1.2 (2021-09-11) *Quick Fix*
* Fixed critical bug that prevented any annotations from being saved. (See issue #61)

### 0.1.1 (2021-09-10) *Drag & Drop Fixes, Open links in new pane, Multi-Line Comments Fix*
* Drag and drop has been improved. The drop handlers are now unloaded when the plugin is unloaded. The issues regarding interferrence with other Drag and Drop functionality are hopefully also resolved.  (See Issue #50)
* Using an array format for the annotation target should now work. This improves compatibility with MetaEdit (See Issue #51)
* Holding <kbd>ctrl</kbd> and clicking links (or clicking with the mouse-wheel) now opens annotations in a new pane. (See Issue #54)
* Issue with multi-line comments should be resolved. (See Issue #47)
* A new command (`Toggle Annotation/Markdown mode) has been added. This can be bound to a hotkey in obsidian, enabling more efficient switching between the two modes. (See issue #39)
* Other things
  * A basic unit-test for annotation loading has also been added. More tests will be added as issues arise. This will guarantee that the plugin becomes increasingly stable over time.

### 0.1.0 (2021-09-03) *Added annotation highlight drag and drop*
* By holding the <kbd>shift</kbd> key you can now drag highlights from the epub/pdf into a separate Obsidian note, and a link to the highlight will be inserted. 
  ![highlight drag and drop](https://user-images.githubusercontent.com/9102856/132098957-e6850c9f-77a0-4fd5-91ac-e7095cfbea9d.gif)

### 0.0.9 (2021-09-03) *Quick fix for annotation id bug*
* See #37

### 0.0.8 (2021-09-03) *Added Pre/Postfix setting toggles, Fixed scrolling issue, More size reductions.*
* The plugin is now available in the community plugins list! 
* The Pre- and Postfix parts of the annotation markdown can now be disabled in the settings. (See #30)
* Clicking a PDF annotation link now causes an immediate jump to the annotation. No more glitchy scrolling. (See #21)
* Potential fix to the memory leak mentioned in #28 added.
* Added core-js. Will hopefully mean that the plugin works with older versions of node (see #34)
* Disabled global WebSocket override. Should resolve issues with Obsidian Sync (see #36)
* Further size reductions of the plugin
  * React is now built in 'production' mode.
  * All the embedded resources now use the highest zip compression ratio.

### 0.0.7 (2021-09-01) *Added Custom Default Path setting, Page notes fix, Slight JSON size reduction, etc.*
* Added a new setting called `Custom Default Path`. See [this comment on #19](https://github.com/elias-sundqvist/obsidian-annotator/issues/19#issuecomment-909549603) for more info. 
* Top-level values in the annotation JSON will now be ommited if their values are "unsurprising". See #24
* Fixed page notes breaking the loading of annotations.
* Made the `Post to...` button always say `Post to Only Me` to reduce privacy confusion. 
* Further reduced plugin size
  * Switched from base64 to full unicode encoding
  * Added minimization of resources before zip generation
  * Added minimization of final rollup output
* Minor fixes
  * Removed warning about websocket userid mismatch
  * Added possible fix to #13

### 0.0.6 (2021-08-30) *`file:` protocol support, various url fixes, privacy improvements, minor fixes*
* Fixed so that no initial http request is made to the hypothes.is servers. 
* Hypothes.is performance trackers removed. 
* No more error messages from the websocket api. 
* The stored annotations no longer reference the sample pdf url, since that confused some users. (See issue #7)
* Initial support for `file:` protocol links added. (Has not been tested much yet.)
* The placeholder staus bar text has been removed (See issue #17)

### 0.0.5 (2021-08-26) *Fixed EPUB bug, minor file restructuring*
* The files necessary for the epub reader were `.gitignore`d, which prevented it from working in the previous releases.  (See issue #6)
* The code files has been moved to the `src` directiory so that the repo looks a bit less messy. 

### 0.0.4 (2021-08-26) *Chinese File name support*
* Added support for chinese file names. (See issue #4)

### 0.0.3 (2021-08-26) *Plugin Size Reduction*
* Removed some unnecessary files to reduce plugin size.

### 0.0.2 (2021-08-26) *Minor fixes*
* Removed logging, 
* Simplified link handling
* viewer height is now 100% instead of fixed to 1000px. 

### 0.0.1 (2021-08-25) *First Release*
* Basic functionality of the plugin implemented
