# Native annotation draft recovery

Version 0.0.16 retains unfinished edits, passage comments, page notes and replies
in local plugin settings (`nativeDrafts`), separate from annotation Markdown.
Typing checkpoints recovery state with a 350 ms debounce. Context changes retain
meaningful drafts; Cancel discards the current session only. A recovery toolbar
button/command lists retained drafts, with Resume, Copy comment and Discard.
Source renames update recovery paths without rewriting stored annotation selectors
or note targets. Normal target reconnection may still be required after a rename.

Restoring a draft does not write a note or weaken save checks. Existing annotation
edits retain their original baseline; an externally changed/deleted record still
refuses mutation. **Compare current annotation** shows original, current and draft
comment/tags. Continuing explicitly adopts the current record as the baseline;
a later Save applies the draft and checks again for intervening changes. Deleted
records cannot be implicitly recreated. An expired passage draft can be attached
to a fresh selection in the same source while retaining its comment/tags.

The editor preserves caret/focus across sidebar refreshes and defers replacement
during composition. Raw tag input is retained separately from parsed tags so a
refresh cannot remove a trailing comma or disturb a partially composed tag.
Typing during an asynchronous save keeps the newer draft and updates its baseline
to the version just saved. Finishing an old deletion does not clear another draft.
Invalid stored sessions are retained in `nativeDraftsRecovery` rather than silently
lost; unknown extensions on valid sessions survive edits.

Evidence is automated host-boundary testing in `drafts.test.mjs` and
`plugin-boundary.test.mjs`: source switching, settings reload/recovery, selective
cancellation, asynchronous save/deletion, stale/deleted records, explicit rebase,
reattachment, source rename, malformed recovery data, caret and comment/tag
composition. These are simulated host/DOM tests, not live desktop/Android IME or
cold-process evidence. A process killed before the debounce/write finishes may
lose the most recent keystrokes; storage failure is reported and retains the live
in-memory draft. Sync merge and abrupt-power-loss durability remain release gates.

No Bend grammar/law was changed. Annotation documents remain authoritative, and
all writes still pass through their existing proved codec and tested transaction
boundary. Local UI/draft/file durability behavior is not a new formal guarantee.


Live evidence was added in 0.0.18: desktop reload retained comment text and raw
trailing-comma tag input; Android force-stop/cold restart retained a checkpointed
`Draft17` page-note draft. Both were resumed through the actual recovery UI, then
cancelled without annotation writes. This does not establish full mobile IME or
keystrokes-before-debounce durability. See [live results](LIVE_RECOVERY_RESULTS.md).
