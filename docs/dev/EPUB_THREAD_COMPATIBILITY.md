# EPUB page-note and reply compatibility — 0.0.40

The independent published oracle now bundles `AnnotationsService` and annotation
classification helpers from pinned client commit
`6e9f06ad6bd8b096a79614b16b0733e0491a2d30`. It does not use the modified working
submodule's service. Its annotation parser must both match the locked checksum
and equal `src/annotationUtils.tsx` from pinned plugin commit
`3647dd92d0d803bae9a3f34a1aac19eacb2fd52d`, mirroring the existing video-parser
source check. These oracle bundles are development-only and excluded from the
native release.

## Automated contract

Sixteen combinations cover Android localhost and desktop app-scheme chapter
URIs, a highlight or source-bearing page-note parent, native or published initial
creation, and native or published parent deletion. Each sequence reparses the
complete Markdown after every operation through both independent readers:

1. Create the parent and classify it with frozen published helpers.
2. Use the actual frozen reply method to construct a reply, then its save method
   and unchanged published backend to create that reply.
3. Create a native nested reply with the complete ancestor reference chain.
4. Edit the nested reply through published save and edit its parent reply natively.
5. Delete the original parent using the selected implementation.
6. Verify surviving reply references, URI-based published retrieval, then delete
   the child natively and the nested child through published delete.

The complete initial document—including an unrelated annotation block with
unknown data and user prose after it—remains a byte-identical prefix throughout.
Both readers agree on IDs, comment/tags, target/source, URI, references and the
checked unknown field. Deletion retains children as independent records; it does
not cascade or silently rewrite their reference chains. This is bounded service/
store regression evidence, not a formal theorem or proof of all UI behavior.

## Actual Android published/native interaction

On emulator-5554 / Obsidian 1.14.4, native 0.0.39 created a source-bearing page
note in Publisher Styles Field Guide. The unchanged published 0.2.11 application
then showed it under Page Notes and created/saved a reply through its own UI.
The original note bytes survived native creation as a prefix; the resulting note
bytes survived published reply creation as a prefix. The reply retained the
correct parent ID and `http://localhost/?loc=chapter.xhtml` URI.

After a cold switch to native, its Page Notes tab displayed the parent and nested
published reply. Native UI deletion removed only the parent. The published reply
remained available as an orphan thread under Annotations, retaining its text and
references. This exposed a category-count inconsistency: three highlight roots
plus the orphan reply produced four independent cards, but the old label said
Annotations 3. A regression reproduced this independently, including nested
children and a page-note parent. Counts now use the exact same root/category
predicate as the card list, so orphan roots count while nested replies do not.

