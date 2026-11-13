# Settings and target upgrade contract (schema 1)

Implemented on the experimental branch. Installed desktop PDF and Android EPUB
rehearsals are recorded below; the full upgrade/rollback corpus remains a release
gate. The initial setting/target assessment is historical: later video, local-file
and appearance checkpoints supersede the original exclusions noted below.

Fresh experimental installs keep auto-open disabled and use scroll mode, so they
can coexist with the legacy plugin. Legacy-shaped data (no native schema/reader,
with `epubSettings` or `deafultDarkMode`) adopts original defaults: pagination,
100% font and annotation-mode-by-default enabled, unless explicitly overridden.
A user's explicit native `autoOpen` takes precedence. Explicit Copy preferences
uses legacy defaults even for an empty settings object.

Writes stamp `nativeSettingsVersion: 1`; newer schemas refuse startup before any
write. Top-level and Markdown-settings unknown keys survive saves. The complete
legacy settings object is retained in `nativeLegacySnapshot` before adoption.
Copy preferences reads the old plugin's file without modifying it. It also
copies auto-open; disable that preference when running both readers together.
No annotation document is changed by preference adoption.

| Legacy setting | Current native disposition |
| --- | --- |
| `epubSettings.readingMode`, `fontSize` | Applied through validated reader preferences; pagination default retained for legacy data |
| `deafultDarkMode` (original spelling) | Applied to native dark theme when true |
| `customDefaultPath` | Applied to target lookup |
| `annotationMarkdownSettings.annotationModeByDefault` | Imported as `autoOpen`; explicit false retained |
| `includePrefix`, `includePostfix`, `highlightHighlightedText` | Applied to new annotation formatting; unknown nested keys retained |
| `darkReaderSettings.brightness`, `contrast`, `sepia` | Adopted by native EPUB dark-mode controls; original object retained. PDF/web Dark Reader equivalence remains open |
| `debugLogging` | Retained; native logging/UI policy still to be finalized |
| `annotateTvUrl` | Retained for rollback, not fetched/executed by native video. Embedded native playback/transcripts exist; full external-app parity remains unverified. |

Dataview is consulted for **both** `annotation-target` and
`annotation-target-type`, then frontmatter is used as fallback. Temporary
Dataview exceptions do not prevent frontmatter lookup. Array/Dataview link values
use the first value. An explicit video type routes to the dedicated timestamp
adapter, separate from PDF/web storage. Extensionless remote PDF/EPUB targets use the
resolved type consistently when selecting and downloading the source. No source
URI or note is rewritten. Local `file:`/absolute PDF/EPUB adapters, in-vault aliases,
reviewed external copies and offline history are implemented; see
`LOCAL_FILE_TARGETS.md`. Broader Windows/path/index-readiness tests remain open.

Automated evidence: `plugin-boundary.test.mjs` covers legacy defaults, explicit
false, fresh-install differences, opaque-data preservation, reopen, schema refusal,
Dataview extensionless EPUB download, video exclusion and rebuilding-index fallback.
These stub-host tests do not replace the installed upgrade/rollback rehearsal.

## Legacy workspace adapter

When packaged with the original `obsidian-annotator` ID, the native plugin registers the legacy `pdf-annotator` FileView type. Restored state continues to identify the annotation Markdown note. Once layout is ready, target resolution opens the native source in that same leaf and retains its collection association. Missing targets show Retry and Open Markdown rather than silently dropping the tab. Delayed startup callbacks are ignored after unloading or replacing the note. Experimental side-by-side installs do not register this legacy type.

Automated host-boundary checks cover deferred opening into the original leaf, unchanged note bytes, missing-target recovery and the plugin-ID boundary. This is implementation coverage, not an installed original-ID upgrade/rollback rehearsal. Versioned workspace/settings backup, rollback restoration and installed cold-start evidence remain required before promotion.

## Before-migration checkpoint

Original-ID startup now saves `native-upgrade-backup-v1.json` in the plugin directory before preference adoption or view registration. It retains exact text (including whitespace/newlines) of `data.json`, `workspace.json` and `workspace-mobile.json`, with `null` recording an absent file. The checkpoint is read back before startup continues. Existing checkpoints are validated and never replaced: an interrupted/invalid checkpoint stops startup instead of recording already migrated state as the original.

The side-by-side experimental ID does not create this checkpoint. This is a settings/workspace checkpoint, not a backup of annotations, cached sources, the old plugin binary, or the whole vault. It cannot reconstruct history from an installation already migrated without a checkpoint.

