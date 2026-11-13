# Website reading-copy selection

Version 0.0.131 lets Android/iOS opening requests choose among several Markdown
reading copies for the annotation note's original website URL. Previously this
case stopped with an error asking the user to open a copy directly. The existing
single-copy path remains automatic; no-copy requests still explain how to save
a reading copy. This does not add a website renderer to mobile Obsidian.

The Obsidian Modal lists full vault paths in sorted order. Buttons wrap long
names and have a minimum height of 44 CSS pixels. The selected copy receives the
original collection association; neither the annotation note's URL nor its
annotation blocks are rewritten. Each opening request has its own chooser.

Cancel/Escape resolves without opening or associating a source. Plugin unload
closes outstanding choosers. After a choice, the request rechecks its lifetime,
the note's target, the selected file's identity and its current snapshot/source
metadata before changing associations. Removed or retargeted copies are refused.
Retained buttons from a closed chooser cannot choose again or close another
dialog.

## Evidence and limits

- Plugin-boundary tests exercise the actual chooser contents and opening path:
  selected collection, cancellation, removed copy, changed source, changed note,
  superseded request, unload and retired controls. The Modal window lifecycle
  is a test stub. All 410 tests pass.
- `test-support/browser-reading-copy-check.mjs` checks actual contents and CSS in
  fresh Chromium at 390 × 844: wrapped long names, no horizontal overflow,
  minimum button heights, pointer selection and retired controls. It uses the
  stub Modal lifecycle, so does not establish Obsidian focus/keyboard behavior.
  Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-reading-copy-chooser/`.
- Release and original-ID rehearsal builds are required alongside these checks.
- The emulator required Android authentication after startup; its vault was
  inaccessible. No plugin/configuration was staged or changed there. The
  temporary headless emulator was stopped. Actual Obsidian mobile touch checks
  for this chooser remain pending; installed Android stays at 0.0.130.
- Separately, the live OpenAI article still contains each of the three real
  legacy-created quote selectors exactly once (prose, link-spanning text and
  code). That source check does not establish snapshot projection, native
  highlights or Android reuse. The full real-article migration check stays open.

No Bend storage rule changes are involved. The broader native-only promotion
gates in `NATIVE_REPLACEMENT_PLAN.md` remain open.

## Archive invalidation and recovery — 0.0.132

A reading-copy archive reload now clears its previous highlight ranges and
identity immediately, refreshing editor decorations and scheduling reading-view
painting. Previously the old ranges survived during a pending or failed reload.
Archive validation/read errors now survive annotation-list refreshes, until a
subsequent valid archive loads. A failure never rewrites the Markdown or archive.

The new regression fails against 0.0.131 with retained link/code editor ranges.
It verifies linked text and multiline code in both directions of the Markdown
map, immediate invalidation, failed hash/missing file/read error, persistent
error status on annotation refresh, and restoration after each recovery. All
411 tests pass; release/original-ID rehearsal builds pass.

`test-support/browser-snapshot-reload-check.mjs` exercises the production
SnapshotHost, mapping and RangePainter with pinned published selector functions
in fresh Chromium. A synthetic article uses matching semantic preview HTML and
a fake file/view host. Published-described link/code selections restore as
visible native highlights; invalid archives remove the marks; valid recovery
restores them. A native reading-copy code selection produces selectors that the
pinned published anchor resolves to the exact multiline text. Markdown and
archive strings remain unchanged. This is selector interoperability evidence,
not a full published-app CRUD test, actual Obsidian Markdown rendering, Android
or the real OpenAI article migration.

Screenshots and audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-snapshot-reload/`.
The installed Android version is not changed by this browser check.

## Literal code spacing — 0.0.133

Website-to-Markdown conversion previously compacted every run of three or more
newlines, including inside fenced code. Code blocks now bypass that prose
spacing cleanup. Temporary markers are chosen outside the source text and
removed before returning Markdown. Fence length still exceeds any backtick run
inside the code; finding that length no longer spreads all matches as function
arguments. Existing archives and annotation notes are not migrated or rewritten.

The regression fails against 0.0.132 by changing `first()\n\n\nsecond()` into
`first()\n\nsecond()`. It checks interior/leading/trailing code blank lines,
literal backticks, Markdown projection, unchanged archive HTML and absence of
temporary markers. A separate edit-mapping check verifies unique contextual
relocation and refusal of duplicated/removed passages. All 413 tests pass.

The isolated browser snapshot harness now includes three newlines between code
statements. Production Markdown maps/painter restore that passage and generated
selectors resolve to its exact spaced text through the pinned published anchor.
Archive failure and recovery checks still pass. Evidence:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-snapshot-code-spacing/`.
The same fake file/view and semantic-preview limits apply. This does not prove
arbitrary HTML layout fidelity or replace actual Obsidian/Android checks.

## Real article and standalone multiline code — 0.0.134

The full ChatGPT launch article was saved through Chrome's native **Web Page,
Complete** export. Its article text has 11,472 characters, matching the live
hydrated article observation; the saved HTML is 497,447 bytes. The earlier
**HTML Only** export retained unhydrated streaming content: its code example was
inside a hidden sibling outside the article. It is retained as capture evidence,
not treated as the rendered-page fixture. No page scripts are executed by the
snapshot converter.

The complete capture exposed a production failure: the article renders its
multiline example as standalone `<code class="block …">`, without `<pre>`.
Conversion escaped it as prose; Markdown parsing then left part of the indented
example unmapped. New conversion emits a fenced block for multiline code even
without a pre wrapper. The reduced-shape regression fails against 0.0.133.

All three existing October 31 legacy-created annotations now resolve through
the real captured source, safe projection and generated Markdown to **exactly
equal** text, including the link-spanning sentence and indented multiline code.
The original annotation file is copied byte-for-byte. This does not establish
which legacy bundle created those blocks or unchanged-published UI provenance.

Reproduce the preparation after `npm run build`:

```text
node test-support/prepare-reading-copy-check.mjs HTML_FILE ORIGINAL_NOTE ORIGINAL_URL FRESH_OUTPUT_DIRECTORY
```

The helper refuses an existing output directory and writes a source archive,
Markdown copy, unchanged annotation collection and audit. It operates input
files, not an Obsidian vault. The real reproduction is retained under
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-mobile-website-copy/production-reproduction/`.
All 414 tests and release/original-ID rehearsal builds pass. Actual Obsidian
Markdown rendering and Android reuse remain pending; no test-vault plugin or
configuration was installed/changed during this preparation. No Bend change.