236 automated tests and the release build pass. No Bend source or formal law
changed. Raw screenshots, accessibility trees, stage-by-stage note copies and
configuration backups are stored at
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-epub-thread-crud/`.
The old published mobile presentation still overlaps host chrome; keyboard
navigation reached Page Notes without patching the reference artifact.

## Remaining gates

The live sequence verifies native parent creation, published reply creation,
native cold reading and native parent deletion on one complete synthetic book.
It does not establish actual published UI parent deletion, nested-reply editing/
deletion, multi-chapter navigation, desktop/iOS, cross-device frozen URI routing,
all malformed/cyclic threads, or the historical real-note corpus. The native
release must retain those gates. Earlier experimental demo-URI orphan records
are not migrated by this checkpoint.

Final native 0.0.40 Android cold reopen retained the orphan reply unchanged and
showed the corrected “Annotations 4” label (screenshot 35). Its note remained
byte-identical to the saved post-deletion document. The source EPUB never
changed. After capturing the test, the exact pre-test annotation note, workspace,
enabled plugin list and native settings were restored; the temporary original-ID
plugin was removed. Native 0.0.40 remains installed. The installed release bundle
SHA-256 is `e55845ff63c32d239038ee0391afa8d353560138b77f70881ae683510afd1e7d`,
matching the built release. The evidence directory's audit.json records the
verified document-prefix, surviving-reference and restoration checks.

## Unchanged published nested edit/delete and native reopen — 0.0.119

A separate isolated Android Obsidian 1.14.4 rehearsal used the checksum-pinned actual published 0.2.11 bundle under its original plugin ID. A fresh complete synthetic EPUB and note were created with the native Bend-backed store: root, child, grandchild, an unrelated record with opaque data, and surrounding prose. The published UI found the root and both replies, expanded the thread, edited/saved the grandchild comment, and confirmed deletion of the intermediate child.

The published UI retains one thread, with “Message not available.” in place of the deleted intermediate reply and the surviving grandchild below it. Grandchild references remain `[nativeparentqa,nativechildqa]`. Exact raw blocks for the root/unrelated record remained unchanged; the child stayed unchanged until its explicit deletion; the grandchild's edited block stayed unchanged during that deletion. Trailing prose survived exactly. Frozen published exact-URI retrieval and native decoding agree on surviving IDs, text and references.

Native 0.0.119 cold-opened the published-edited note byte-identically and displayed both surviving comments. It exposes a release-blocking UI discrepancy: it counts/displays root and surviving grandchild as two independent annotation threads, omitting the missing-parent placeholder. This is a thread-model/rendering gap, not annotation loss. The source note and book are unchanged by native reopening. The captured Markdown and expected published hierarchy are now checked in as `fixtures/published-missing-intermediate-reply.md` and its JSON companion.

The next implementation must build a view-only thread forest from the complete ordered references path, including shared placeholder nodes for missing ancestors, count displayed roots consistently, and keep search/actions attached to real records. It must handle cycles/conflicting reference paths without dropping records or rewriting IDs/references. The pinned client's `sidebar/helpers/build-thread.js` documents the placeholder model; its production dependency must not be reintroduced. A deleted root with several surviving siblings and a deleted intermediate with several grandchildren need regression coverage alongside the existing orphan-count test.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-published-nested-thread/`. `10-replies.json`/`.png`, `12-nested-draft.json`, `13-nested-saved-ui.json`, `14-delete-intermediate.json`/`.png`, `15-intermediate-deleted-ui.json`, `18-native-thread.json`/`.png`, stage-specific Markdown copies, `store-audit.json`, and `audit.json`. The actual installed published main.js hash matches `aa08182b6fac314af098ef692702987ff11a02c490a140009d67fa86c815a938`. Native installed artifacts also match dist.

The published cold-start frontmatter-index race required navigating away/reopening after indexing. Its mobile sidebar toggle sits behind host chrome; native keyboard Tab/Shift-Tab/Enter reached it without patching the reference artifact. These baseline limitations are retained in evidence. The exact pre-test workspace/enabled-plugin/native-data files were restored, temporary original-ID plugin and QA files removed, and forwarding removed. Installed isolated Android is now 0.0.119. No personal vault or physical tablet was used.

This verifies one actual published nested edit and intermediate deletion plus native cold reading. Root/grandchild deletion, new nested reply creation, multi-chapter and other-format/platform UI checks remain open. No runtime or Bend contract changed in this evidence checkpoint; the prior full suite is 382 passing tests.

## Missing-ancestor presentation fixed — 0.0.120

Native now builds a view-only forest from the full references path. Missing ancestors are shared placeholder nodes rather than fabricated stored annotations. Existing annotations retain their own declared parentage; inferred missing-node ancestry uses the first established path. Parent links are checked iteratively for cycles, so malformed cyclic/conflicting paths retain accessible real records without mutating their references. No Hypothesis runtime dependency was introduced.

The sidebar counts and renders the same forest roots. An available root with a missing intermediate reply remains one thread; several grandchildren share that placeholder. When the root is absent, siblings share an unavailable root rather than becoming independent threads. Placeholders say “Message not available.” and have no edit/delete/reply/link actions. Real descendants keep those actions. Search continues to show matching real records without synthetic parent matches, and sorting/focus uses available thread context.

The captured published-deletion regression failed before implementation with Annotations 2 instead of 1. It now checks the missing intermediate, several surviving grandchildren, deletion of the root, placeholder sharing, action ownership and search. Additional cyclic/conflicting-path cases verify every real record remains reachable and input references stay unchanged. The existing orphan-count expectations now include visible placeholder nesting. All 384 tests and release/original-ID rehearsal checks pass.