Rollback procedure for the eventual original-ID rehearsal: quit Obsidian fully; retain a separate copy of the current plugin directory and workspace files (including native draft recovery); restore the frozen old plugin artifacts; restore each non-null checkpoint entry byte-for-byte and remove only the corresponding files recorded as absent; then reopen Obsidian. Keep both the checkpoint and the current-state copy. Annotation documents must remain untouched so that published-reader compatibility can be checked against native edits. This procedure still requires an installed rehearsal before release; no automatic destructive rollback command is shipped.

### Rehearsal package

`npm run build:upgrade-rehearsal` builds the native release and creates a separate `.generated/upgrade-rehearsal/` artifact using the original plugin ID, with SHA256 hashes in `rehearsal-artifact.json`. The regular `dist/` retains the experimental ID. Install the rehearsal artifact only in an isolated copied vault with the legacy plugin disabled/replaced, retain the frozen old binary separately, and close Obsidian before replacing plugin files or restoring workspace snapshots. Packaging does not itself verify an installed upgrade.

Restoration also checks that its legacy tab still owns the destination after asynchronous source preparation. A delayed download may retain a reusable source cache, but cannot replace a document subsequently opened in that tab. A host test explicitly switches the tab while the request is pending and verifies no source opens and no annotation bytes change.

### Installed original-ID checkpoint — 2026-11-01

Desktop Obsidian 1.14.5 opened the separate `obsidian-annotator-upgrade-rehearsal` vault with a synthetic legacy `pdf-annotator` workspace leaf pointing to a copied annotation fixture. Enabling the original-ID native artifact restored that leaf into the built-in PDF reader. Both existing annotations rendered as highlights; clicking the title highlight opened its saved comment in the native sidebar. Only `obsidian-annotator` was enabled, with no competing experimental interceptor. The annotation document stayed byte-identical; the checkpoint retained exact original settings text, legacy workspace type, and absence of a mobile workspace. Adopted font size was 125 and settings schema was 1.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-upgrade-rehearsal/` contains original files, preparation hashes, `native-open-audit.json` and `01-original-id-native-restored.png`. Installed native bundle SHA256: `6f33e99d385f24d489ab4ed7455de9ec9b1a93d371c22710e8638d57c008e1f7`. This checks installed native restoration against synthetic saved legacy state; it does not yet demonstrate an actual frozen published installation upgraded and rolled back after edits. That gate remains open, along with cold restart and interrupted migration checks. The personal vault was not edited.

### Reload/edit and rollback preparation

The installed original-ID native artifact also passed **Reload app without saving**: the native PDF and both annotations returned, then an annotation comment was edited and saved through the native sidebar. This is an app reload, not a full OS-process restart. `02-native-edit-after-reload.png`, `after-native-edit.md` and `reload-edit-audit.json` record it.

The isolated vault window was then closed, its entire current `.obsidian` state retained separately, and the checksum-verified published 0.2.11 bundle plus release-commit manifest staged in place of the native artifact. Original checkpoint settings/workspace were restored without reverting annotation Markdown; the native comment edit remains. The published release has no separate stylesheet asset, so the native stylesheet was moved to the evidence directory. `rollback-staged.json` records preparation only: reopening and using the actual published reader remain pending. No rollback success is claimed from file replacement alone.

### Published rollback and native re-upgrade — live PDF fixture

The staged, checksum-verified **unmodified published 0.2.11 bundle** was reopened on desktop Obsidian 1.14.5. It restored the saved legacy tab, anchored both highlights and displayed the native-saved comment. Opening and entering its editor left the whole annotation document byte-identical. Saving a further `Published rollback edit.` through the actual Hypothesis sidebar succeeded.

After closing that vault, its published state was backed up separately and the native original-ID artifact restored without replacing the workspace saved by the published reader or the annotation document. Reopening restored that actual published workspace into the native PDF reader, with both highlights and both edit paragraphs visible. Native inspection again left the complete document byte-identical. The audit checked two surviving record IDs, the edited record's unchanged targets, the exact comment addition and an unchanged second annotation projection. This is a passing two-record desktop PDF rollback/re-upgrade fixture, not full cross-format or account-metadata preservation coverage.

Evidence in the same directory: `03-published-reader-native-edit.png`, `04-published-rollback-edit.png`, `05-native-after-published-edit.png`, before/after Markdown, `published-state-after-edit/` and `published-roundtrip-audit.json`. Other formats, reply-thread deletion, minimum-host/mobile upgrade, interrupted migration and full-process restart gates remain open. Native/published artifacts were never simultaneously active in the rehearsal vault.

## EPUB dark-mode appearance controls

Native EPUB preferences now expose brightness/contrast (50–150%) and sepia (0–100%), with finite numeric validation. Legacy adoption imports Dark Reader values and its 150/85/0 defaults; fresh native installs use neutral 100/100/0. Filters apply to publication content only in the explicit Dark theme and clear in other themes. Book bytes and projected text remain unchanged. Native settings retain these controls across saving and reopening.

The 191-test suite passed; an additional EPUB lifecycle assertion verified the applied CSS filter, clearing it on switching to Light, and unchanged publication text/book bytes. This is not a visual equivalence claim with Dark Reader's page transformation. PDF/web appearance controls and live visual checks for these newly added EPUB controls remain open. No staged/running vault artifact was replaced for this change.

### Older native appearance migration — 0.0.28

Native settings saved before the appearance controls existed now fill missing controls from retained `darkReaderSettings`, while explicit native values take precedence. Saving preferences also retains unrecognized nested reader options, alongside the original legacy settings object. A host integration test covers adoption, an explicit override, save and reopen, and opaque nested reader data. This migration changes settings only, not annotation documents. Live appearance verification remains separate.

### Desktop EPUB appearance check

Installed native 0.0.28 on Obsidian 1.14.5 rendered the existing two-annotation EPUB fixture in Dark with contrast 79 and sepia 21 (brightness remained 100), then in Light; the selected Light theme and both annotations survived app reload. EPUB and annotation Markdown bytes remained unchanged. The Light check exposed dark-background toolbar controls with dark text when the reader theme differed from Obsidian. Scoped toolbar colors now follow the selected reader palette; reloading the corrected stylesheet visibly restored readable controls.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-epub-appearance/`, including original files/plugin backup, dark screenshot, pre-fix Light screenshot, `03-desktop-light-toolbar-fixed.png`, and installed-artifact/unchanged-file audit. This verifies contrast/sepia adjustment and theme switching on desktop; brightness adjustment and Android appearance controls remain separate live checks.

