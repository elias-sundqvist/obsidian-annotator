# Security notes

## Issue 384 (remote code execution in the original plugin)

The report: an EPUB named by a note's `annotation-target` is opened; the
original plugin lets the book's scripts run (`allowScriptedContent`), in an
iframe that is same-origin with Obsidian, so a book can reach
`window.top.require("child_process")`.

The native reader is not affected by that mechanism. Book and page markup is
parsed inert and rebuilt node by node through allowlists (`dom-source.ts`,
`passive-markup.ts`); publisher CSS is applied property by property with no
network addresses (`publisher-styles.ts`). No script from a book, a page or
a PDF runs in Obsidian's document, and the host code has no `innerHTML`,
`eval` or `document.write`. Tests: "book and page markup reaches the host
inert…", "foreign markup drops active constructs…", "standalone SVG book
assets…" (`readers.test.mjs`), "network CSS, dynamic selectors…"
(`publisher-styles.test.mjs`).

## What the review of the same class of problem found, and what was done

1. **A live web page could make the reader save text of its choosing.**
   The helper that reads a page's selection runs among the page's own
   scripts, which can make it report anything, and the host acted on a
   reported "highlight" at once. Fixed: nothing a page reports is an
   instruction. Its selection is only *offered*; the host shows the actions
   in its own bar with the words that would be saved, and saving needs the
   user's click there. No toolbar is drawn inside the page any more.
   Test: "a live page can only offer a selection…" (`readers.test.mjs`).
   The same holds for a picture of a live page kept with a note: the page
   reports which picture was clicked, where it is and what it shows, and each
   of those is checked (the place by a fixed pattern of child steps that is
   never run as a selector by the host, the address as a plain http(s) one).
   The picture kept is what the Web viewer showed in that rectangle, taken by
   Obsidian itself: the address the page gave is never fetched. It is shown
   in Obsidian's own window, and kept only on the user's click there.
   Tests: `web-figures.test.mjs`.
2. **Words from the source became raw Markdown in the note.** The visible
   line of an annotation carries the passage and its context; a passage
   containing a code fence, inline code, a tag or a template command would
   have been live Markdown in the user's note (with some community plugins,
   code). Fixed for everything the native reader writes: the line is a single
   line, backticks are escaped, tag and template openers and `%%` are broken
   with a zero-width space, and the context is read back as the same words
   (`proofs/display-text.mjs`). The stored JSON keeps the passage exactly.
   Test: "words from the source are written into the note as inert words…"
   (`codec.test.mjs`). Notes written earlier, or by the original plugin, keep
   their raw lines.
3. **A script address is never a link.** `javascript:`, `data:` and
   `vbscript:` addresses in book or page markup are dropped before the
   reader's link handling sees them.

## Known and not yet changed

- **A note's `annotation-target` is followed without asking.** An http(s)
  target is fetched, and an absolute path outside the vault is read and, if it
  is a real PDF or EPUB, copied into the vault, when the note is opened in the
  reader (automatically only if "open annotation notes in the reader" is on,
  which is off by default). A note from someone else can therefore cause one
  fetch or one local read. Planned: confirm once per note and target.
- **Remote video files** (`.mp4` and similar targets) are loaded by the
  built-in player from wherever the target points.
- **Imported comments** are rendered as Markdown like the user's own.
- The helper in a live page is still in the page's world: a page can hide
  or falsify highlights *on itself* and can change what it offers. It cannot
  write to the vault.
  While you are choosing a picture, the page's pictures can take the
  keyboard (`tabindex`), which the page's own scripts can see; it is removed
  when you leave.

## Recognising text in scans

The words of a scanned PDF are read by Tesseract, built to WebAssembly (the
npm package `tesseract-wasm` 0.11.0), with a language's data (the npm
packages `@tesseract.js-data/<language>` 1.0.0). Neither is carried in the
plugin.

- **What is fetched, and when.** The engine and one language, only when the
  reader presses **Download and recognise** in a dialog that names each with
  its size and host, from this repository's release assets on `github.com`,
  which hands the download to its file host (`githubusercontent.com`).
  Nothing is fetched at start, in the background, or to look for a newer one.

  | File | Bytes |
  | --- | ---: |
  | `tesseract-core-0.11.0.wasm` (the engine) | 1,839,004 |
  | `eng-1.0.0.traineddata.gz` (English) | 2,952,873 |
  | `fra-1.0.0.traineddata.gz` (French) | 707,406 |
  | `deu-1.0.0.traineddata.gz` (German) | 1,333,102 |
  | `spa-1.0.0.traineddata.gz` (Spanish) | 2,100,190 |
  | `swe-1.0.0.traineddata.gz` (Swedish) | 2,503,095 |
- **No script is fetched.** The JavaScript that drives the engine is part of
  `main.js` and is reviewed with it. What is fetched is the engine's
  WebAssembly and data.
- **Every file is checked before every use.** The size and SHA-256 of each
  file are written in the plugin's code (`src/scan-manifest.ts`). A file is
  checked after it is fetched, before it is written, and again each time it
  is read; one that differs is deleted and refused, in words. A different
  engine can therefore arrive only with a new version of the plugin. The
  checksums are those of the files in the published npm packages; a test
  compares them with the packages `package-lock.json` names, so anyone can
  confirm what they stand for.
- **What the host learns.** That a download of that file happened, from which
  address and when. No page, picture, word or file name leaves the device:
  recognition runs on it.
- **Where the engine runs.** In a worker of its own, which has no access to
  the vault, the page or Obsidian. Before anything else it removes `fetch`,
  `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `indexedDB`
  and `caches` from itself. It is handed the engine and the language as bytes
  and pictures of pages, and hands back words with their boxes. It never runs
  on the interface thread.
- **Recognised words are words from a source,** and are not trusted: which
  are kept is decided by checked logic (`proofs/scan_text.bend`), and they
  are written into the copy as text and nothing else. A highlight made on
  them goes into a note by the same inert-words rule as any passage.
- **The searchable copy** is a file in the vault that holds the scan's text.
  It is as private as the PDF, and syncs with whatever syncs the vault.
- **Files put there by hand** (where GitHub cannot be reached) are taken only
  if their checksums match; the plugin has no way to accept another file.
- **What a run has read so far** is kept in the same folder
  (`pending-<the PDF's fingerprint>-<language>.json`) until the copy is
  written, so that an app closed in the middle loses little. It holds the
  words of the pages read and where they are, and is as private as the PDF.
  It is let go when the copy is written. Read back, it is checked piece by
  piece and taken for nothing if it is not what the plugin writes.
- **The words of a marked area** are read from the area's part of the page,
  drawn on the device, and kept in the annotation note with the area; only
  that one value of the annotation changes, and everything else is read back
  as it was before anything is written.
- **The settings** list each of the recogniser's files with its size and
  whether it is on the device, with Remove.

Known and not yet changed: the files are kept in the plugin's folder, so a
tool that syncs that folder carries them to other devices, where they are
checked again.

## What is kept on the device outside the vault

- **The text of PDFs you have opened**, so that their highlights can be placed
  as soon as a page is drawn next time. It is kept in the app's own storage
  on that device (IndexedDB, `obsidian-annotator-pdf-text`): not in the vault,
  not synced, never sent anywhere. At most 40 documents are kept, the oldest
  let go; a text longer than six million characters is not kept. It is only a
  head start for painting: the text is read from the file again at every
  opening, and nothing is written into a note from remembered text.
- **Settings, reading positions and unfinished drafts** are in the plugin's
  `data.json` inside the vault's configuration folder, as with any plugin.
