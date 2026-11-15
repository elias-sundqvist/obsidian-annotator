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

- **A note's `annotation-target` outside the vault is asked about.**
  Before an http(s) target is fetched, or a file outside the vault is read
  and copied in, the reader asks, naming the address or the path. For a web
  address the answer is remembered (it can be given for the whole site), so
  a later change at the same address is not asked about again. For a file
  on this computer the answer is for the one copy then made, and is not
  kept: while the copy is in the vault the file outside is not read again,
  and if it is read again it is asked about again. A Zotero or Calibre link
  is first followed to a path inside the folder the settings name, and a
  DEVONthink link to the path DEVONthink gives (see below); that path is then
  asked about in the same way.
- **An address cannot make the reader read outside the vault without this
  computer's key.** `obsidian://annotator-open` can be opened by any web
  page or program. With `file=` it opens a PDF or EPUB that is already in
  the vault, named by its path there; anything else is refused (another
  type, a hidden or configuration folder, an absolute or climbing path).
  That writes nothing and asks nothing, as Obsidian's own `obsidian://open`
  does for any file. With `source=` it names a file outside the vault, and
  is followed only when it carries the key this computer made; without it no
  file is looked at, nothing is asked, and one notice a minute at most says
  so. With it, the first file from a folder is asked about (the dialog
  starts on **Not now**, and its other answers work only after a moment);
  **Always from this folder** allows that folder from then on. The key and
  the allowed folders are kept in Obsidian's storage for this computer and
  vault, not in the plugin's settings, so they do not sync. No address names
  where anything is written, and nothing is sent back to whoever opened it.
  At most twenty requests wait at once. What remains: a program on the same
  computer can read the key from the recipe, and on macOS such a program
  could then have Obsidian copy a PDF from a folder already allowed into the
  vault, where that program may be able to read it. **New key** or
  **Remove** in the settings ends a key, and **Forget them** the folders.
- On a Mac, whether the vault's disk takes names that differ only in case
  for one name is asked of the disk, so that a path into the vault written
  in another case is not taken for a file outside it.
- **A user name and password for a source's server are asked for, never
  stored.** An address with them in it is refused, so they cannot end up in a
  note that syncs. When a server answers a download with a Basic challenge,
  the reader asks in a dialog of its own (warning when the address is plain
  http), sends them only to that address's origin, and keeps them in memory
  until the plugin is unloaded. It asks three times at most per download.
- **Nothing is written beside a file outside the vault.** Since 1.14.4
  Obsidian can open a file that is not in the vault, and its file functions
  then write wherever that file's path says. The reader names its notes and
  exports after their source, so a source that is not in the vault is not
  annotated where it lies: it gets no note, no export and no saved position.
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

## Asking DEVONthink for a file

A DEVONthink item link names an item, not a file; where DEVONthink keeps
the file is in its own database. To follow such a link the plugin runs a
program, and this is the only program it runs.

- **What is run.** `/usr/bin/osascript -l JavaScript -e <script> <question>
  <UUID>`, through Node's `execFile`: no shell, and the arguments are a list.
  The script is a constant in the plugin (`DEVONTHINK_SCRIPT` in
  `src/app-links.ts`); nothing from the note is written into its text. The
  item's UUID is passed as an argument, and only after it has matched
  DEVONthink's form exactly (five groups of hexadecimal digits, 8-4-4-4-12);
  any other link is not a DEVONthink link and nothing is run for it.
- **What it asks.** First whether DEVONthink 4 or 3 is installed and running
  (asked of macOS; this starts nothing). Then, after the reader's yes, the
  path of the record with that UUID, and whether its file is still to be
  downloaded from a sync location. Nothing in DEVONthink is changed.
- **When.** Only on a Mac's desktop app, only when a note whose
  `annotation-target` is such a link is opened and the link has not been
  followed yet (or the file it was followed to is gone), and only after a
  dialog that says so. The dialog says when DEVONthink is not running and
  asking will start it. A yes holds until Obsidian is closed and is not
  stored. The module that runs programs is loaded only then; on a phone, a
  tablet, Windows or Linux it is never loaded, and such a link says it is
  followed on a Mac only.
- **What macOS asks.** The first time, macOS asks whether Obsidian may
  control DEVONthink. Refused (error -1743), the reader says where to allow
  it (System Settings, Privacy & Security, Automation). The plugin does not
  change that setting.
- **What is done with the answer.** The path must be a whole path to a PDF
  or EPUB that exists. It is remembered for the link in the plugin's
  settings, and is then asked about and copied in like any file outside the
  vault. osascript is stopped after three minutes.

## What is kept on the device outside the vault

- **The text of PDFs you have opened**, so that their highlights can be placed
  as soon as a page is drawn next time. It is kept in the app's own storage
  on that device (IndexedDB, `obsidian-annotator-pdf-text`): not in the vault,
  not synced, never sent anywhere. At most 40 documents are kept, the oldest
  let go; a text longer than six million characters is not kept. It is only a
  head start for painting: the text is read from the file again at every
  opening, and nothing is written into a note from remembered text.
- **This computer's key and the folders files may be copied from** without
  a question (Open from outside Obsidian), in Obsidian's own storage for
  this computer and vault. They are not in the vault and do not sync.
- **Settings, reading positions and unfinished drafts** are in the plugin's
  `data.json` inside the vault's configuration folder, as with any plugin.
