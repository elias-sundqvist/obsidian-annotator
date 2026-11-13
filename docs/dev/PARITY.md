# Native-only replacement release gates

This is a tracking checklist, not a claim that native-only Annotator is ready to
replace the published plugin. Work stays on `experiment/obsidian-native-pdf`.
Existing users must retain their notes, selectors, IDs, links and workflows.
See the [ordered native replacement plan](NATIVE_REPLACEMENT_PLAN.md) for the
implementation sequence, acceptance criteria, and legacy-runtime deletion gates.
The [current evidence matrix](RELEASE_EVIDENCE_MATRIX.md) separates implemented
features from historical host runs and the remaining current-artifact gates.

## Implemented, requiring broader release validation

- Built-in PDF selection, persistent highlights, shared annotation CRUD.
- Native EPUB continuous linear scrolling, chapter search, links, font size,
  pagination and themes. Desktop and Android chapter-boundary/reopen evidence
  exists; large-book and orientation validation remain required.
  Passive MathML/SVG content and packaged SVG images render with original-text
  annotation mappings; a synthetic corpus passed desktop/Android live checks.
- Persisted EPUB chapter/text position; preferences do not overwrite associations.
- Website guest on core Web viewer; offline Markdown reading copies and mapping.
- Embedded native video, provider-neutral timestamp actions, dedicated Bend video
  storage, selectable/clickable captions and offline transcript companions.
- Native cards, comments, Markdown preview, tags, replies and notes. Local draft
  recovery, explicit stale-edit comparison, caret/composition preservation and
  asynchronous-save draft retention are boundary-tested; live input/recovery
  checks remain. Structured
  local search agrees with the frozen published sidebar; EPUB location sorting
  uses resolved chapter order and original text offsets.
- Annotate/Highlight selection actions and keyboard shortcuts; mobile selection
  handling, bottom actions and touch-size controls.
- Copy/drag block links; interception of annotation block links in Obsidian.
- Loss-preserving Bend-backed storage and Hypothesis JSON import/export.
- Native shipped bundle has no inputs from the Hypothesis client submodule.
  Standalone HTML selectors are tested against the pinned client. A small,
  attributed EPUB identity compatibility module remains local to this project.
- Android emulator installation and actual EPUB read/create/edit evidence.

## Still required before changing the default for existing users

- [ ] Broader mobile PDF and overlapping-annotation verification. Android PDF
      overlap choice and real text-layer eviction/rebuild have scoped 0.0.97
      evidence; complete CRUD/current-artifact/platform coverage remains. Cross-page creation is
      intentionally refused because the pinned Hypothesis client also refuses it;
      native restoration can split imported cross-page passages.
- [ ] Broader current-artifact remote EPUB and reviewed refresh/rollback checks.
      Immutable revision staging/history and failure recovery are implemented and
      boundary-tested; scoped live refresh/rollback is in LIVE_RECOVERY_RESULTS.md. Remote PDF was verified
      in the built-in reader with its note unchanged. Download/cache and
      note-identity preservation are implemented and boundary-tested.
- [ ] Live validation of Dataview targets and custom base paths. Dataview values,
      arrays, wikilinks and custom base paths are implemented.
- [ ] Live validation of opt-in default-opening, Markdown toggle and file menu.
      The toggle command ID is retained.
- [ ] Live review of legacy settings import and default-opening preference.
      EPUB/theme, target path and Markdown-output preferences can be copied; legacy
      settings remain untouched. Numeric appearance controls are implemented; broader
      appearance and imported-default validation remains.
- [ ] Complete native video/transcript parity and broader live validation. Native
      playback, timestamp CRUD, caption retrieval, offline transcripts and shared
      sidebar are implemented; provider, IME/accessibility, failure and complete
      legacy-feature coverage remain. See [video evidence](VIDEO_TRANSCRIPTS.md).
- [ ] More EPUB fidelity: publisher styling, complex MathML/SVG, RTL/CJK, images, non-spine footnotes,
      non-XHTML spine, remaining fixed-layout fidelity and pagination/reflow corpus.
- [ ] EPUB position/reflow tests on long paragraphs and actual Android process
      restarts. Desktop app reload and Android plugin reload were verified; a new
      MathML/SVG corpus also restored highlights and an edited card after Android
      process termination/relaunch. Long-paragraph and orientation coverage remains.
- [ ] Live web dynamic/SPA/login/shadow DOM coverage and duplicate/changed text.
- [ ] Website annotations reused against offline copies on mobile.
- [ ] Mobile link navigation, drag/drop and pop-out regression coverage. Desktop
      copied-link navigation and Android link copying were verified.
- [ ] Android PDF, EPUB and snapshot complete CRUD with cold reopen; iOS evidence.
- [ ] Accessibility, screen reader, keyboard navigation and small-screen polish.
- [ ] Larger legacy corpus, conflicting sync edits and failure/recovery UX.
- [ ] Complete current-artifact/all-format original-ID upgrade/workspace/rollback
      coverage. Scoped desktop PDF and Android EPUB rehearsals already exist.
- [ ] Actual minimum-host 1.11.4 and Windows coverage, alongside the iOS gate above.
- [ ] Remove legacy shipping/build resources only after every required gate passes.

Do not silently migrate unsupported video records or fall back to an unrelated
website reader. Unresolved annotations must remain visible and recoverable.

Video storage now has a separate experimental Bend document recognizer/CRUD and
precise native codec boundary, with whole-document cycle stabilization and
accepted-update preservation laws. Native/published alternating CRUD is tested.
[Proof/test scope](../bend-codec/VIDEO.md) lists remaining grammar/semantic gaps.
The codec is wired into the native video reader. Playback, timestamp UI and
transcripts have desktop/Android evidence; the broader provider/device and
published cross-reader matrix remains incomplete.

Version 0.0.17 adds [local PDF/EPUB file targets](LOCAL_FILE_TARGETS.md): in-vault
absolute/file URL mapping, synced aliases, copying external sources without altering originals, and reviewed
refresh/offline history. Temporary-file/real EPUB and host-boundary checks pass;
live desktop/mobile/Windows checks and full local-HTML/UNC/fragment parity remain.

0.0.18 adds [unlocked live evidence](LIVE_RECOVERY_RESULTS.md): EPUB refresh/offline
rollback, desktop/Android draft recovery, Android cold start, real desktop file
PDF/PDF.js review and unchanged-note hashes. The live filesystem loading and EPUB
context problems found during testing were fixed and rechecked. Broader device,
network, published-UI and full replacement gates remain open.

### EPUB navigation checkpoint — 0.0.19

Previous-page crossing now enters the preceding linear chapter at its final
text page under the current viewport/font geometry. Forward/backward page turns
follow the linear spine and stop at its ends; non-spine footnotes stay explicitly
navigable without entering that flow. Following an internal book link records
the visible original text offset, so Back returns to the prior passage rather
than the chapter start. Loading another book clears stale link history.

146 native tests pass, including controlled multi-column lifecycle geometry,
end boundaries, non-linear exclusions, saved offsets and actual projected-link
activation/Back. These are host tests, not formal laws or real browser layout
evidence. The release build passes. The Mac locked before the live check;
0.0.19 is built but not installed in the test vaults. Desktop/Android remain on
the live-verified 0.0.18. RTL column geometry and broader typography remain open.

### Native video collection workspace (0.0.20)

