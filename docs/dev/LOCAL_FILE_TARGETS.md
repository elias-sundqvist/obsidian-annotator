# Local file target checkpoint (0.0.18)

The native experiment accepts desktop absolute paths and local `file:` URLs for
PDF/EPUB targets. The published bridge has a file-URL reader; previous native
versions skipped both forms. Original annotation-target values, source files,
annotation Markdown and selectors are retained.

For a path inside the current desktop vault, the reader opens the actual vault
file. Opening it records a canonical file-URI → vault-relative alias in plugin
settings. That alias follows vault rename events and permits mobile reopening
without a desktop base path. A currently resolvable desktop path takes precedence
over an old alias. Windows drive syntax and file-URL decoding have pure tests;
actual Windows file I/O has not been exercised on this Mac. Network/UNC file URLs
and encoded Windows separators are not accepted.

For a file outside the vault, the desktop lazily obtains filesystem promises through Obsidian’s CommonJS loader,
reads through a bounded descriptor, validates the PDF with Obsidian's PDF parser
or parses/indexes the actual EPUB archive, and writes a separate copy under
`Annotator sources`. The original is opened read-only. The reader uses its normal
PDF/EPUB host on the copy; standard PDF fingerprint and EPUB book/chapter identity
are unchanged by byte-for-byte copying. File URLs are not sent to HTTP requests.

Reads reject empty/nonregular/oversized files, truncation, growth and detected
mtime/ctime/inode changes while copying. Allocation is bounded by the initial
file size (64 MiB EPUB / 128 MiB PDF). These are the current source/cache limits,
not a claim that every historically supported large file is covered. A race with
an external writer cannot be treated as a proved filesystem transaction.

Cached external files use the existing retained-source association/history
settings, now accepting canonical file URIs as well as HTTP(S). Explicit Refresh
reads the external original and reviews annotation resolution before selecting an
immutable new revision. Previous copies and all notes remain. Retained revisions
can be chosen offline, including on mobile. A mobile device cannot refresh an
uncached desktop filesystem path; it can use synced vault files/copies and aliases.
Original files are never overwritten by this workflow.

Initial association write failure now restores/repairs the prior settings and
keeps verified copied bytes for retry. A matching orphan copy is reused only when
its complete hash matches newly read bytes; a differing file is refused rather
than overwritten. Metadata write/power-loss/sync durability retains the limitations
of the existing [revision workflow](REMOTE_REVISIONS.md).

## Evidence and remaining gates

Pure tests cover POSIX/Windows lexical paths, Unicode/space/#/?/% handling,
containment rather than sibling-prefix matching, unsupported hosts/separators,
actual read-only temporary-file/symlink reads, size/error cases and alias/history
validation. Host-boundary tests exercise direct in-vault opening, external PDF
copy/refresh/rollback, offline mobile-style reuse, real EPUB archive validation,
settings reopen, alias rename and initial association failure/retry/collision.
PDF parsing is a host double in these tests; EPUB parsing is real. Tests do not
constitute live desktop, Android, iOS or Windows UI evidence.

The release build rejects eager filesystem import statements. A compiled
CommonJS-module test confirms that startup makes no filesystem require call and
that explicit desktop access loads it once. The mobile branch refuses fresh
external reads before obtaining that module. Live 0.0.18 desktop file opening and
PDF.js revision review now pass; Android 0.0.18 cold startup also passes. See
[LIVE_RECOVERY_RESULTS.md](LIVE_RECOVERY_RESULTS.md) for evidence and limits. The
initial 0.0.17 dynamic import failed in the real renderer despite Node tests; this
was corrected before claiming live file-target support.

Local HTML/website targets, UNC/network shares, source URL fragment/startup-page
behavior, a larger historical corpus and exact published application UI/rollback
remain incomplete. This checkpoint does not establish all local-target parity or
justify deleting the legacy runtime.
