# Native PDF investigation

> **Using the reader?** Start with the [guide](GUIDE.md): reading,
> highlighting, areas, drawing, books, video, exports and styling, with
> screenshots. What changed is in the [changelog](CHANGELOG.md). The rest of
> this file is the investigation log.

Branch: `experiment/obsidian-native-pdf`, based on Bend commit `9b8fe21`.
Investigated 2026-10-30. All source changes remain on this experimental branch.
The native reader is a separate test plugin; the experimental legacy backend now
shares its Bend store. No production release or personal vault is updated.

**Conclusion:** replacing the PDF iframe/Hypothesis UI with Obsidian's built-in
PDF view plus a native annotation sidebar is feasible. Existing plugins provide
concrete implementations of the host integration. The difficult part is
preserving existing annotation anchoring across PDF.js versions and page
virtualization, not drawing a native comment form. There is no inspected fork
that we can simply merge to obtain this architecture.

## EPUB and website implementation

Version 0.0.7 adds shared EPUB identity and verified recovery across repackaged
books, plus bundled Hypothesis frame routing. See
[EPUB_IDENTITY_RESULTS.md](EPUB_IDENTITY_RESULTS.md) for the policy and live checks.

Version 0.0.6 adds an EPUB FileView, Markdown website reading copies, and an
adapter for the core Web viewer, sharing the native sidebar and Bend store.
See [EPUB_WEB_RESULTS.md](EPUB_WEB_RESULTS.md) for usage, cross compatibility,
checks and live Obsidian EPUB/web screenshot evidence.

## Current implementation: persistent highlights

Version 0.0.5 includes cross-reader storage, tags, page notes, replies and JSON exchange;
see [INTEROPERABILITY_RESULTS.md](INTEROPERABILITY_RESULTS.md). Version 0.0.2 live
evidence establishes that the reader paints clickable, persistent highlights on the built-in reader.
Single-page text selections create annotations in the associated Markdown note
using the existing typed Bend codec and source CRUD. Comments can be reopened
by clicking a PDF highlight, edited, or deleted. Multiline selections paint one
rectangle per native DOM text range. Native zoom, page replacement and resize
trigger repainting; scrolling moves the page-relative overlays naturally.

No PDF bytes are modified. Existing Markdown/prose and unknown annotation fields
are retained by the codec. Failed/ambiguous quote matches remain visible in the
annotation list. See [HIGHLIGHT_TEST_RESULTS.md](HIGHLIGHT_TEST_RESULTS.md) for
live screenshots, the actual saved fixture, and exact tested/untested boundaries.

The published plugin remains unchanged; this is still an experimental branch.

## What the fork investigation found

GitHub's public forks endpoint returned 85 direct forks in a single page. I
screened the 13 with pushes later than the upstream 2024-01-08 timestamp, reading
the default branch README, main, definePdfAnnotation and defineGenericAnnotation
files. All 13 still contain the iframe integration. The two most relevant forks
were additionally cloned and inspected. This is a bounded default-branch survey,
not an assertion about every branch, deleted repository or indirect fork.
[research.json](research.json) records the screened repositories and pinned
commits for the deeper source inspections.

