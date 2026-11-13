# Native replacement acceptance status

Assessment at native 0.0.138, 2026-11-02. This is an index of
verified scope and remaining acceptance work, not a release approval. Preserve
all five milestones and deletion conditions in `NATIVE_REPLACEMENT_PLAN.md`.
The branch remains `experiment/obsidian-native-pdf`; root production is legacy.

## Current artifact versus historical host evidence

423 tests pass; production runtime remains0.0.138 with its passing release/original-ID rehearsal builds. They do not
turn earlier host screenshots into live tests of 0.0.138. The latest completed
Android installation audit is 0.0.130; the later emulator startup required Android
authentication before its vault could be accessed, and was stopped without
staging files. Do not infer that a missing vault path means the vault was deleted.
The physical tablet is outside this test workflow.
Desktop's isolated native vault now has 0.0.138: actual Obsidian1.14.5 passage navigation, temporary edit/cancel and deletion-confirmation cancel pass on the existing synthetic two-record EPUB, with unchanged book/note bytes. Earlier0.0.137 image-marker EPUB visuals also pass. Earlier website evidence: the full captured article showed
all three original highlights through Obsidian 1.14.5's actual reading renderer.
Its collection survived a0.0.134 window reload. On0.0.136, sidebar first-click
preservation plus host line navigation passes the controlled Fold all headings
fixture, preserving unrelated folds. Broader folding/platform cases remain;
a window reload is not a process cold start.

Three oracles remain distinct: unchanged published 0.2.11/client pinned in
`compat/published/lock.json`, the experimental patched legacy reader, and native.
A published parser/anchor function is stronger than a native-only fixture but
does not prove the complete published application UI.

| Format | Actual-host evidence already inspected | Remaining complete compatibility run |
| --- | --- | --- |
| PDF | Desktop two-record original-ID edit/read cycle; current0.0.138 actual published/native page-note create/edit/tag/reply/rollback-edit cycle passes with unchanged unrelated records. Native parent deletion retains the reply, but published normal tabs hide its missing-parent thread (recorded limitation); Android nested-overlap touch/keyboard/Escape and real text-layer eviction/rebuild on 0.0.97. | Finish current-artifact full CRUD/link/cold reopen and actual published missing-parent reply recovery/deletion; complex PDFs, multiple panes/pop-outs, supported-platform and appearance checks. |
| EPUB | Android original-ID published/native edit/rollback on 0.0.64; unchanged published reader finds a native chapter-two annotation; published nested/root deletion captures, native missing-reply restoration; real vertical/CJK/font fixtures on later native versions; desktop Obsidian1.14.5/0.0.137 displays archive/variable image bullets and shorthand reset with unchanged note/book bytes. | Current-artifact alternating full thread CRUD/cold reopen, multiple collections, repackaging/rename, wider publisher/resource corpus and remaining platform/layout/performance checks. |
| Website/reading copy | Legacy UI created three OpenAI article annotations; full rendered capture maps all three exact texts. Actual desktop Obsidian1.14.5/0.0.134 shows all three highlights and retains the collection after window reload;0.0.136 passes controlled first-click fold-all reveal while unrelated headings stay closed. Original note/archive/copy bytes unchanged. Synthetic checks additionally exercise pinned published selector functions. | Broader folding/platform cases; mobile real-article reuse; creating legacy bundle provenance; chooser in actual Obsidian; complete cross-reader CRUD/process reopen and dynamic/login/SPA/frame/shadow scenarios. Desktop visual restoration is not complete workflow parity. |
| Video | Android embedded playback and real 572-cue ASR selection/save/seek/cold reopen on 0.0.127. Desktop Obsidian 1.14.5/0.0.136 local-video create/edit/window reload/seek/delete passes; a second UI create/delete cycle leaves the entire document byte-identical to the first deleted state. Frozen published video serializer/parser agrees; unrelated control fields and original document prefix remain unchanged. First cycle retains one separator LF. | Full published external video application baseline and alternating complete CRUD; desktop transcript/provider/language/IME/accessibility/pop-out/timeline checks. Local-video window reload is not process cold start; frozen parser acceptance is not a published video UI run. |

Authoritative evidence roots (outside the repository):

`~/Documents/obsidian-annotator-native-test-validation/`

- `2026-11-01-upgrade-rehearsal/published-roundtrip-audit.json`
- `2026-11-02-pdf-overlap/audit.json`
- `2026-11-02-pdf-virtualization/audit.json`
- `2026-11-02-original-id-upgrade/roundtrip-audit.json`
- `2026-11-02-published-multichapter/audit.json`
- `2026-11-02-published-nested-thread/` and `2026-11-02-published-root-delete/`
- `2026-10-31-website/`, `2026-11-02-mobile-website-copy/`
- `2026-11-02-snapshot-reload/`, `2026-11-02-snapshot-code-spacing/`
- `2026-11-02-online-automatic-captions/audit.json`
- `2026-11-02-settings-snapshot/audit.json`
- `2026-11-02-desktop-real-website/audit.json`
- `2026-11-02-desktop-folded-navigation/audit.json`
- `2026-11-02-sidebar-first-click/audit.json`
- `2026-11-02-desktop-video-crud/cleanup-audit.json`
- `2026-11-02-image-markers/host-audit.json`
- `2026-11-02-sidebar-controls/audit.json`
- `2026-11-02-published-page-note-crud/roundtrip-audit.json`

The complete artifact hash/operation/fixture/byte scope in each audit takes
precedence over this short index. Historical failure observations stay visible;
later corrected evidence must identify what was corrected and rechecked.

## Next acceptance work, in order

1. Finish the full real-article mobile reuse check, including the three existing
   legacy-created annotation blocks. Their October 31 screenshot/note set does
   not pin the creating bundle; do not label it unchanged-published provenance
   without establishing that separately. The complete source and reproducibly
   prepared copy are now retained under `2026-11-02-mobile-website-copy/`; use
   that full capture, not a reconstructed excerpt. Verify original
   note bytes before/after inspection and selected-copy association.
   Desktop's controlled fold-all/first-click fixture now passes on0.0.136;
   retain that case in platform and current-artifact acceptance runs.
2. Use a fixed candidate artifact to fill the missing full CRUD/cold-open cells
   for PDF, EPUB, web/snapshot and video. Preserve independently pinned published
   behavior; add regressions only for failures actually exposed. Record source,
   note, settings and artifact hashes, rather than only successful screenshots.
3. Rehearse that candidate under the original plugin ID, all formats and multiple
   notes, including normal rollback and real interrupted/sync-failure cases.
   Malformed-checkpoint fixtures do not prove an actual interrupted write.
4. Complete representative corpus, multi-pane/pop-out, IME/accessibility and
   measured performance gates from milestones 2/4. Obtain actual minimum-host,
   Windows and iOS evidence for a release claiming those platforms.
5. Only after the original acceptance criteria pass, switch the root build,
   inspect the native dependency graph, remove shipping legacy resources and
   run packaged cold-open/CRUD/rollback checks. Keep pinned compatibility oracles
   and licenses separately reproducible.

No cell is cleared by replacing a requested workflow with an external link,
discarding unknown fields, silently changing selectors or narrowing supported
platforms. Product decisions that change inherited scope require explicit user
agreement. This index does not add a permission gate to already authorized
experimental implementation or testing.