Native routing, shared-sidebar timestamp cards/editor, title/time/comment CRUD,
block links, draft recovery and awaited stale-protected vault transactions now
exist. New tests execute the native controls/store and the frozen published
parser. [Implementation and limits](VIDEO_PLAYBACK.md#native-timestamp-workspace--0020)
separate this manual/external-playback workflow from the still-unverified real
player/capture/seek and transcript gates. The desktop was locked, so this is not
a live UI/screenshot or video replacement-parity claim.

### Collection identity checkpoint — 0.0.21

Separate panes for the same source now retain their selected note, including
native workspace state. Captured selections require the originating pane; a
closed pane cannot fall through to another collection or same-source pane.
[Collection evidence and limitations](COLLECTION_CONTEXT.md): 162 tests pass,
including compiled PDF-adapter/Bend transaction isolation, workspace hints,
renames/deletion and unchanged opposite-note checks. Real restart/pop-out/device
checks and the published workspace upgrade/rollback remain open.

### Locked-Mac Android evidence — 0.0.22

Direct ADB is now explicitly user-authorized on emulator-5554. Actual native
video cards/editor, unchanged annotation save and cold reopen/shared-sidebar
reveal were checked while the Mac stayed locked. A startup-context reconciliation
fix has a compiled-plugin regression; 163 tests and release build pass.
[Evidence, screenshots, integrity audit and limits](LOCKED_ANDROID_RESULTS.md).
Embedded video, complete Android CRUD/device parity and desktop checks remain open.

## Embedded video 0.0.23

In-Obsidian YouTube and vault MP4 playback/seek/capture exercised on Android; provider-neutral annotation actions implemented. 169 tests and release build pass. See [results](EMBEDDED_VIDEO_RESULTS.md) for scope and remaining gates.

## Video transcript UI 0.0.24

In-Obsidian transcript rendering, passage click/keyboard seek, partial/cross-passage selection into a timestamped annotation draft, VTT/SRT companion import/reopen, and existing published-format saves are implemented. Desktop and Android synthetic-fixture UI checks passed; 176 tests and the release build pass. Automatic YouTube caption download returned an empty response in the real host and remains an open parity gate. See [transcript results and usage](VIDEO_TRANSCRIPTS.md).

## Real caption retrieval 0.0.25

The empty watch-page caption response is resolved for the verified public videos by requesting fresh signed tracks from YouTube player metadata. Production retrieval returned 466 and 286 English passages on two videos; actual desktop and Android Obsidian loaded the 466-passage transcript and performed caption-driven seeks. A real-caption selection saved at 10.349 seconds remained published-parser compatible and preserved the previous note prefix. 178 tests and the release build pass. Broader providers/languages, automatic-caption rolling text and other full-parity gates remain open; the internal provider contract can change. See [results](VIDEO_TRANSCRIPTS.md).

## Transcript search and follow 0.0.26

Real transcript search, event-driven current-passage marking, opt-in inner-panel following and manual-browse override now have desktop/Android live evidence. 182 tests and release build pass; annotation files remained unchanged. Selection text and source timestamps survive filtering/tracking, and player listeners stop on teardown. See [transcript checkpoint](VIDEO_TRANSCRIPTS.md#search-and-playback-following--0026). Full replacement gates remain open.

## RTL pagination implementation — 0.0.32

The EPUB package reader retains explicit spine page-progression direction. In pagination mode, the viewport and column container follow that direction (falling back to chapter text direction when unspecified). Page turns normalize RTL negative scroll coordinates, and text-offset restoration/first-visible-character lookup use the corresponding viewport edge. Returning to scroll mode clears the column direction override; chapter text direction remains intact. Saved annotation selectors/URIs and book bytes are not rewritten.

Controlled lifecycle tests cover RTL page progression, restoring a later text page, saving its original text offset, forward/backward chapter crossing and start boundaries, alongside existing LTR/non-linear chapter checks. `test-support/rtl-fixture.mjs` supplies a numbered synthetic Hebrew book for live tests. Browser typography, RTL mixed-direction text, Android/iOS geometry and live restart evidence remain open; this does not establish complete RTL or vertical-writing support.

### Android RTL live evidence

Installed 0.0.32 on emulator-5554 / Obsidian 1.14.4 rendered the numbered synthetic Hebrew EPUB in pagination mode. Next page advanced from paragraphs 001–004 to 005 onward; Previous page returned to the chapter heading and 001. After advancing again, settings retained chapter 0 / original text offset 425, and force-stop/cold reopen restored paragraph 005. Previous page from chapter two's start entered chapter one's final page (040); Next page crossed back to chapter two's start (041). Book and annotation-note bytes remained unchanged; installed bundle matched the release artifact.

Screenshots 01–07, original fixture/note, saved-state copies and `audit.json`: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-rtl-pagination/`. Bundle SHA256 is recorded in the audit. This closes basic Android RTL page-turn, chapter-boundary and cold-reopen checks on this fixture; mixed-direction typography, selection/highlight CRUD, font/viewport changes, iOS and desktop RTL remain open.

## Preserve passages across reading-mode changes — 0.0.33

A regression test reproduced loss of the current passage when switching pagination to scroll: offset 20 became 0 because preferences already named the destination mode while the DOM still used outgoing column geometry. Visible-position measurement now uses `renderedMode`. The integration test changes modes through the real reader preference/layout lifecycle in both LTR and RTL, verifying the same original text offset after each transition. The earlier EPUB lifecycle check now also switches layout before testing scroll coordinates. This fixes mode transitions; changing font size/viewport and mixed-direction paragraphs remain separate coverage.

### Android mode-switch live evidence

On emulator-5554 / Obsidian 1.14.4 with installed 0.0.33, advanced the synthetic Hebrew book to chapter two, paragraph 045. Pagination → Scroll → Pagination kept 045 first visible. Saved state at all three checkpoints retained chapter 1 / original text offset 425. Force-stop and cold reopen also restored paragraph 045. Book and annotation-note bytes matched the preceding RTL checkpoint; the installed bundle matched the built artifact (SHA-256 `b60354d5d2e853f73fba3a3889838f01a45af9f96ea7dd46d48cf0e9184a3d67`).

Screenshots 01–04, state snapshots and integrity audit: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-epub-mode-switch/`. This verifies the mode-switch fix in actual Android geometry for this RTL fixture. Desktop/iOS, varying font and viewport sizes, mixed-direction typography and annotation selection remain open; this checkpoint does not establish full reader parity.

## Preserve reading anchors during viewport resizing — 0.0.34

The EPUB reader now retains its last original text position before viewport reflow. ResizeObserver uses that anchor when rebuilding columns or adjusting continuous layout, instead of measuring text after it has moved. Resize-generated scroll events are ignored through the next painted layout so they cannot replace the retained anchor with an earlier page start. Scroll notifications arriving before ResizeObserver also route through resize restoration; zero-sized hidden panes wait for visible geometry. Normal user scrolling continues to update the anchor, and teardown/new-file generation guards discard pending resize callbacks.

202 tests and release build pass. Controlled real-reader lifecycle tests cover scroll plus LTR/RTL pagination, changing geometry before observer delivery, restoration-generated scroll, round-trip resizing, repeated observer delivery and disposal. Disabling restoration makes the new test fail (200 vs expected 300 vertical coordinate).

Live emulator-5554 / Obsidian 1.14.4 initially exposed a second problem: the first implementation showed paragraph 045 in landscape, then drifted to chapter-start 041 after returning to portrait. The final resize-scroll guard retained 045 across two portrait → landscape → portrait cycles. Landscape's page begins at 044 and includes 045; returning to portrait restores 045 first. The source book/note stayed byte-identical and the installed bundle matched the final build. Original emulator auto-rotation preferences were restored. Screenshots 01–03 record the intermediate failure; 04–07 record the corrected behavior, with audit and installed artifact at `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-epub-resize/`.

This is Android synthetic RTL pagination evidence, not universal typography/device parity. Desktop/pop-out/iOS, scroll-mode rotation in a real host, font changes, asynchronous publisher resources and the published EPUB compatibility rehearsal remain open.

## Publisher typography and local fonts — 0.0.35

Local linked/embedded CSS and bounded imports now supply retained EPUB typography, colors, spacing, borders, tables and unobfuscated packaged fonts. Selectors are evaluated on the inert original DOM; publisher classes/stylesheets never enter the host UI. Original selectors and wire format are unchanged. Font faces use unique names and leave the host set when their chapter is removed. Unsupported styles/fonts have a visible reader-status warning.

212 tests and release build pass. Actual Android styled-book highlight creation and cold reopen passed; the saved annotation also passed the frozen published parser and original-chapter selector engine. [Scope, exact bounds, screenshots, audit and remaining CSS/font gates](EPUB_PUBLISHER_STYLES.md). This does not establish full publisher CSS, obfuscated fonts, fixed layout, vertical typography or actual published EPUB reader UI parity.

## IDPF and Adobe obfuscated fonts — 0.0.36

Per-resource font-obfuscation metadata now selects the specified IDPF SHA-1/1040-byte or Adobe UUID/1024-byte transform. Keys come from the designated raw publication identifier, with no alternate-key guessing. Original archives, identity aliases and annotation selectors are unchanged; invalid fonts produce the existing omission status. 218 tests and release build pass.

Actual Android checks passed the pinned W3C correct-key and deliberate wrong-key font fixtures, plus the synthetic Adobe font book. Books and notes stayed byte-identical on inspection. [Algorithms, pinned primary sources, independent byte-level tests, screenshots and remaining gates](EPUB_PUBLISHER_STYLES.md#obfuscated-fonts--0036). This closes basic IDPF/Adobe font loading, not broader CSS/layout, full corpus or published-reader parity.

## Responsive publisher typography — 0.0.37

Conditional CSS (`@media`, `@supports`, sheet media and media imports), font shorthand/reset cascade and reading-pane viewport lengths now refresh in place. Device preference listeners and conditional font activation preserve source order and clean up on close; original DOM selectors/capture identities stay intact. 228 tests and release build pass.

Actual Android portrait → landscape → portrait changed the expected heading/paragraph styles and kept a newly created word highlight aligned; cold reopen restored it. Source book and saved annotations were unchanged by reflow/reopening. The frozen published parser/selector engine accepted the saved record. [Coverage, bounds, source-token/capture checks, screenshots and remaining CSS/device gates](EPUB_PUBLISHER_STYLES.md#conditional-typography-and-font-shorthand--0037). The separate desktop published EPUB UI retry was interrupted by locking and remains unverified.

## Background EPUB position restoration — 0.0.38

Hidden startup panes now defer geometry-dependent restoration and retain their pending text/fragment destination. Hiding an existing reader preserves its last real anchor, even before observer delivery; equal-size reveal, hidden preference/mode changes and closing before visibility no longer replace progress with zero. A compiled-reader regression reproduced offset 20 becoming 0 before the fix. 233 tests and release build pass.

Actual Android inactive-tab activation, switching away and cold restart retained seeded chapter 1 / offset 425 and returned to paragraph 045, with book/annotation bytes unchanged. [Exact lifecycle coverage, synthetic workspace setup, screenshots, integrity audit and device limits](EPUB_BACKGROUND_RESTORE.md). Desktop/iOS/pop-out and full migration gates remain open.

Published EPUB Android rehearsal: the unchanged pinned 0.2.11 reader loads the
complete fixture, but broken chrome/icon layout obstructs reliable sidebar
inspection. No cross-edit/anchoring pass is claimed. Test documents remained
byte-identical and native configuration was restored. See the final section of
[the publisher-style evidence](EPUB_PUBLISHER_STYLES.md).

## Published EPUB URI routing — 0.0.39

Actual unchanged published 0.2.11 UI exposed the old native demo URI as an
orphan. New native records now match the live Obsidian host canonical URI. On
Android, a native-created highlight then rendered in the unchanged published
book, opened its matching card and accepted a published UI edit. Native also
reopened the published-created highlight and earlier published comment edit.
234 tests/release build pass. [Evidence and remaining same-host/cross-device
limits](EPUB_PUBLISHER_STYLES.md#published-epub-frame-routing-correction--0039).
This supersedes the earlier inconclusive sidebar inspection; full EPUB parity
is still unproven.

## EPUB page notes and reply retention — 0.0.40

The frozen published reply/save/delete service now exercises 16 alternating
parent/nested-reply CRUD sequences with independent reparsing and unrelated-byte
checks. Actual Android UI created a native EPUB page note, displayed/replied in
unchanged published 0.2.11, reopened the thread natively, and deleted the parent
while retaining the published reply. This exposed and fixed orphan-root category
counts; nested children stay excluded from root counts. 236 tests/release build
pass. [Exact source pins, workflow, evidence and remaining live gates](EPUB_THREAD_COMPATIBILITY.md).

## Publisher CSS variables — 0.0.41

Book-owned custom properties now resolve against the original DOM without
inheriting host variables or installing publisher CSS. Fallback/cycle handling,
computed inheritance, invalid-value resets, conditional refresh and packaged
font aliases have regression coverage. Android matched literal font/color
reference pairs, and rotation changed a variable-driven heading while retaining
a saved highlight. 244 tests/release build pass. [Scope, bounds, screenshots and
remaining fidelity gates](EPUB_PUBLISHER_VARIABLES.md).

## Compact EPUB reader controls — 0.0.42

The default EPUB toolbar is one navigation row. Secondary font/mode/chapter/search
controls expand on demand with keyboard/focus semantics and bounded scrolling.
245 tests/release build pass, including capture/text-offset retention while the
panel changes viewport height. Android verified collapsed/expanded layouts,
Enter search, Escape focus return, rotation/highlight alignment and live scroll
mode selection. [Exact geometry, evidence and remaining host/a11y gates](EPUB_COMPACT_CONTROLS.md).

## Native PDF appearance — 0.0.43

PDF page backgrounds/inversion now use the source-inspected native renderer;
legacy numeric adjustments apply only to inverted page canvases. Ownership-aware
cleanup, current native-theme reconciliation, missing/failing capability guards
and a PDF/EPUB toggle command are covered. Android displayed an existing PDF
highlight on light and dark pages and opened its native card. 254 tests/release
build pass. [Exact integration, screenshots, limits and remaining UI/host gates](PDF_APPEARANCE.md).

## PDF text-layer lifecycle — 0.0.44

The real NativePdf adapter now clears its rendered Range references whenever it
removes overlays, including document replacement and indexing/error states.
Previously detached ranges could survive until a subsequent successful paint.

Two jsdom adapter tests drive actual mutation observation and scheduled painting:
text-layer removal/recreation, changed text that must not receive the old mark,
recovery, disposal, PDF replacement and an obsolete asynchronous indexing result.
They verify a single highlight returns on the new layer, unresolved content does
not receive it, detached ranges are released and late results cannot overwrite
the replacement document. Geometry is mocked; these tests do not establish real
PDF.js virtualization/zoom/rotation behavior or replace the remaining host UI
and performance gates. Full suite: 256 tests; release build passes.

## PDF capture identity — 0.0.45

Native PDF captures now carry the indexed renderer generation in their transient
revision and check the current PDF document object before saving. A replacement
with unchanged file path/mtime/size and identical selected text can no longer
reuse an old selection under a different fingerprint. Capture waits for text
indexing rather than issuing an unverified selection while indexing is pending.
Collection wrappers preserve this revision when copying captures. No stored
annotation format changes.

The real adapter test saves a valid selection, replaces the renderer while file
metadata/text remain unchanged, rejects the old selection before and after
reindexing, then saves a fresh selection with the replacement fingerprint. It
also checks file-revision invalidation. Full suite: 257 tests; release build
passes. Live host replacement/capture UI remains a separate verification gate.

## Android PDF navigation/redraw — 0.0.45

Installed release 0.0.45 in the isolated emulator-5554 vault (Obsidian 1.14.4).
Cold-opened the existing 14-page TraceMonkey paper, navigated to page 14 using
the host page field, then returned to page 1. The existing Time highlight
returned at exactly `[414,540][488,580]` and opened its Page 1 annotation card.
Host zoom-in redrew the page; after scrolling the title back into view, the
highlight visually covered Time at `[388,569][475,616]`.

PDF and annotation Markdown were byte-identical before/after. Installed bundle,
manifest and stylesheet matched dist. Main SHA256:
`108c55e7d00932b9c130909278cbc29cbb48e81b1197efd352c81c7a6b701e8d`.
Original workspace, enabled-plugin list and plugin data were restored and
verified before restarting. No personal vault or physical device was changed.

Screenshots, XML, file copies, backups and audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-pdf-lifecycle/`.
This proves navigation/zoom redraw for this PDF on Android, not actual internal
page destruction, large-document performance, rotation, pop-outs, or stale-save
rejection through the UI. The latter remains covered only by the adapter test.

## Automatic caption structure evidence

Fresh automatic English JSON3 retrieval supplied 533 passages with newline-only
rolling controls, not duplicated lexical rows. Exact VTT export/reparse passed
for all passages. Added source-shaped regression coverage preserves genuine
repeated phrases and latest-cue overlap behavior; nine transcript tests pass.
See VIDEO_TRANSCRIPTS.md for counts, evidence and remaining corpus limitations.

## Sidebar keyboard categories and IME — 0.0.46

Category tabs now have stable per-view IDs, aria-controls/labelledby relations,
a single tab stop for the active category, and Left/Right/Home/End activation.
Rebuilding category results restores focus to the selected tab. The results
panel is keyboard focusable. Two categories mean either horizontal arrow moves
to the other tab, including RTL. Modified/composing arrow events are ignored.

Comment editor save/cancel shortcuts ignore active IME composition, including
isComposing, keyCode 229 and tracked composition sessions. Enter/Escape cannot
prematurely save or discard a candidate while composition is active. Existing
caret/composition-end refresh behavior is retained.

Plugin-boundary coverage checks tab focus, tab stops, panel ownership and IME
save/cancel suppression, alongside existing comment/tag composition tests.
Full suite: 258 tests; release build passes. Actual assistive-technology and
mobile IME testing, sidebar focus on unrelated refreshes, deletion confirmation
focus and video-sidebar keyboard parity remain open.

## Sidebar action focus and deletion cancellation — 0.0.47

Card/toolbar icon actions carry stable annotation-and-action focus keys. Refresh
restores the same still-existing action (and focused category tabs) within the
same source/editor session, using preventScroll. It does not carry focus across
collection/editor session changes. Comment/tag caret restoration remains separate.

Inline delete confirmation is a named group and initially focuses Cancel. Escape
cancels without deleting and restores focus to that annotation's Delete action.
A background refresh dismisses the inline confirmation and uses the same return
key; destructive confirmation is never remembered or automatically executed.
The plugin-boundary regression verifies refresh focus, named confirmation, safe
initial focus, Escape return and unchanged records. Full suite: 258 tests; release
build passes. Actual screen-reader/device checks, search/sort and all dynamic
control focus, successful-deletion focus and video-sidebar behavior remain open.

## Video editor keyboard and failed-save focus — 0.0.48

The video editor now has IME-safe save/cancel shortcuts and restores field caret
and scroll after failed saves in the same draft session. Deletion cancellation
has safe initial focus and an Escape return path. Actual VideoView host regression
checks preserve source bytes; 259 tests and release build pass. Device/assistive
technology checks and the remaining video/replacement release gates stay open.

## Android sidebar hardware-key check — 0.0.48

Actual Obsidian 1.14.4 on emulator-5554 opened the existing PDF annotation in the
shared sidebar. Delete confirmation focused Cancel (accessibility tree reports
focused=true); Android Escape dismissed it and focused that card's Delete
annotation action. Focusing Annotations then sending Right activated/focused
Page Notes; Home returned to/focused Annotations. The empty page-notes state and
original annotation card matched the selected categories.

PDF and annotation note remained byte-identical. Installed main/manifest/styles
matched release artifacts. Original workspace, enabled plugins and plugin data
were restored and verified before restart. Screenshots, accessibility XML,
backups, before/after files and audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-sidebar-keyboard/`.
This verifies actual Android hardware-key routing/focus, not TalkBack, mobile
IME, successful deletion or all editor/video keyboard workflows. Those and the
remaining native-replacement gates are still open.

## Sidebar search composition — 0.0.49

Search retains its live input node during IME composition; background refreshes
for the same collection defer until composition ends. The completed query then
rebuilds results and restores input focus/cursor where the host exposes them.
Detached-input or changed-collection input events cannot change the new query.
Moving to video or closing the view clears the composition reference.

The plugin-boundary regression composes a query over multiple input/refresh
steps, verifies the input identity and unfiltered results survive, then checks
the completed filter, returned focus and ignored late detached-node input.
Full suite: 259 tests; release build passes. This is synthetic composition-event
coverage, not actual Chinese/Japanese IME/device verification. Mobile keyboard,
assistive-technology and the remaining replacement gates remain open.

## Verified PDF source ordering — 0.0.50

NativePdf now exposes the sidebar location adapter, returning verified
`[page, pageTextOffset]` from its live resolved matches. Historical quote-only
annotations sort by their actual anchors; unresolved/wrong-fingerprint/page-note
records return null and follow resolved passages. Stored hints no longer stand
in for current PDF locations. Reply threads retain the sidebar's root ordering.

Cached positions become unavailable immediately when the renderer or file
revision changes. Annotation activation checks document identity before using
cached matches, preventing an old page number from navigating a replacement PDF
while its text index loads. No annotation storage changes.

The actual adapter regression covers two-page positions, unknown/wrong-source
locations, valid navigation and renderer replacement before periodic polling.
Full suite: 260 tests; release build passes. Actual multi-annotation PDF sidebar
ordering UI, large corpora and remaining platform/release gates are still open.

## Fixed-page EPUB corpus gate

Added a complete two-page positioned-text EPUB fixture and an installed epub.js
package/layout/Contents.fit regression. The dependency scales declared fixed-page
coordinates; native package loading rejects them. This identifies a concrete
remaining implementation gap, not a supported failure or published-app UI pass.
See EPUB_FIXED_LAYOUT.md for the fixture, implementation requirements and evidence
limits. Two targeted fixture tests pass; production runtime/version unchanged.

## Fixed-page metadata foundation — 0.0.51

Package and spine layout resolution now prevents silently reflowing an explicitly
fixed spine item. Linked non-spine pages inherit the package layout. Added explicit
page viewport validation and aspect-preserving fit helpers for renderer work.
Fixed pages still report unsupported; renderer/selector/UI work remains a blocker.
263 tests passed; final linked-page hardening passed 29 targeted reader tests and
release build. See EPUB_FIXED_LAYOUT.md for precise scope.

## Basic fixed-page XHTML rendering — 0.0.52

Fixed chapters now mount with validated viewport dimensions into clipped/scaled
page slots, retain source selector coordinates, and turn pages without reflow.
Passive positioned styles are opt-in for fixed pages; fixed/sticky UI stays
omitted. 265 tests and release build pass. Android rendered both synthetic pages,
retained page 2 after cold restart, followed a cross-page fragment and returned
with Back. EPUB/note bytes unchanged; original config restored. See
EPUB_FIXED_LAYOUT.md for screenshots/evidence, hashes and remaining fidelity,
spread, mixed-layout, device and live CRUD gates. Full replacement remains open.

## Android fixed-page annotation lifecycle evidence

Actual 0.0.52 UI created a word highlight, retained alignment through landscape
and portrait cold reopening, edited its comment and confirmed deletion. Frozen
published parser/anchor located the real saved word in original XHTML; edit
retained ID/selectors/metadata. Delete matched expected codec output (one extra
trailing newline versus the initial note), then the original note/config/rotation
were restored. Source EPUB bytes unchanged. See EPUB_FIXED_LAYOUT.md for evidence
and limits, including the unsuccessful hardware Ctrl+Enter attempt. Full fixed
layout and replacement parity remain unfinished.

## Fixed-page facing spreads — 0.0.53

Package/spine spread policy and physical page placement now drive paginated
fixed-page grouping, common-scale fitting, RTL slot order, blank slots and
whole-spread page turns. Resize regrouping retains the requested chapter.
269 tests passed; final gap correction passed 28 targeted tests and release build.
Android checked portrait/landscape pairing and a real right-page annotation
anchored by frozen published code. UI evidence predates final zero-gap hardening;
final-artifact recheck and full spread/device parity remain open. Details and
remaining gates: EPUB_FIXED_LAYOUT.md.

## Exact Android spread cold-start check — 0.0.54

Final-artifact verification found and fixed a zero-geometry startup case that
left only one landscape page mounted. Restoration now reconciles spread chapters
before completing. 270 tests and release build pass. Exact installed 0.0.54
cold-opened both pages with the saved right-page highlight aligned; portrait
page-2 navigation restored it. Annotation/EPUB bytes unchanged while reading,
original note/configuration/rotation restored. EPUB_FIXED_LAYOUT.md records exact
artifact hash, evidence and the still-open broad content/device parity gates.

## Fixed-page publisher transforms — 0.0.55

Separate page-fit canvas and source projection retain publisher body/descendant
2D transforms with unchanged text selectors. 272 tests and release build pass.
Android rendered translated/rotated fixture text and created a word highlight;
the actual saved record anchored through frozen published code. Original source
unchanged, note/config restored. EPUB_FIXED_LAYOUT.md records exact artifact,
screenshots, rectangular-highlight limits and remaining content/device gates.

## Archive background artwork — 0.0.56

Background images resolve through the existing archive image/SVG adapter with
stylesheet-relative paths, per-chapter URL ownership, bounded resources and
proper shorthand longhand cascade. 276 tests and release build pass. Android
rendered SVG background artwork, created a word highlight and restored both after
page turns. Actual saved selectors anchored through frozen published code.
Source unchanged; note/config restored. EPUB_BACKGROUNDS.md records artifact
hash, screenshots, new limits and remaining CSS/corpus/platform gates.

## Variable background artwork — 0.0.57

Background custom-property URLs use their consuming declaration's source base,
with bounded serial acquisition and lifecycle cleanup. 282 tests/release build
pass. Android displayed the correct consumption-path artwork and cold-restored
its actual saved word highlight without annotation/source changes. Frozen published
parser/anchor checked the record; original note/config restored. EPUB_BACKGROUNDS.md
records exact artifact/evidence and remaining responsive/corpus/platform gates.

## Host-scoped editor shortcuts — 0.0.58

Diagnosed Android Ctrl+Enter as host window-capture keymap interception. Native
and video editors now register public View.scope handlers with owned-field,
busy and IME guards; the shared sidebar delegates video handling. 284 tests and
release build pass. The exact Android PDF artifact saved by the formerly failing
Ctrl+Enter chord; Escape cancelled a later draft with no write or recovery draft.
Original note/config restored, PDF unchanged, temporary probe fully removed.
EDITOR_SHORTCUTS.md records cause, exact artifact/evidence and remaining device/
video/Meta-key/IME/a11y gates. Full replacement remains unfinished.

## EPUB capture eviction/remount — 0.0.59

Continuous chapter windowing previously reused the reader epoch when a chapter
was evicted and later mounted again. The old capture's validity predicate could
therefore become true again. Each mount now gets a monotonically increasing
in-memory generation included in its captures' revision. Payload creation refuses
an evicted projection's capture even after the same chapter returns. Mounting a
neighbor does not invalidate captures in retained chapters. No stored annotation
format, selectors or book bytes are changed by this fix.

The regression executes actual EpubView remove/mount/capture/payload methods,
checks stale payload refusal and unaffected neighboring captures, and anchors a
fresh post-remount payload with the frozen published HTML engine. Full suite:
285 passing tests; release build passes. Logs:
`/tmp/annotator-epub-mount-tests.log`,
`/tmp/annotator-epub-mount-release.log`.
Actual installed-device eviction/remount UI and orientation regrouping selection
continuity remain separate gates. No Bend theorem changed.

## Spread selection continuity — 0.0.60

Retain selected fixed-page chapter DOM and capture identity during orientation
spread regrouping, with latest-geometry and navigation-race guards. 288 tests
and release build pass. See EPUB_FIXED_LAYOUT.md for evidence and limits;
actual-device selection handles and sidebar-draft orientation checks remain open.

## Actual Android spread selection/draft rotation — 2026-11-02

Exact native 0.0.60 selection handles, selected quote and typed sidebar draft
survived rotation; Ctrl+Enter saved and a cold restart restored the highlight.
Frozen parser and HTML anchoring checks passed on the actual saved record.
EPUB_FIXED_LAYOUT.md records screenshots, whole-document/source checks, installed
hashes and verified restoration. This is a two-page synthetic fixture; broad
platform/content and replacement gates remain open.

## Publisher flex layout — 0.0.61

Project publisher flex layout and sizing with shorthand-aware cascade, responsive
changes and original text/selector preservation. 292 tests and release build pass;
EPUB_FLEX_LAYOUT.md separates automated source/anchor evidence from pending actual
browser layout and device checks. Standalone SVG-spine published behavior remains
unproven; Section.load alone is not a renderer oracle.

## Actual Android publisher flex layout — 2026-11-02

The exact 0.0.61 artifact renders responsive stacked/side-by-side panels and
publisher visual order. A real highlight created in the reordered panel cold
restores and passes frozen published parser/anchor checks, with source and
cold-read note bytes unchanged. EPUB_FLEX_LAYOUT.md records screenshots, bounds,
hashes, restoration and remaining pagination/reading-position/corpus limits.

## Visual reading positions — 0.0.62

Correct reading-position selection when publisher layout puts later source text
above an earlier node. Retain original source offsets and published annotation
anchoring, exclude offscreen candidates, and update responsive reorder metadata.
294 tests and release build pass. See EPUB_FLEX_LAYOUT.md for scope and limits.

Actual Android follow-up: exact 0.0.62 persisted original purple-heading offset
223 despite earlier source-order blue content being visible below. Cold reopening
returned that heading to the viewport top. Note/book bytes remained unchanged;
test settings and rotation were restored. EPUB_FLEX_LAYOUT.md records precise
source/geometry audits, screenshot paths, hashes and remaining corpus gates.

## Publisher grid layout — 0.0.63

Retain explicit/implicit grid layout and placement, alignment shorthands and
historical gap aliases with grammar/resource checks and per-longhand cascade.
302 tests and release build pass, including actual reader responsive selection
and frozen published anchoring. EPUB_GRID_LAYOUT.md records scope and limits.

Actual Android follow-up: final exact 0.0.63 renders the named-area grid in both
orientations, cold-restores its highlight and saves a comment. Whole-document
expected CRUD and frozen parser/anchor checks pass. EPUB_GRID_LAYOUT.md records
artifact distinctions, screenshots, hashes, restoration and remaining corpus gates.

## Original-ID Android upgrade/rollback — 0.0.64

Fix an actual duplicate-tab startup race between restored legacy views and native
default opening. Convert only the owning Markdown leaf in place, deduplicate
notifications and cancel stale source preparation; explicit toggle shares the path.
304 tests and release/rehearsal builds pass. Actual published → native → published
→ native EPUB comment edits retain source identity, exact migration checkpoint,
opaque settings and one explicit collection leaf. Native final reading leaves the
whole published-saved note unchanged. ORIGINAL_ID_ANDROID_REHEARSAL.md records
screenshots, original published startup failures, verified restoration and remaining
migration/platform gates. Native landscape panel overlap remains an open UI issue.

## Landscape sidebar reachability correction — unchanged 0.0.64

Actual Android scrolling brings the previously covered card actions above the
native drawer chrome. Edit and the visible Save button work in landscape; Escape
cancels deletion, returns focus to Delete and leaves the note unchanged. The
whole saved document equals the expected codec update and frozen parsing agrees.
LANDSCAPE_SIDEBAR_RESULTS.md corrects the earlier accessibility-coordinate diagnosis
and records screenshots, bounds, restoration and precise remaining scope. No
runtime/CSS change, new unit-test count or new formal theorem is claimed.

## Restored Markdown startup and explicit mode choice — 0.0.65

Default opening now scans restored Markdown panes after layout readiness and
retries notes waiting for the metadata cache or Dataview startup. Settled ordinary
notes leave the pending queue; subsequent frontmatter edits do not unexpectedly
convert them. Closed or replaced panes are discarded. Reader preparation preserves
the owning leaf and does not activate background panes or steal focus after an
asynchronous download.

Explicit Markdown mode is tracked per view and file, including the video toolbar
and original-ID recovery action. File-open notifications and metadata retries
respect that choice until the user toggles back. This replaces the previous
one-event global suppression, which could be consumed by another pane.

Automated plugin-boundary tests cover two restored collections sharing one source,
late metadata, delayed Dataview, removal of pending panes, settled ordinary notes,
explicit mode retention and focus changes during remote preparation. Video tests
cover ownership and failed Markdown transitions without annotation writes. Actual
desktop/Android cold-start and recovery UI checks for this checkpoint remain open.
All 310 automated tests, the release build, original-ID rehearsal packaging and
`git diff --check` pass. No Bend proof or production-root build was changed.

## All-leaf traversal and restored collection isolation — 0.0.66

Actual Android cold-start testing found that Collection B switched to Collection A
when two restored Markdown notes targeted the same EPUB. The cause was a truthy
return from `leaf => live.add(leaf)` in both live-leaf inventories: the host
traversal stopped after the first leaf, and cleanup deleted the other collection.
Both callbacks now explicitly return nothing. The test host models early exit,
and a regression verifies retention of both live collections and removal of a
closed leaf. Earlier attempts to retain collection state at other boundaries did
not fix the problem and were removed, along with temporary tracing.

Final Android 1.14.4 release verification retained both original tab IDs, converted
them in place to the native EPUB reader, kept startup-a active, and serialized
both exact collection choices. Activating startup-b displayed Collection B in
the sidebar. Two tabs remained; no annotation CRUD was performed.

The mixed CRLF final newline became LF. A control with all community plugins
disabled reproduced the exact normalization after opening the same Markdown note
and switching away. This establishes host editor normalization for this fixture,
not plugin-only mutation or byte-identical Markdown-view restoration.

All 311 tests and release/original-ID rehearsal builds pass. Source EPUB bytes
were unchanged; original isolated workspace/community/plugin settings were
restored and temporary source/notes/trace removed. Personal vault and physical
tablet were untouched. Evidence, raw trace from diagnosis, UI screenshots,
plugin-disabled baseline, installed artifact hashes and restoration audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-startup-trace/`.
Earlier failing candidates remain documented in the separate startup-metadata
evidence directory. Live desktop, other formats, delayed Dataview startup and
explicit Markdown-mode checks remain open. No Bend theorem was changed.

## Concurrent video pane opening — 0.0.67

The prior video-opening guard was global per note: while one view was opening,
a second pane for that same note was silently skipped. It is now a weak map of
destination leaf to note. Duplicate requests for one pane are coalesced; another
pane opens independently. Cleanup only removes the matching request. File-open
notifications consult their owning recent leaf.

A regression failed before the fix (one view opened instead of two) and passes
afterward. All 312 tests, release build and original-ID rehearsal packaging pass.
Actual Android 1.14.4 cold startup restored two Markdown tabs for the same video
note as two native video views with both original leaf IDs and the first leaf
still active. The player showed ERR_INTERNET_DISCONNECTED, so this establishes
view restoration, not playback, caption loading, draft isolation or editing.
Original isolated workspace/community/plugin settings were restored and synthetic
fixtures removed. Evidence and exact installed-artifact hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-video-pane-startup/`.
No personal vault, physical tablet, network settings or Bend source was changed.

## Markdown recovery after a failed source — 0.0.68

Original-ID restored readers now catch failures from the Open Markdown action,
show an accessible status message and re-enable the action for retry. Previously
a rejected view transition escaped as an unhandled promise rejection. A response
for an unloaded, replaced or retargeted recovery view cannot add a stale message.

The plugin-boundary regression starts from a valid remote annotation target whose
fetch returns 404, then makes the first Markdown transition fail. Retrying opens
Markdown successfully; file-open, metadata-changed, metadata-resolved and pending
retry events do not restart the failed download. Complete note text stays equal.
All 313 tests, release build, original-ID rehearsal packaging and diff checks pass.
This is automated host evidence; actual desktop/mobile recovery UI checks remain
open. No new installed artifact, personal-vault write or Bend proof is claimed.

## Markdown preview concurrency and failure recovery — 0.0.69

Each Preview click now gets a separate render target and child Component. A late
older render writes only into its detached target, and replacing the preview
removes its previous component so embedded resources can unload. Closing the
sidebar removes its Markdown component. Card and preview rendering rejections
are handled with literal comment text fallback, scoped to the still-visible
container; asynchronous failures cannot repopulate a closed or replaced sidebar.

The plugin-boundary test completes the second preview before the first, refuses
HTML interpretation in the fallback, rejects a render after close, reopens the
sidebar with failed card rendering and verifies the entire annotation note stays
unchanged. Automated scope only: actual Obsidian math/embeds/custom blocks,
resource cleanup behavior and accessibility still need live corpus checks.
All 314 tests, release build, original-ID rehearsal packaging and diff checks
pass. No new Bend theorem, installed artifact or native-replacement completion
claim.

## Video annotation refresh recovery — 0.0.70

A late read failure previously cleared cards from a newer successful refresh.
Failure results now require the same current request serial, view epoch and live
view as successful reads. The regression failed before the fix (zero cards
remained instead of one).

A current failure keeps the last loaded cards readable, labels them as last
loaded, disables card editing/deletion and new-annotation creation, and offers
Refresh annotations to retry explicitly. Existing unfinished editor text is
retained. A successful retry restores the controls and clears the failure status.
Switching notes clears cached records before loading, preventing prior-note
comments from being displayed if the new read fails. Copy/seek on retained cards
remain available; mutations still use fresh atomic vault transactions.

Tests cover reordered failure/success, current failure, retry, draft retention,
control states, switching notes and complete annotation-note preservation.
These are automated host checks; actual filesystem/sync failure UI, caption
provider errors and broader platform recovery remain release gates. No new
Bend theorem or installed artifact is claimed. All 316 automated tests, release
build, original-ID rehearsal packaging and diff checks pass.

## Committed save versus failed refresh — 0.0.71

Saving a video annotation previously replaced a post-save read error with the
plain Annotation saved message. The UI now distinguishes a committed write from
a failed list refresh and retains the refresh error and explicit retry guidance.
A superseded refresh does not overwrite the newer request's status. Successful
reads and current failures return distinct outcomes; stale reads return neither.

The regression failed before this fix and exercises both create and update: the
write commits, the following read fails, the draft recovery checkpoint clears,
the editor closes, and retry refreshes the list without saving or duplicating
the annotation again. Whole saved document bytes remain equal across retry.
This is automated host evidence; live filesystem failure and screen-reader
announcement checks remain open. All 317 tests, release build, original-ID
rehearsal packaging and diff checks pass. No storage law or wire format changed.

## Transcript keyboard and composition semantics — 0.0.72

Focusable passage text now exposes a button role and a timestamp action title.
Enter and Space seek to the original fractional cue time; Space prevents page
scrolling. Modified shortcuts and IME/composition events (including keyCode 229)
do not seek. Passage text remains selectable, and clicking with an active text
selection retains the existing non-seeking behavior. Native timestamp buttons
remain available alongside passage text.

Transcript search defers filtering during IME composition, applies the query at
composition end, and ignores delayed input/composition events from an older reader
epoch. The regression checks Japanese composition, filtered visibility, reader
reopening, action roles, keyboard activation, modifiers and unchanged annotation
documents. These host tests do not establish actual TalkBack/VoiceOver output,
hardware-key routing, mobile IME behavior or an optimal tab order for long
transcripts; those remain accessibility gates. No new formal proof or installed
artifact is claimed. All 319 tests, release build, original-ID rehearsal
packaging and diff checks pass.

## Long-transcript keyboard navigation — 0.0.73

Transcript passages use a roving Tab entry instead of putting both controls in
every row into the sequential Tab order. One visible passage is tabbable;
timestamp buttons remain pointer/assistive-technology actions but are skipped
by sequential Tab. Arrow Up/Down and Home/End move focus among visible passage
texts without seeking. Enter/Space seek. Modified/composition keys retain their
normal behavior. The transcript container remains a separate Tab entry.

Filtering retains a visible entry or selects the first match. It does not move
focus from Search; if a focused passage becomes hidden, focus moves to a visible
entry or the transcript container. Playback updates never change keyboard focus.
Arrow navigation pauses Follow and adjusts only the transcript's own scroll.
The displayed instructions describe these keys. Text selection and annotation
capture keep the original passage nodes and timestamps.

A 500-passage host regression verifies bounded sequential Tab stops, filtered
navigation, Home/End, modifier/IME suppression, focus preservation during playback
and search, empty results, seeking, scoped scrolling and whole-note equality.
All 320 tests, release build, original-ID rehearsal packaging and diff checks
pass. Actual TalkBack/VoiceOver, browser screen-reader navigation mode, mobile
hardware keys and larger transcript performance remain open. No new installed
artifact or Bend theorem is claimed.

## Actual Android transcript navigation and metadata startup — 0.0.74

A cold-restored video view could open before its annotation target metadata was
ready, keep an empty target, report no player adapter and discard the saved
transcript response. Metadata changed/resolved now reinitializes a still-unresolved
view when its target becomes available. An established target is not silently
replaced. The host regression checks saved-cue recovery and that later settled
metadata events do not rebuild the player.

Final release on Android Obsidian 1.14.4 / emulator-5554 cold-opened the existing
local flower.mp4 player as Video ready and automatically loaded a synthetic
500-passage VTT companion. Actual input key events and accessibility focus confirm
Arrow Down focuses passage 001, End focuses 499, Home returns to 000, and Tab
leaves for annotation search. Transcript-local scrolling leaves the outer
instructions/current-position block in place. Playback remained at its initial
position; this is keyboard navigation evidence, not a fresh seek/playback test.
The focused span's visual focus treatment still needs polish.

Both the complete annotation note and companion VTT remained byte-identical.
Original isolated workspace/community/plugin settings were restored and temporary
files removed. No personal vault, physical tablet or network settings were used
or changed. Evidence, screenshots, accessibility focus bounds, byte/hash audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-transcript-navigation/`.
All 321 tests, release build, original-ID rehearsal packaging and diff checks
pass. Filtered navigation, actual IME, TalkBack/VoiceOver and other devices remain
open; no full accessibility or native-replacement completion claim.

## Visible transcript keyboard focus — 0.0.75

Passage text now has an accent outline when focus-visible matches, with an
offset and rounded corners. This distinguishes keyboard focus from the current
playback passage's filled background and side marker. No parser, annotation
behavior or document format changed.

Actual Android Obsidian 1.14.4 / emulator-5554 cold-opened the local player and
500-cue saved companion. Arrow Down focused passage 001; accessibility focus and
the raw screenshot show its accent outline while playback remains marked on
passage 000. Complete note and VTT bytes remained identical. Original isolated
workspace/community/plugin settings were restored; synthetic files removed.
Evidence, screenshot and installed-artifact hash audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-transcript-focus/`.

Release type checking/build, original-ID rehearsal packaging and diff checks
pass. No new unit tests were added for this CSS-only change. The previous runtime
checkpoint passed 321 tests; this change was verified through the actual Android
render. Dark theme, measured contrast, desktop and assistive-technology output
remain open. No personal vault or physical tablet was used.

## Video annotation-search composition — 0.0.76

Video card search now defers filtering during IME composition and applies the
query when composition ends. Events from replaced reader epochs or closed views
are ignored. Filtering does not rebuild the editor or the search field. The host
regression checks focus, editor-node identity, unfinished comment retention,
filtering after composition and delayed events after reader reopening, with the
entire annotation note unchanged. Actual Android/iOS IME and screen-reader
checks remain open; this is automated host evidence, not a new installed-artifact
or native-replacement completion claim.

0.0.76 validation: all 322 tests, release build, original-ID rehearsal packaging
and diff checks pass.

## Native video comment preview — 0.0.77

The video editor now offers Preview comment using Obsidian's MarkdownRenderer and
the annotation note as its source path. Preview components have a separate
lifecycle from card rendering; replacing/cancelling an editor or closing the view
unloads them. Repeated previews use separate targets/components, so late responses
cannot overwrite newer previews. Render failures show literal comment text.
Preview does not save the annotation.

All 323 tests and release/original-ID rehearsal builds pass. The new test checks
out-of-order renders, literal fallback, source-path resolution, cancellation and
whole-note preservation. A test-only entry point exposes the mocked renderer; it
is excluded from the shipped bundle.

Actual Android Obsidian 1.14.4 renders bold text and inline math in the editor
preview and saved card. An initial stale-coordinate tap hit Save in the synthetic
test instead of Preview; after-test-save.md records that committed baseline.
The subsequent verified preview and cancellation left that complete saved note
byte-identical and cleared its recovery draft. Original isolated workspace/plugin
settings were restored and the synthetic note removed. No personal vault or
physical tablet was used. Raw screenshots, note copies, exact installed hashes
and audit: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-video-preview/`.
Images, transclusions, custom blocks, desktop and screen-reader rendering remain
open. This is native-editor consistency evidence, not a claim of a complete
Annotate.tv feature inventory. The checksum-pinned published source at commit
3647dd92 confirms its transcript proxy requested English captions and numbered
returned cues; the externally loaded application still needs separate inventory.

## Preview invalidation after comment edits — 0.0.78

Regular and video editors now discard the preview target and unload its component
when the comment changes. Formatting buttons in the regular editor do the same.
A pending older render can finish only into its detached target, leaving the
visible preview empty until the user requests a new snapshot. Title/time/tag
edits do not invalidate a comment-only preview.

The host regressions cover typing after preview, formatting-button invalidation,
a late render after resumed typing, retained draft text and whole-note equality.
All 324 tests, release build, original-ID rehearsal packaging and diff checks
pass. These are automated host checks; earlier Android preview screenshots
precede this change and do not establish live invalidation or resource cleanup.
Actual embed lifecycle and mobile/desktop IME checks remain open. No wire format,
Bend theorem, personal-vault content or installed artifact changed in this check.

## Collection identity across asynchronous reads — 0.0.79

Shared PDF/EPUB/web note loading now revalidates collection association, exact
vault file identity and annotation-target after the asynchronous read completes.
Previously only request generation was rechecked, so a note replaced at the same
path, retargeted note or changed collection association could populate the old
collection when the metadata/layout event had not yet started a newer read.
Invalidated results now enter the existing unavailable/reconnect state, clear
old hosts and block ensureNote-based mutations until reconnection.

The regression failed before the fix and covers all three interleavings without
dispatching a newer load event. It checks empty records, unavailable state,
mutation refusal and byte-identical current note contents. This is a host-boundary
identity guarantee, not a distributed sync merge protocol or a new Bend theorem.
Actual conflicting-sync, filesystem replacement and reconnect UI checks remain
open. No personal vault or installed artifact was changed.

0.0.79 validation: all 325 tests, release build, original-ID rehearsal packaging
and diff checks pass.

## Shared-sidebar annotation read retry — 0.0.80

Unavailable collection states now include Retry loading annotations beside the
status error. Retry uses the captured collection key and existing generation/
identity guards, disables its button while pending and reloads without opening a
new source pane or cancelling the active draft. The normal refresh redraws the
sidebar after recovery. Failed retries keep the existing error/retry path.

The host regression simulates a vault read failure, retries through the actual
sidebar button, and verifies recovered records, preserved unfinished comment and
tags, removal of the error action and whole-note equality. All 326 tests, release
build, original-ID rehearsal packaging and diff checks pass. Actual filesystem/
sync recovery and screen-reader announcements remain open. No Bend theorem or
installed artifact changed in this check.

## Publisher gradient backgrounds — 0.0.81

Publisher background/background-image values now allow linear, radial, conic
and repeating gradient functions. The allowance is restricted to background
values; existing URL ownership, numeric limits, unknown-function rejection,
variable substitution and browser declaration validation still apply. No raw
author stylesheets or external image URLs enter the host.

Two regressions cover all six gradient forms, variable/shorthand cascade,
background sizing, original/rendered text-range equality, unknown nested functions
and mixed external image layers (zero image fetches). The positive regression
failed before the change. The test DOM cannot parse full background-position/size
shorthand with gradients, so that form was checked in the actual host.

Android Obsidian 1.14.4 cold-opened a synthetic grid-derived EPUB with a visible
linear blue gradient and variable radial purple gradient using full background
shorthand. The source EPUB and complete note remained byte-identical. Original
isolated workspace/community/plugin settings were restored; synthetic files
removed. Evidence, screenshot and installed hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-gradients/`.
`test-support/gradient-layout-fixture.mjs` deterministically reproduces its
decompressed contents; ZIP directory timestamps are normalized in the generator.

All 328 tests, release build, original-ID rehearsal packaging and diff checks
pass. Conic/repeating visual checks, dark themes, pagination and annotation CRUD
on this fixture remain open. This is bounded background support, not complete
publisher CSS parity. No Bend theorem or personal-vault content changed.

## Text-decoration shorthand cascade — 0.0.82

Text-decoration now expands to line, thickness, style and color before declaration
weights are compared. Complete values are checked against the bundled CSS-tree
grammar; omitted components use their initial values. Global values apply to all
components. Invalid declarations are omitted, while invalid variable substitution
masks earlier components using unset. Passive-value/number checks still run
before expansion. This follows [CSS Text Decoration 4](https://www.w3.org/TR/css-text-decor-4/#text-decoration-property).

Two host regressions cover mixed shorthand/longhand specificity, important color,
omitted-value resets, absent variables, inherit and invalid declarations. No
source selectors, annotation storage or Bend laws changed. Actual EPUB visual
checks (underline/strike-through, dark theme, font metrics and highlighted text)
remain open; this checkpoint is cascade evidence, not complete decoration parity.
No installed artifact or personal-vault content changed.

0.0.82 validation: all 330 tests, release build, original-ID rehearsal packaging
and diff checks pass.

## Actual Android text-decoration cascade — unchanged 0.0.82

The final 0.0.82 release cold-opened a synthetic grid-derived EPUB on Android
Obsidian 1.14.4. The purple heading displays a blue wavy strike-through from an
important line override and color longhand; the blue heading displays the red
wavy underline from the more-specific shorthand. Both survive a later weaker
text-decoration:none declaration. Raw screenshot 02-ready.png records the render.

EPUB and complete annotation-note bytes remained equal. Original isolated
workspace/community/plugin settings were restored and fixtures removed. Exact
installed-artifact hashes and audit are retained at
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-decorations/`.
The deterministic `test-support/decoration-layout-fixture.mjs` reproduces the
fixture. Runtime remains 0.0.82; no source or CSS fix was required after the visual
check, and no additional unit test was added. The preceding runtime checkpoint
passed 330 tests and release/rehearsal builds. Dark theme, pagination, highlighting
interactions, desktop and broader decoration corpus remain open. No personal
vault or physical tablet was used.

## Publisher list shorthand and inheritance — 0.0.83

Passive list-style declarations now expand to marker type, position and image
reset before cascade ranking. Omitted values reset to disc/outside/none; an
explicit none sets the type to none unless a separate type was supplied. Global
values affect all components, and invalid variable substitution masks earlier
components using unset. List properties are included in inherited root styles.
Complete shorthands use the bundled CSS-tree grammar; URL/image-marker acquisition
is not enabled by this change. See [list-style reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/list-style).

Two regressions cover specificity, omitted-value resets, none ambiguity,
position-only shorthand, root inheritance, variable failure, blocked URL markers
with zero image reads, and original/rendered list-text mapping equality.
Actual marker visuals, counter styles, image bullets, pagination, list start/
reversed/value attributes and device corpus remain open. This is automated host
evidence; no installed artifact, annotation format or Bend theorem changed.

0.0.83 validation: all 332 tests, release build, original-ID rehearsal packaging
and diff checks pass.

## HTML list numbering and marker hints — 0.0.84

Projection preserves ol start/reversed/type, li value/type and ul type attributes
on their list elements. Raw numeric/boolean attribute values are retained so the
browser uses the same parsing and counter behavior as the original DOM, including
negative and long start values. A derived case-preserving marker hint plus reader-
scoped CSS restores marker presentation against host defaults; publisher inline
styles can override it. This avoids HTML type selectors' case-insensitive matching
collapsing lower/upper Roman or alphabetic hints.

Host tests compare source/rendered list properties, exact attribute values, text
and range mappings. Shipped-CSS tests distinguish a/A/i/I and check inline style
overrides. All 334 tests, release build, original-ID rehearsal packaging and diff
checks pass. A deterministic fixture is in test-support/list-layout-fixture.mjs.

Actual Android Obsidian 1.14.4 verifies V, IX, VIII for a reversed/restarted list
and square markers from publisher shorthand. The first candidate showed decimal
markers despite retained type attributes; screenshot 04-markers-ready.png shows
the corrected final artifact. Source EPUB and complete annotation-note bytes
remain equal. Original isolated workspace/community/plugin settings were restored
and test files removed. Evidence and installed hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-lists/`.

Host marker colors remain dim; margin-block in the fixture is omitted and triggers
the publisher-style warning. Those are recorded remaining gaps. Image markers,
counter definitions, dark theme, pagination, list annotation CRUD and broader
platform checks remain open. No personal vault, physical tablet or Bend source
was changed.

## EPUB list marker color — 0.0.85

Reader-scoped li::marker now inherits the list item's color instead of the host's
muted UI marker color. The actual Android Obsidian 1.14.4 screenshot shows dark
Roman and square markers alongside the dark book text, preserving the reversed
V/IX/VIII sequence. This corrects the dim-marker finding in 0.0.84.

Source EPUB and complete note bytes stayed equal. Original isolated workspace/
community/plugin settings were restored and temporary fixtures removed. Raw
screenshot and exact installed hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-list-marker-color/`.
Release type checking/build, original-ID rehearsal packaging and diff checks pass.
No new unit test was added for this CSS-only change; the preceding runtime
checkpoint passed 334 tests. Dark theme, contrast measurement, publisher marker
pseudo-element rules and desktop checks remain open. Logical spacing remains
omitted in the fixture. No personal vault or physical tablet was used.

## Logical spacing and alias cascade order — 0.0.86

Publisher margin-block, margin-inline, padding-block and padding-inline now
validate against the bundled grammar and expand to their start/end longhands.
Global values and computed-invalid variables affect both sides. Invalid multi-
value declarations remain omitted. Winners carry source order and are emitted
from weaker/earlier to stronger/later cascade weights. This preserves ordering
when physical and logical properties alias the same browser-resolved edge,
without hardcoding direction or writing-mode edge mappings.

The regression checks one/two-sided expansion, physical/logical emission order
under specificity and source-order ties, invalid arity and variable unset. All
335 tests, release build, original-ID rehearsal packaging and diff checks pass.
These ordering tests do not themselves establish actual RTL/vertical geometry.

Final Android Obsidian 1.14.4 cold-opened the unchanged list fixture with its
margin-block spacing applied and the publisher-style omission warning gone.
The reversed Roman and square markers remain visible. Source EPUB and complete
note bytes were identical; original isolated workspace/community/plugin settings
were restored and fixtures removed. Screenshot, raw UI and installed hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-logical-spacing/`.
Actual RTL/vertical physical-edge competition, pagination, dark theme and wider
layout corpus remain open. No personal vault, physical tablet or Bend source
was changed.

## Actual LTR/RTL physical/logical alias geometry — unchanged 0.0.86

A synthetic four-paragraph EPUB now checks both directions and both stronger
property types. Specific logical start margins compete with weaker physical
edges; specific physical edges compete with weaker logical starts. Actual Android
Obsidian 1.14.4 displays the intended right edge in RTL and left edge in LTR.

Screenshot blue-border samples, converted using the emulator's 420 dpi density
(2.625 device pixels/CSS pixel), measured 40.00px for each logical winner,
59.81px for the RTL physical winner and 60.19px for the LTR physical winner.
All are within one CSS pixel of the expected 40/60px. This establishes actual
horizontal alias precedence for these cases, beyond serialized-style tests.
The deterministic fixture is test-support/logical-spacing-fixture.mjs.

Source EPUB and complete note bytes remained identical. Original isolated
workspace/community/plugin settings were restored and fixtures removed. Raw PNG,
accessibility bounds, pixel geometry and installed artifact hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-spacing-aliases/`.
No runtime change/version bump was needed; the existing 0.0.86 artifact is used.
Its preceding checkpoint passed 335 tests and release/rehearsal builds. Vertical
writing, pagination, inheritance/revert edge cases, annotations on this fixture
and desktop remain open. No personal vault or physical tablet was used.

## Projected table header relationships — 0.0.87

Passive table projection now keeps valid th scope values and abbreviated header
labels. Cell headers references are resolved after the projection is complete,
rewritten to prefixed reader IDs, deduplicated and limited to retained th elements
in the same source table. Missing, cross-table and host-only references are not
linked. Forward references work without adopting original/book DOM nodes.

The host regression checks row/column scope, abbreviations, forward references,
missing/duplicate/cross-table header references, text equality and original/
rendered cell-range mapping. Actual TalkBack/VoiceOver header announcements,
complex multi-level/merged tables, duplicate source IDs and broader table styling
remain open. Existing span-size restrictions also remain. This is semantic DOM
coverage, not full table accessibility parity or a new Bend proof. No installed
artifact or personal-vault content changed.

0.0.87 validation: all 336 tests, release build, original-ID rehearsal packaging
and diff checks pass.

## Table span attributes — 0.0.88

Cell colspan/rowspan and col/colgroup span are now preserved on their relevant
elements. The previous three-digit filter dropped longer values, and column
spans were omitted entirely. Keeping raw passive values lets the browser apply
the same integer parsing and clamping as the original source DOM, including
rowspan=0, instead of a separate projection-specific numeric grammar.

The host regression compares source/rendered DOM span properties and raw values
for zero, long and noncanonical numeric spellings, with unchanged cell text and
range mappings. All 337 tests, release build, original-ID rehearsal packaging and
diff checks pass. Actual merged-table rendering, very large-table memory/layout,
screen-reader announcements and broader device checks remain open. This is
structural DOM evidence; no installed artifact, personal-vault content or Bend
theorem changed.

## Actual Android merged-table rendering — unchanged 0.0.88

A deterministic synthetic EPUB now exercises a two-level header, grouped column
heading, rowspan=0 body header, explicit header references, column spans and a
full-width footer. Android Obsidian 1.14.4 renders the expected merged geometry
in portrait scroll mode. Screenshot 02-ready.png shows both body rows under Q1
and the Measurements heading spanning Quantity/Quality. No runtime fix was
needed after the visual check. The fixture is test-support/table-layout-fixture.mjs.

Source EPUB and complete note bytes remained equal; original isolated workspace/
community/plugin settings were restored and test files removed. Raw UI, PNG and
installed hashes: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-tables/`.
Runtime remains 0.0.88, whose preceding checkpoint passed 337 tests and release/
rehearsal builds. This verifies small merged-table rendering, not screen-reader
header announcements, huge-table memory, pagination, dark theme, annotation CRUD
or complete desktop/mobile table parity. No personal vault or physical tablet
was used.

## Native disclosures and hidden-passage navigation — 0.0.89

Projection retains authored details open state and disclosure group names. Group
names are scoped per projection, even when callers reuse an ID prefix, so book
controls cannot group with host UI or another projected chapter. Native summary
interaction remains browser-managed.

EPUB annotation activation, chapter search and fragment navigation reveal closed
ancestor disclosures before scrolling to hidden content. A visible summary does
not force its own disclosure open; nested content opens outer ancestors first.
RangePainter listens for captured toggle events and schedules a geometry repaint,
including cases where the outer reader size does not change. Disposal removes
the listener. Source text, selectors and stored annotations are not rewritten.

Tests cover authored/scoped state, separate projection groups, summary/content
reveal, nested/idempotent reveal, original/rendered range equality, actual EPUB
activation/search call order, repaint scheduling and listener cleanup. All 340
tests, release build, original-ID rehearsal packaging and diff checks pass.
Actual disclosure UI, grouped behavior on supported host versions, highlight
geometry after toggles, cold progress into collapsed content, snapshot navigation
and assistive-technology announcements remain open. This is automated host
evidence, not a new installed artifact or Bend theorem.

## Saved offset inside collapsed disclosure — 0.0.90

The range-based EPUB offset restoration path now reveals enclosing disclosures
before measuring the target text rectangle. Previously a reopened reader could
measure hidden content and restore to the wrong geometry. The existing offset
indexing, chapter-start guard and browser scroll calculation remain in place.

The compiled-reader regression failed before this change and checks a saved
nonzero offset in collapsed text: the disclosure is open when geometry is read,
the scroll position is correct and the original text offset is retained. All 341
tests, release build, original-ID rehearsal packaging and diff checks pass.
Actual cold-start geometry, pagination, zero-offset disclosure intent and manual
open-state persistence remain open. This is host-assumption evidence, not a Bend
proof or a new installed artifact. No personal-vault content changed.

## Saved-website disclosure navigation — 0.0.91

Snapshot reading-mode activation now reveals ancestor disclosures around an
already-mapped annotation range before scrolling. Source mode keeps its editor
position navigation. The same helper used for EPUB handles nested disclosure
ancestors without changing source text or stored selectors.

The adapter-method regression supplies a mapped reading range and checks reveal
before scroll, then checks that source-mode activation uses Markdown editor
positions without opening the reading DOM. This is direct activation coverage,
not a full snapshot import/render/mapping workflow. The test-only plugin entry
exports SnapshotHost to exercise that method; shipped code is unaffected by the
export. Actual saved-copy disclosure capture/mapping, mobile navigation and
assistive-technology checks remain open. No new installed artifact or Bend
theorem is claimed.

0.0.91 validation: all 342 tests, release build, original-ID rehearsal packaging
and diff checks pass.

## Android disclosure progress restoration — 0.0.91

The isolated Android vault cold-opened a synthetic EPUB with a nonzero saved
text offset inside an initially closed `details` element. The restored passage
was visible at the top of the reader. Its disclosure opened, and the authored-open
peer in the same named group closed. This exercises actual Android browser
layout and native disclosure grouping, beyond the simulated geometry tests.

The reproducible archive generator is `test-support/disclosure-layout-fixture.mjs`.
It inherits the base fixture's book/chapter labels; those labels in the screenshot
are not a different book. Private screenshot, original configuration backup,
installed artifact hashes and byte audits are under
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-disclosures`.
The EPUB and note were byte-identical after the check. Original workspace,
community-plugin configuration and plugin data were restored exactly; synthetic
files were removed. The installed experimental artifact is 0.0.91. No personal
vault was modified.

This closes only the nonzero-offset Android portrait scroll-mode restoration
check. Zero-offset pagination, manual disclosure-state persistence, annotation
overlay geometry after toggling, assistive technology and the complete saved-copy
website workflow remain unverified. No runtime or Bend proof changed in this
validation step.

## Disclosure highlight repaint regression

A host-boundary regression now exercises closed → open → closed disclosure
geometry while the reader root stays fixed. It checks removal of hidden marks,
repositioning of highlights after the disclosure, reconstruction of marks when
opened, one owned overlay, unchanged selected text and cleanup on disposal.
This supplies synthetic rectangle measurements; it does not establish actual
Android/desktop text-range geometry or toggle-event timing. The live overlay
geometry gate remains open. No production behavior or Bend theorem changed.

Validation: `npm test` passes all 343 tests, including the TypeScript check and
build; `git diff --check` passes. No new installed artifact was needed for this
test-only addition.

## Actual Android PDF text-layer eviction and recovery — 0.0.97

The isolated Android Obsidian 1.14.4 native reader now has live cache-eviction
coverage beyond the simulated lifecycle regression. A deterministic 40-page
synthetic PDF has a distinct anchor on every page. A page-one highlight was
created through selection/Highlight; navigation used the native page-number
input (1 → 40 → 20 → 10 → 1). One jump to page 40 did not evict page one, so that
observation alone was not counted as virtualization evidence.

Read-only Android WebView DOM snapshots showed the page-one text layer initially
present (backend node 8) with one saved annotation ID. After the additional jumps,
page one's text layer and owned mark were absent while ten other pages were
cached. Returning to page one created a different text layer (backend node 1489)
and exactly one mark for the same annotation ID. The screenshot shows the mark
on `anchor`, and tapping it opened the saved sidebar card labelled Page 1. No
page script was injected to force eviction or restoration. Temporary localhost
ADB forwarding was removed afterward.

The annotation note after navigation is byte-identical to its post-creation
baseline; that baseline retains the complete initial note as an exact prefix.
The PDF stayed byte-identical. Original workspace, plugin data and community
plugin configuration were restored exactly; synthetic vault files were removed.
The installed 0.0.97 release artifacts were verified by hash/byte comparison.
No personal vault or physical tablet was used.

`test-support/pdf-virtualization-fixture.py` reproduces the test PDF with the
bundled ReportLab/pypdf runtime. Its generation check validates all forty page
anchors; Poppler renders of pages 1 and 40 were visually inspected for clipping
and legibility. This is a test fixture, not a new shipped PDF dependency.
Private screenshots, before/after note/PDF bytes, DOM snapshots, virtualization
assertions and artifact/configuration audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-pdf-virtualization`.

No runtime fix was needed, and the 356-test suite was not repeated for this
fixture/evidence-only addition. This closes one actual Android PDF cache-eviction
case; arbitrary PDF text/layout complexity, overlap, pop-outs, desktop/device
corpus, complete mobile CRUD and performance budgets remain release gates. No
Bend theorem or published-reader UI compatibility claim is added.

## Actual Android overlapping PDF annotations — 0.0.97

Two seeded synthetic records share page-one text in the 40-page PDF fixture:
`anchor` (Inner annotation) is nested inside `Unique anchor 01` (Outer annotation).
Both are independently verified against the native PDF text. Touching their common
area opens Choose annotation with both records. Touch-selecting Outer annotation
opens its card with the selected border; Arrow Down moves accessibility focus to
the outer chooser button, Arrow Up/Enter selects the inner card. Escape dismisses
the chooser without opening an editor. No production change was needed.

The initial outer fixture was malformed: its context prefix was sliced from an
already trimmed visible field, dropping part of the page number. The reader
correctly refused that record while keeping the inner mark functional. Corrected
records were re-created through the codec before the successful interaction
checks; a metadata-changing call to the comment/tag update API was refused as
expected and did not modify the fixture. Screenshots 01–03 describe this setup
failure and are not overlap-success evidence. Corrected marks appear in 04,
the touch chooser in 05, selected outer card in 06, keyboard focus in 09, selected
inner card in 10, and Escape cancellation in 12–13.

A host-boundary regression now covers invalid outer context alongside a valid
inner mark, corrected independent range verification, two-choice hit testing,
selection of the outer annotation and chooser disposal. Its rectangles are
synthetic; the Android screenshots separately establish actual touch/keyboard
behavior. This is a seeded overlap, not an assertion that mobile drag selection
created both records.

Private fixture copies, screenshots/accessibility dumps and integrity audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-pdf-overlap`.
The corrected annotation baseline and PDF remain byte-identical after all choices
and cancellation. Original workspace, plugin data and community-plugin settings
are restored, and synthetic vault files removed. No personal vault or physical
tablet was used. Arbitrary overlap geometry, larger groups, screen-reader
announcements, pop-outs, desktop and full mobile CRUD remain release gates.
No production version increment or Bend theorem is claimed for this test/evidence
addition.

Validation: all 357 tests pass, including the TypeScript check/build; diff checks
pass. Installed experimental files still match the 0.0.97 artifact.

## Retired overlap controls and PDF dialog ownership — 0.0.125

Shared chooser controls become inert after dismissal, replacement or selection. Native PDF dismisses only its own chooser on records/renderer changes or disposal and rejects detached marks. All 392 tests and release/rehearsal builds pass; fresh Chromium verifies replacement focus and exactly-once activation. ANNOTATION_CHOOSER_LIFECYCLE.md records scope/evidence. This is not new device/PDF geometry or all-adapter multiple-pane evidence. Installed Android remains 0.0.124.

## EPUB/saved-web/live-web picker ownership — 0.0.126

RangePainter and LiveWebHost now dismiss only their own retired choices. Saved-content repaint invalidates old marks; live choice activation obtains fresh guest status and refuses changed source/revision/navigation/rows. All 394 tests and release/rehearsal builds pass; existing private-label isolation remains checked. See ANNOTATION_CHOOSER_LIFECYCLE.md. This is automated coverage; new installed-device and arbitrary multi-pane race checks remain open.