### Original-ID Android EPUB cycle and duplicate-tab fix — 0.0.64

An actual unmodified published 0.2.11 → native → published → native workflow now
passes for one synthetic grid EPUB annotation. Its first native upgrade exposed
a race: default opening handled the legacy view's file-open notification and
created an extra source tab without explicit collection state. Native 0.0.64
restricts in-place conversion to the owning Markdown view, deduplicates pending
notifications and refuses stale navigation. Explicit mode toggling shares the
same path. The corrected replay restores exactly one original leaf and collection.

304 tests and release/rehearsal builds pass. The installed check verifies exact
pre-adoption checkpoint bytes, opaque settings preservation, a native comment edit,
rollback restoring actual checkpoint settings/workspace without replacing that
annotation, a subsequent edit in the actual Hypothesis sidebar, and a cold native
re-upgrade retaining it with byte-identical read-only Markdown. The checkpoint
and EPUB remain unchanged across the cycle.

[Detailed evidence and limits](ORIGINAL_ID_ANDROID_REHEARSAL.md) retain the published
startup/frontmatter and memory failures that required a warm Markdown/annotation
toggle, and the native landscape panel-chrome overlap that remains open. This is
not universal or uninterrupted migration proof, full published cold-start success,
or production promotion. Original isolated-vault settings/files were restored and
the current experimental artifact retained. Personal vault was untouched.

## Malformed settings startup guard — 0.0.124

Before calling the host's loadData or registering views, native startup now reads an existing plugin data.json and checks JSON syntax. A malformed/truncated file causes an explicit startup error identifying the path and requesting restoration of a valid copy; startup does not proceed using empty defaults. The damaged file and any existing upgrade checkpoint are not rewritten. A missing settings file remains a normal first installation. This applies to the experimental and original plugin IDs. It validates syntax, not the complete schema or a distributed sync transaction.

The regression models a host loadData implementation falling back to null for a truncated file. It fails against 0.0.123; after the change both plugin IDs refuse before host loading/view registration/settings writes, preserving the raw settings and unrelated annotation bytes. All 389 tests, release build and original-ID rehearsal artifact generation pass.

