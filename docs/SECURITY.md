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

- **A note's `annotation-target` outside the vault is asked about, once.**
  Before an http(s) target is fetched, or a file outside the vault is read
  and copied in, the reader asks, naming the address or the path. The answer
  is remembered for that address (for a web address it can be given for the
  whole site), so a later change of the file at the same path or address is
  not asked about again. A Zotero or Calibre link is first followed to a
  path inside the folder the settings name, and that path is then asked
  about in the same way.
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
