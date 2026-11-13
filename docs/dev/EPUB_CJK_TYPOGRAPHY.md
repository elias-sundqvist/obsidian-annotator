# EPUB CJK typography — 0.0.112

Publisher text emphasis now retains its style, color and independent position through the bounded source cascade. The shorthand resets style/color but leaves position intact. Inherited values at the collapsed HTML/body boundary resolve against the book. Registered EPUB/WebKit typography aliases normalize legacy orientation and upright-combining values; arbitrary misspelled prefixes and invalid canonical values remain rejected.

References: [CSS Text Decoration](https://www.w3.org/TR/css-text-decor-3/) and [EPUB CSS writing modes](https://idpf.org/epub/31/spec/epub-contentdocs.html#sec-css-writing-modes). Legacy `horizontal N` maps to `digits N`; rendering remains subject to the host browser's support. This does not establish support for every combining value.

## Verification

The regression failed before implementation. All 377 tests and the release/original-ID rehearsal build pass. A fresh Chromium 151.0.7922.34 compares six rendered elements against independently canonicalized reference CSS: computed emphasis/orientation/combining and dimensions agree. Real text selection anchors identically in the native projection and frozen published Hypothesis anchoring module; generated emphasis marks do not enter the quote. Source bytes remain unchanged and the synthetic fixture reports zero omissions.

Private reference evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-cjk-typography/reference/` (`observations.json`, `comparison.png`). Reproduce with `test-support/browser-cjk-typography-check.mjs` and the configured Playwright module.

The corpus adds the unmodified official IDPF Kusamakura sample (17,940,673 bytes), pinned by SHA256 in `test-support/published-epub-corpus.json`. Chapter 2 has 8,404 text characters. Preferred vertical → author horizontal → preferred vertical switching preserves requested source offset 200. Six original `strong.sesame_dot` elements retain sesame emphasis with red marks and blue text in all three phases. Nine omission events remain. The earlier Vertical Writing sample also passes again with offset 200 and five remaining omissions. Neither book is bundled into the repository or distribution. Catalog/license provenance is recorded in the corpus manifest.

Private real-book evidence: `.../2026-11-02-cjk-typography/kusamakura-emphasis/` and `.../mymedia-regression/`, under the validation directory above. Run `test-support/browser-publisher-sample-check.mjs` with `ANNOTATOR_CORPUS_SAMPLE=kusamakura` for the second book; the default selects the first sample.

## Remaining scope

These checks use an isolated browser fixture, not current Obsidian desktop/mobile. Installed Android remains 0.0.107. Complex ruby/emphasis interactions, additional writing systems, omitted CSS, media overlays/audio and wider books still need validation. Storage schemas, annotation wire format, personal vaults and Bend proofs are unchanged. The native replacement is not ready for promotion.

## Android published-book check — 0.0.112

Android Obsidian 1.14.4 on emulator-5554 loaded the unmodified Kusamakura sample in portrait. Native touch controls switched preferred vertical → author horizontal → publisher default vertical. Saved positions after the horizontal/default phases remained chapter 2, offset 200. Six source strong elements had computed sesame emphasis and red emphasis color in both settled styles and after a cold reopen. Screenshots visibly show red marks, blue emphasized text and ruby. The cold reopen returned to the same vertical passage. This checks one chapter and does not establish full CRUD, media-overlay/audio or accessibility support.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-cjk-android/`: `05-horizontal-settled-dom.json`, `06-horizontal-reading.png`, `08-default-dom.json`, `08-default-data.json`, `09-cold-dom.json`, `09-cold.png`, and `audit.json`. Inspection used read-only WebView DOM/CSS plus native ADB taps/screenshots. The first horizontal screenshot was captured while styling was loading; settled rendering was checked separately. Initial staging selected a different existing workspace tab; correcting the active tab preceded the book test.

The book SHA256 and note bytes were checked unchanged. Original workspace, community-plugin list and plugin data were restored exactly; the copied book/note and temporary forwarding were removed. The isolated Android plugin is now 0.0.112 with all three installed artifacts hash-verified against dist. No personal vault or physical device was used.

The host bottom toolbar overlaps reading text in the screenshots. Viewport sizing/occlusion needs a follow-up fix; these checks do not close mobile layout readiness. Desktop, mixed writing/ruby cases and the other compatibility gates remain open.