Actual Android Obsidian 1.14.4, emulator-5554, installed 0.0.120: the exact captured published-edited note cold-loads with Annotations 1 and Page Notes 1. The real root contains the unavailable intermediate, which contains the published-edited grandchild. The placeholder has no own actions. Editing the grandchild opens “Published nested edit QA.”; Cancel restores the same hierarchy. Complete note and EPUB bytes remain identical to the staged fixture. This resolves the observed published/native missing-intermediate grouping discrepancy.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-native-thread-forest/`: `03-native-hierarchy.json`/`.png`, `04-grandchild-editor.json`, `05-cancelled.json`, before/after note/book copies, installed artifact hashes and `audit.json`. The exact pre-test workspace/community-plugin/native-data files were restored and QA files/forwarding removed. Installed isolated Android is 0.0.120. No personal vault, physical tablet, annotation wire format or Bend proof changed.

This is one actual EPUB thread plus bounded automated forest cases. Deep/adversarial thread performance, screen-reader behavior, root/nested deletion and creation across the complete published UI, other formats/platforms and broader cross-compatibility gates remain open. The model is tested host presentation code, not an additional formal theorem.

## Published two-chapter navigation — unchanged 0.0.120

The checksum-pinned, unchanged published 0.2.11 plugin on Android Obsidian 1.14.4 opened a complete synthetic two-chapter EPUB with native Bend-backed annotations. Chapter one loaded its native root thread under `http://localhost/?loc=chapter.xhtml`. Keyboard activation of the published table-of-contents “Second chapter” link navigated to `http://localhost/?loc=next.xhtml`. After asynchronous loading settled, the sidebar showed exactly one annotation, “Native chapter two QA.” with the multichapter tag, and the chapter document contained a Hypothesis highlight around the exact “Second chapter” heading. This checks chapter-specific identity and anchoring through the actual published reader, rather than only a parser oracle.

