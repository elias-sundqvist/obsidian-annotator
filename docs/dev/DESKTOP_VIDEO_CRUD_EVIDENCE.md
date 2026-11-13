# Desktop video CRUD rehearsal — 2026-11-02

Actual Obsidian 1.14.5 with native 0.0.136, on the experimental branch.
Evidence directory: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-desktop-video-crud/`.

An isolated note targeted the public MDN CC0 flower MP4. Its baseline contained an unrelated annotation created by the frozen published video serializer. The native reader displayed that record and confirmed seeking to 0.25 seconds.

Using the real native UI, creation saved a new record at 1.25 seconds with multiline Markdown. Editing retained its ID and changed the title, comment and timestamp to 2.5 seconds. Reloading the Obsidian window restored both cards without changing the edited document bytes, and the timestamp button confirmed seeking to 2.50 seconds. Deleting only the new record retained the control. The frozen published video parser accepted the created and edited fields exactly. A second actual UI create/delete cycle produced a whole document byte-identical to the first deleted state.

The original document remained an exact prefix throughout. The first create/delete cycle retained one separator LF; this is evidence of cycle stability, not exact receipt-free undo. Control fields and its original raw prefix remained unchanged, with the separator delta explicitly audited.

Evidence includes baseline, created, edited, reopened and deleted Markdown snapshots and JSON audits, second-cycle snapshots/audit, downloaded-source provenance and cleanup audit. No exported screenshot PNG is claimed. The two known fixture files were removed after closing only the test window; community-plugin configuration, workspace and plugin settings were restored byte-for-byte. Installed native 0.0.136 was retained; personal vault files were not changed.

This closes one desktop local-video CRUD rehearsal. It does not establish full published external video application UI compatibility, transcript/provider coverage, process cold restart, Android parity at 0.0.136, or minimum-host behavior. Existing 416-test and release/rehearsal results apply to the unchanged implementation; this evidence-only update did not rerun them.
