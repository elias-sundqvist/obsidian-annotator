# Native replacement plan

Current checkpoint: **native 0.0.138**. Native PDF/EPUB/web/video, Bend storage, transcripts, publisher styling and original-ID rehearsal implementations exist. The remaining work is a combination of specific fidelity gaps and incomplete published-reader/platform/upgrade acceptance, described in the current matrix below and [release evidence matrix](RELEASE_EVIDENCE_MATRIX.md). See also [reader evidence](PARITY.md) and [publisher typography scope](EPUB_PUBLISHER_STYLES.md). Production promotion remains open.

Historical baseline: the original read-only assessment covered commit `4494782`,
native 0.0.10, on 2026-11-01. That assessment created only this plan and inspected
the then-current 68-test result. Later implementation checkpoints supersede it;
its test count and missing-feature findings do not describe the current code.

## Recommendation

Keep the experimental branch and close the **frozen published compatibility and
live upgrade acceptance contract** before promotion or deleting old code. The most consequential
remaining uncertainty is whether an unchanged published Annotator installation
can retrieve, navigate to, and edit every class of newly written annotation—not
whether its parser can recognize a block. Close the remaining reader/video
fidelity gaps and device/workspace checks, then promote one native release path.

The architecture should stay: one loss-preserving Bend-backed document store;
small source adapters for PDF, EPUB, web, snapshot, and timestamp records; one
native sidebar; Obsidian's PDF/Web viewers where available. Keep wire-format
compatibility code even after removing the old application. Reimplementing an
independent storage format or bundling a second PDF viewer would discard the
strongest parts of the current work.

“Native-only” means no bundled Hypothesis application, OfflineIframe, scraped
reader application, or iframe-based annotation UI. It does **not** mean arbitrary
websites execute in Obsidian's privileged DOM. The current desktop Web viewer is
an isolated `webview`, with a narrow guest adapter and private comments retained
in the host. JS/login-dependent websites need that boundary. A literal ban on
all browser isolation surfaces conflicts with full interactive website parity
and likely with embedded external-provider video playback. Resolve that product
constraint explicitly; do not claim both promises have been met.

## What is actually unfinished

Current implementation assessment: **0.0.138**, reconciled with source on
2026-11-02. The chronological checkpoints below retain historical findings and
test counts; they are not the current missing-feature list. The current native
suite has 423 passing tests and release/original-ID rehearsal builds pass.
Historical live results cover specific older artifacts, not automatic validation
of the latest bundle. See [release evidence matrix](RELEASE_EVIDENCE_MATRIX.md)
for the distinction and the next acceptance runs.

| Area | Implementation finding | Remaining evidence or decision |
| --- | --- | --- |
| Storage and ordinary annotations | Native/experimental legacy share compiled Bend CRUD; unknown JSON lexemes, IDs, source prose, replies, notes, tags, and JSON exchange are covered. Native stale edits are refused. | Expand frozen **published** integration coverage, corpus, failure and sync tests. Native stale protection is not a distributed merge protocol. |
| Native PDF | Built-in reader, highlights, selection, source fingerprint, links and overlap chooser exist. Android overlap choice and actual text-layer eviction/rebuild have live evidence on 0.0.97. | Complete mobile CRUD/cold reopen, complex PDF corpus, pop-outs/multiple panes, appearance and latest-artifact reruns. Cross-page creation is deliberately refused because the pinned old client refuses it. |
| EPUB | Continuous linear scrolling, pagination, fixed XHTML/SVG pages, passive MathML/SVG, bounded publisher CSS/fonts, RTL/vertical axes, CJK typography, TOC/search, position recovery and non-spine navigation exist. Real vertical/CJK/font and published multi-chapter/thread checks have scoped evidence. | Wider publisher/resource corpus, complex ruby/bidi/sideways/media overlays, remaining non-XHTML formats, performance, full thread CRUD/repackaging/rename and latest-artifact platform runs. Implemented support is not arbitrary-book fidelity. |
| Web/snapshots | Desktop core Web viewer, isolated selector guest, archive plus Markdown copies, original-note association and mobile multi-copy chooser exist. Reload invalidation, code spacing and changed/duplicate mapping have automated/browser checks. | Real published-created annotations against a full mobile reading copy; actual-host chooser, SPA/login/redirect/frame/shadow coverage and revision workflow. A fetched/static or synthetic page does not prove a rendered authenticated page. |
| Video | Dedicated Bend timestamp store, native view/shared editor, embedded YouTube/browser media, provider-neutral seeking, caption retrieval, selectable transcripts and offline companions exist. Real Android ASR selection/save/seek/cold reopen has evidence. | Full external Annotate.tv UI baseline, published-app alternating full CRUD, desktop/provider/language/live/ads/pop-out/IME/accessibility coverage. Legacy mobile video was unsupported; native mobile playback is additional capability. |
| Settings/targets | Target and type both use Dataview/frontmatter resolution; arrays/wikilinks/custom paths, local file aliases/copies, legacy defaults/appearance adoption, versioned settings, validated startup and save read-back exist. | Actual sync/interrupted-write breadth, minimum host, Windows local paths, broader live settings/target/appearance parity and legacy debug-logging disposition. Read-back verification is not a distributed settings protocol. |
| Sidebar | Obsidian Markdown rendering, structured search, EPUB-aware location order, iterative nested/missing-reply forest, thread toggles, tags, links, retained drafts and stale-edit comparison exist. | Complete full-app thread CRUD, custom Markdown/embed lifecycle, keyboard/screen readers/IME, pop-outs/multiple panes and measured large-collection performance. |
| Distribution | Standalone native release excludes legacy inputs. Original-ID packaging, legacy leaf restoration, settings checkpoint and scoped desktop PDF/Android EPUB rollback rehearsals exist. | Root distribution still ships legacy. Complete all-format/current-artifact upgrade/rollback, actual minimum host and supported-platform acceptance before promotion/dependency removal. |

Evidence: [PARITY.md](PARITY.md), [Android/live checkpoint](ANDROID_AND_PARITY_RESULTS.md),
[storage/interoperability results](INTEROPERABILITY_RESULTS.md),
[EPUB identity results](EPUB_IDENTITY_RESULTS.md),
[main.ts](main.ts), [epub-book.ts](epub-book.ts), [epub.ts](epub.ts),
[dom-source.ts](dom-source.ts), [sidebar.ts](sidebar.ts), [build.mjs](build.mjs).
Legacy baselines: [settings](../../src/settings.tsx),
[EPUB continuous mode](../../src/defineEpubAnnotation.tsx),
[target resolution](../../src/annotatorView.tsx),
[video records](../../src/videoAnnotationUtils.tsx),
[video integration](../../src/defineGenericAnnotation.tsx),
[search grammar](../../submodules/hypothesis-client-annotator-fork/src/sidebar/util/search-filter.js).

## Ordered milestones

### 1. Freeze compatibility and close the upgrade contract

Deliver a checked-in feature/fixture matrix identifying the exact published
plugin artifact and client revision, the experimental patched legacy artifact,
and the native artifact. Keep three independent oracles. The existing immutable
pre-integration parser fixture is valuable, but it does not establish unchanged
published EPUB search/frame routing: current legacy EPUB integration has been
patched to share native identity resolution. Do not accidentally make “old reader”
mean only that patched implementation.

Cover ordinary historical PDF/EPUB/web blocks, page notes, nested/orphan replies,
tags, manual visible-field edits, multiple notes for one source, renamed targets,
LF/CRLF/EOF, Unicode, malformed/duplicate blocks, unknown selectors/metadata and
large-number lexemes. Preserve immutable fixtures and expected whole documents.
Use user-provided/anonymized real notes only when authorized; synthetic fixtures
should be labeled as such.

Acceptance must separately establish:

- Old writes → native reads/anchors; native writes → published old search finds
  them, actual reader anchors them, links navigate and comments/tags can be edited.
  Repeat through restart and after deleting one member of a reply thread.
- Native open/inspect is byte-identical. Native comment/tag edits change only the
  intended visible fields. Other records, opaque JSON and whole-document prose
  survive. Create/delete batches stabilize under the documented separator rule.
- Standard PDF fingerprints and HTML selectors work without native hints. EPUB
  retains `?loc=`, first-DC-identifier quirks and fingerprint aliases; repackaging
  recovery never guesses between repeated passages or rewrites old selectors.
- Check the published writer separately for unknown-field loss. We cannot make
  unmodified old code lossless by changing the new reader. If it strips data,
  document the precise rollback/editing limitation and design retained provenance
  or recoverable backups; do not label patched-writer tests published parity.
- Keep Bend's existing verification and negative controls passing. Add a law only
  if changing the codec's contract; DOM tests are not formal proofs.

Implement versioned native settings adoption with explicit original defaults,
including `annotationModeByDefault` and the misspelled `deafultDarkMode`; preserve
unknown settings and leave annotations untouched. Resolve Dataview type as well
as target, and audit `file:`/absolute paths as a desktop compatibility adapter or
an explicit supported-target decision. Test existing hotkey command IDs under the
original plugin ID. Add a documented per-setting disposition for brightness,
contrast, sepia, debug logging and the obsolete Annotate.tv resource URL.

**Exit:** a small vertical slice can upgrade a disposable legacy vault, open its
existing notes, create/edit a native annotation, reopen it in the frozen old
reader, and roll back without an implicit data migration. Any incompatible case
is named and classified before further promises or deletion.

### 2. Complete reader behavior against a representative corpus

Prioritize EPUB because the current safe projection deliberately drops visible
book content. Add passive MathML/SVG support, bounded resource/style/font handling,
RTL/page-progression and CJK layout, and true continuous chapter scrolling if the
legacy baseline confirms it as a supported workflow. Preserve the original DOM
selector coordinate system through projection; sanitization must never silently
anchor a different passage. Test SVG images, ruby, long paragraphs, tables,
footnotes/back navigation, async image reflow, font changes and orientation.

Decide fixed-layout support from actual old-reader fixtures. A book that works in
the published reader and cannot open natively is a release-blocking regression
under the no-loss requirement; a recovery link alone is not parity. Keep DRM and
unsupported encrypted/scripted content classified separately from previously
supported passive content. Size caps need corpus measurements and clear errors;
they are new limits, not automatically inherited legacy restrictions.

Finish sidebar behavior that affects existing workflows: structured search
filters used by the old sidebar, EPUB-aware source ordering, comment Markdown
math/embeds/custom code blocks, draft retention when views update, and legacy
shift-drag/link modifiers where promised. Audit PDF search/outline/page controls
through the built-in viewer instead of reimplementing them.