Actual Android Obsidian 1.14.4 / emulator-5554 installed native 0.0.124 with a temporary truncated experimental-ID data.json. The host displayed inactive native tabs and no native commands for the annotation palette query. The damaged file remained byte-identical. Restoring the exact original settings, workspace and enabled-plugin files and cold starting restored 12 matching native commands. Installed native main/manifest/styles match dist. No personal vault, physical tablet or annotation file was modified; forwarding removed.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-interrupted-settings/`: `01-damaged-start.json`, `02-damaged-palette.json`/`.png`, `03-restored-palette.json`, damaged/restored settings copies and `audit.json`. This is a manually injected truncation and actual side-by-side startup/recovery test. Original-ID installed failure, genuine process-kill timing, filesystem/sync failures and minimum-host/platform coverage remain open. No storage/Bend change.

## Installed original-ID interrupted-checkpoint recovery — unchanged 0.0.124

An isolated Android Obsidian 1.14.4 rehearsal installed the generated native artifact under `obsidian-annotator`, disabled the experimental ID, supplied valid legacy settings, a saved `pdf-annotator` EPUB note tab and a manually truncated native-upgrade-backup-v1.json. Startup refused: the host showed the legacy view as inactive and the annotation command-palette query contained no native command. Both the interrupted checkpoint and legacy data.json remained byte-identical.

With Obsidian stopped, a valid checkpoint containing the exact legacy settings and desktop/mobile workspace states was restored, along with the saved legacy tab state. Cold starting resumed successfully. The same leaf ID changed from `pdf-annotator` pointing at the annotation note to `annotator-native-epub` pointing at its source. The reader displayed all four associated comments across the two-chapter fixture, adopted the legacy 125% font size and retained the opaque settings object when saving native settings. The valid checkpoint stayed byte-identical. Complete annotation Markdown and EPUB bytes were unchanged.

Installed original-ID main/manifest/styles matched the generated rehearsal artifact by exact bytes. Original experimental workspace/community-plugin/data files were restored exactly; temporary original-ID plugin, both QA source/note files and forwarding were removed. The isolated emulator resumes experimental native 0.0.124. No personal vault or physical tablet was used.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-original-id-interrupted-checkpoint/`: `01-interrupted-start.json`, `02-interrupted-palette.json`/`.png`, `03-resumed-reader.json`, `04-resumed-annotations.json`/`.png`, interrupted/valid checkpoint and legacy/native settings copies, resumed workspace, installed artifacts and `audit.json`. A new host-boundary regression also verifies that truncated/wrong-version original-ID checkpoints prevent view registration and preference writes without replacing either settings or recovery data.

This verifies actual original-ID refusal and cold recovery after a manually injected interrupted checkpoint, plus same-leaf EPUB restoration/settings adoption. It is not a real process-kill timing or sync test, an automatic repair mechanism, all-format/multi-note/minimum-host coverage or a full rollback rehearsal. Broader gates remain open. All 390 tests pass; production runtime and the previously passing release/rehearsal artifacts are unchanged. No storage/Bend change in this evidence checkpoint.

## Verified settings writes — 0.0.129

A host-source check found that the installed desktop runtime can resolve saveData after catching an adapter write failure. Native persistence now reads settings back and rejects missing, malformed or differing data rather than reporting success; whitespace is accepted and failed jobs can be retried. All400 tests and release/rehearsal builds pass, including swallowed/partial/replaced writes for both plugin IDs. Actual Android normal draft persistence, cold recovery and cancellation pass with the guard; exact test configuration restored and QA removed. See SETTINGS_PERSISTENCE.md for source hash, evidence and limits. This is not an atomic/distributed-write guarantee or real disk-failure UI rehearsal.

## Host-provided plugin directory — 0.0.130

Settings and original-ID checkpoint handling now use PluginManifest.dir when supplied by the host, retaining the default configDir/plugins/id behavior otherwise. Version1 checkpoint shape and standard paths remain compatible; validation requires the exact settings path and both workspace paths for the supplied directory context. Wrong-context checkpoints are refused and existing checkpoints are not replaced. Startup adopts its already validated settings snapshot rather than risking a second host-read fallback. All403 tests and release/rehearsal builds pass. See SETTINGS_PERSISTENCE.md for actual Android normal-directory recovery/preservation evidence and remaining scope.

### Current-artifact page-note and reply cycle, with missing-parent limitation

Desktop Obsidian1.14.5 / original-ID native0.0.138 and checksum-pinned published0.2.11 pass a copied-PDF page-note create, native comment/tag edit and reply creation, published display/reply edit, native reopen and root-only deletion. Read-only whole-document bytes, unrelated records, parent references, URIs/targets and the existing checkpoint remain unchanged. All original isolated configuration and documents were restored exactly afterward.

The final published reopen hides the surviving reply in normal tabs because its pinned thread filter explicitly excludes missing-parent threads. Native still displays the original reply under Message not available. A frozen-function test proves its filtered-search branch includes that thread, but actual published search retrieval and final reply deletion remain unverified. Do not claim full rollback compatibility for missing-parent threads or rewrite surviving references to conceal this limitation. See PUBLISHED_PAGE_NOTE_INTERCHANGE.md for exact artifacts, scope and evidence.
