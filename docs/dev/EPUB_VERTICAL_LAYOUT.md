# Vertical EPUB layout — 0.0.106

Native reflowable EPUB chapters now retain publisher `writing-mode: vertical-rl` and `vertical-lr`, `text-orientation` and `text-combine-upright`. Chapter roots start in the source document's horizontal default, so a neighboring vertical chapter does not become their implicit host default. Fixed-page coordinate fitting keeps its existing outer horizontal layout; publisher text can still use its own writing mode within the page.

Continuous vertical reading advances horizontally, using negative scrollLeft for vertical-rl and positive scrollLeft for vertical-lr. Vertical multicolumn pagination advances along physical Y. Body sizing, overflow, page steps, chapter visibility/windowing, retention while prepending/removing chapters, reading-position restoration and resize restoration share the reading-axis model. Entering a chapter with another writing mode reconciles the outer layout around the visible text anchor. An asynchronous window operation does not apply old-axis scroll compensation after that axis changes.

This follows the axes defined in [CSS Writing Modes](https://www.w3.org/TR/css-writing-modes-4/) and the inline-axis columns in [CSS Multi-column Layout](https://www.w3.org/TR/css-multicol-1/). Sideways chapter writing modes are still omitted rather than sent through an incompatible geometry path.

## Verification

All 369 native tests pass, including the new inherited vertical typography/unsupported-sideways regression and the existing continuous/RTL/fixed-page lifecycle suite. Release and original-ID rehearsal packaging pass.

`test-support/vertical-layout-fixture.mjs` generates a deterministic four-chapter synthetic corpus for vertical-rl, vertical-lr and alternating vertical/horizontal modes. `test-support/browser-vertical-epub-check.mjs` loads those actual EPUB bytes into the production EpubView bundle with the existing test-only Obsidian boundary in fresh Chromium 151.0.7922.34. It checks six writing/mode combinations:

- Real pointer selection of the vertical `章0` heading yields that exact native quote. The frozen published Hypothesis HTML anchor module locates the same original text, and native highlight painting runs.
- Page/reading advances move the text anchor and the expected scroll axis. Reopening the chapter restores the leading text offset within one UTF-16 code unit in this fixture.
- Switching reading modes keeps the requested passage visible. Pagination rounds to a containing page, so the page's leading offset can differ from the incoming continuous offset; no exact leading-offset promise is inferred from the mode switch.
- Resizing retains a later passage and reopening at its resulting offset remains stable.
- Forward movement crosses chapter boundaries; continuous mode releases chapter 0 and retains later chapters. Mixed-mode runs actually enter a horizontal chapter. Backward movement returns to chapter 0.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-browser-vertical-epub/final-resize`, with structured observations, six layout screenshots and six pointer-selection/highlight screenshots. Earlier runs in the same parent directory retain initial/expanded diagnostic results. The first mode-toggle assertion incorrectly demanded identical leading offsets after pagination; it was replaced with direct visibility of the requested passage, matching the containing-page behavior.

Run after `npm run build`:

```sh
ANNOTATOR_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node test-support/browser-vertical-epub-check.mjs /private/evidence/directory
```

The optional Playwright module is a QA dependency, not shipped in the plugin. Browser fixtures attach to no user tabs and read/write no vault. Installed artifacts, personal notes, source selectors, annotation storage and Bend proofs are unchanged by this checkpoint.

## Remaining gates

Actual Obsidian/Android vertical reading and selection, broader real Japanese/Chinese/Mongolian books, nested orthogonal flows, bidi and sideways variants, vertical ruby/complex multi-level ruby, images/tables/fixed-page combinations, conditional writing-mode changes, minimum host versions and assistive technology remain unverified. This is implemented vertical layout with bounded synthetic browser evidence, not completion of the native replacement or the full CSS writing-mode specification.

## Android gesture ownership and live highlights — 0.0.107

Actual Android Obsidian 1.14.4 exposed a host gesture conflict that the isolated browser could not: a rightward swipe scrolled vertical-rl text but also opened the file drawer. Read-only inspection of Obsidian 1.14.5's installed host bundle identified its existing `data-ignore-swipe` convention, also used by native canvas surfaces. Horizontal reading viewports now set that marker; other reading axes remove it, and the toolbar stays outside it. No touch default action or text-selection event is cancelled.

The same swipe on installed 0.0.107 advanced the passage without opening the drawer. A long press selected the Japanese character `の`; the native Highlight action saved it and painted its vertical glyph. Exact-URI search through the frozen published parser found the actual pulled record, and its original-chapter Hypothesis anchor restored `の`. Scroll-mode cold reopen restored the saved chapter/offset (0/545) and the highlight. Native pagination buttons advanced through later passages and brought the mark into view; a second cold reopen restored the pagination position (0/516) with the highlight visible.

The initial Android mode-selection attempts involved an immediate second tap and did not establish exact source-anchor retention across the mode change. That claim remains browser evidence: the expanded fixture now uses the actual native reading-mode control callback, opens/closes its controls, and verifies the requested character stays visible. Both 900- and 397-CSS-pixel reader widths pass all six writing/mode cases. Resize shrinks each starting width proportionally; chapter-boundary steps are bounded but adapt to the number of pages instead of assuming ten steps suffice for narrow readers. Intermediate fixture failures from the earlier fixed step count and fixed 700-pixel resize are retained as diagnostics.

All 370 tests and release/original-ID rehearsal builds pass. The new regression checks that horizontal reading gets the host marker, toolbar gestures do not inherit it, and ordinary vertical scrolling removes it. Actual desktop/minimum-host behavior, vertical-lr and mixed-mode Android interaction, wider content and assistive technology remain open.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-vertical-android`: screenshot 02 reproduces the drawer conflict; 05 shows the fixed swipe; 06/07 show native selection/creation; 09 shows scroll cold restoration; 16/17 show pagination movement; 18 shows pagination cold restoration. `narrow-browser-bounded` and `wide-browser-final` contain the expanded browser checks. `published-check.json` records the real saved annotation's published search/anchor result. The EPUB stayed byte-identical, and the created note stayed byte-identical through both reopens and mode changes. Workspace, plugin data and community-plugin settings were restored exactly; synthetic files were removed. Installed experimental artifacts match 0.0.107. No personal vault, physical tablet, annotation wire format or Bend theorem changed.

## Source-root inheritance — 0.0.108

A retained chapter body shares a rendered element with the inherited HTML-root cascade. Passing `inherit` or inherited `unset` through as literal CSS made the chapter inherit Obsidian's outer viewport instead of the book's HTML root. Writing mode, text orientation and upright combining now resolve these keywords against a snapshot of the source HTML-root winners. At the source root, or when there is no inherited source value, their initial values are `horizontal-tb`, `mixed` and `none`, respectively, per [CSS Writing Modes](https://www.w3.org/TR/css-writing-modes-4/). `initial` always uses that source initial value. Conditional-style refresh rebuilds the snapshot, so a media rule can change the inherited chapter direction.

The new regression failed on 0.0.107 (`inherit` remained literal). It verifies inherited vertical-rl, a conditional vertical-lr switch, orientation/combining inheritance and a plain source chapter's horizontal default inside a vertical host. All 371 tests and release/original-ID rehearsal checks pass. The deterministic vertical corpus now explicitly uses body writing-mode/orientation inheritance; all six actual EPUB browser cases pass at both wide and narrow reader widths. Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-writing-inheritance/{wide,narrow}`. This fixes the three writing-layout properties at the collapsed HTML/body boundary; it does not claim general computed-style inheritance for every publisher property. No installed artifact, vault, annotation format or Bend proof changed in this checkpoint; Android inheritance-reset checks remain open.

## Responsive writing and anchor stability — 0.0.109

The corpus now includes conditional vertical-to-horizontal writing on resize. All eight browser cases pass at wide/narrow initial widths. Requested source offsets are retained independently of containing-page starts, closing the repeated control/mode-change drift observed during this check. See [precise reading-position semantics and evidence](EPUB_READING_POSITION.md). This supersedes the earlier saved-leading-offset behavior while retaining normal page-boundary geometry. Device checks remain open.