## Actual desktop reading view — 0.0.134

The prepared full article and byte-identical original collection were opened in
the isolated `obsidian-annotator-native-test` vault on desktop Obsidian 1.14.5.
Native 0.0.134 was loaded through that window's Reload app without saving command.
Obsidian's actual reading renderer showed the original three cards and correctly
placed highlights on the linked sentence, wrapped prose and indented multiline
code. This advances beyond the synthetic preview/module-only checks above.

The collection and three cards survived a window reload. This was **not** an
application process cold start. A separate folded-heading issue was observed:
after Samples was folded, navigating to the code annotation did not reopen the
section. The fold survived reload. Do not count navigation to hidden Markdown
sections as passing, or infer a full post-reload code-paint pass while folded.

The annotation note, archive and reading copy were each byte-identical after
inspection. The test window was closed before restoring its original settings,
community-plugin list and workspace exactly; the three QA files were removed.
Native 0.0.134 artifacts remain installed in this isolated test vault and match
the release build. No personal-vault edits or physical-tablet actions occurred.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-desktop-real-website/audit.json`.
Actual CUA screenshots were visually inspected and emitted in the chat. A native
screenshot-export attempt produced no local PNG; this audit does not claim one.
Full CRUD, folded-heading navigation, process cold reopen, mobile reuse and
unchanged-published UI provenance remain open.

## Host line navigation — 0.0.135 (partial)

Reading-mode activation first asks `MarkdownView.setEphemeralState` to navigate
to the mapped Markdown source line, then refines its position to the exact DOM
range if available. The public view entry point exists in the SDK; the line
state's folding/render behavior was inspected in installed Obsidian1.14.5
`app.js` (SHA256 `95b9fd3944625c3b88116878b03d655147fed8cdfe6ddf931f2064ead78ccd5b`).
Its preview path attempts to reveal folded ancestors through host rendering.
Minimum-host behavior is still unverified. No private renderer methods are
called by the plugin.

The regression fails against0.0.134: DOM-only navigation never requests the
missing section. It verifies the host request precedes DOM lookup, the correct
source line is used, an unrelated fold flag is retained, and source bytes stay
unchanged. The existing details-disclosure and editor-mode checks still pass.
All415 tests and release/original-ID rehearsal builds pass.

Actual Obsidian1.14.5 with0.0.135 reopened the same folded Samples fixture. After
scrolling the code card into the visible sidebar and activating it, the section
expanded and the exact indented code highlight was visible at the landing. An
initial off-screen click was not counted. **Fold all headings and lists** was
then run with the Markdown view active; the stronger case still failed to
reveal code after navigation. Therefore folded navigation is only partially
resolved and remains an acceptance gate. The earlier0.0.134 UI observation did
not establish that its code card was visible when clicked; treat that as an
investigation trigger, not a controlled before/after UI experiment.

Note/archive/copy bytes stayed unchanged; the test window was closed, original
data/community/workspace restored exactly, and QA files removed. The isolated
desktop vault retains release0.0.135. Evidence and exact scope:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-desktop-folded-navigation/`.
CUA screenshots were inspected/emitted in chat; no saved local PNG is claimed.
No Bend change, full CRUD, process cold-start, mobile or complete folding claim.

## First-click sidebar focus — 0.0.136

Focusing the annotation sidebar no longer calls source rebinding or rebuilds its
controls. Obsidian can emit active-leaf-change on pointerdown, before click; the
old handler's unconditional refresh removed the pressed quote/button. The
floating selection toolbar is still hidden, the current source/video/collection
is retained, and real model/source changes continue to refresh the sidebar.

The regression runs the actual plugin focus listener with a pressed quote. It
fails against the pre-fix main source because that target is detached before
click, then passes with the guard. The full416 tests and release/original-ID
rehearsal builds pass. Temporary navigation diagnostics are absent from source,
the final bundle and installed clean build.

On desktop Obsidian1.14.5, clean0.0.136 reopened the full article with all headings
folded. After bringing the code card into the visible sidebar, one click revealed
its code, restored the exact highlight and landed on it. A fresh built-in
**Fold all headings and lists** command was then executed with the Markdown pane
active, and a single visible-card click passed again. Scrolling through the
article afterward visibly confirmed Methods, Limitations and the other unrelated
headings remained closed. This closes the specific desktop fold-all fixture
failure recorded above, not arbitrary folding/platform behavior. Some earlier
diagnostic attempts had foreground/input failures and are not controlled negative
UI evidence; the pre-fix module regression is the deterministic failure control.

All three original annotation blocks, source archive and reading copy stayed
byte-identical. The test window was closed before the exact restoration of its
original data/community/workspace files; QA files were removed. The isolated
desktop vault retains clean release0.0.136. Actual CUA screenshots were inspected
and emitted; a native OS screenshot shortcut produced no local Desktop image,
so no saved PNG is claimed. Evidence:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-sidebar-first-click/audit.json`.
Android, minimum-host, full CRUD/process cold-start and other release gates remain
open. No Bend/storage rule changes.