**Exit:** every supported corpus document renders its meaningful content,
selection round-trips to old selectors, navigation lands on the right passage,
and reflow/reopen preserves both annotation bytes and reading position. Difficult
documents get explicit expected failures; omitted content is never silently
treated as full fidelity.

### 3. Add native video and robust remote-source lifecycle

Introduce a timestamp source adapter and loss-preserving codec for the existing
video block grammar. Do not squeeze video records into Hypothesis JSON or rewrite
them on open. Native cards must expose title, timestamp and Markdown content,
create/edit/delete, block links and seek. Test old↔new alternating edits against
[the legacy serializer](../../src/videoAnnotationUtils.tsx), with raw prose and
malformed blocks retained/refused predictably. A Bend extension needs its own
specified invariants and verification, not a casual regex replacement of the
proved document store.

The durable video fields are title, content, start and block `_id`. The legacy
reader fabricates author/video metadata, dates, tags and other JSON fields on
read; do not promise recovery of values that were never persisted. Mobile video
is an optional improvement, not a requirement inherited from the old reader.

Use a provider adapter for YouTube playback/transcripts. Preserve existing
desktop workflows using an isolated supported player/Web viewer where feasible;
keep playback inside Obsidian with provider-neutral Go to timestamp actions.
Manual timestamp entry remains available when capture is unavailable; do not substitute an external provider button for playback.
Do not resurrect scraped Annotate.tv assets. Missing provider captions/login
availability must not prevent opening or editing existing notes. Verify the
concrete legacy UI's transcript behavior before finalizing its acceptance list.

Add an explicit remote refresh command: fetch and validate into a staged source,
retain the previous revision until success, compare content identity, re-resolve
annotations, report unresolved matches, and atomically commit cache metadata.
Never change annotation target/IDs/selectors to fit a new download automatically.
Test offline reuse, redirect/content change, network/HTTP/size failure, source
rename/delete, interrupted write, and old/new revision ambiguity. For snapshots,
create/version a new copy rather than overwrite the user's edited Markdown; let
the user choose among several copies associated with one annotation note.

**Exit:** remote PDF/EPUB refresh failure leaves the current reader usable;
website copies reuse the same collection on desktop/mobile; historical video
notes remain byte-identical on open and old-reader-consumable after native edits.

### 4. Prove live platform and failure behavior

Use only the established isolated desktop vault and app-private Android emulator
vault unless the user authorizes more. Run PDF, EPUB and snapshot create, edit,
delete, reply, note, overlap choice, copied-link navigation, cancel and cold reopen
on each supported platform. Actual Android process termination/relaunch is needed;
plugin reload is not the same test. Obtain iOS evidence before advertising iOS
support, and Windows evidence for a supported desktop release.

Desktop web coverage must include JS-generated content, SPA navigation, login,
redirects, duplicate text and inaccessible/shadow/frame content. Preserve guest
isolation and prove comments never cross into pages. Capability/error messages
must tell users when a rendered-page snapshot or external browser is needed.

Exercise original Markdown editing, two panes, pop-outs, new-tab modifiers,
plugin unload/reload, source/note moves, sync between platforms, and competing
edits. Preserve rejected drafts and offer reload/compare/retry; never silently
overwrite newer notes. Test malformed storage, unavailable source and interrupted
import/save recovery with before/after hashes.

Run keyboard-only and screen-reader flows, focus restoration, touch selection,
large fonts and small screens. Establish measured budgets on a low-end mobile
profile and large PDF/book/annotation fixtures, then fix indexing/sidebar/overlay
hotspots that exceed them. Current EPUB indexing retains all section DOMs and the
sidebar recreates cards; happy-path screenshots do not prove acceptable scaling.

**Exit:** record artifact hash, host/OS, source fixture, exact operation and
storage audit for each live result. Automated adapter tests and live evidence
remain separate columns. No unexplained data loss, stale save, wrong-document
anchor, lost draft, or stranded workspace is acceptable.

### 5. Promote, validate rollback, then delete legacy runtime

Promote the native entry point behind the original `obsidian-annotator` identity
in an isolated upgrade rehearsal. Restore saved `pdf-annotator` leaves through a
small compatibility view/state adapter, preserve command IDs, and convert only
necessary view/settings state with a reversible versioned backup. Handle startup
ordering/Dataview readiness and already-open documents. Avoid having old/new link
interceptors active together; that conflict has already occurred in live tests.

Set the actual minimum Obsidian version from feature-capability checks and live
coverage. The manifest currently says 1.11.4 while evidence uses newer hosts;
pinning API types alone does not prove minimum-version behavior. Rehearse normal
upgrade, interrupted upgrade, disable/re-enable and restoring the old artifact
after native edits. Publish limitations and rollback instructions honestly.

Delete shipping legacy code/assets only when all of these are true:

1. Every supported legacy workflow has a passing replacement fixture and required
   live evidence, or an explicit accepted product decision. Missing video/fixed
   layout cannot be renamed “intentional” solely to clear the checklist.
2. Frozen published-reader and patched-reader compatibility, Bend verification,
   native suite and original-ID upgrade/rollback gates pass for the exact artifact.
3. The root release command produces the native artifact from a clean checkout
   without building/reading Hypothesis, epub.js, OfflineIframe, scraped web/video
   applications or old bundled PDF.js. Inspect the dependency graph and output,
   not only strings in minified JS; verify no old network bootstrapping executes.
4. Remove legacy `src` reader/bootstrap paths, resource ZIP/build pipeline and
   package dependencies only after tracing remaining imports. Keep legitimate
   native dependencies such as JSZip. Rebuild lockfiles and release manifests.
5. Retain the tiny attributed [EPUB identity compatibility module](compat/README.md),
   Bend codecs, historical fixtures, and a separately runnable pinned legacy
   compatibility oracle with its licenses. Runtime removal does not require
   erasing the reference implementation. If removing the submodule from the main
   checkout, archive/pin the oracle reproducibly before deleting it.
6. Root README/build/contribution instructions describe the new architecture and
   supported platforms. The experiment's no-legacy bundle guard becomes a release
   gate, and a packaged install passes a final cold-open/CRUD/rollback smoke test.

Keep cross-page PDF creation, cloud account synchronization, DRM, and legacy
mobile video restrictions explicitly labeled as baseline limitations or separate
features. Arbitrary imported media/multi-target selectors must remain losslessly
stored and visible when not renderable; full authoring support is required only
where the actual old plugin supports that workflow. Service-side behavior and
provider availability cannot be guaranteed by a local reader replacement.

## Implementation checkpoint — 2026-11-01

Milestone 1 is in progress, not passed. Added the pinned published 0.2.11
[source-derived oracle and evidence matrix](compat/published/README.md) and
[schema-1 settings/target contract](UPGRADE_CONTRACT.md). The frozen frame router
caught and drove a correction to nested EPUB chapter URI generation. Published
account-field stripping is explicitly tested, including recovery through the
cloud-import provenance boundary. Settings adoption now retains unknown data and
legacy snapshots, default-opening and Dataview target types. The full native suite
passes 77 tests. Exact published UI, original-ID upgrade/rollback and the broader
corpus remain required; the source harness does not establish those gates.


Version 0.0.12 closes the structured **local** search and EPUB chapter-ordering
implementation gaps. Native search is differentially tested against the frozen
published parser/matcher, including field combinators, quoted phrases, accent
folding and relative-time queries. Source ordering now uses verified chapter
resolution and original UTF-16 offsets, with unresolved annotations last. The
81-test suite passes. Desktop live checks of `text:Second` and
`quote:"Highlights should"` returned the expected cards; clearing restored the
list. App reload/search left the note SHA-256 unchanged. Private evidence lives
in `obsidian-annotator-native-test-validation/2026-11-01-plan-implementation`.
This does not establish the remaining draft/accessibility/Markdown-rendering,
mobile, continuous-scroll or richer-EPUB gates.

Version 0.0.13 adds passive MathML presentation and SVG geometry/text projection,
plus reconstructed packaged SVG images. The browser renders actual namespaced
nodes, not flattened equation/diagram text. Shapes, gradients and local resource
references survive; active/unsupported elements, arbitrary CSS and external URLs
are not adopted. Annotation mappings still use original text/UTF-16 coordinates.
This closes basic MathML/SVG content omission, not publisher styling, full SVG
filter/animation/content-MathML or complex-publication fidelity.

Live synthetic-corpus evidence: desktop Obsidian 1.14.5 rendered a quadratic
formula, inline gradient diagram and packaged SVG. Native UI created equation and
SVG-label highlights; both restored after app reload and anchored through the
frozen published client's HTML engine. Android 1.14.4 rendered those desktop
records, opened the equation by touch, saved comment/tag changes, and restored
reader/highlights/edited card after actual process termination and relaunch.
The storage audit proves that only intended visible comment/tag bytes changed,
with the other record unchanged. Private screenshots/audits are in
`obsidian-annotator-native-test-validation/2026-11-01-fidelity`; the redistributable
synthetic source is `test-support/fidelity-fixture.mjs`. The native automated
suite passes 84 tests; these remain adapter tests, not additional Bend proofs.

Version 0.0.14 replaces chapter-local scroll mode with continuous linear EPUB
flow. Neighboring chapters mount together, with further chapters prefetched near
the viewport and distant DOM/resources released while preserving scroll position.
An active selection retains the intervening flow; non-spine footnotes remain
explicitly navigable without being appended as linear chapters. Captures are
bound to their actual chapter, independent of the first chapter still visible.
Changing reading mode during delayed resource loading honors the latest choice.

The suite passes 90 tests, including continuous chapter identity against the
frozen published anchor, position compensation with concurrent scrolling,
selection retention, footnote isolation, unload races and repeated mode changes.
Desktop live validation scrolled across the boundary, created a chapter-two
highlight while chapter one remained visible, then automatically tracked and
restored chapter two after reload. Android switched from pagination to Scroll,
scrolled across the same boundary, and restored chapter two after process
termination/relaunch. Reading/reopening left annotation bytes unchanged; the new
desktop record's original chapter selector anchored in the frozen published
client engine. Screenshots and audits are private under
`obsidian-annotator-native-test-validation/2026-11-01-continuous`.
Large-book performance, orientation/RTL/CJK and full platform workflow gates are
still open; this checkpoint does not establish the entire replacement plan.

