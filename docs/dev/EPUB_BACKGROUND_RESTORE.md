# Background EPUB position restoration — 0.0.38

A compiled-reader regression reproduced a hidden startup tab losing a requested
text offset: 20 became 0 because its viewport and text rectangles had no visible
geometry. The reader completed restoration and then treated that zero as its
reading position. The pre-fix failure is recorded in
`/tmp/annotator-hidden-before.log`.

Restoration now remains pending until a nonzero viewport exists. Background state
serialization retains the requested chapter/offset, and progress saves cannot
replace it with a measurement from an invisible pane. A previously visible tab
keeps its last real text anchor while hidden, including workspace saves that run
before ResizeObserver delivery. Revealing the tab restores that anchor even when
its dimensions equal the previous visible dimensions. Font/mode preferences can
change while hidden without discarding its pending position.

A pending fragment destination is also retained in native view state. It is
scrolled only after the pane becomes visible, then removed from transient state.
Cold restoration honors that explicit pending navigation; otherwise the existing
newer-persisted-position rule still wins over stale workspace offsets. Closing a
never-visible tab cancels its restoration without saving zero or resurrecting its
chapter. Book bytes, annotation selectors and annotation document storage are
unchanged.

## Tests and host evidence

233 tests and the release build pass. Controlled geometry checks cover hidden
startup, state/preferences while hidden, hiding before observer delivery,
equal-size reveal, LTR/RTL hidden mode changes, pending fragments through a fresh
FileView restoration, and disposal before visibility. The test harness now gives
visible panes real nonzero dimensions during their initial lifecycle and derives
chapter positions from their actual viewport scroll, rather than adding dimensions
only after load. These checks exercise the compiled reader, not a copy of its
position algorithm.

On emulator-5554 / Obsidian 1.14.4, a disposable workspace was staged with the
Responsive EPUB in front and a separate background RTL book at chapter 1 / text
offset 425. This was an explicit synthetic test seed, with the original raw
workspace/settings backed up first. The background position remained 425 while
the other book was foreground. Activating that tab showed paragraph 045. Switching
back to the other book and force-stopping/reopening Obsidian retained both the
settings position and inactive workspace offset 425; reactivating the book again
showed 045. The RTL source book/note and the other book's existing annotation note
were byte-identical before/after. Installed 0.0.38 matched the release artifact.

This establishes the Android inactive-tab/workspace workflow. The exact zero-size
startup branch is established by controlled lifecycle tests; the host was not
instrumented to prove when Obsidian deferred or instantiated each background leaf.
Desktop/iOS, pop-outs, long asynchronous resource loads, pending-fragment UI checks
and full multi-pane/corpus migration remain separate validation gates.

Screenshots 01–04, original/staged/cold workspace and settings, unchanged source
copies, installed artifact and `audit.json`:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-background-epub/`.
Bundle SHA-256:
`3594c271412825ec6d7c0e60ebcbfb3ded57c7a5ff655e0c068332909ed765d4`.
The app uses the added synthetic background tab for the final screenshot; original
workspace/settings backups remain in the evidence folder.
