# iOS Simulator pass: the reader in iOS WebKit

2026-11-13. Plugin 0.3.0, `dist/main.js` sha256 `05ac4234e68b…` (built from `experiment/native-design` at
`0e9e3f6` plus that morning's uncommitted work), copied aside before testing. Harness and rerun steps:
[test/support/ios/README.md](../../test/support/ios/README.md).

**This is not Obsidian.** Obsidian for iOS is App Store only and cannot be installed in the Simulator. What
ran here is the plugin's real `main.js` and `styles.css` inside iOS WebKit (WKWebView), served from
`capacitor://localhost` the way Obsidian for iOS serves its page, against a stand-in `obsidian` module
written for this pass. The stand-in reuses Obsidian 1.15.0 desktop's own `app.css` and its pdf.js 5.3.34;
the workspace, drawer, navbar, Markdown view, menus and vault are imitations. The floating bar with
‹ 🗂 ⌘ 🖍 in the screenshots is harness chrome standing in for Obsidian's navbar, not the plugin.
So this pass shows how the plugin's code behaves in iOS WebKit. It cannot show plugin loading, Obsidian's
own PDF view wrapper (its toolbar, pinch zoom), Obsidian's drawers, editor or keyboard toolbar, or sync.

## Devices

| Device | Runtime | Screen (pt) | Safe areas portrait / landscape |
|---|---|---|---|
| iPhone 17 Pro | iOS 27.0 (24A434) | 402 × 874 | top 62, bottom 34 / left 62, right 62, bottom 20 |
| iPad Pro 13-inch (M5) | iOS 27.0 (24A434) | 1032 × 1376 | top 32, bottom 20 / same |
| iPhone Duo (first shake-out) | iOS 27.1 (24A94425) | 466 × 678 | right 84, bottom 34 |

`xcodebuild -downloadPlatform iOS` installs iOS 27.1 first, which supports only the "iPhone Duo" device type,
then iOS 27.0, which is the runtime for current iPhones and iPads. Both are installed (14.8 GB).
WebKit user agent: iPhone `iPhone OS 18_7 … Mobile/15E148`; iPad reports a Mac (`Macintosh; Intel Mac OS X 10_15_7`),
as iPad WebKit does by default. Second vehicle: Mobile Safari 27.0 on the iPad against `serve.mjs` (http://localhost).

## Results

Pass = behaved correctly in the harness. "Device" = only the real app can settle it.

| Check | iPhone | iPad | Notes |
|---|---|---|---|
| Logic worker from a Blob URL (`src/logic-host.ts`) | pass | pass | Ends in mode `worker` (not the page-thread fallback) under `capacitor://` and in Mobile Safari. |
| IndexedDB, PDF text memory (`src/pdf-text-memory.ts`) | pass | pass | `obsidian-annotator-pdf-text` database created on PDF open; 100 kB round trip. |
| Container queries, `Intl.DateTimeFormat`, `crypto.subtle`, CSS Highlights | pass | pass | Secure context true for `capacitor://localhost` and `http://localhost`. |
| pdf.js rendering, text layer, real worker | pass | pass | Obsidian 1.15's pdf.js; worker is a real module worker, not the fake one. |
| EPUB chapters | pass | pass | Rendered in the page DOM; the reader uses no iframes, so "chapters in frames" does not apply. |
| Desktop-made PDF highlights restore; name with spaces (#89) | pass | pass | `Field guide 2024.pdf` with two records written as a desktop install writes them. |
| Desktop-made EPUB record restores | pass | — | Record with source `app://obsidian.md/index.html?loc=…` restored ("Highlight restored · Verified passage"). New iOS records are stamped `capacitor://localhost/index.html?loc=…` by design (`chapterUri`, `src/epub-book.ts`). |
| Multi-line PDF selection with touch (#166) | pass | pass | Long press, drag handle across line ends and a paragraph gap. |
| Multi-line EPUB selection with touch (#166) | pass | — | |
| Tall blue bars in multi-line selection (#322) | — | not reproduced | Drag across a paragraph gap into the page margin: 4 normal line rects, none taller than a line. |
| Selection bar vs system callout (#177) | pass | pass, see F5 | iOS's Copy / Look Up / Translate callout stays at the selection; the plugin bar sits at the bottom above the navbar; no overlap. |
| Highlight saved to the note | pass | pass | Selectors, page, fingerprint written. |
| Composer with the software keyboard | pass, see F3 | pass | Sheet in the drawer; Save at 370–414 pt, keyboard top 478 pt (iPhone). Keyboard model is the harness's (see limits). |
| Edit and delete from the list | pass | — | "Annotation updated." / inline "Delete this annotation?"; note text changed and block removed. |
| Safe areas, portrait | pass | pass | No plugin control under the Dynamic Island or home indicator. |
| Safe areas, landscape | see F4 | pass | |
| Light and dark | pass | pass | Theme follows the system; reader and list readable in both. |
| Annotation list on phone width / docked on iPad | pass | pass | Search, tabs, "By location" fit; iPad docks the drawer itself (`sidebarForOpened`) at ≥1000 pt. |
| Freehand drawing with a curved touch path | pass | — | 14-point curve drawn smoothly, page did not scroll, saved as an SVG selector on page 2. |
| Region selection on a PDF page | fail | — | F6. |
| Following an annotation link (#225) | fail | — | F2: lands on page 1 when the link opens the PDF. Works when the PDF is already open in another tab. |
| Video note view (#207) | — | fail | F7: layout fine (player, transcript, docked list), YouTube refuses to play (Error 153); no serverless fix, see F7. |
| Zoom keeps highlights | fail | fail | F1. |
| Long PDF scroll (60 pages) | pass | — | Scripted sweep 60 fps, no long frames; finger flings render without blank pages; pdf.js keeps about 10 canvases. |
| Long EPUB scroll (16 chapters) | pass | — | Flings move chapter 2 → 5 with chapters dropped and scroll compensated. A scripted 40 ms scrollTop loop stalled mid-chapter 2; real flings do not, so this is counted as a script artefact. |
| Memory warnings, web view reloads | none | none | Host logs on all three devices: no memory warning, no web content termination, no page errors. |
| Pen hover (#373) | could not test | could not test | The Simulator cannot produce Apple Pencil hover. |

## Failures

### F1. Highlights disappear after zooming a PDF (iPhone and iPad)

Steps: open `Field guide 2024.pdf` (one restored highlight on page 1), change zoom 100% → 80%
(`pdfViewer.currentScale`, the same as pinching or the zoom buttons). All highlight marks on the page vanish and
stay gone through scrolling; they come back only when the page size changes again or the note changes.
Reproduced on iOS 27.1 and 27.0 (iPad: at 80% and 90%); timing-dependent (a second visit to 80% kept them).
Not reproduced in desktop Chromium with the same harness.
Screenshot: [screenshots/ios/f1-highlights-gone-after-zoom.png](screenshots/ios/f1-highlights-gone-after-zoom.png).

Cause, traced in the page: on a zoom pdf.js hides the old text layer (`hidden`, `display: none`) while it
re-renders. `NativePdf.paint()` (`src/native-pdf.ts`, around the `kept` cache) runs in that moment,
`range.getClientRects()` returns nothing, no marks are made, and the empty result is cached in `kept` with
the new page size. When the text layer comes back, later paints take the "same text, annotations and size"
path and keep the empty overlay. Painting while `.textLayer` is hidden (or zero rects for a range that should
have some) should not be cached.

### F2. An annotation link that opens the PDF lands on page 1 (#225)

Steps: open `Links to passages.md`, tap "Middle of the guide, page 30". The PDF opens, the sidebar opens and
the right card is selected, but the page stays at 1. With the PDF already open in another tab the same link
goes to page 30. Same in desktop Chromium with the harness.

Cause: `openNoteTarget` (`src/main.ts`) calls `openAnnotation` → `NativePdf.activate()` right after
`leaf.openFile`. At that moment pdf.js has 0 pages and the text is not indexed (`matches` empty), so the
fallback `viewer.currentPageNumber = notePage(...)` is dropped by pdf.js, and nothing retries when the matches
arrive about 7 ms later (`reveal` is only set on the matched branch). Whether Obsidian's PDF view resolves
`openFile` late enough to hide this is for the device check, but it is a plausible cause of #225.

### F3. Composer's colour row overflows on phones

Steps: iPhone, select text, Note. The sixth swatch ends at x 396 pt while the composer card ends at 394 pt;
in the narrower drawer of the Duo device (307 pt) the green swatch is cut off. Screenshot:
[screenshots/ios/f3-composer-swatch-clipped.png](screenshots/ios/f3-composer-swatch-clipped.png).
Source: the composer head (label + `.annotator-editor-inks`) in `styles.css` / `src/floating-composer.ts` does not
wrap or shrink at drawer widths under about 340 pt. Narrower iPhones (375 pt) will clip more.

### F4. iPhone landscape: EPUB toolbar ends under the right inset; reading area is short

Steps: iPhone 17 Pro landscape, open the EPUB. The reader toolbar's last button ("Reading controls") ends at
x 866 of 874 pt with a 62 pt right inset. Obsidian 1.15's CSS pads only the left of the root split
(`.is-mobile .workspace>.mod-root{padding-left: var(--safe-area-inset-left)}`) and `styles.css` has no right-inset
padding, so this probably happens in the app too; confirm on a device. Also, the book viewport is 187 pt of the
402 pt screen (header, reader toolbar, status line and the 80 px navbar allowance from EPUB_MOBILE_VIEWPORT take
the rest): readable but cramped. Source: the EPUB reader bar in `src/epub.ts` / `styles.css`.

### F5. iPad: the selection bar is centred on the screen, not the page

With the drawer docked (x ≥ 682 pt in portrait) the bar spans x 341–691, so it overlaps the sidebar by 9 pt
and sits off-centre over the page. Source: `.is-mobile .annotator-selection-actions { left: 50% … }` in
`styles.css` (and `SelectionActions.build`, `src/selection-actions.ts`), which centre on the viewport.

### F6. A marked area's picture is named after the internal collection key

Steps: open the PDF through its note (or a link), Mark an area, drag a box. The picture is written to the
vault as `%00annotator-collection   Field guide 2024.pdf , Field guide 2 p2 area.png` (a NUL character in the
file name) and the note embeds `![[\u0000annotator-collection …]]`. Not iOS-specific. Source:
`saveArea()` in `src/main.ts` builds `title` from its `file` argument, which is the collection key
(`\0annotator-collection:[…]`) when the source was opened through a note; it should use the source path
(`collectionSource(file)`). The PDF import path that also names `… area.png` from `key` should be checked too.

### F7. iPad video note: YouTube Error 153 (#207)

Steps: open `Lecture.md`, Open this note's source. The video view lays out well beside the docked list, but
the YouTube player shows "Video player configuration error, Error 153", and the plugin explains "YouTube
requires player client identification." Screenshot:
[screenshots/ios/f2-ipad-video-error-153.png](screenshots/ios/f2-ipad-video-error-153.png).
Cause: `src/embedded-video.ts` sets YouTube's `origin` parameter only for http(s) pages, and a `capacitor://`
page sends no usable referrer to https. Obsidian for iOS serves from `capacitor://localhost`, so this is a
likely explanation of #207 on iPad (Android's Capacitor origin is `http://localhost`, which is why it plays
there). Confirm on a device; the harness's origin matches the app's but not necessarily its headers.

## Fixes

F1 to F6 are fixed in the repository (applied 2026-11-13 from the patch this pass wrote and ran in the harness
on the iPhone 17 Pro and iPad Pro simulators). Tests added with them: highlights surviving a zoom and a link
landing on its page (`native-pdf-lifecycle.test.mjs`, both fail on the code before), and the picture's file
name (`design.test.mjs`).

| | Where | Change | Verified |
|---|---|---|---|
| F1 | `src/native-pdf.ts`, `paint()` | Skip a page whose `.textLayer` is `hidden` (pdf.js redrawing at a new zoom) and observe the text layer with the existing `ResizeObserver`, so the page is painted when the layer reappears. Do not store a page in `kept` when a passage got no rectangles. | iPad: 0 of 21 zoom steps lose the highlight (was 2 of 7); marks line up with their text to the pixel at 70/80/130%. |
| F2 | `src/native-pdf.ts`, `activate()`, new `moveToReveal()`, `land()` | `activate()` always records the reveal; `moveToReveal()` (also called from `land()`, which runs on every paint) goes to the matched page, else the note's page, once pdf.js has pages (`pagesCount !== 0`). The 4 s landing window starts when the page is reached (30 s cap while waiting). `pagesCount` added to the `PdfViewer` interface. | iPad: cold-open link lands on page 30 with the highlight on screen; already-open case unchanged; navigation tests pass. |
| F3 | `styles.css`, `.annotator-editor-head`, `.annotator-editor-inks` | `flex-wrap: wrap` (row gap 8px): where the six swatches do not fit beside "NEW NOTE" they take their own row. Desktop and iPad widths are unchanged (they fit). | iPhone: last swatch ends at 312 pt inside a card ending at 394 pt. |
| F4 | `styles.css` | `.is-mobile .mod-root .annotator-epub-reader { padding-inline-end: var(--safe-area-inset-right, 0px); }` (the `.mod-root` is needed to beat `.annotator-epub-reader.annotator-publication { padding: 0 }`). | iPhone landscape: last toolbar button at 804 pt (safe edge 812), text at 787; bottom padding unchanged; portrait unaffected. |
| F5 | `src/selection-actions.ts` `build()`, `styles.css` mobile rule | Set `--annotator-source-center` / `--annotator-source-width` from the reader element's box; the mobile rule uses them for `left` and `max-width` (falls back to 50% / 100vw). | iPad docked: bar centre 341 = page centre 341, right edge 516 < sidebar 682. |
| F6 | `src/main.ts` lines 842, 884, 1452 | Use `collectionSource(file/key)` for the picture title, as line 626 already does (area pictures, book figures, imported PDF areas). | iPad: `Field guide 2024 p1 area.png`, embedded as `![[Field guide 2024 p1 area.png]]`. |

F7 has no fix inside the plugin, and the plugin will not depend on an external server for it (owner's decision,
2026-11-13). What was established in the Simulator:
- The embed fails with Error 153 from the `capacitor://localhost` page whatever the URL says (`origin=https://…`,
  `widget_referrer=…`, `youtube-nocookie.com`), and plays from an `http://localhost` page in Mobile Safari: YouTube
  needs an http(s) Referer, which a `capacitor://` page cannot send.
- A relay made by the plugin itself does not help: a `blob:` page or a `srcdoc` frame inherits the `capacitor://`
  origin, a `data:` page has an opaque one; all three get Error 153.
- A relay page on an https site does work (prototype: load, play, pause, seek ±10 s and a timestamped note all
  passed through it on the iPad simulator), but that is a hosted server the plugin would depend on, so it was
  dropped and removed.
- Taking YouTube's raw streams through `requestUrl` (posing as YouTube's own app) would avoid the player, but goes
  against YouTube's terms; not pursued.

What remains open for the device check and the plan: (a) whether YouTube embeds in an ordinary Obsidian note play
in Obsidian for iOS (if Obsidian solves it in the app, the plugin's player may simply work there; the harness cannot
show the app's own headers); (b) if they do not, a graceful fallback on Error 153 on iOS: say plainly that YouTube
does not play inside Obsidian on iOS, and offer "Open in YouTube at this time" for the video and for each
timestamped note, with notes, timestamps typed by hand and transcripts still working without the player.

### F7 fallback (applied 2026-11-13)

Applied to the repository from the patch this pass wrote, with a test (`embedded-video.test.mjs`):
- `src/embedded-video.ts`: the player is still tried as before, so nothing is lost if Obsidian for iOS does play
  embeds. When YouTube answers Error 153 on a `capacitor:` page, YouTube's error screen is replaced by "YouTube
  videos can't play inside Obsidian on iOS. Your annotations are below." and an **Open in YouTube** link
  (`window.open`, which Obsidian hands to the system browser or the YouTube app). A new optional
  `VideoPlayback.elsewhere(seconds)` gives that address at a time. Any other error, and every other platform, is
  unchanged.
- `src/video-view.ts`, `goToTimestamp`: where the player gives an `elsewhere` address, tapping a note's time opens
  YouTube at that time instead of showing an error.
- `styles.css`: the message box in the player's place (16:9, theme colours), and Play, Pause, speed, "Note at the
  current time" and "Note with this frame" hidden while there is no player. The list, search, New annotation,
  editing, links, the timeline and the transcript stay.

Verified on the iPad and iPhone simulators (iOS 27.0): the message and link replace the player; only "Open
Markdown" and "Refresh annotations" remain in the toolbar; both saved time notes are listed; the link opens
`https://www.youtube.com/watch?v=aqz-KE-bpKQ`, and tapping 0:18 and 1:35 opens it with `&t=18s` and `&t=95s`, with
no error shown. The full `test:reader` list passes (585 tests). On a device, check that the link actually leaves
Obsidian for the YouTube app or Safari (the harness records the `window.open` call; it has no system browser).

## Still for the owner's iPhone and iPad

- The plugin loading and enabling in Obsidian for iOS / current iPadOS (#289).
- F1, F2, F4 and F7 in the real app (Obsidian's PDF view wrapper and timing, its layout and headers).
- Obsidian's own keyboard handling: whether the web view resizes or only `--keyboard-height` changes, and its
  toolbar above the keyboard, with the composer open. The harness passes the keyboard height but does not
  resize the web view, and shows WebKit's form accessory bar.
- Pinch zoom and Obsidian's PDF toolbar (the harness has neither; it zooms through pdf.js directly).
- Pen hover showing a highlight's note (#373) with an Apple Pencil.
- Sync of a note made on desktop with a spaced file name arriving on the device (#89): the matching side passes here.
- Long-text typing with the real keyboard (Simulator text injection sometimes doubled or dropped input; the
  composer value was checked after each entry).
