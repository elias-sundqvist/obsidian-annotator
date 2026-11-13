# Original-ID Android upgrade and rollback — native 0.0.64

This isolated rehearsal uses emulator-5554 / Obsidian 1.14.4, one synthetic
named-area EPUB, one annotation note and the original obsidian-annotator ID.
It is an installed app workflow, separate from parser/engine-only tests.
The experimental branch and regular distribution ID remain unchanged.

## Finding and fix

The initial 0.0.63 upgrade restored two EPUB tabs from one published legacy tab.
One retained its explicit annotation collection and original leaf ID; the other
had only source state. The legacy FileView's file-open notification also reached
the native default-opening handler, whose default destination was a new tab.
The earlier host restoration test had default opening disabled and did not
simulate this notification.

0.0.64 converts only the Markdown view that still owns the exact opened note,
using that same leaf. Legacy/video/source views do not enter that path. A per-leaf
pending operation prevents duplicate notifications from starting another open.
A view/file ownership predicate cancels preparation after navigation; a failed
stale operation cannot replace the user's new document or raise a stale error.
The explicit Markdown-to-annotation toggle uses this same in-place path even when
automatic opening is disabled. Deliberate file-menu/new-pane operations retain
their separately requested destination behavior.

304 tests and the release/original-ID rehearsal builds pass. The original legacy
restoration test now enables default opening and dispatches the actual conflicting
file-open notification. Added host regressions cover ordinary in-place opening,
repeated notifications, explicit toggle with auto-open disabled, wrong-owner
events and navigation during delayed remote preparation. Logs:
/tmp/annotator-original-upgrade-final-tests.log and
/tmp/annotator-original-upgrade-release.log.

## Live evidence collected

The unmodified published 0.2.11 main.js is checksum-verified against the pinned
release hash aa08182b6fac314af098ef692702987ff11a02c490a140009d67fa86c815a938.
Only the original plugin ID is enabled during both reader phases. Its initial
cold restoration reported missing frontmatter before indexing; later startup
logs also recorded an Android allocation OutOfMemoryError and its viewer remained
at a spinner. Toggling to Markdown and back in the loaded app recovered the
published reader. It then rendered the grid, anchored the native-created highlight
and displayed its existing comment without changing a note byte. These startup
failures are retained, not counted as successful published cold opening.

The fixed native upgrade replays the exact actual published settings/workspace.
It restores one main leaf with the original ID and explicit source/note collection.
The first-migration checkpoint matches the original raw settings and workspace
bytes, including null entries for absent files. Schema adoption retains the entire
legacy settings object, opaque top-level and nested canaries, and explicit default
opening. Opening/inspection leaves the complete note unchanged.

A native comment edit is checked against the exact expected whole-document codec
update, retaining the record ID, targets and document metadata. Rollback restores
the frozen published binary/manifest and exact checkpoint settings/workspace while
keeping that edited annotation file. The recovered published reader anchors its
highlight and shows “Native upgrade edit survives rollback.” It saves a further
“Published rollback edit reaches native.” through its actual Hypothesis editor,
retaining the original record ID and URI. The current native artifact is then
installed over that actual published-saved workspace/settings without replacing
the note or migration checkpoint.

Evidence directory:
~/Documents/obsidian-annotator-native-test-validation/2026-11-02-original-id-upgrade/

Important artifacts include baseline-audit.json, native-upgraded-workspace.json
(the two-tab failure), native064-workspace.json, native064-upgrade-audit.json,
native-edit-audit.json, raw before/after notes and complete per-phase .obsidian
snapshots. Screenshots 07–08 show the published baseline; 10 shows the initial
native failure; 12 the corrected restoration; 17 the native edit; 21 the published
rollback comment; 24 the published edit. Further final checks are recorded below.

## Remaining release scope

This single annotation/EPUB fixture does not establish all-format, multi-note,
reply-thread, interrupted-migration, sync-failure, minimum-host or all-device
upgrade/rollback safety. Background Markdown default-opening and late-indexing
behavior need broader lifecycle checks. The landscape native sidebar also exposed
Obsidian panel chrome overlapping the lower card controls; attempts there did not
edit the note, and the successful storage edit used portrait. That UI issue remains
open. No root build promotion, legacy-asset deletion or new Bend proof is claimed.

## Completed re-upgrade and restoration

The final native 0.0.64 cold process start shows “Published rollback edit reaches
native.” and paints the same highlighted word. The actual published writer changed
only the projected text field in this fixture; record ID, URI, selectors, document
metadata and dates remained equal. Native inspection leaves its complete saved
Markdown byte-identical. The final workspace has one main leaf with the original
ID and explicit source/note association. The original migration checkpoint remains
byte-identical through rollback and re-upgrade. The adopted legacy snapshot equals
the actual published-saved settings object; opaque canaries survive and no drafts
remain. The source EPUB stays byte-identical throughout.

Screenshots 26–27 show the final native comment and highlight. roundtrip-audit.json,
published-edit-field-audit.json, final-native-workspace.json, raw files and hashes
record the final checks. Main.js SHA256 for the exact native artifact:
50502696afb2283b4b515a168fe8e93ad2a0d0bcca43ee6fb7c48a7461c940d4.

The test vault's original workspace files, enabled plugin list and experimental
plugin settings were restored and byte-verified; absent files remain absent.
The original-ID directory and synthetic book/note were absent before the test and
were removed after their complete state was retained in evidence. Rotation was
restored before restarting. The current experimental 0.0.64 release and notices
remain installed and hash-verified in that isolated vault. restoration-audit.json
records this boundary. Personal vault, desktop rehearsal vault and physical tablet
were not modified. No published/native readers were enabled simultaneously.

### Landscape follow-up correction

The later [landscape interaction check](LANDSCAPE_SIDEBAR_RESULTS.md) shows those
controls are reachable by scrolling in the unchanged 0.0.64 artifact. The earlier
tap used accessibility bounds below the visible drawer area. Actual landscape
Edit/Save and Escape delete cancellation now pass for this EPUB card. This
supersedes the earlier unresolved-overlap classification for that specific case;
broader mobile/video/IME/a11y workflows remain open.

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
