# Continuous EPUB reading

Scroll mode mounts neighboring linear chapters in one viewport. Chapters near
its edges are prefetched; content more than two viewports away can be released.
An active text selection retains its chapter and all intervening mounted chapters
so scrolling back never jumps across a hole. Once selection is released, distant
DOM and blob resources can be evicted. Original inert section DOM remains in the
publication resolver; its existing 32 MiB index budget is unchanged.

Each mounted section has its own original↔rendered mapping. Capturing text uses
the section containing the actual selection, not the chapter currently named in
the toolbar. A pending capture keeps that section's URI and metadata while other
chapters scroll into view. Cross-chapter selections are refused, matching the
legacy per-frame authoring boundary. Imported data is preserved regardless.

Position data remains `{chapter, offset}` with a chapter-local UTF-16 reading
position. App state and persisted progress are restored into the correct mounted
section. A short final chapter gets enough trailing room to reach the top rather
than being clamped inside its predecessor. Browser automatic scroll anchoring is
disabled in this viewport; explicit compensation handles prepends/removals and
accounts for user scroll during asynchronous image work. Pagination still mounts
one chapter. Repeated reading-mode changes invalidate older loads by epoch.

Non-linear/non-spine sections, such as separately linked footnotes, can be opened
explicitly and returned from using Back. They are not appended to the normal
linear reading flow. Their original IDs/selectors are unchanged.

Tests: `epub-continuous.test.mjs` and the existing lifecycle/selector suites.
Actual desktop/Android evidence is documented in `ANDROID_AND_PARITY_RESULTS.md`.
This does not claim a measured large-book memory/performance budget, complete
orientation reflow, RTL pagination, CJK vertical layout or fixed-layout support.
