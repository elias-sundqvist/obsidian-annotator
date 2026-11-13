# Remote PDF/EPUB revisions

Version 0.0.15 adds two native commands:

- **Refresh cached remote PDF or EPUB** downloads a candidate and shows a review.
- **Choose a cached remote source revision** reviews a retained copy without a
  download, permitting offline rollback.

Open a cached remote source first. A refresh never overwrites its bytes or any
annotation note. EPUB candidates are parsed/indexed with the native publication
resolver. PDF candidates use Obsidian's public `loadPdfJs()` API to parse and
extract text; no additional PDF viewer/library is shipped. The preflight and
actual PDF reader share the same fingerprint and passage-resolution policy.
Replies/page notes without their own verified passage are reported separately.
Malformed sources, password/parser errors, unavailable validation capabilities,
HTTP failures and review limits leave the selected cache intact.

Review covers every discoverable annotation collection targeting the URL. IDs,
URIs, selectors, visible fields and opaque JSON stay in the original notes. A
candidate with unresolved passages can be selected explicitly; those records
remain visible/recoverable, with the previous source available. Selecting it
writes a separate content-addressed file, reads it back to verify the checksum,
then persists history/default routing/associations together. Existing old tabs
remain on their old files; the selected revision opens in a new tab. Retained
revisions remain associated with the original URL and annotation collection.
Files are not garbage-collected automatically.

A review becomes stale if source bytes, active revision or annotation collections
change. Commits serialize; queued preference writes read the latest state when
executed. Failed metadata saves restore and re-persist prior selection. If a
candidate file was staged before failure it is retained, never used silently or
overwritten on a later collision. Source renames update retained paths. Drafts
must be saved/cancelled before changing revisions.

This is a recoverable staged workflow, not a formal filesystem transaction.
The settings store still depends on Obsidian's `saveData` durability; power-loss
and sync-conflict rehearsals remain release gates. Original files and notes are
retained even if settings storage fails. Refresh review has explicit limits of
10,000 PDF pages/32 MiB extracted text and the existing archive limits. These are
new validation limits, not claims that the old plugin imposed the same limits.

Automated evidence: `plugin-boundary.test.mjs` and `remote-review.test.mjs` cover
immutable files/notes, offline rollback, unchanged bytes, HTTP/HTML errors,
corrupt EPUBs/PDF parser failure, identity mismatch, stale reviews, concurrent
commit/preference writes, rename, partial staged writes and failed/ambiguous
settings-write acknowledgements. PDF engine behavior in these tests is a host
stub; actual PDF.js/EPUB refresh dialogs still require live verification.

Live fixture setup was prepared under `/tmp/annotator-remote-refresh` (loopback
HTTP server and old/new public/synthetic source bytes). The Mac locked before
opening the remote targets, so no live refresh/rollback result is claimed for
this checkpoint. The temporary command-entry text in the isolated EPUB test note
was restored from its untouched synthetic source; the personal vault was untouched.

PDF loading options reference:
[PDF.js getDocument API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html).
The data buffer given to PDF.js is a copy, since workers can take ownership of it.