The old mobile toolbar remains oversized; its presentation is not evidence of full visual parity. Initial loading required reopening the note. The immediate navigation snapshot had no annotations; the settled snapshot contains the correct record/highlight. Root deletion was not performed in this rehearsal and remains open.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-published-multichapter/`, including `03-chapter-two.json`, `04-chapter-two-settled.json`, `04-chapter-two.png`, and `audit.json`. Installed published bundle SHA256 is `aa08182b6fac314af098ef692702987ff11a02c490a140009d67fa86c815a938`. Complete note/book bytes stayed identical. Original workspace, enabled plugins and native settings were restored exactly; temporary published plugin, QA files and forwarding were removed. No personal vault or physical tablet was used. No runtime or Bend change; the preceding full suite remains 384 passing tests.

## Wide missing-parent forest — 0.0.121

A new stress regression constructs 150,000 real replies sharing one unavailable parent. Before the fix, forest construction throws `RangeError: Maximum call stack size exceeded` while choosing the root's representative: spreading all children into `Array.push` exceeds the engine's function-argument limit. The traversal now pushes children individually in reverse order, retaining the same first-descendant selection and sibling order without that call-stack dependency. The regression verifies one root, every sibling retained, first-row representative and last-row root lookup. It fails against 0.0.120 and passes after the fix.

All 385 tests, release build and original-ID upgrade artifact generation pass. This verifies model construction and representative lookup, not acceptable performance rendering 150,000 DOM cards. Deep renderer recursion, large-list virtualization, accessibility and actual large imported collections remain open. Installed isolated Android remains 0.0.120; no new device UI claim, stored-format/Bend change or Hypothesis runtime dependency.

## Iterative nested-card rendering — 0.0.122

The sidebar now walks the model's acyclic forest with an explicit work stack. Rendering a child no longer recursively calls the card renderer or copies every ancestor ID into a new Set. Reverse scheduling preserves depth-first sibling order, real/missing-node nesting and the existing flat search behavior. The forest's cycle/reachability regression remains the prerequisite for this traversal.

A 250-level host-boundary regression checks exact DOM order and every parent relationship, an unavailable root, a second sibling rendered after the deep branch, the deepest annotation's edit target and flat search without placeholders. All 386 tests, release build and original-ID upgrade artifact generation pass. This is structural/stub-host evidence, not a new actual Obsidian UI or arbitrary-depth browser guarantee. Browser DOM/layout depth limits, large-thread virtualization and screen-reader checks remain open. Installed Android remains 0.0.120. No storage-format/Bend change.

## Actual published root deletion and native reopen — unchanged 0.0.122

An isolated Android Obsidian 1.14.4 rehearsal installed the unchanged checksum-pinned published 0.2.11 plugin. Its actual UI confirmed deletion of the native-created chapter-one root. Both child and grandchild survived in Markdown with their original references. The complete resulting document equals the initial document with only the root block and its immediately preceding newline removed; every surviving raw annotation block, unrelated record, chapter-two annotation and other byte remained unchanged. This explicitly accounts for the published deletion rule's newline consumption.

The published sidebar showed an empty annotation list after deletion. Navigating away/reopening, waiting for loading, opening its sidebar and keyboard-selecting Annotations still showed the empty state. The frozen published exact-URI parser nevertheless returns both surviving reply IDs with references matching native decoding. This is observed published UI behavior, not storage loss or proof that all published missing-root displays behave this way. Its oversized mobile chrome overlays tab hit targets, so the final tab selection used keyboard focus/Enter. The retained old-reader screenshot is on Page Notes; the final Annotations empty-state evidence is the read-only DOM snapshot.

A cold switch to native 0.0.122 showed both surviving comments beneath one unavailable-root placeholder with no own actions, plus the chapter-two annotation separately. Native opening left the complete published-edited note byte-identical; the EPUB remained identical. Installed native artifacts matched dist. Exact original workspace/community-plugin/native-data files were restored; temporary original-ID plugin, fixtures and forwarding were removed. Native 0.0.122 remains installed in the isolated emulator. No personal vault or physical tablet was used.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-published-root-delete/`, especially `03-delete-confirm.json`, `04-root-deleted.json`, `08-annotations-keyboard.json`, `10-native-root.json`/`.png`, source copies, `store-audit.json` and `audit.json`. Published main.js SHA256 remains `aa08182b6fac314af098ef692702987ff11a02c490a140009d67fa86c815a938`. The exact synthetic resulting note is committed as `fixtures/published-missing-root-replies.md`; its forest regression verifies both descendants, references and independent roots. Other-format/platform root deletion, new nested replies and the broader compatibility gates remain open. No runtime or Bend change in this checkpoint.

## Reply collapse/expand controls — 0.0.123

Native cards and unavailable ancestor placeholders now expose Show/Hide replies with counts of real descendants only. Threads begin expanded, retaining existing native behavior. Collapsing omits descendant card rendering; state survives sidebar refresh and search round trips within that note. Search still returns flat matching records, including hidden descendants. Opening an annotation for editing or starting a reply expands its ancestor path. State is cleared on collection changes and pruned when nodes disappear. Controls expose aria-expanded and stable focus keys; detached controls cannot mutate current state. Phone controls have a 44 CSS-pixel minimum touch height.

The host-boundary regression checks counts across missing ancestors, collapse/expand, focus restoration, refresh retention, detached events, search and editor-path expansion without mutating records. All 388 tests, release build and original-ID rehearsal artifact generation pass.

Actual Android Obsidian 1.14.4 / emulator-5554 used the exact captured published intermediate-deletion fixture. Touch Hide replies removed both missing-parent and surviving-grandchild presentation; Show replies restored both in the original hierarchy. The button counted one real reply and measured 44 pixels high. Complete note/book bytes were identical, installed native artifacts matched dist, original workspace/community-plugin/native settings were restored exactly and fixtures/forwarding removed. Isolated Android is now 0.0.123. No personal vault, physical tablet, storage-format or Bend change.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-reply-toggles/`: `02-final-expanded.json`, `03-collapsed.json`/`.png`, `04-expanded-again.json`/`.png`, before/after files and `audit.json`. `01-expanded.json` records the earlier smaller touch target, before the phone-height fix. Search/focus/editor expansion are automated evidence; screen-reader, keyboard/device/platform breadth and full large-thread performance remain open.
