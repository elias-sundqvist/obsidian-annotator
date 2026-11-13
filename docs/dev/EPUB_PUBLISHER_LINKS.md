# Publisher hyperlink selectors — 0.0.116

The bounded publisher cascade now accepts `:link` and `:any-link`, using the browser's selector matching against the inert source document. Original selector specificity and source ordering remain intact. Matching the source is necessary because projected links deliberately replace/remove their href and named anchors can become spans. No author selectors or stylesheets are installed into Obsidian's document.

The [Selectors specification](https://www.w3.org/TR/selectors-4/#the-any-link-pseudo) distinguishes hyperlinks from named anchors and distinguishes unvisited/visited history. This implementation supports static source hyperlink styling. It neither reads browser history nor tracks book-link visits; `:visited` remains an explicit styling omission. Hover, focus and target-dependent publisher styling also remain outside the static cascade.

## Verification

A regression failed before implementation: a real link was gray rather than the publisher's navy. It now covers source hyperlink and descendant matching, specificity/source order, class overrides, empty references, named anchors, non-anchor href attributes, unchanged source DOM and projection selection roundtrip. Its visited rule remains two explicit omission events (one per source pass). All 379 tests and the release/original-ID rehearsal build pass.

A fresh isolated Chromium 151.0.7922.34 compares five projected fixture nodes against independent CSS in a shadow root: color, decoration and font weight agree; the screenshot was inspected. The fixture targets are unvisited. Source bytes remain unchanged. This checks visual styles, not navigation or history-state transitions. Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-publisher-hyperlinks/unvisited-reference/` (`observations.json`, `comparison.png`); reproduce with `test-support/browser-hyperlink-check.mjs`.

The initial browser fixture included an empty href, which resolves to the already-visited fixture page. Its reference visibly used the unsupported visited color even though computed style concealed that history-dependent difference. It was excluded from the unvisited visual comparison; the unit regression still covers empty-reference source matching. Initial evidence remains in `.../reference/` and must not be presented as visual parity. This illustrates why computed styles alone do not prove visited appearance.

The pinned unmodified IDPF Vertical Writing sample passes preferred/horizontal/default author-style switching with requested offset 200 and three remaining omission events, reduced from five. These comprise the still-rejected visited selector in two source passes and the unsupported page rule. Evidence: `.../published/`. The sample itself remains outside the distribution.

Installed Android remains 0.0.115. Current-host/device hyperlink rendering, visited appearance, dynamic pseudo-classes, full published application UI interoperability and wider corpus checks remain open. No annotation storage, vault or Bend contract changed.