Version 0.0.15 implements reviewed immutable remote revisions and offline history
selection, using the shared actual PDF identity/anchor policy and native EPUB
resolver. The 100-test suite covers failure, staging readback, concurrency and
rollback boundaries. See [REMOTE_REVISIONS.md](REMOTE_REVISIONS.md). Live refresh
UI, real host PDF validation, process interruption and sync failure rehearsals
remain open. The Mac locked while preparing the live remote fixtures; no live
refresh success is claimed. This advances milestone 3 without passing its release
acceptance gate or the overall plan.

The detailed [video implementation plan](VIDEO_ANNOTATIONS_PLAN.md), reviewed by
Astra, is now ready. Its first milestone is a frozen video codec reference plus a
real isolated desktop YouTube playback/current-time/seek and timestamp CRUD slice.
Transcript acquisition and missing external-player UI inventory remain separate
full-parity gates; no video implementation has been claimed by that planning pass.

Version 0.0.16 adds [local draft recovery and explicit stale-edit comparison](DRAFT_RECOVERY.md).
Unfinished comments/tags survive context switches and host-boundary settings
reloads; asynchronous saves/deletions cannot clear a newer draft. Editor caret and
composition survive simulated sidebar refreshes, including raw trailing-comma tag
input. The native suite passes 111 tests. Real desktop/Android input and cold
process recovery remain required; the Mac was still awaiting unlock during this
checkpoint. These changes advance the sidebar/failure gates without completing
the overall replacement plan.

## Local file targets checkpoint (0.0.17)

Native resolution now handles in-vault absolute/file-URL references and external
PDF/EPUB files through validated, retained vault copies. Synced in-vault aliases
permit mobile reuse; external refresh uses reviewed immutable revisions and
offline rollback. Original source files, note targets and annotation Markdown
are unchanged. Initial association failures retain verified copies for safe retry.
[Evidence and limits](LOCAL_FILE_TARGETS.md) distinguish real temporary-file/EPUB
checks and simulated host/mobile behavior from pending installed-device checks.
Local HTML, UNC, startup fragments, size/performance corpus and full published
upgrade/rollback parity remain gates.

## Unlocked live recovery checkpoint (0.0.18)

Desktop and Android recovery checks now have actual UI/process evidence. Live
EPUB refresh/rollback, Android cold reopening, desktop/Android draft recovery and
real file-PDF opening/PDF.js review passed. Testing found and corrected a renderer
filesystem module-loading mismatch and an overly strict EPUB context check;
144 native tests and release build pass. [Live results and exact remaining scope](LIVE_RECOVERY_RESULTS.md)
include whole-note/source hashes and screenshot locations. No new Bend theorem
or complete replacement-parity claim is made.

### EPUB navigation checkpoint (0.0.19)

Page-boundary navigation now follows the linear reading spine, entering the
previous chapter at its last text page. Internal-link Back restores the prior
text offset; a new book clears the old link history. The 146-test suite and
release build pass. [Evidence limits](PARITY.md) explicitly retain the pending
real-layout check because the desktop locked. This does not close the EPUB
fidelity, mobile or release/upgrade gates.

### Native video collection workspace (0.0.20)