| Project | Actual architecture and useful material |
| --- | --- |
| [Annotator+](https://github.com/0shombh-d3v/annotator-plus/tree/68f1be5793b9d5539f776882c589be9ee2ee712b) | Direct fork, still uses OfflineIframe and bundled Hypothesis/PDF reader. Useful local-PDF resolution, note lifecycle and theme fixes; not a native-viewer migration. |
| [obsidian-references](https://github.com/sparthaje/obsidian-references/tree/119651f4ccda516611bca7177a877ffd19f7f170) | Direct fork, still uses the generic iframe and React annotator view. No ready native replacement found. |
| [PDF++](https://github.com/RyotaUshio/obsidian-pdf-plus/tree/6a3218b9c506076b405438489e614bc9e22b833b) | Independent plugin extending Obsidian's existing PDF viewer. Strong reference for selection, viewer lifecycle, geometry, link navigation and compatibility handling. Not a replacement storage backend for our Markdown format. |
| [PDF Annotator](https://github.com/predator2k/obs-pdf-annotator/tree/9ad1c72ceb99129c33a4551f1e93028e34876691) | Independent plugin with native overlays plus a separate custom-reader mode. Its native mode demonstrates layers, margin cards, selection and cleanup. Its sidecar format is different, and its geometry path loads a bundled PDF.js document. |

The latter two repositories have MIT licenses, with additional third-party
notices in PDF++. Our repository has AGPLv3 in LICENSE.TXT despite the historical
package.json saying MIT. No third-party implementation was copied into this
spike. If we extract code later, retain the relevant notices and inspect the
specific dependency/code's license rather than assuming every file is MIT.

Useful source entry points:

- Annotator+ [defineGenericAnnotation.tsx](https://github.com/0shombh-d3v/annotator-plus/blob/68f1be5793b9d5539f776882c589be9ee2ee712b/src/defineGenericAnnotation.tsx) still imports OfflineIframe.
- PDF++ [viewer access](https://github.com/RyotaUshio/obsidian-pdf-plus/blob/6a3218b9c506076b405438489e614bc9e22b833b/src/lib/index.ts), [highlight geometry](https://github.com/RyotaUshio/obsidian-pdf-plus/blob/6a3218b9c506076b405438489e614bc9e22b833b/src/lib/highlights/geometry.ts) and [private typings](https://github.com/RyotaUshio/obsidian-pdf-plus/blob/6a3218b9c506076b405438489e614bc9e22b833b/src/typings.d.ts).
- PDF Annotator [native-overlay.ts](https://github.com/predator2k/obs-pdf-annotator/blob/9ad1c72ceb99129c33a4551f1e93028e34876691/src/native-overlay.ts) and [pdf-engine.ts](https://github.com/predator2k/obs-pdf-annotator/blob/9ad1c72ceb99129c33a4551f1e93028e34876691/src/pdf-engine.ts).

The native-overlay header describes DOM-only integration, but the inspected
implementation also defensively reads `leaf.view.viewer.child.pdfViewer`.
Its header alone is not evidence of a wholly public API implementation.

## Proposed architecture

```text
Obsidian PDF tab (host owns canvas, text layer, toolbar, zoom and navigation)
    ↕ NativePdfAdapter (selection, page lifecycle, anchoring, overlay geometry)
Native annotation ItemView (comment editor, tags, list, Markdown preview)
    ↕ AnnotationService (note/PDF association, IDs, conflict handling)
Compiled Bend codec + typed CRUD
    ↕ Vault.process / atomic current-version checks
Existing annotation Markdown note (same IDs, unknown fields and untouched prose)
```

Keep the UI and storage ports independent. The PDF path can stop loading
react-offline-iframe, the scraped via.hypothes.is PDF viewer, the Hypothesis
sidebar, fake HTTP routes, iframe event bubbling and iframe Markdown bridges.
Use Obsidian components, icons, theme variables and MarkdownRenderer directly.
The native PDF viewer already supplies rendering, selection, search and zoom.

Deleting every iframe dependency in the whole plugin is a separate milestone:
EPUB, web and video currently use the generic iframe path too. A native PDF
reader does not replace those readers. Once PDF parity is achieved, retain or
separately redesign those modes before removing shared resources/dependencies.
Remote PDF URLs also need an explicit policy: this spike accepts vault-local
PDFs only. A future download/cache action must define where files live and how
existing remote target URIs are preserved; do not silently rewrite targets.

## Public API versus private surface

The installed, pinned Obsidian 1.11.4 declaration package exposes `FileView`,
`ItemView`, workspace events, `openFile`, MarkdownRenderer and **loadPdfJs**.
It does not expose a typed PDFView/PDFViewerChild or a supported page/text-layer
lifecycle API. Loading the host's PDF.js library is public; accessing the active
viewer's document and viewport is not thereby public.

Recommended progression:

1. Use public workspace APIs for native PDF tabs and an ItemView for the UI.
2. Isolate `.textLayer` and `.page[data-page-number]` assumptions in one adapter.
   These are still private DOM contracts, not guaranteed plugin APIs.
3. For durable highlighting, use a guarded, narrowly typed host-viewer adapter
   for the PDF document, page viewports and page-render events. PDF++ is the
   reference. Missing capabilities should disable painting/saving with a
   visible explanation while leaving PDF reading and annotation inspection usable.
4. Prefer the host's PDF.js and document over bundling another renderer. If
   public `loadPdfJs` plus a separately opened geometry/text document is needed
   as fallback, measure its extra parsing/memory cost and verify extraction
   consistency. Do not import all of PDF++ or PDF Annotator as a hard dependency.

Native overlays must be recreated after text-layer/page replacement; the viewer
may discard off-screen page DOM. Scope observers to each PDF view, paint only
rendered pages, remove subscriptions on file switch/close/unload, and support
multiple PDFs and multiple views of one PDF without global viewer assumptions.
Use each view's ownerDocument for pop-out windows. Zoom/rotation must transform
PDF-space coordinates through the page viewport, not rescale stale screen rects.

## The main compatibility problem: existing selectors

Our bundled Hypothesis client at `6e9f06ad6` already has reusable anchoring code:
[PDF anchoring](../../submodules/hypothesis-client-annotator-fork/src/annotator/anchoring/pdf.js),
quote matching and normalization helpers. We can retain/adapt those algorithms
without retaining its iframe or UI. The PDF module currently relies on the
`PDFViewerApplication` global and page sibling order, so it needs an injected
viewer interface and explicit page indices rather than being copied unchanged.

Its position selectors are **document-wide UTF-16 offsets**: page offsets sum
`getTextContent().items.map(it => it.str).join('')` lengths for earlier pages.
They are not page-local DOM offsets, PDF++'s text-item indices, or Bend character
counts. Its quote anchoring normalizes whitespace and maps matches back to text
layers. The newer host PDF.js may extract text differently. Matching a stored
position without verifying the quote can silently attach to the wrong passage.

Preserve existing JSON selectors and annotation IDs. Use position as a hint,
verify exact/context, and fall back to quote anchoring. Report ambiguous or
unmatched anchors as unresolved annotations in the sidebar; never silently
hide them or rewrite their selectors during a read. Cache/index extraction
incrementally and cancel obsolete work on document changes. Test duplicate
quotes, ligatures, emoji, hyphenation, rotated pages and non-Latin text.

New page/geometry hints can be retained as extension fields in the typed Bend
model, but should be introduced only after specifying their units, versioning
and relation to the existing selectors. Geometry is a cache, not sufficient
proof that a quote still matches. The Bend storage laws do not establish that
a DOM selection belongs to the right passage in the PDF.

The Bend Node import hook is not used inside Obsidian. The current implementation
compiles the verified core ahead of time into the browser bundle. Document-size
performance still needs profiling. Host anchoring, vault I/O and concurrency
remain outside the checked pure-core laws.

## Run the current prototype

Requirements for building: Node 26, the pinned Bend 2.0.5 installation (default
`~/.bend`, overridable with `BEND_HOME`), and the initialized pinned Hypothesis
submodule for the parent experiment's full verifier. Obsidian receives ordinary
browser JavaScript, not the compiler or Node import hook.

```sh
cd experiments/native-pdf
npm ci --ignore-scripts
npm test
```

`npm test` performs strict TypeScript checking, builds the plugin and browser
codec, then runs eleven meaningful anchoring/storage tests. Build output is in
`dist/`; generated compiler/cache artifacts stay in ignored `.generated/`.
The build caches by Bend/compiler/Base source contents and exported roots,
and rejects proof holes/unsafe source. Native PDF geometry and host I/O remain
outside the formal proof boundary.

Copy `dist/main.js`, `manifest.json` and `styles.css` into a test vault's
`.obsidian/plugins/annotator-native-pdf-spike/`, then enable the plugin.

1. Open an existing annotation note and run **Open annotation target in built-in
   PDF reader**, or open a local PDF normally and run **Open native annotations**.
2. Select text on one page; enter an optional Markdown comment and click
   **Save highlight**. Selection alone does not persist anything.
3. Click a painted highlight or its list entry to reopen/edit the comment.
   **Delete highlight** removes its annotation block through the same codec.
4. Reopen/reload: annotations are read from Markdown and resolved against PDF
   text again. Text selection can be cleared without removing saved highlights.

A unique existing note targeting that PDF is discovered automatically. If
several notes target it, the user must open the desired note with the native
target command. The explicit association is retained in plugin data. If there
is no note, the first explicit save creates `<PDF path>.annotations.md` with
an annotation-target property; existing files at that path are never overwritten.
A removed note is not recreated automatically. Changed/missing explicit note targets and
malformed notes produce diagnostics and block mutation. Auto-created sidecars
and rename edge cases need further interactive coverage.

### Anchoring and painting contract

The native adapter reads the host document through guarded private
`view.viewer.child.pdfViewer.pdfViewer` access. Text is indexed across all pages
in PDF.js item order. New TextPositionSelector offsets are document-wide UTF-16
code units, and TextQuoteSelector stores exact text plus prefix/suffix context.
A versioned `nativePdf` extension records the page hint and units; it is preserved
by the typed codec. It does not replace quote verification.

Read/paint first verifies a position hint against the quote and supplied context.
If that fails, it searches the indexed pages and accepts a unique quote/context
match. Whitespace, soft hyphens, selected direction/zero-width controls and NFKC
ligatures are normalized with maps back to original UTF-16 positions. Partial
matches within an expanded ligature are refused. There is no fuzzy/edit-distance
matching or cross-page selection support. Duplicate unresolved quotes are
reported rather than attached arbitrarily.

Painting maps the resolved quote back into the current native text layer,
constructs DOM Ranges and recomputes their rectangles relative to a page overlay.
It stores no screen coordinates. Observers track native page DOM and size
changes. Every rectangle is an accessible button that opens its annotation;
pointer-down activation avoids a host page-replacement race before click.
Only the first target's text quote is painted. Page notes, unsupported selector
combinations and missing text layers remain list entries, not guessed marks.

Comment edits patch only the visible comment section through the Bend source
CRUD; original embedded JSON bytes, including unknown numeric lexemes, remain
unchanged. Visible text remains authoritative over any older stored JSON text.
Vault.process applies the codec to current note text atomically. Edits/deletes
compare the current typed annotation with the version the editor opened; a
changed/deleted annotation is refused rather than overwritten or resurrected.
PDF changes and plugin unload invalidate pending capture saves. These host
transaction checks are implementation/test boundaries, not new Bend theorems.

### Browser compilation fix

Live testing exposed Bend 2.0.5 generating very large JS functions for literal
string patterns. Explicit String.eq dispatch in annotation_schema.bend and
recognizer.bend keeps exactly the same rules and original 91 laws while avoiding
those functions. No compiler-generated JS is patched and no proof is weakened.
The v0.0.2 native bundle was roughly 316 KiB and its only external import is `obsidian`.
The complete Bend verifier still checks 15 negative controls, 30 integration tests and the new
creation-boundary law. The current cross-reader suite has 34 tests.

### Evidence and limits

The original in-memory spike's [TEST_RESULTS.md](TEST_RESULTS.md) is retained as
historical evidence. The earlier v0.0.2 persistent implementation has its own historical
[HIGHLIGHT_TEST_RESULTS.md](HIGHLIGHT_TEST_RESULTS.md). Current v0.0.5 live checks
are recorded in [INTEROPERABILITY_RESULTS.md](INTEROPERABILITY_RESULTS.md). Testing used
Obsidian 1.13.7 / macOS 26.6.2 in an isolated vault. The manifest minimum is the
pinned declaration version 1.11.4, not a tested minimum app version.

The native API/DOM contract is private. Rotation, overlapping annotations,
large/dense PDFs, split panes/pop-outs, mobile, and the full range of historical
PDF.js extraction differences still need testing. This is a working prototype,
not a claim of full Hypothesis feature parity. The PDF renderer remains entirely
Obsidian's; there is no bundled PDF.js renderer, Hypothesis UI, React or iframe.

## EPUB and websites

[HYPOTHESIS_COMPATIBILITY.md](HYPOTHESIS_COMPATIBILITY.md) makes legacy notes,
Hypothesis JSON exchange and alternating bidirectional CRUD between the native
UI and embedded Hypothesis client explicit release gates.
[INTEROPERABILITY_RESULTS.md](INTEROPERABILITY_RESULTS.md) records the implemented
shared-store CRUD, native tags/page notes/replies, PDF anchoring comparison and
Hypothesis JSON exchange, plus remaining rendering and live-test gates.

To build either experimental reader from a fresh checkout, initialize the pinned
Hypothesis submodule and run `npm ci --prefix experiments/native-pdf` first.
The legacy `npm run quick-build`, `npm test` and `npm run dev` commands now build
the shared browser codec before using it. Keep all builds on this experimental
branch; the legacy host minimum is now Obsidian 1.11.4.

[EPUB_AND_WEB_PLAN.md](EPUB_AND_WEB_PLAN.md) specifies the proposed native reader
surfaces, shared annotation architecture, reusable projects, locator/migration
contracts, mobile strategy and implementation/test gates. It is a plan, not an
implemented EPUB/web renderer.

## Next implementation gates

1. Extend live coverage to rotation, overlapping highlights, split panes,
   pop-outs, mobile, large documents and geometry/selection edge cases.
2. Broaden compatibility against existing annotation notes with their actual
   original PDFs, and measure text-index/codec memory and latency at scale.
3. Exercise sidecar creation, external concurrent edits, PDF/note renames,
   delete/recreate and sync conflicts. Add tagging, undo, backlinks and stronger
   accessibility/navigation before changing the production PDF path.
4. Independently decide EPUB/web/video and remote-PDF scope before deleting
   all shared iframe infrastructure from the shipping plugin.

The native prototype now combines Obsidian's renderer and a native UI with our
typed Bend/Markdown storage. Further reuse from PDF++ should stay behind the
small host adapter rather than importing an entire second annotation system.

The [native sidebar UI results](SIDEBAR_UI_RESULTS.md) describe version 0.0.8's
Annotator-style cards, selection actions, keyboard shortcuts and live checks.

[Android and native-only parity results](ANDROID_AND_PARITY_RESULTS.md) record
version 0.0.9's emulator evidence, standalone release build, preferences and
navigation work. [PARITY.md](PARITY.md) tracks the remaining replacement gates.
Use `npm run build:release` here to build only the native distribution; `npm test`
also builds the pinned legacy reference bundles for compatibility checks.
