# Actual published/native page-note and reply interchange

Desktop Obsidian1.14.5, 2026-11-02. Native0.0.138 original-ID rehearsal artifact, SHA256 b3b1a5adb16dc1403661a6c54b4b522e002bca6bf1234c3bb505095efc696b3a. Unchanged published0.2.11, SHA256 aa08182b6fac314af098ef692702987ff11a02c490a140009d67fa86c815a938; revisions remain pinned in compat/published/lock.json. Only one artifact was active in the isolated upgrade vault at each stage.

The copied synthetic PDF collection retained two unrelated historical control annotations. The actual published sidebar created a page note with comment and tag. Native restored the actual published workspace in Obsidian's built-in PDF reader, displayed the page note, edited its comment/tags, and created a reply. After rollback, the actual published sidebar displayed the native edit, both tags, and the expanded native reply. Published editing added a further paragraph to that native-created reply. A second native upgrade displayed that edit and deleted only the QA root. Native retained the unchanged reply under Message not available.

All read-only reopen phases left the whole document byte-identical. Native editing changed only the page note's text/tags; published editing changed only the reply's text. The page-note URI and empty target survived; the reply's URI, target and parent ID survived. Both unrelated control records and the complete original document prefix remain unchanged at every audited stage. The original checkpoint stayed byte-identical through both upgrades and rollbacks. Source PDF bytes are unchanged. These are measured results for this fixture, not a universal old-writer unknown-field preservation claim.

## Remaining rollback limitation: deleted parent

The final unchanged-published reopen did not display the surviving reply in its normal tabs. The record is still present and accepted by both parsers. This is explained by the pinned client's thread-annotations.js: the normal sidebar thread filter returns false when thread.annotation is missing. Its filtered-search branch does not apply that tab filter.

A development oracle now bundles that exact pinned thread function, and the captured fixture fixtures/published-orphan-page-note.md reproduces the behavior: normal tabs hide the missing-parent thread, while a text filter includes the same original reply under its missing-parent placeholder. Only ephemeral anchored status is added to the two control records in that test; stored references/targets remain untouched. The actual UI search attempts did not establish filtered retrieval, so published search and deletion of the surviving reply remain unverified. No final published deletion is claimed.

This is an inherited published-client visibility limitation. Native must not silently remove surviving replies, rewrite references, or add substitute annotations merely to make that old default-tab filter pass. A rollback/recovery workflow that makes these records accessible still needs an actual UI acceptance run; the full compatibility gate remains open.

## Evidence and cleanup

Private evidence: ~/Documents/obsidian-annotator-native-test-validation/2026-11-02-published-page-note-crud/ contains each phase's Markdown and parsed audit, before/phase configuration trees, PDF, pinned-artifact audit, roundtrip-audit.json and cleanup-audit.json. Actual CUA screenshots were emitted and visually inspected in chat; no exported native PNG is claimed.

After closing only the test window, the entire original rehearsal configuration and published artifact were restored exactly. All original vault documents match their initial hashes; only the two known copied QA files and folder were removed. The regular experimental native test vault was untouched and still has native0.0.138. Personal documents and the physical tablet were not edited.

All423 tests pass, including the frozen-thread regression. Production runtime, wire format and Bend proofs are unchanged; prior0.0.138 release/rehearsal build results still apply. This is a page-note/reply CRUD slice with a recorded failing rollback case, not complete PDF CRUD, process cold restart, Android, all-format acceptance or release promotion.