Native routing, shared-sidebar timestamp cards/editor, title/time/comment CRUD,
block links, draft recovery and awaited stale-protected vault transactions now
exist. New tests execute the native controls/store and the frozen published
parser. [Implementation and limits](VIDEO_PLAYBACK.md#native-timestamp-workspace--0020)
separate this manual/external-playback workflow from the still-unverified real
player/capture/seek and transcript gates. The desktop was locked, so this is not
a live UI/screenshot or video replacement-parity claim.

### Concrete isolated video host checkpoint

The player guest, core guest transport and development loopback host are ready
for the real host spike. The [host gate](VIDEO_HOST_GATE.md) records 158 passing
host tests and explicitly open playback/client identity, timeline classification,
automatic capture/seek and screenshots. These modules are not connected to the
production main module; the native timestamp editor remains manual/external.

### Per-pane collection identity (0.0.21)

Explicit note opens now retain source + annotation-note identity per leaf instead
of changing every pane for that source. Capture owners prevent saving through a
replacement pane; native workspace hints, source/note rename and deletion handling
are implemented. [162-test evidence and remaining live/upgrade gates](COLLECTION_CONTEXT.md)
distinguish simulated native-adapter integration from actual Obsidian restart,
mobile, original plugin-ID and `pdf-annotator` compatibility. No root legacy
resources were removed, and no annotation format changed.

### Locked-Mac Android testing enabled (0.0.22)

User-authorized ADB screenshot/input control works on the isolated emulator while
the Mac remains locked. [Real video UI/unchanged-save/cold-reopen evidence](LOCKED_ANDROID_RESULTS.md)
and a startup-context reconciliation fix replace the earlier screenshot blocker
for Android. 163 tests/release build pass. Desktop UI and the provider playback,
capture/seek/transcript gates remain separate, unfinished work.

## Transcript checkpoint — 0.0.24

Native selectable transcript passages now seek the in-app player and create timestamped annotation drafts. VTT/SRT transcripts persist as separate vault files and can be explicitly linked with annotation-transcript. Desktop and Android synthetic-fixture interactions, published parser compatibility and original-note preservation passed; 176 tests and release build pass. Real YouTube metadata was discoverable, but caption download returned an empty response. Reliable provider retrieval and the remaining transcript inventory stay open; see [scope and evidence](VIDEO_TRANSCRIPTS.md).

## Real-caption retrieval checkpoint — 0.0.25

Fresh signed tracks from YouTube player metadata now resolve the original empty watch-page response on the tested videos. Production retrieval returned 466/286 English passages from two public videos; desktop and Android actual-host fetch/seek passed. A real caption selected into a 10.349-second annotation saved in the existing published-compatible format without altering the prior document prefix. 178 tests and release build pass. Broader acquisition coverage and remaining transcript features stay open; this is not a universal provider guarantee.

## PDF lifecycle checkpoint — 0.0.44

Clear detached rendered ranges immediately when removing PDF overlays. Actual
adapter regression coverage now exercises text-layer unloading/recreation and
late indexing after document replacement. 256 tests and release build pass.
Real host virtualization/performance and the other release gates remain open.

## PDF selection identity checkpoint — 0.0.45

Bind PDF selection validity to renderer generation and current document identity,
not only file metadata. Reject stale selections after renderer replacement and
wait for indexing before capture. 257 tests and release build pass; real host
replacement UI and remaining release gates stay open.

## Sidebar keyboard checkpoint — 0.0.46

Category tabs now implement roving focus and keyboard activation with linked
results panels. Comment save/cancel shortcuts respect IME composition.
258 tests and release build pass; full device/assistive-technology and sidebar
focus workflows remain release gates.

## Sidebar action focus checkpoint — 0.0.47

Retain matching annotation action/tab focus during refreshes in the same session.
Delete confirmation focuses Cancel and Escape returns to the original action.
258 tests and release build pass; remaining device/a11y and release gates stay open.

## Video keyboard checkpoint — 0.0.48

Video draft fields now have IME-safe save/cancel shortcuts and failed-save caret
restoration; delete cancellation returns focus. 259 tests and release build pass.
Actual-device and complete release gates remain open.

## Search IME checkpoint — 0.0.49

Keep the sidebar search input alive during composition and reconcile deferred
results on completion. Reject detached/changed-collection query events.
259 tests and release build pass; actual IME/device and full release gates remain.

## PDF source ordering checkpoint — 0.0.50

Order PDF annotation cards using verified live page/text matches and invalidate
old navigation matches before renderer replacement indexing. 260 tests and
release build pass; live multi-annotation ordering and release gates remain open.

## Fixed-page metadata checkpoint — 0.0.51

Effective package/spine layout now prevents silent fixed-page reflow. Viewport
validation and aspect-preserving fit helpers prepare renderer integration.
Fixed-page rendering remains incomplete; see EPUB_FIXED_LAYOUT.md.

## Fixed-page XHTML reader checkpoint — 0.0.52

Basic fixed-page slots now render declared dimensions with aspect-preserving
scale and source selector mapping. Android page-turn/cold-reopen/link/Back checks
passed; 265 tests and release build pass. Full fixed-layout parity remains open;
EPUB_FIXED_LAYOUT.md lists remaining spread, CSS, selection/CRUD and device gates.

## Fixed-page spread checkpoint — 0.0.53

Facing-page pagination now uses inherited/overridden policy and physical page
placement with RTL, blank-slot and resize grouping coverage. Android pairing and
right-page annotation compatibility passed before final zero-gap hardening.
269 tests passed; final hardening passed 28 targeted tests and release build.
Exact final-artifact UI and full parity gates remain open.

## Exact spread cold-start checkpoint — 0.0.54

Fix zero-geometry startup spread membership before finishing restoration.
270 tests and release build pass. Exact Android artifact cold-opened both pages
and restored the saved right-page highlight with unchanged source/note bytes.
Broader fixed-layout/platform and replacement gates remain open.

## Fixed-page transform checkpoint — 0.0.55

Compose independent page fit with passive publisher body/text 2D transforms.
272 tests and release build pass. Android transformed-text highlight and frozen
published selector checks passed. Broader rendering/device/release gates remain.

## Archive background artwork checkpoint — 0.0.56

Use archive image/SVG reconstruction for bounded publisher background resources,
with correct source-relative paths and lifecycle cleanup. 276 tests/release build
and Android artwork/highlight/page-turn checks pass. EPUB_BACKGROUNDS.md records
remaining CSS, resource-budget, content and platform gates.

## Background variable checkpoint — 0.0.57

Resolve variable image URLs at the consuming declaration base with bounded serial
loads. 282 tests/release build and exact Android artwork/highlight/cold-read
checks pass. Broader CSS/resource-corpus and platform/release gates remain open.

## Scoped editor shortcut checkpoint — 0.0.58

Fix host capture interception with public view scopes for owned native/video
editor fields. 284 tests/release build pass; exact Android PDF Ctrl+Enter save
and Escape cancellation pass with restored test files/config. Video/device/IME
and remaining replacement gates stay open; see EDITOR_SHORTCUTS.md.

## Continuous capture lifetime checkpoint — 0.0.59

Bind EPUB captures to the chapter projection's mount generation as well as the
file revision and reader epoch. Evicting and remounting a chapter during
continuous reading can no longer revive a pending selection from its old DOM.
Captures from unaffected mounted chapters remain valid; new captures still
anchor in the frozen published client engine. 285 tests and release build pass.
This is automated reader lifecycle evidence; no new installed-device UI check
or full selection/draft continuity across spread regrouping is claimed.

## Spread selection continuity checkpoint — 0.0.60

Regroup fixed-page spreads by retaining existing chapter projections, mounting
missing neighbors and disposing only pages outside the new group. The live
selected page becomes the retained chapter when narrowing. This preserves its
browser selection and pending capture instead of rebuilding the selected DOM.
Membership is recomputed after asynchronous resource loading; late completion
cannot alter a newly navigated chapter. 288 tests and release build pass.
Actual-device orientation selection/draft checks remain open; automated checks
include exact source anchoring in the frozen published engine.

Actual Android follow-up (2026-11-02): exact 0.0.60 preserved selected text and
handles through spread rotation, retained a typed sidebar draft through two more
rotations, saved via Ctrl+Enter, and cold-restored the saved highlight. Frozen
parser/anchor and byte-preservation audits passed. EPUB_FIXED_LAYOUT.md records
the fixture scope, screenshots, restoration and remaining gates.

## Publisher flex layout checkpoint — 0.0.61

Retain publisher display, flex container/item layout, wrapping, ordering, alignment,
gaps and bounded sizing with per-longhand shorthand cascade. 292 tests and release
build pass, including frozen published anchoring after source-preserving projection.
EPUB_FLEX_LAYOUT.md records scope, actual SVG baseline uncertainty and remaining
live wrapping/fragmentation/platform gates. No installed 0.0.61 UI result is claimed.

Actual Android flex follow-up (2026-11-02): exact 0.0.61 stacks/reorders publisher
panels in portrait and displays them side by side in landscape. A highlight in
the visually reordered second source panel survives cold reopening and rotation;
the actual record passes frozen published parsing and anchoring. Original bytes
and test-vault settings were verified/restored. EPUB_FLEX_LAYOUT.md records the
single-fixture scope and remaining pagination/reading-position/device gates.

## Visual reading-position checkpoint — 0.0.62

For reordered publisher content and fixed pages, choose the visually leading
visible passage while preserving original source offsets. Responsive winning
order/reverse-flow declarations control the geometry scan; ordinary linear
chapters retain their fast first-match path. 294 tests and release build pass.
EPUB_FLEX_LAYOUT.md records the source-order regression and remaining gates.

Actual Android 0.0.62 follow-up: source offset 223 for the visually leading purple
heading was retained while source-first blue remained visible below. A cold
restart restored that heading to the top of the viewport, with unchanged note
and book bytes and verified settings/rotation restoration. EPUB_FLEX_LAYOUT.md
records exact artifact hashes and remaining pagination/bidi/performance gates.

## Publisher grid layout checkpoint — 0.0.63

Retain grid tracks, named areas, implicit flow, item placement and alignment with
validated, shorthand-aware source cascade. Responsive templates preserve capture
identity and frozen published anchoring. 302 tests and release build pass.
EPUB_GRID_LAYOUT.md records implementation, artifact size and remaining browser,
fragmentation/content/performance/platform gates.

Actual Android grid follow-up: final exact 0.0.63 cold-restores a highlight in a
visually reordered named area, renders stacked and side-by-side grids, and saves
a comment via Ctrl+Enter. The actual document passes expected whole-create/update
and frozen published parser/anchor checks. Settings and test files were restored;
EPUB_GRID_LAYOUT.md separates early creation from final keyword-hardening artifact
evidence and records remaining broader gates.

## Original-ID startup race checkpoint — 0.0.64

Actual Android upgrade revealed duplicate source tabs caused by legacy restoration
and default opening handling the same note. Convert only its owning Markdown view
in place, deduplicate pending events and cancel stale navigation; explicit toggle
shares that path. 304 tests and release/rehearsal builds pass. The exact published
settings/workspace replay restores one original leaf and exact migration backup,
with unknown settings retained. ORIGINAL_ID_ANDROID_REHEARSAL.md records the live
rollback cycle, startup failures and remaining platform/migration/UI gates.

The Android EPUB cycle is complete for that one fixture, including actual published
editing and a cold native re-upgrade with byte-identical read-only Markdown. Exact
checkpoint and source bytes, opaque settings, original leaf identity and explicit
collection survive; isolated-vault state was restored. The next observed UI issue
is landscape Obsidian panel chrome covering native annotation actions. Full corpus,
interruption/sync-failure/minimum-host/all-platform and remaining reader gates are
still open; no promotion or legacy removal is authorized by this checkpoint.

Landscape follow-up: the reported card-action overlap was an off-viewport
accessibility-coordinate error. Scrolling exposes all card actions in unchanged
0.0.64; actual Android Edit/Save and Escape delete cancellation pass, with expected
whole-note storage and focus restoration. LANDSCAPE_SIDEBAR_RESULTS.md records the
correction. Broader mobile/video/IME/a11y and other replacement gates remain open.

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

## Restored collection isolation — 0.0.66

Fix truthy callback returns prematurely ending the host's leaf traversal. Actual
Android two-note/one-EPUB cold startup now keeps both collection identities and
active-leaf ownership; activating the second tab shows its own collection.
A plugin-disabled Markdown control reproduces the observed mixed newline
normalization. See PARITY.md for scope, evidence and remaining startup gates.

## Concurrent restored video panes — 0.0.67

Scope video-opening deduplication to the destination pane. A failing-before
regression and actual Android cold startup establish that two tabs for the same
video note both become native video views while preserving active-leaf identity.
See VIDEO_TRANSCRIPTS.md for evidence and offline playback limits.

## Failed-source Markdown recovery — 0.0.68

Catch failed Markdown transitions in original-ID recovery, display a status
message and permit retry. A full plugin-boundary regression verifies that an
explicit Markdown recovery choice survives index events without restarting a
failed remote fetch. See PARITY.md for verification scope and remaining UI gates.

## Markdown preview lifecycle — 0.0.69

Isolate asynchronous preview renders, remove superseded preview components and
provide literal comment fallback after renderer failure. A plugin-boundary
regression covers late responses, failure, closure/reopen and whole-note
preservation. Actual Markdown rendering corpus gates remain open (see PARITY.md).

## Video read-failure recovery — 0.0.70

Ignore stale failed refreshes, retain clearly labeled last-loaded cards on a
current read failure and expose explicit retry. Clear cached cards when switching
notes. See VIDEO_TRANSCRIPTS.md for regression and remaining actual-host scope.

## Committed-save refresh reporting — 0.0.71

Preserve post-save refresh errors and distinguish them from write failures.
Create/update recovery tests verify that retrying the list refresh preserves
exact saved document bytes and cannot duplicate the committed annotation.
See VIDEO_TRANSCRIPTS.md for scope and remaining live failure checks.

## Transcript keyboard and IME support — 0.0.72

Expose passage seek semantics, support Enter/Space without consuming modified
or composition keys, and defer search filtering until IME composition finishes.
Ignore delayed composition events from replaced reader epochs. See
VIDEO_TRANSCRIPTS.md for automated scope and remaining actual accessibility gates.

## Long-transcript navigation — 0.0.73

Use one passage Tab entry and arrow/Home/End navigation across visible cues,
retain search focus and avoid playback-driven focus moves. A 500-passage host
regression covers navigation, selection-sensitive shortcuts and local scrolling.
See VIDEO_TRANSCRIPTS.md for exact scope and remaining actual accessibility gates.

## Video metadata startup and Android navigation — 0.0.74

Retry a restored video's unresolved target after metadata indexing. Actual
Android cold startup now recovers the local player and 500 saved transcript cues.
Accessibility focus confirms Arrow Down, End, Home and one-step Tab exit; notes
and companion bytes stay unchanged. See VIDEO_TRANSCRIPTS.md for evidence,
restoration and remaining visible-focus/IME/screen-reader/device gates.

## Transcript focus visibility — 0.0.75

Add a focus-visible outline around passage text. Actual Android evidence shows
keyboard focus on passage 001 independently of the playback marker on 000.
See VIDEO_TRANSCRIPTS.md for evidence and remaining theme/accessibility scope.

## Video annotation-search IME — 0.0.76

Defer annotation filtering during composition and ignore delayed events from
replaced reader epochs. Host tests retain search focus and the same unfinished
editor; actual mobile IME checks remain open. See VIDEO_TRANSCRIPTS.md.

## Native video Markdown preview — 0.0.77

Add isolated, failure-tolerant comment preview without committing annotation
changes. Actual Android evidence shows bold and math rendering, with exact saved
note preservation across preview/cancel. See VIDEO_TRANSCRIPTS.md for the test
incident baseline and remaining embed/custom-block/external-app inventory gates.

## Current-comment preview snapshots — 0.0.78

Invalidate regular/video previews on comment edits, including regular formatting
actions, so the displayed snapshot cannot silently describe older text. Tests
cover pending render completion and whole-note preservation. See PARITY.md.

## Asynchronous collection identity — 0.0.79

Revalidate note identity, target and selected association after reads. Reject
replaced/retargeted/switched-note results rather than displaying or mutating the
wrong collection. Host regressions cover three concurrent-change cases; actual
sync/reconnect UI and distributed conflict handling remain open. See PARITY.md.

## Shared annotation retry — 0.0.80

Expose explicit retry for unavailable collection reads and retain the unfinished
comment/tags across recovery. Host-button tests verify record recovery without
annotation writes. Actual sync/reconnect UI remains open. See PARITY.md.

## Publisher gradient backgrounds — 0.0.81

Allow passive gradient functions for EPUB backgrounds while retaining URL and
function checks. Automated cascade/mapping tests and actual Android linear/radial
rendering pass. See EPUB_PUBLISHER_STYLES.md for scope, reproducible fixture and
remaining conic/repeating/pagination/theme/corpus gates.

## Text-decoration cascade — 0.0.82

Expand publisher decoration shorthand before ranking individual line/color/style/
thickness declarations. Host tests cover specificity, priority, reset and variable
invalidity. Actual visual decoration/highlight corpus checks remain open. See
EPUB_PUBLISHER_STYLES.md for specification and scope.

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

## Publisher list styles — 0.0.83

Expand passive list-style shorthand per component and inherit root list
properties. Host tests cover cascade/reset/variables and text mapping. Image
markers, counter definitions and actual list rendering corpus remain open;
see EPUB_PUBLISHER_STYLES.md for supported scope.

## HTML list counters — 0.0.84

Preserve list start/reversed/value/type semantics and case-sensitive marker hints.
Actual Android verifies reversed/restarted Roman numbering and publisher square
markers, with unchanged EPUB/note bytes. Marker color and logical spacing remain
visible gaps; see EPUB_PUBLISHER_STYLES.md for evidence and remaining scope.

## EPUB marker color — 0.0.85

Restore marker color inheritance from book text instead of host UI dimming.
Actual Android light-theme evidence passes; logical spacing and other-theme
marker checks remain open. See EPUB_PUBLISHER_STYLES.md for scope and restoration.

## Logical publisher spacing — 0.0.86

Expand logical margin/padding shorthands and emit property winners in cascade
order for browser-resolved aliases. Actual Android list spacing now has no omitted
style warning. See EPUB_PUBLISHER_STYLES.md for ordering tests and the remaining
RTL/vertical/pagination geometry gates.

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

## Table header semantics — 0.0.87

Preserve table scopes/abbreviations and rewrite same-table header references to
reader IDs without changing cell text or range mappings. Actual screen-reader
and complex-table checks remain open; see EPUB_PUBLISHER_STYLES.md.

## Table span preservation — 0.0.88

Retain cell and column span attributes using native browser parsing. Host tests
compare source/rendered span properties and cell range mappings; actual merged
table rendering and performance remain open. See EPUB_PUBLISHER_STYLES.md.

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

## Disclosure state and navigation — 0.0.89

Preserve native disclosure state/groups, reveal hidden EPUB targets on explicit
navigation and repaint highlights on toggle. Host/reader tests cover state,
scoping, navigation and cleanup; actual geometry, cold progress and accessibility
gates remain open. See EPUB_PUBLISHER_STYLES.md.

## Disclosure-aware reading progress — 0.0.90

Reveal collapsed target text before range-based saved-offset measurement. A
failing-before reader regression verifies ordering, scroll result and retained
offset. Actual cold-start/pagination/open-state checks remain open; see
EPUB_PUBLISHER_STYLES.md for scope.

## Saved-copy disclosure activation — 0.0.91

Reveal mapped reading-mode annotation targets inside disclosures before scrolling.
Keep source-mode editor navigation. Direct adapter tests pass; complete import/
render/mapping and actual mobile UI gates remain open. See PARITY.md.

## Transcript ownership and offline reload — 0.0.92

Local companion reload is independent of remote language validation. Transcript
load/import entry points refuse stale reader ownership before invalidating
pending work. Two regression cases bring the full suite to 345 passing tests;
see VIDEO_TRANSCRIPTS.md. Actual device interaction, remaining provider/device
coverage and the broader native-only promotion gates remain open.

## Transcript action ownership — 0.0.93

Replaced reader controls and replaced transcript passages cannot act on the
current reader. Save, annotate, follow/manual browsing, seek and passage keyboard
handlers check their owner before acting. All 346 tests pass; see
VIDEO_TRANSCRIPTS.md for the bounded host-regression scope. Device verification
and the remaining native-only release gates are still open.

## VTT cue header distinction — 0.0.94

Valid cue IDs beginning WEBVTT no longer cause passages to disappear on import.
347 tests pass; source and test scope are in VIDEO_TRANSCRIPTS.md. SVG spine
items remain rejected: epub-book.ts restricts spine media types, viewport
extraction requires HTML meta, and publicationSections parses all roots as HTML.
A complete SVG path must preserve XML namespaces, viewport/viewBox geometry,
chapter identity and original-selector mapping; accepting the MIME type alone
is insufficient. This restriction remains a native replacement gate.

## SVG spine foundation

A tested XML parser and viewBox dimension extractor now exist in epub-svg.ts;
see EPUB_FIXED_LAYOUT.md. All 349 tests, TypeScript/build and diff checks pass.
The module is currently test-built only. Next integrate package media-type
routing and original XML-root selector/identity handling together, then rendering
and frozen published-reader/device validation. SVG reader support is still open;
no production version increment or installed artifact is claimed for this step.

## Mixed SVG spine reading — 0.0.95

SVG spine items now load as original XML roots, retain canonical chapter URIs,
and render through the passive projection using native viewBox scaling. Unspined
SVG images are not promoted to chapters. Frozen Hypothesis anchoring modules
resolve selectors in both directions on the original SVG root. Android renders
the synthetic mixed book, follows links both ways and opens/cancels a draft from
selected SVG text. All 352 tests pass. See EPUB_FIXED_LAYOUT.md for evidence,
initial rendering failure and remaining SVG/full-replacement gates.

## SVG cold restore and Android CRUD — 0.0.96

Invisible SVG title text no longer sends scroll restoration to the prior
chapter. Empty/image-only chapters also fall back to their own origin. All 353
tests pass. Actual Android SVG highlight creation, process restart/restoration,
comment edit and deletion pass; a second create/delete cycle adds no newlines.
Whole-file and frozen parser/anchor audits are recorded in EPUB_FIXED_LAYOUT.md.
Remaining format/device/published-app and production-promotion gates stay open.

## Linked SVG appendix navigation — 0.0.97

Explicit navigation/anchor targets discover non-spine SVG pages without treating
image assets as reading-order documents. Recursive SVG/xlink links are bounded
and path-deduplicated. All 355 tests pass; actual Android source link, return link
and reader history navigation pass with unchanged EPUB/note bytes. Scope and
remaining compatibility/performance gates are recorded in EPUB_FIXED_LAYOUT.md.

## Published SVG metadata contract

356 tests now include exact 0.2.11 release EPUB metadata hooks and their runner,
extracted reproducibly from the checksum-pinned artifact. HTML metadata succeeds;
standalone SVG hooks log failures and produce no canonical/DC metadata. See
HYPOTHESIS_COMPATIBILITY.md. This strengthens the distinction between shared
selector-engine compatibility and full published reader/UI/cross-device routing.
Those SVG interoperability gates remain open. No production version increment,
installed artifact change or Bend proof is claimed for this test-only step.

## Android native-PDF cache eviction evidence

A real 40-page PDF run evicted page one's text layer after page-number navigation.
Returning rebuilt a different layer with exactly one mark for the same saved
annotation; tapping it opened the card. PDF and post-creation note bytes stayed
unchanged. See PARITY.md for source/runtime observations, cleanup and limits.
The reproducible synthetic generator is the only new code; no production version
increment or new Bend law. Broader native-PDF and replacement gates remain open.

## Android native-PDF overlapping highlights

A live nested pair exposes both records in the overlap chooser, selects the
outer card by touch and inner card by keyboard, and cancels with Escape. A new
adapter regression preserves valid marks when a neighboring record's context
fails verification. See PARITY.md for the initially invalid fixture, corrected
baseline, actual interaction evidence and remaining scope. No runtime/version or
Bend-law change; broader overlap/device/replacement gates remain open.

## Composition-safe selection actions — 0.0.98

Native and website selection shortcuts no longer emit annotation actions for
composing/keyCode-229 input. The overlap chooser leaves composing and modified
keys to their owner while retaining its ordinary navigation. All 360 tests pass;
see EDITOR_SHORTCUTS.md for reproduced-before-fix cases and device limits. No
Bend law changed; the broader native-only release/device gates remain open.

## Editable website contexts — 0.0.99

Native and isolated-guest selection controls respect inherited/plaintext-only
editing and explicit read-only islands. Website form/editor focus no longer
returns a stale cached quote. Existing text indices/selectors are unchanged. All
362 tests pass; EDITOR_SHORTCUTS.md records failed-before-fix cases and the
remaining actual website/IME/shadow/device gates. No Bend law changed.

## Website action retention across real editor focus — 0.0.100

A fresh headless Chromium exposed loss of a read-only-island toolbar action after
its parent editor retained focus. Explicit actions now capture their versioned
public quote independently of manual editing-focus capture, retaining source
revision/URL and public-selector checks. All 363 tests and the reproducible real
browser fixture pass; see EDITOR_SHORTCUTS.md. Actual desktop Obsidian is still
unverified while the Mac is locked; other device/format/release gates stay open.

## Website body replacement checkpoint — 0.0.101

Same-owner website guests now rebind when a site replaces its body at the same URL. Saved public annotation rows and highlight visibility survive, while old selections/actions are discarded and the source revision advances even when the replacement text is identical. Rebinding occurs on the next host request, including the regular poll. Missing-body gaps reject captures without losing the saved state.

365 tests and the release/original-ID rehearsal build passed. The isolated Chromium fixture `test-support/browser-body-replacement-check.mjs` reproduced detached highlight ranges against 0.0.100, then verified connected replacement ranges, cleared old intent, monotonic new action IDs, foreign stylesheet retention and refusal of duplicate ambiguous passages. Evidence is in `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-browser-body-replacement`. This is isolated browser and host-test evidence; actual Obsidian UI, general SPA routing and the broader web corpus remain open. No vault, installed artifact or Bend theorem changed.

## Website mutation click checkpoint — 0.0.102

Content mutations now discard queued highlight clicks and suspend old range hit testing until the scheduled re-resolution. This prevents a click on previous content from opening an annotation after the page changes. The click counter remains monotonic, and clicking a successfully restored range produces a fresh event. UI-only mutations retain the existing exclusion rules.

The regression failed against 0.0.101. All 366 tests and release/original-ID rehearsal checks pass after the fix. The isolated Chromium body-replacement fixture also verifies a real pointer click, content change, cleared click and fresh click after repaint; evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-browser-mutation-click/after-observations.json`. This is not a new Obsidian UI/device run. Installed artifacts, vaults and Bend proofs are unchanged; broader native replacement gates remain open.

## Website route ownership checkpoint — 0.0.103

Leaving the bound source URL now retires the website guest and removes its owned highlights, styles and controls. Returning repaints the stored public selectors. Navigation events trigger cleanup; regular host polling also detects departures and restores the reader on return when events were missed. Each retirement changes the owner generation, so late cleanup of the previous agent cannot dispose the returning one. Host capture/source validation remains in force.

All 367 tests and the release/original-ID rehearsal build pass. The regression reproduced lingering highlights against 0.0.102. Coverage includes departure/return, missed events, asynchronous delayed disposal, fresh ownership, no replayed actions and exclusion of private comments from the page. This checkpoint uses the actual host/guest implementation in the DOM harness; it does not establish actual Obsidian SPA navigation coverage. Installed artifacts, personal vaults and Bend proofs remain unchanged.

### Real-browser route verification — 2026-11-02

`test-support/browser-route-check.mjs` bundles the actual LiveWebHost and guest into its own local fixture and launches fresh headless Chromium (151.0.7922.34). Real button interactions change the URL while preserving page content. Departing removes owned highlights; returning restores one connected range. Both paths also pass with the navigation event deliberately omitted, relying on host request/poll detection. Foreign highlights remain unchanged, no annotation capture/open callback is replayed, and private comment text never appears in the document. Screenshots and structured observations are in `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-browser-route/final`.

A baseline run with the exact 0.0.102 host from commit `4410041` fails on departure: the old connected highlight remains on `/other`. Baseline evidence is in `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-browser-route-before`. The fixture supports `ANNOTATOR_LIVE_WEB_MODULE` for a baseline host and `ANNOTATOR_PLAYWRIGHT_MODULE` for the optional browser runtime; no user tabs or installed Obsidian are attached. The first fixture attempt read cached host status before the regular poll and was corrected to wait for that poll. This adds isolated browser evidence, not actual Obsidian/Electron navigation certification. No runtime, installed artifact or Bend proof changed in this verification-only commit; the preceding full suite remains 367 passing tests.

## EPUB ruby typography checkpoint — 0.0.104

Publisher `ruby-position` and `ruby-align` now pass through the bounded cascade, including inherited HTML-root defaults, inline priorities and source selectors. Passive `rb` and `rtc` elements remain their original element types instead of being projected as generic spans. Original text-node maps and annotation selectors are preserved. See EPUB_PUBLISHER_STYLES.md for geometry evidence and the explicit rtc/vertical-layout limits. All 368 tests and release/original-ID rehearsal checks pass. No installed artifact, vault or Bend proof changed.

## Writing-axis foundation — 0.0.105

EPUB chapter visibility/windowing, viewport preservation while prepending/removing chapters, first-visible-character search, reading-position restoration and page movement now use a shared ReadingAxis. Current horizontal layouts retain their existing axes: scroll mode advances physical Y; pagination advances physical X, with negative scrollLeft for RTL. All 368 tests pass, including the existing continuous-window, concurrent scrolling, RTL pagination, resize/restoration and fixed-page cases.

This is the first integration stage for vertical writing, not enabled vertical layout. Publisher writing-mode remains excluded. The remaining integration must choose block-axis progression for vertical continuous reading and inline-axis progression for vertical multicolumn pagination, size the viewport/body correctly, retain chapter-local writing modes, handle mixed-mode transitions and validate restoration, virtualization and selection in actual browser/device geometry. CSS reference: https://www.w3.org/TR/css-writing-modes-4/ and https://www.w3.org/TR/css-multicol-1/. No installed artifact, vault or Bend theorem changed.

A separate fresh Chromium 151.0.7922.34 geometry prototype confirmed the intended axis mapping for both vertical-rl and vertical-lr: a 500×400 continuous viewport overflowed horizontally to 6864 pixels (negative/positive scrollLeft respectively), while a one-column paginated viewport overflowed vertically to 6336 pixels and advanced with scrollTop. Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-writing-axis-prototype/geometry.json`. This prototype is isolated synthetic CSS, not the integrated EPUB reader. Release/original-ID rehearsal build also passes.

## Vertical writing integration — 0.0.106

Reflowable vertical-rl/vertical-lr chapters now use the integrated reading-axis layout in continuous and paginated modes. Publisher writing mode/orientation/upright combining pass through the bounded cascade; sizing, overflow, chapter windows, mixed-mode transitions and text-offset restoration follow the active axis. All 369 tests and release/original-ID rehearsal checks pass. Six actual-browser EPUB cases cover forward/backward boundaries, eviction, resizing, mode changes, reopening and real pointer selection with published Hypothesis anchoring. See [vertical layout scope and evidence](EPUB_VERTICAL_LAYOUT.md). Actual host/device and wider corpus checks remain open. No installed artifact, personal vault or Bend proof changed.

## Android vertical reading gestures — 0.0.107

Horizontal EPUB reading viewports now use Obsidian's existing swipe opt-out to prevent the host file drawer from opening while vertical text scrolls. Actual Android vertical-rl touch selection/highlight creation, published exact-URI search/original-chapter anchoring, scroll cold reopen, pagination movement and pagination cold reopen passed. EPUB and created annotation bytes survived the reopens unchanged; original test configuration was restored and fixtures removed. All 370 tests and release/rehearsal checks pass. Expanded real-browser cases also exercise the actual reading-mode control at wide and narrow widths. See [vertical layout evidence and remaining limits](EPUB_VERTICAL_LAYOUT.md). No personal vault or Bend theorem changed; the wider native replacement remains incomplete.

## Source writing-mode inheritance — 0.0.108

Writing-layout inheritance at the collapsed source HTML/body boundary now resolves against the book rather than the host viewport, including source initial values and media-condition changes. The inherited vertical corpus passes all six real-browser cases at wide/narrow widths; 371 tests and release/rehearsal checks pass. See EPUB_VERTICAL_LAYOUT.md for the reproduced defect and precise property scope. Installed Android remains 0.0.107; no vault or Bend theorem changed.

## Stable reading anchors and responsive writing — 0.0.109

Requested source offsets now survive repeated reading-mode changes and reflow instead of being replaced by each containing page's leading offset. User reading navigation releases the retained anchor; offscreen and detached-reader guards prevent stale retention. The responsive corpus changes writing direction at a media breakpoint. Eight browser cases at wide/narrow widths pass, along with 372 tests and release/rehearsal checks. See [reading-position semantics and evidence](EPUB_READING_POSITION.md). Actual device validation of this change remains open; installed Android is still 0.0.107. No annotation wire format, vault or Bend theorem changed.

## Published vertical corpus and publisher style sets — 0.0.110

The real IDPF Vertical Writing sample exposed inactive alternate sheets being applied and legacy writing-mode aliases being omitted. Both paths are corrected. Named author sets can now be selected in native reading controls; preferred/alternate/default switching retains the requested source offset. The pinned unmodified sample passes its actual browser switch cycle, with 42 remaining styling omissions explicitly recorded. All 375 tests and release/rehearsal checks pass. See [publisher stylesheet sets and corpus evidence](EPUB_PUBLISHER_STYLE_SETS.md). Installed Android stays 0.0.107; no vault or Bend theorem changed.

## Publisher omission trace and outline cascade — 0.0.111

The pinned published sample's 42 omission events were traced: most were repeated outline resets. Outline shorthand/longhands now preserve their cascade and independent offset; underline-position and its legacy aliases are supported. Independent Chromium reference styles agree across five cases without layout shift, and the published sample's style cycle retains offset 200 with 5 remaining omissions. All 376 tests and release/rehearsal checks pass. See [exact trace and scope](EPUB_PUBLISHER_OUTLINES.md). Installed Android remains 0.0.107; source annotations, vaults and Bend proofs are unchanged.

## CJK emphasis and second published corpus — 0.0.112

Publisher emphasis shorthand/longhands and registered legacy orientation/combining aliases now preserve the source cascade. Independent Chromium reference geometry/styles and native/published text anchoring agree. The unmodified 17 MB Kusamakura sample retains sesame emphasis and source offset 200 through author-style switching; nine styling omissions remain. The first published sample passes again with five omissions. All 377 tests and release/rehearsal checks pass. See [scope and evidence](EPUB_CJK_TYPOGRAPHY.md). Actual current-host/mobile checks remain open; installed Android stays 0.0.107. No personal vault or Bend theorem changed.

## Android published CJK style cycle — 0.0.112

The actual Android host now verifies Kusamakura preferred/horizontal/default switching with saved offset 200, all six red sesame emphasis runs, and cold reopening of the same vertical passage. Source/note bytes and restored test configuration were verified; isolated installed Android is now 0.0.112. See EPUB_CJK_TYPOGRAPHY.md for evidence. A newly observed bottom-toolbar overlap of reading text needs a viewport sizing fix. This is one-chapter host evidence, not full published-reader CRUD or mobile readiness.

## Phone EPUB toolbar clearance — 0.0.113

The phone EPUB reader now reserves Obsidian's inherited view-bottom-spacing, so its measured viewport and pagination stay above the floating navigation bar. Actual Android Kusamakura evidence changes an overlap of 66 CSS pixels into ten pixels of clearance; page advance and cold reopen retain saved offset 437. Source/note bytes and restored configuration were verified. All 377 tests and release/rehearsal checks pass; installed isolated Android is 0.0.113. See [mobile viewport scope](EPUB_MOBILE_VIEWPORT.md). Other orientations/hosts/readers and the broader replacement gates remain open.

## Landscape compact-keyboard clearance — 0.0.114

The phone EPUB allowance now takes the larger of host view-bottom-spacing and safe-area-inset-bottom, so the Android compact keyboard cannot reclaim reserved reading space. Actual landscape keyboard geometry changes the viewport bottom from CSS y=352.19 to 316.19 with an 88px keyboard/safe inset. Controls remain scrollable and portrait size returns. All 377 tests and release/rehearsal checks pass; isolated Android is 0.0.114. A saved-offset change from 200 to 178 during rotation/control gestures remains unisolated and must be investigated before claiming position retention for this sequence. See EPUB_MOBILE_VIEWPORT.md. Test configuration and emulator rotation settings were restored; no personal vault or Bend proof changed.

## Reading-offset isolation — unchanged 0.0.114

A fresh actual-Android settled sequence of rotation, expanding/scrolling reading controls, Find focus/typing, keyboard dismissal and return to portrait preserved chapter 2/offset 200 at all saved checkpoints. DOM text-node geometry independently confirms that requested character remains visible. The earlier 178 observation was not reproduced and remains unexplained; rapid races are not ruled out. See EPUB_MOBILE_VIEWPORT.md. Test configuration, fixtures and rotation settings were restored. This is evidence only; no runtime or Bend change.

## Pre-observer workspace-save race — 0.0.115

Workspace/progress serialization now retains the pre-resize source offset when dimensions have changed but ResizeObserver has not restored layout yet. A deterministic regression reproduced 23→16 before the fix. All 378 tests and release/rehearsal checks pass. The expanded actual-browser corpus checks synchronous serialization/progress saves before observer delivery in eight wide writing/mode cases, including responsive direction changes; all pass, along with the existing eight narrow cases. See EPUB_READING_POSITION.md. The earlier Android 178 observation remains unattributed; isolated installed Android remains 0.0.114. No storage/Bend contract changed.

## Android 0.0.115 lifecycle follow-up

The actual installed Android build preserves the real-book offset 200 through observed rotation, consecutive reading-control taps, return to portrait and cold reopen. Independent DOM character geometry and saved positions agree. Source/note bytes and artifact hashes were verified; test configuration and rotation settings restored. See EPUB_READING_POSITION.md for precise sequence and timing limits. Installed isolated Android is now 0.0.115; wider compatibility gates remain open.

## Publisher hyperlink selectors — 0.0.116

Static source :link/:any-link styling now retains native matching and specificity through projection. A failing gray-versus-navy regression now passes; independent unvisited Chromium fixture styles/screenshots agree. The pinned published sample retains offset 200 through its author-style cycle with three remaining omissions (visited rules and @page). All 379 tests and release/rehearsal checks pass. See EPUB_PUBLISHER_LINKS.md for the explicit visited-history limitation and the initial fixture's computed-style privacy trap. Installed Android remains 0.0.115; no storage or Bend change.

## Markdown renderer and vault-link routing — 0.0.117

Actual Android annotation cards render relative note/image embeds, MathJax and highlighted code; Mermaid respects the host trust guard. This exposed internal links reloading the WebView. Cards/previews for ordinary and video annotations now route those clicks through Obsidian with the collection note's source path and host modifiers, with component-owned cleanup. The actual Android link opens the correct note/heading after the fix. All 380 tests and release/rehearsal checks pass; all fixture bytes and restored configuration verified. Installed Android is 0.0.117. See ANNOTATION_MARKDOWN_LINKS.md for evidence, test-navigation cleanup and remaining lifecycle/platform gates. No storage/Bend change.

## Video Markdown host checks and phone action clearance — 0.0.118

Actual Android video cards and unsaved previews render relative note/image embeds and math; their internal links open the correct note/heading. The draft survives link navigation and cancels without altering annotation bytes; frozen published video durable fields agree. A newly reproduced bottom-toolbar overlap of final video actions is fixed with host-provided phone spacing, and the real controls/preview pass. All 380 tests and release/rehearsal checks pass; test files/configuration restored and isolated Android is 0.0.118. See ANNOTATION_MARKDOWN_LINKS.md for evidence and limits. Desktop remains locked; broader lifecycle/platform/compatibility gates remain open.

## Embedded-note relative links — unchanged 0.0.118

Actual Android checks distinguish collection and embedded-note source folders using identical relative links and duplicate destination names. Each opens the correct note; the existing event-ownership guard correctly preserves embedded renderer navigation. A new focused regression protects that guard. Runtime is unchanged, fixture bytes verified and test configuration restored. See ANNOTATION_MARKDOWN_LINKS.md. Deeper embeds, desktop modifiers and the wider parity gates remain open.

## Website unsupported-selection capture — 0.0.119

Frame focus and shadow-root selections now clear stale outer-page quotes/toolbars and return specific capture errors. Actual Chromium exposed apparently collapsed outer selections with nonempty shadow text; both open/closed cases now refuse cached-quote fallback. The boundary regression reproduces the old defect; all 382 tests and release/rehearsal checks pass. A fresh two-origin browser fixture verifies real frame/open-shadow/closed-shadow selection and subsequent ordinary capture. See WEB_SELECTION_BOUNDARIES.md. This adds no frame/shadow anchoring support. Desktop remains locked, installed Android remains 0.0.118, and broader compatibility gates stay open. No storage/Bend change.

## Published nested-thread edit/delete and discovered grouping gap — unchanged 0.0.119

Actual unchanged published 0.2.11 UI on Android finds a native-written three-level EPUB thread, edits the grandchild and deletes its intermediate parent while retaining the full surviving references path. Raw unrelated/root blocks and prose survive exactly. Native cold reopening preserves note bytes and both surviving comments, but incorrectly renders two independent annotation roots instead of the published missing-intermediate placeholder hierarchy. This is a release-blocking thread-forest/UI gap; the captured synthetic Markdown and expected hierarchy are committed as a regression fixture. See EPUB_THREAD_COMPATIBILITY.md for next implementation requirements, exact evidence and scope. Test configuration restored and temporary old-ID plugin removed; isolated native Android is 0.0.119. Broader gates remain open; no runtime/Bend change in this checkpoint.

## Missing-parent thread forest — 0.0.120

The native sidebar now retains complete reference-path hierarchy using shared, view-only unavailable-ancestor nodes. Counts/rendering use the same roots; actions/search remain attached to real records. The captured published intermediate-deletion regression, shared missing-root/intermediate cases and cycle/conflict reachability checks pass. Actual Android displays the exact published-edited fixture as one thread with the missing intermediate and surviving grandchild; the correct descendant opens for edit and cancels without changing bytes. All 384 tests and release/rehearsal checks pass; test configuration restored and isolated Android is 0.0.120. See EPUB_THREAD_COMPATIBILITY.md. This resolves the observed grouping gap; broader thread/UI/platform gates remain open. No wire-format/Bend change or Hypothesis runtime dependency.

## Published EPUB chapter identity — unchanged 0.0.120

Actual unchanged published 0.2.11 UI on Android navigated a native-annotated two-chapter EPUB and loaded the chapter-two comment under the exact chapter-two canonical URI, with its heading highlighted in the book document. Immediate and settled snapshots distinguish asynchronous loading. Complete note/book bytes and restored test configuration were audited; temporary original-ID plugin and fixtures removed. See EPUB_THREAD_COMPATIBILITY.md. This extends actual chapter compatibility evidence; root deletion, repackaging and broader platform/format gates remain open. No runtime/Bend change.

## Wide thread representative overflow — 0.0.121

A failing 150,000-sibling missing-parent regression exposed a function-argument stack overflow in forest representative traversal. Individual reverse-order pushes preserve traversal semantics and remove that failure. All 385 tests and release/rehearsal builds pass. See EPUB_THREAD_COMPATIBILITY.md. This covers model construction, not full large-thread DOM performance; virtualization/deep rendering and broader parity gates remain open. Android remains 0.0.120.

## Iterative reply-card traversal — 0.0.122

Native reply rendering now uses an explicit work stack instead of recursive calls and per-descendant ancestor-set copies. A 250-level structural regression verifies hierarchy, sibling order, missing-parent placement, exact edit targeting and flat search; all 386 tests and release/rehearsal builds pass. See EPUB_THREAD_COMPATIBILITY.md. Browser DOM/layout limits, large-thread virtualization and actual accessibility/platform checks remain open. Android remains 0.0.120; no storage/Bend change.

## Actual published root deletion — unchanged 0.0.122

Actual unchanged published 0.2.11 UI deleted a native EPUB thread root, preserving both reply records/references. Exact-byte audit accounts for the root block plus one preceding newline. The published UI hides the surviving thread even after reopen and explicit Annotations selection, while its frozen parser still returns the replies. Native cold reading displays both under one missing-root placeholder without changing the note. Exact fixture and forest regression retained; isolated emulator configuration restored and temporary files removed. See EPUB_THREAD_COMPATIBILITY.md for evidence and limits. Android now has verified 0.0.122 artifacts; broader parity gates remain open.

## Reply collapse/expand — 0.0.123

Native real/missing-parent cards now expose Show/Hide replies with real-descendant counts, stable focus and note-local collapse state. Search reveals matching descendants independently; editing/replying expands the relevant ancestor path. Phone targets are at least 44 CSS pixels high. All 388 tests and release/rehearsal builds pass. Actual Android touch collapse/expand restores the captured published missing-intermediate hierarchy without changing note/book bytes; settings restored and QA removed. See EPUB_THREAD_COMPATIBILITY.md. Android now has verified 0.0.123 artifacts. Broader accessibility, platform, large-thread and compatibility gates remain open.

## Interrupted settings startup refusal — 0.0.124

An existing malformed data.json now stops startup before host loadData fallback, view registration or settings persistence. Both plugin IDs have a regression that failed before the fix. Actual isolated Android refuses the damaged experimental-ID file without changing its bytes; restoring original settings/configuration and cold restarting restores native commands. All 389 tests and release/rehearsal builds pass; installed Android artifacts match 0.0.124. See UPGRADE_CONTRACT.md. This is syntax/truncation protection, not schema validation or complete process/sync/upgrade failure coverage. No annotation/Bend change.

## Original-ID interrupted-checkpoint recovery — unchanged 0.0.124

Actual Android with only the original-ID native rehearsal installed refuses a truncated upgrade checkpoint while retaining it and legacy settings exactly. Restoring a valid checkpoint and cold starting restores the saved legacy EPUB tab in the same leaf, adopts font125, retains opaque settings and displays all four source comments without changing note/book/checkpoint bytes. Generated artifact hashes and exact configuration restoration were audited; temporary original-ID plugin and QA files removed. See UPGRADE_CONTRACT.md. A host-boundary regression covers refusal before view registration/settings writes. Genuine process interruption/sync, all-format/multi-note/minimum-host and wider rollback gates remain open.

## Overlap chooser lifecycle — 0.0.125

Retired shared chooser controls cannot select stale annotations, repeat selection or steal focus from a replacement dialog. Native PDF owns its dismissal handle, expires choices on annotation/renderer changes, ignores detached marks and preserves another pane's dialog on disposal. A regression fails on the previous build; all 392 tests and release/rehearsal builds pass. Fresh Chromium verifies focus and exactly-once selection with production chooser/CSS. See ANNOTATION_CHOOSER_LIFECYCLE.md. Android remains 0.0.124; broader source-adapter ownership and PDF/device/accessibility gates remain open. No storage/Bend change.

## Saved-content/live-web picker ownership — 0.0.126

EPUB/saved-site range painters and live website hosts now own their picker handles. Repaint, record/revision change, navigation and disposal expire the relevant picker without closing a different reader's dialog. Live choice activation revalidates current guest status, source, navigation and rows before opening. All 394 tests and release/rehearsal builds pass, including content-change/privacy checks. See ANNOTATION_CHOOSER_LIFECYCLE.md. Installed Android remains 0.0.124; actual platform/multiple-pane/accessibility breadth and overall parity gates remain open. No storage/Bend change.

## Published shadow-selection baseline — unchanged 0.0.126

The pinned unchanged selectedRange module now runs alongside native capture in the real Chromium boundary fixture. Both select ordinary text; the published observer returns null for open/closed shadow selections in Chromium151 while native reports an explicit unsupported-component error. Source matches the pinned Git object exactly. See WEB_SELECTION_BOUNDARIES.md. This narrows the baseline uncertainty without asserting full published-app/frame/provider/browser support or closing the broader web gates. All 394 tests and release/rehearsal builds pass; runtime/device/storage/Bend unchanged.

## Large packaged CJK font — 0.0.127

The font loader now accepts a single face up to the existing 24,000,000-byte mounted-chapter font budget, replacing the incompatible 8 MiB per-face cap without raising the total budget. The real pinned 16.5 MB Noto CJK face failed before and now renders actual custom-font glyphs in Chromium and Android, including cold reopen; native/reference dimensions and frozen selector round trips agree. All 396 tests and release/rehearsal builds pass; exact source/note/config and installed artifacts audited. See EPUB_PUBLISHER_STYLES.md. Isolated Android is 0.0.127; broader corpus/memory/platform gates remain open. No font/book asset shipped or storage/Bend change.

## Real automatic-caption corpus and saved Android reading — unchanged 0.0.127

An explicit-network harness verifies 572- and 533-passage real English automatic tracks through production parsing and exact VTT roundtrip. Actual Android displays every text/timestamp label of the 572-passage companion correctly before/after cold restart and filters the expected single Jeff match without changing notes/transcript/drafts. Settings restored and fixtures removed. See VIDEO_TRANSCRIPTS.md. Fresh seek fails because the emulator has no default network and the frame reports ERR_INTERNET_DISCONNECTED; online seek is not claimed. Text-bearing append events, broader providers/languages and full video gates remain open. Runtime and prior396-test/release/rehearsal artifacts unchanged.

## Online Android ASR annotation workflow — unchanged 0.0.127

Reconnecting the standard emulator AndroidWifi network restores validated internet and resolves the last observed no-route blocker. Actual in-Obsidian player readiness and ASR caption seek10.24 now pass. Android long-press selection creates a quoted hey annotation at the cue's exact10.24 start; the frozen published parser accepts it, original note prefix is unchanged, and annotation plus572 saved cues survive cold restart. Vault settings restored and temporary files removed; emulator intentionally stays connected. See VIDEO_TRANSCRIPTS.md. This is one real ASR touch-create workflow, not all-provider/language or full published-app video parity. Runtime/prior396-test builds unchanged.

## Compact transcript setup/help — 0.0.128

Primary caption loading, annotation, search and follow stay visible; secondary language/import/export/provenance/help controls move into native Transcript options. Compact status and hidden empty match feedback reduce clutter without removing actions. All 397 tests and release/rehearsal builds pass. Actual Android verifies 44-pixel disclosure touch, real 572-cue reload retention and closed/open visibility; first timestamp placement improves by180.76 CSS pixels. Note/companion unchanged, settings restored and QA removed. See VIDEO_TRANSCRIPTS.md. Android now runs verified 0.0.128; broader viewport/platform/accessibility and parity gates remain open. No storage/Bend change.

## Settings read-back verification — 0.0.129

Native settings persistence now verifies the on-disk JSON after host saveData, whose installed implementation can swallow adapter write failures. Both IDs have silent-error/truncation/replacement/retry checks, with a more realistic host writer; all400 tests and release/rehearsal builds pass. Actual Android confirms draft writes, cold recovery and cancellation through the real host API, without annotation writes. Settings restored and QA removed; Android is verified0.0.129. See SETTINGS_PERSISTENCE.md. Real filesystem/sync/minimum-host/platform failure breadth remains open; no storage grammar/Bend change.

## Consistent settings snapshots/directories — 0.0.130

Startup adopts its validated disk snapshot, preventing a second host read from replacing it with fallback data. Own settings and original-ID checkpoints follow host manifest.dir with standard-path fallback and strict checkpoint-context validation. Both-ID/custom-config/raw-retention regressions pass; all403 tests and release/rehearsal builds pass. Actual Android restores a captured draft, cancels with verified persistence and retains opaque settings; note/config audited and QA removed. See SETTINGS_PERSISTENCE.md. Android is0.0.130; real sync/failure and broader platform/parity gates remain open. No annotation/Bend change.

## Multiple website reading copies — 0.0.131

Mobile opening requests now offer an Obsidian chooser when several saved copies match the original website URL. Selection binds the requested original annotation collection; cancellation, stale targets/copies, superseded requests, unload and retired controls are covered without annotation rewrites. All 410 tests pass; an isolated Chromium phone-layout check verifies wrapped paths, 44-pixel buttons and selection. See WEBSITE_READING_COPIES.md for the exact evidence limits. The emulator required Android authentication and no device files were changed; actual Obsidian touch and real-article migration checks remain pending. Android remains installed at0.0.130. No Bend change or promotion.

## Reading-copy archive invalidation — 0.0.132

Pending/failed archive reloads clear previous highlight ranges and identity immediately. Validation/read failures remain visible across annotation-list refreshes until valid recovery. The regression fails against0.0.131; all411 tests and release/rehearsal builds pass. Fresh Chromium exercises published-described link/code selectors, production snapshot mapping and visible highlights, failure/removal/recovery, and native selectors restored by the pinned published anchor. A synthetic semantic preview and fake file/view host limit that evidence: actual Obsidian rendering, Android and real-article migration remain open. See WEBSITE_READING_COPIES.md. No Bend change or device staging.

## Website code-block spacing — 0.0.133

New reading copies preserve code-block blank lines through the surrounding prose-spacing cleanup. The regression fails against0.0.132; all413 tests pass, including contextual relocation and ambiguous/removed passage refusal. The isolated browser snapshot harness confirms spaced code text, native visible highlights, pinned published selector restoration, archive invalidation and recovery. See WEBSITE_READING_COPIES.md for evidence and limits. Existing documents/annotations and Bend rules are unchanged; no device staging or promotion.

## Real article standalone code — 0.0.134

A complete hydrated article capture exposed unmapped indented code emitted as prose from standalone multiline code elements. Conversion now fences those elements; the reduced regression fails against0.0.133. All three existing legacy-created OpenAI annotations map to exactly equal text through the complete captured source and generated Markdown. A checked-in preparation helper reproduces the fixture without vault writes. All414 tests and release/rehearsal builds pass. Actual Obsidian/Android rendering and the creating legacy bundle provenance remain open. See WEBSITE_READING_COPIES.md; no Bend change or test-vault staging.

## Actual desktop website reading copy — 0.0.134

Desktop Obsidian1.14.5 now visually restores all three original highlights against the full captured article in its actual reading renderer, including code indentation/line breaks. The collection survives a window reload with note/archive/copy unchanged. Folded-heading navigation does not reveal the code target and is explicitly still failing. The isolated test vault retains the0.0.134 release artifacts; configuration/workspace restored exactly and QA files removed after closing its window. See WEBSITE_READING_COPIES.md for audit and screenshot-export limits. No runtime change; Android, full CRUD/process reopen and published provenance remain open.

## Host reading-copy line navigation — 0.0.135 (partial)

Activation uses the public view's source-line navigation before exact DOM landing. The regression fails against0.0.134; all415 tests and release/rehearsal builds pass. Actual desktop Obsidian1.14.5 reveals the singly folded Samples section and correct code highlight when the visible sidebar card is activated. A controlled Fold all headings case still fails and remains open; the earlier0.0.134 UI click did not establish card visibility. Note/archive/copy unchanged, configuration restored and QA removed; desktop retains release0.0.135. See WEBSITE_READING_COPIES.md. No Bend change or full folding/mobile/process-cold-start claim.

## Preserve the sidebar's first pointer click — 0.0.136

Sidebar focus no longer rebinds/rebuilds the pressed controls before click; source/video context and model-driven refreshes remain intact. The actual focus-listener regression fails against the pre-fix main source; all416 tests and release/rehearsal builds pass. Clean desktop Obsidian1.14.5/0.0.136 now passes first-click code reveal both from stored all-folded state and a fresh Fold all headings command, retaining unrelated headings' closed state. This closes that scoped desktop fixture; broader folding/platform cases remain. Note/archive/copy unchanged, settings restored, QA removed; desktop retains the clean release with no diagnostics. See WEBSITE_READING_COPIES.md. No Bend change or full replacement claim.

## EPUB archive image bullets — 0.0.137

Publisher list-style and list-style-image now share the existing bounded archive-image resource boundary with backgrounds, including stylesheet-relative paths, variable consumers, responsive changes, cache/budget limits and disposal. Shorthand expansion retains image/type/position resets. Three regressions cover source-coordinate preservation, safe resources/cascade, shared bounds, responsive loading and stale disposal; pre-change source fails the new image-marker checks. All419 tests and release/original-ID rehearsal builds pass. Actual desktop Obsidian1.14.5 displays the synthetic archive and inline-variable image bullets and reset text bullet without a styling warning; book/note unchanged, configs restored, QA removed. Browser checks additionally decode the SVG and verify native/published selector interoperability. Android, pagination, custom counter styles and complete published UI/corpus acceptance remain open. See EPUB_PUBLISHER_STYLES.md.

## Sidebar event ownership and passage IME — 0.0.138

Sidebar actions now require their element to remain in the live sidebar and their source/draft session to remain current. This covers card actions, deletion confirmation, editor fields/actions, tabs/search/sort, replies, links and drag, including the interval before a model refresh. Retired controls cannot delete an old record, replace a newer draft's text/tags, save/cancel it or navigate/filter another collection. Passage Enter/Space handlers ignore composition, keyCode229 and modified shortcuts. Current plain keyboard activation remains available.

All three new boundary regressions fail against the previous sidebar. All422 tests and release/original-ID rehearsal builds pass. Actual desktop Obsidian1.14.5/0.0.138 confirms current passage navigation, editing/temporary typing/cancel, and deletion-confirmation cancel on the existing synthetic two-record EPUB. Source book and complete note stay byte-identical; configs restored and native138 retained. Retired-event/IME reproductions are automated; no actual IME, Android, full published UI or complete CRUD claim. Evidence: ~/Documents/obsidian-annotator-native-test-validation/2026-11-02-sidebar-controls/audit.json.

## Actual page-note/reply interchange and inherited missing-parent gate

On unchanged native0.0.138, actual published0.2.11 created a page note; native edited comment/tags and created a reply; published displayed both and edited the native reply; native reopened and deleted only the root, retaining the reply and original references. All read-only document bytes, unrelated controls and checkpoint survive. The subsequent published normal tabs hide the missing-parent thread, matching its pinned thread filter. Filtered retrieval is source-tested, not verified in actual UI; final published reply deletion remains unverified. Captured fixture/frozen oracle regression bring the suite to423 tests. Production runtime and prior release/rehearsal results unchanged. See PUBLISHED_PAGE_NOTE_INTERCHANGE.md; this is explicit incomplete rollback acceptance, not full CRUD parity. Whole isolated config/artifact and original documents restored exactly; copied QA files removed.
