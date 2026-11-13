# Publisher stylesheet sets — 0.0.110

The published IDPF Vertical Writing sample exposed two concrete incompatibilities: the reader applied its horizontal alternate stylesheet together with its preferred vertical sheet, and ignored the `-epub-writing-mode` / `-webkit-writing-mode` declarations used by the book. Named stylesheet sets are now selected before resources are read. Those two legacy writing-mode aliases map to the same bounded canonical declaration/cascade path; arbitrary prefixes are not accepted.

Untitled CSS remains persistent. The author default comes from default-style metadata or the first preferred named sheet. Only the selected named set is loaded/applied. Disabled linked sheets, non-CSS types and inactive alternates are not fetched or counted as styling failures. Named inline style elements and case-insensitive relationship tokens are supported. The selection model follows [HTML stylesheet sets](https://www.w3.org/TR/html4/present/styles.html) and [CSSOM's preferred-set model](https://drafts.csswg.org/cssom-1/).

Books with named sets expose **Publisher style** in the native reading controls. Readers can select an author-provided alternative or return to Publisher default; the control is hidden for books without choices. The requested source position survives the remount. The selection follows matching titles across chapters in the current open book; a new open/reload returns to the author's default. This is static authored stylesheet selection, not execution of book scripts or persistence of arbitrary browser stylesheet state.

## Published corpus evidence

The unmodified [IDPF Vertical Writing sample](https://idpf.github.io/epub3-samples/30/samples.html), **ガリ版の話** by **津野海太郎**, publisher **株式会社ボイジャー**, is downloaded separately from the 20230704 release. The catalog lists CC BY-SA 3.0 as its default license and no alternative for this sample. `test-support/published-epub-corpus.json` records attribution, URL, 267252-byte size and SHA256 `6623732b1aa7cefed26e2db95f7ac14c80360b99d328ed927b93548a96990c62`. No EPUB content is copied into the repository or shipped plugin.

`test-support/browser-publisher-sample-check.mjs` refuses a different artifact hash. Actual EpubView/projection/style code in fresh Chromium 151.0.7922.34 opens chapter 2 with preferred 縦組 (vertical-rl), chooses 横組 (horizontal-tb) through the native selector, then returns to the default. Source offset 200 and the chapter's 3866-character text remain unchanged throughout; the EPUB's on-disk hash is rechecked. Screenshots and observations: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-published-vertical/native-final`. The first browser run exposed the empty default option's missing explicit value; it was corrected and added to the host regression.

The source displays **42 unsupported styling omissions** in both styles. This result establishes the author-set and writing-direction behavior, not complete typography, layout, media-overlay or visual fidelity for the sample. It is an isolated browser with the test-only Obsidian boundary, not actual Obsidian/device or full published-plugin UI evidence. The preceding synthetic eight-case vertical/responsive corpus also passes.

All 375 tests pass, including persistent/preferred/alternate loading, default-style metadata, named inline sheets, inactive/disabled/non-CSS resource exclusion, alias behavior and the native selector's default/alternative/default cycle without book-byte changes. Release/original-ID rehearsal checks pass. Installed Android remains 0.0.107; no vault, annotation wire format or Bend theorem changed.

Run after the normal build, with the pinned sample already downloaded:

```sh
ANNOTATOR_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node test-support/browser-publisher-sample-check.mjs /path/to/mymedia_lite.epub /private/evidence
```
