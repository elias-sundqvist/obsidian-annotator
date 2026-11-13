# Native EPUB and website readers — experimental 0.0.6

EPUB identity and revision handling were subsequently updated in 0.0.7;
see [EPUB_IDENTITY_RESULTS.md](EPUB_IDENTITY_RESULTS.md) for the current policy
and live native/Hypothesis validation.

Implemented 2026-10-31 on `experiment/obsidian-native-pdf`.

## What is implemented

- EPUB files open in an Obsidian FileView. The reader unpacks the original
  archive through Vault.readBinary, reads EPUB 2 NCX / EPUB 3 navigation and OPF
  spine, and constructs a passive chapter DOM. Chapter selection, previous/next,
  internal links and footnotes (including non-spine XHTML), back navigation,
  font sizing, chapter search, and local raster images are supported. No iframe
  or EPUB-owned scripts/styles run. No EPUB bytes are written.
- Websites can be saved as editable Markdown reading copies. The original HTML,
  source URL and SHA-256 are retained in a separate JSON archive. The reading
  copy opens in the actual MarkdownView, with CodeMirror decorations in editing
  mode and range overlays in Reading view. Mapping uses Markdown AST source
  offsets and the retained original HTML DOM; Markdown offsets are never saved
  as if they were offsets on the original website.
- Live websites use Obsidian's existing core Web viewer. A small, owned guest
  agent captures standard selectors and paints public highlights inside that
  existing isolated guest. Comments, tags, vault paths and CRUD remain in the
  native host/sidebar. There is no new browser container, local production
  server, Node/preload exposure or CSP change. The core plugin must be enabled
  and expose the required webview capabilities; otherwise the command reports
  failure. Live pages can also be saved as reading copies.
- All readers reuse the native sidebar, Bend Markdown store, import/export,
  comments, tags, page/chapter notes and replies from the PDF experiment.
  Failed or ambiguous targets remain in the sidebar rather than being deleted.

## Cross compatibility

EPUB/snapshot captures map back into the **original HTML** and use the pinned
Hypothesis client's real HTML `describe` implementation. Native resolution
checks range/position selectors against the quote and its context, then accepts
only a unique normalized fallback. Live captures use standard TextQuote and
TextPosition selectors. No native-only locator is required.

The legacy offline iframe derives chapter URIs from its physical location.
New records use a stable chapter URI with the same `?loc=manifest-href` shape;
the legacy local API adapter now compares that chapter identifier within the
associated annotation note across host-origin changes. Ordinary website and
PDF URI matching remains available. EPUB archive hashes are carried in standard
`document.link` metadata. In 0.0.7, changed revisions trigger passage verification
instead of refusing the annotation solely because the ZIP bytes changed.

The stored selectors, source URLs, IDs and unknown JSON fields are retained when
comments/tags are edited. Existing JSON exchange preserves external author/group
provenance; sharing selectors does not bypass Hypothesis server permissions or
mean that annotations are automatically uploaded to a remote service.

## How to try it

The generated `dist` plugin is installed in the isolated test vault, with the
previous plugin backed up outside the vault. Reload the
experimental plugin. Open an `.epub`, select a passage and use the native sidebar.
For websites use these command-palette entries:

- **Save website as an offline Markdown reading copy**
- **Open website in core Web viewer**
- **Save current Web viewer as a Markdown reading copy**
- **Capture selection in native reader**
- **Open native annotations**

Reading-copy files and original HTML JSON archives are created in `Web snapshots`.
The archive is inert data and is never adopted as active host HTML. In editing
mode, Alt-click a decorated passage to open its comment without taking over
ordinary text editing.

## Validation and limits

TypeScript check and browser build pass. The 34 previous native/codec/exchange
checks pass, plus seven reader checks covering:

1. Real pinned Hypothesis HTML describe/anchor in both directions through the
   safe DOM, repeated-quote refusal, and rejection across removed content.
2. Markdown formatting, escaped entities, link labels and UTF-16/astral offsets.
3. EPUB package parsing, original-archive preservation, traversal rejection and
   fixed-layout rejection.
4. Original HTML archiving and passive Markdown conversion with original links.
5. Isolated guest standard selectors, text-mutation invalidation, owner-scoped
   cleanup and listener/overlay disposal.
6. Legacy EPUB chapter searches across iframe host-origin changes, with a
   negative check for another chapter.
7. Live host highlight restoration after guest reload, without private comments
   appearing in the guest DOM.

The existing Bend verifier still checks all proof terms, rejects all 15 mutation
controls, and passes its 30 bridge checks. The three root legacy Jest tests also
pass. The root production quick-build succeeds with existing host typing, circular
import and resource-minifier warnings. These are **not formal proofs of ZIP parsing, DOM anchoring, Markdown AST
mapping, webview isolation or Obsidian lifecycle**; those remain tested boundaries
around the proved storage core.

## Live validation in Obsidian 1.13.7

On 2026-10-31, after the Mac was unlocked, CUA tested the actual test vault.
The previous plugin instance was unloaded and version 0.0.6 was loaded.
The core Web viewer was enabled in this isolated vault through Obsidian settings.

- Opened the authored two-chapter EPUB in the registered FileView, selected a
  passage and saved its comment through the native sidebar/Bend store. Navigated
  to chapter two; clicking the saved annotation returned to chapter one and
  restored its highlight. After a full workspace reload, the highlight remained
  and clicking it reopened the persisted comment.
- Used the website command to fetch a public `https://example.com/` reading copy.
  Selected its first English sentence in the real Markdown editor and saved a
  comment. Verified the decoration in Live Preview and two line rectangles in
  Reading view. The original HTML archive and source URI remain separate from
  Markdown/editor positions.
- Opened the same URL in the existing core Web viewer, selected its first English
  sentence and saved a native comment. Two live highlight rectangles appeared.
  Reloaded the workspace, refreshed the web guest, and clicked a restored
  rectangle: the native sidebar reopened the saved comment and reported
  “Highlight restored”.

Live testing found and fixed two issues: the EPUB DOM needed explicit
`user-select: text` under Obsidian's default view styling; guest `dom-ready` and
in-page navigation now resend the saved public highlight selectors. A new
isolated-host regression test destroys/recreates the guest agent and verifies
highlight restoration without transmitting the private comment. There are now
**41 passing native tests**, including seven reader checks. The disabled-core
viewer path also checks for the actual required guest element instead of merely
accepting an unknown view with the requested name.

Unedited screenshots and the authored EPUB / public-source annotation fixtures
are in [evidence/epub-web](evidence/epub-web). Screenshots 05 and 06 show the final
installed build after reload. This verifies this bounded desktop workflow, not
arbitrary books, websites or mobile.

Unsupported/limited: DRM, fixed-layout EPUB, SVG/media/book CSS, pagination and
cross-chapter selections; complex Markdown constructs that cannot be mapped
unambiguously; website embedded frames and cross-origin subframe selections;
automatic redirect/canonical merging, login-dependent requestUrl snapshots,
automatic snapshot refresh and mobile. Live selections are rejected if the
page changes before saving; dynamic sites may require recapturing. Reading-copy
edits that remove/ambiguate a passage refuse anchoring. Resource limits are
explicit (64 MiB compressed EPUB, 2 MiB chapter text, 12 MiB raster image,
4 MiB HTML snapshot; bounded live page text and selection size).
