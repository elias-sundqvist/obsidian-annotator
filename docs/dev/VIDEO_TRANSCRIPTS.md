# Native video transcripts — 0.0.26

The transcript is rendered as selectable text inside Obsidian, below the embedded player. Clicking passage text, pressing Enter on a focused passage, or using its **Go to timestamp** button seeks through the same provider-neutral playback adapter as annotation cards.

Select all or part of one or more passages and choose **Annotate selected transcript**. The shared sidebar opens a draft containing an escaped Markdown blockquote of the selected text and the start time of the first selected passage. Add a title/comment and save through the existing Bend timestamp store. A selected word gets its passage's start time: this does not promise word-level alignment. Creating a draft never overwrites another unfinished editor or writes an annotation immediately.

## Transcript sources

**Import VTT/SRT** validates the chosen file and copies its original text into a separate vault file named `<annotation note path>.transcript.vtt` (or `.srt`). The original file and annotation Markdown are unchanged. Existing companion files of either format and configured transcript links are protected from replacement. A companion transcript loads automatically when the video note opens; **Load saved transcript** reloads it after edits or a failed network fetch.

An explicit source can be set in the annotation note:

```yaml
annotation-transcript: "[[Captions/My video.en.vtt]]"
```

This is a vault link/path, not a remote fetch URL. Imported transcript files do not add fields to the published video annotation format. Existing timestamp/comment/title/block-ID records remain the interchange format; the selected quotation is ordinary comment Markdown. Transcript loading and refresh never rewrite those records.

**Load captions** retrieves public YouTube captions in the requested language (default `en`). It reads the public player API key from the watch page, then requests fresh signed caption metadata from the player endpoint using the source-inspected `ANDROID` client context (`20.10.38`). This follows the current [youtube-transcript-api retrieval implementation](https://github.com/jdepoix/youtube-transcript-api/blob/master/youtube_transcript_api/_transcripts.py) and [client settings](https://github.com/jdepoix/youtube-transcript-api/blob/master/youtube_transcript_api/_settings.py). No package from that project is shipped. It is an internal provider contract, not an official public-caption API guarantee.

The original failure came from watch-page caption URLs: those returned an empty HTTP 200 response for the test video. Fresh player metadata supplied working signed URLs. The loader replaces an existing `fmt=srv3` parameter with `fmt=json3`; appending a second parameter can leave XML as the actual response format. If a page supplies no public key, direct watch-page tracks remain a fallback for videos where they work.

The loader validates the exact video, playability status and HTTPS YouTube timedtext endpoint, then prefers a human track in the requested language. It does not silently choose another language. No cookies, user credentials, third-party services, Origin/Referer overrides, token generation or remote script execution are involved. Only the public video identifier and standard caption client context are sent. Normal opening makes no caption network request; **Load captions** performs the fetch. Network or availability failures retain the prior transcript and all annotation CRUD. Caption bodies and page data are never inserted as remote HTML.

The official [caption-download API](https://developers.google.com/youtube/data/reference/rest/v3/captions/download) is separate and requires authorization and video-edit permission. Provider changes, restrictions, missing tracks and network/rate limits can still prevent retrieval. This checkpoint demonstrates public English captions on two videos, not universal availability.

## Validation

182 automated tests pass, including partial and cross-passage selections, Unicode/entities, invalid timing and size limits, exact provider/video checks, requested-language handling, failed/late responses, import persistence/conflicts, click/keyboard seeking, draft ownership, and published-parser decoding of a saved selection. Release TypeScript checks and build pass. No Bend source or proof was changed; these are host/parser tests, not new formal theorems.

Desktop Obsidian 1.14.5: clicking the second synthetic passage confirmed a seek to 20.25 seconds. Selecting the first passage created a draft at 12.5, and the saved annotation was accepted by the frozen published parser. The complete prior note remained a byte-identical prefix.

Android emulator-5554, Obsidian 1.14.4: clicking a synthetic passage confirmed a seek to 1.25; long-pressing `passage` and choosing the selection action opened the shared editor with `> passage` at 1.25. The draft was cancelled; the note remained byte-identical and recovery contained zero video drafts. Only the isolated test vaults were used; the personal vault and physical tablet were untouched. Final import-conflict hardening was verified automatically after these UI checks.

Raw screenshots, before/after note copies, fixtures and hash audit: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-video-transcript/`. The displayed transcripts are explicitly synthetic UI fixtures, not successful YouTube caption downloads. Final release bundle SHA256: `b4cb0984fc08ebd70370d1d31c2792ad89b62ed12acacba6294cd82ae8f6fb77` (verified against installed Android bytes).

Remaining gates include broader real-provider/language coverage, rolling automatic-caption deduplication, larger real-caption corpora, iOS/IME/accessibility checks and the complete legacy transcript feature inventory. Playback and note editing work when transcripts are unavailable.

## Real-caption validation — 0.0.25

The production loader fetched 466 English passages for `M7lc1UVf-VE` (starts 10.349 through 1337.309 seconds) and 286 for `aircAruvnKk` (starts 4.22 through 1105.1), using three requests each. Desktop Obsidian 1.14.5 and Android Obsidian 1.14.4 both loaded the real 466-passage transcript through their actual `requestUrl` implementation and confirmed caption-driven seeks at 10.35 seconds.

On desktop, selecting the first downloaded caption created a draft at the exact 10.349 start. Saving it produced a record accepted by the frozen published parser, while the previous note stayed byte-identical as a prefix. Android performed fetch/seek without changing annotation Markdown; recovery held zero video drafts. Playback was paused afterward. No personal vault or physical tablet was used.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-real-captions/` (raw desktop/Android screenshots, before/after notes and audit JSON). Bundle SHA256: `f8a331744d81fa1046a37058949d233621a92b4a0e497dc8552d2022d9e44841`, verified against installed Android bytes. These screenshots show actual fetched captions, unlike the synthetic fixtures used for the initial 0.0.24 interaction checks above.

## Search and playback following — 0.0.26

**Search transcript** filters passage text using case-insensitive NFKC-normalized matching, displays the match count, and retains the original cue text and timestamps. Search does not recreate the passage text nodes. Selection-to-annotation excludes hidden results, and active playback updates never rewrite the selection or annotation Markdown.

The current passage has a theme-colored accent marker and an explicit start-time label. Browser media events and verified YouTube clock messages drive updates; there is no polling timer. The latest-starting overlapping cue is active, with end times exclusive and gaps clearing the marker. A sorted-cue lookup with prefix maximum end times avoids scanning the full transcript during silent gaps. Player failure, source changes, unsubscribe and disposal clear/stop clock notifications. Browser media errors also make current-time capture unavailable until metadata loads again.

**Follow playback** is off by default. When enabled it scrolls only the transcript panel to the active visible cue. A text selection suspends automatic scrolling. Mouse-wheel, touch interaction and scrolling keys inside the transcript switch follow off, so manual reading is not pulled back to playback. Search-hidden cues do not trigger a scroll.

182 tests and the release build pass, covering overlap/gap/end boundaries, a 10,000-cue lookup fixture, provider/browser clock notifications, errors/unsubscribe/disposal, filtered selection timestamps, selection retention, and scoped scrolling/manual override. These are host/UI tests; no Bend source or formal law changed.

Desktop Obsidian 1.14.5: the real 466-passage transcript filtered to two results for `Jeff`; result seeking worked. Follow tracked the current real passage at 45.17 seconds after an annotation seek to 45.25 and scrolled its inner panel into view. Manual wheel scrolling changed Follow playback from on to off. An earlier synthetic fixture independently checked the 20.25-second marker. The marker was strengthened with an accent border after live contrast review.

Android emulator-5554, Obsidian 1.14.4: the real transcript likewise filtered to two `Jeff` matches. In the final build, playing after a caption seek and enabling follow advanced the panel to the active 21.49-second cue, with its marker and label visible. Touch browsing switched follow off. Before/after annotation files remained identical on both platforms; no video drafts remained. The personal vault and physical tablet were untouched.

Evidence and exact installed-artifact hash audit: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-transcript-follow/`. Screenshots 01/04 document the initial search check; 03 is the synthetic marker fixture; 05/06/07 show real-caption following and manual override. Original-ID upgrade/rollback, published-reader UI compatibility, larger EPUB/layout/device corpora and remaining transcript/provider gates are still open. This does not establish full native-replacement readiness.

Android cleanup note: media-pause key and direct iframe tap attempts did not produce a confirmed pause; the clock continued advancing. The native source tab was closed (four tabs to three) for cleanup. Android player-control affordances need a dedicated follow-up before release. This does not affect the verified transcript search/follow result.

0.0.26 release main.js SHA256: `4a98d234a9bcda9538038eb0cfd9ba35514a4555bb13065f8919ae02284771bd`; main.js, manifest and stylesheet hashes match both installed test vaults.

## Save downloaded captions for offline reading — 0.0.30

**Save transcript** writes the currently displayed passages to `<annotation-note>.transcript.vtt` using the existing companion import boundary. Opening the video again discovers that companion without contacting YouTube. Existing configured transcripts and VTT/SRT companions are refused rather than overwritten; annotation Markdown is not edited.

Export escapes literal markup/entities and encodes embedded line breaks so blank lines or timing-shaped text cannot split a cue. It reparses the complete output and requires exact cue text/start/end equality before any write. Sub-millisecond timing that VTT cannot represent, changed text, invalid cues and oversized output are refused. A failed save retains the loaded transcript. Saving does not cancel pending caption retrieval, and a late save cannot relabel a newer transcript. The companion preserves passage text/timing, not remote language/track metadata; its source label becomes the local path when reopened.

Automated tests exercise literal Unicode/markup/entities, blank lines, cue-shaped text, long-video times, precision refusal, the native save action, failed saves, unchanged annotation bytes and concurrent loading/replacement. Live desktop/Android save-and-offline-reopen checks remain pending; earlier screenshots do not establish this new action.

## Real-caption save and Android offline cold reopen — 0.0.31

The first live Save transcript check exposed a floating-point discrepancy: VTT's prior parser added fractional seconds to minutes, yielding a different IEEE-754 value for some timings (for example 93.829) than JSON3's integer-millisecond conversion. The loss check correctly refused the write. VTT/SRT timestamps now accumulate safe integer milliseconds and divide once, retaining exact numeric equality; excessively large timestamps are refused. The regression covers the real failing cue and a minute boundary. All 199 tests and the release build passed.

On emulator-5554 / Obsidian 1.14.4, the corrected build downloaded and saved 466 real English passages for M7lc1UVf-VE. Wi-Fi and mobile data were disabled, Obsidian force-stopped and reopened. The provider iframe reported `net::ERR_INTERNET_DISCONNECTED`, while all 466 passages loaded from the companion VTT and remained readable. Network settings were then restored to their prior enabled values. The annotation note stayed byte-identical. All Android-saved cue text/start/end values also matched an independently fetched copy of the real transcript exactly.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-offline-captions/`. Screenshot 01 records the refused pre-fix save; 02 records successful saving; 03 is early startup; 04 shows the offline player error alongside the loaded count; 05 shows readable local passages while offline. Raw companion, note copies, cue equality audit and installed-artifact audit are retained. Installed bundle SHA256: `d3c227bd42c562b33c30bb9f696ccb0e32f7a2310e5fc7a1e8a2e8b12c0882a1`. Desktop offline save/reopen and broader provider/language coverage remain open.

## Automatic JSON3 scrolling investigation

A fresh public English automatic track for `aircAruvnKk` returned 1,066 events:
533 text cues, 532 newline-only append events and one window configuration event.
525 adjacent cue pairs overlap in display time; there were no text-bearing
append events. The production JSON3 parser already drops newline-only controls
and keeps each supplied text cue once. The existing clock selects the latest
active phrase during overlap. Therefore this track does not require lexical
prefix/suffix deduplication, which could erase genuine repeated speech.

The entire 533-cue track survived VTT save/reparse with exactly equal text,
starts and ends. The investigation filtered player metadata to automatic tracks
only; normal production retrieval still prefers human captions. No production
provider behavior changed. A source-shaped synthetic regression checks window
controls, overlap, intentional repeated phrases and exact offline roundtrip;
all nine transcript tests pass.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-automatic-caption-structure/`.
This is fresh network/parser evidence, not a new desktop/Android UI check.
Text-bearing append events, other automatic tracks and rolling imported VTT/SRT
still need corpus checks; this does not close general automatic-caption coverage.

## Video editor keyboard/failure recovery — 0.0.48

Title, timestamp and comment fields now support Ctrl/Cmd+Enter to save and Escape
to cancel. Shortcuts are disabled while busy or during tracked/browser IME
composition (including keyCode 229). Failed-save re-rendering restores the active
field, selection and scroll position for the same draft session; it does not
reuse focus state for another draft. Delete confirmation initially focuses
Cancel delete; Escape cancels and returns to Delete without changing the note.

The actual VideoView host regression covers composition suppression, a failing
save with caret restoration, and deletion/editor cancellation with byte-identical
source Markdown. Full suite: 259 tests; release build passes. Real mobile IME,
assistive technology, successful-save focus and complete video keyboard parity
remain open; no new actual-host UI claim is made here.

## Host keymap routing — 0.0.58

Video editor shortcuts now also register through public view Scope APIs, and the
shared annotation sidebar delegates its scope to the active video editor. This
addresses host capture interception found in the actual Android PDF sidebar.
Video/shared-panel scope and IME/focus tests pass; actual video hardware-key UI
verification remains open. See EDITOR_SHORTCUTS.md for precise evidence and limits.

## Concurrent video pane opening — 0.0.67

The prior video-opening guard was global per note: while one view was opening,
a second pane for that same note was silently skipped. It is now a weak map of
destination leaf to note. Duplicate requests for one pane are coalesced; another
pane opens independently. Cleanup only removes the matching request. File-open
notifications consult their owning recent leaf.

A regression failed before the fix (one view opened instead of two) and passes
afterward. All 312 tests, release build and original-ID rehearsal packaging pass.
Actual Android 1.14.4 cold startup restored two Markdown tabs for the same video
note as two native video views with both original leaf IDs and the first leaf
still active. The player showed ERR_INTERNET_DISCONNECTED, so this establishes
view restoration, not playback, caption loading, draft isolation or editing.
Original isolated workspace/community/plugin settings were restored and synthetic
fixtures removed. Evidence and exact installed-artifact hashes:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-video-pane-startup/`.
No personal vault, physical tablet, network settings or Bend source was changed.

## Video annotation refresh recovery — 0.0.70

A late read failure previously cleared cards from a newer successful refresh.
Failure results now require the same current request serial, view epoch and live
view as successful reads. The regression failed before the fix (zero cards
remained instead of one).

A current failure keeps the last loaded cards readable, labels them as last
loaded, disables card editing/deletion and new-annotation creation, and offers
Refresh annotations to retry explicitly. Existing unfinished editor text is
retained. A successful retry restores the controls and clears the failure status.
Switching notes clears cached records before loading, preventing prior-note
comments from being displayed if the new read fails. Copy/seek on retained cards
remain available; mutations still use fresh atomic vault transactions.

Tests cover reordered failure/success, current failure, retry, draft retention,
control states, switching notes and complete annotation-note preservation.
These are automated host checks; actual filesystem/sync failure UI, caption
provider errors and broader platform recovery remain release gates. No new
Bend theorem or installed artifact is claimed. All 316 automated tests, release
build, original-ID rehearsal packaging and diff checks pass.

## Committed save versus failed refresh — 0.0.71

Saving a video annotation previously replaced a post-save read error with the
plain Annotation saved message. The UI now distinguishes a committed write from
a failed list refresh and retains the refresh error and explicit retry guidance.
A superseded refresh does not overwrite the newer request's status. Successful
reads and current failures return distinct outcomes; stale reads return neither.

The regression failed before this fix and exercises both create and update: the
write commits, the following read fails, the draft recovery checkpoint clears,
the editor closes, and retry refreshes the list without saving or duplicating
the annotation again. Whole saved document bytes remain equal across retry.
This is automated host evidence; live filesystem failure and screen-reader
announcement checks remain open. All 317 tests, release build, original-ID
rehearsal packaging and diff checks pass. No storage law or wire format changed.

## Transcript keyboard and composition semantics — 0.0.72

Focusable passage text now exposes a button role and a timestamp action title.
Enter and Space seek to the original fractional cue time; Space prevents page
scrolling. Modified shortcuts and IME/composition events (including keyCode 229)
do not seek. Passage text remains selectable, and clicking with an active text
selection retains the existing non-seeking behavior. Native timestamp buttons
remain available alongside passage text.

Transcript search defers filtering during IME composition, applies the query at
composition end, and ignores delayed input/composition events from an older reader
epoch. The regression checks Japanese composition, filtered visibility, reader
reopening, action roles, keyboard activation, modifiers and unchanged annotation
documents. These host tests do not establish actual TalkBack/VoiceOver output,
hardware-key routing, mobile IME behavior or an optimal tab order for long
transcripts; those remain accessibility gates. No new formal proof or installed
artifact is claimed. All 319 tests, release build, original-ID rehearsal
packaging and diff checks pass.

## Long-transcript keyboard navigation — 0.0.73

Transcript passages use a roving Tab entry instead of putting both controls in
every row into the sequential Tab order. One visible passage is tabbable;
timestamp buttons remain pointer/assistive-technology actions but are skipped
by sequential Tab. Arrow Up/Down and Home/End move focus among visible passage
texts without seeking. Enter/Space seek. Modified/composition keys retain their
normal behavior. The transcript container remains a separate Tab entry.

Filtering retains a visible entry or selects the first match. It does not move
focus from Search; if a focused passage becomes hidden, focus moves to a visible
entry or the transcript container. Playback updates never change keyboard focus.
Arrow navigation pauses Follow and adjusts only the transcript's own scroll.
The displayed instructions describe these keys. Text selection and annotation
capture keep the original passage nodes and timestamps.

A 500-passage host regression verifies bounded sequential Tab stops, filtered
navigation, Home/End, modifier/IME suppression, focus preservation during playback
and search, empty results, seeking, scoped scrolling and whole-note equality.
All 320 tests, release build, original-ID rehearsal packaging and diff checks
pass. Actual TalkBack/VoiceOver, browser screen-reader navigation mode, mobile
hardware keys and larger transcript performance remain open. No new installed
artifact or Bend theorem is claimed.

## Actual Android transcript navigation and metadata startup — 0.0.74

A cold-restored video view could open before its annotation target metadata was
ready, keep an empty target, report no player adapter and discard the saved
transcript response. Metadata changed/resolved now reinitializes a still-unresolved
view when its target becomes available. An established target is not silently
replaced. The host regression checks saved-cue recovery and that later settled
metadata events do not rebuild the player.

Final release on Android Obsidian 1.14.4 / emulator-5554 cold-opened the existing
local flower.mp4 player as Video ready and automatically loaded a synthetic
500-passage VTT companion. Actual input key events and accessibility focus confirm
Arrow Down focuses passage 001, End focuses 499, Home returns to 000, and Tab
leaves for annotation search. Transcript-local scrolling leaves the outer
instructions/current-position block in place. Playback remained at its initial
position; this is keyboard navigation evidence, not a fresh seek/playback test.
The focused span's visual focus treatment still needs polish.

Both the complete annotation note and companion VTT remained byte-identical.
Original isolated workspace/community/plugin settings were restored and temporary
files removed. No personal vault, physical tablet or network settings were used
or changed. Evidence, screenshots, accessibility focus bounds, byte/hash audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-transcript-navigation/`.
All 321 tests, release build, original-ID rehearsal packaging and diff checks
pass. Filtered navigation, actual IME, TalkBack/VoiceOver and other devices remain
open; no full accessibility or native-replacement completion claim.

## Visible transcript keyboard focus — 0.0.75

Passage text now has an accent outline when focus-visible matches, with an
offset and rounded corners. This distinguishes keyboard focus from the current
playback passage's filled background and side marker. No parser, annotation
behavior or document format changed.

Actual Android Obsidian 1.14.4 / emulator-5554 cold-opened the local player and
500-cue saved companion. Arrow Down focused passage 001; accessibility focus and
the raw screenshot show its accent outline while playback remains marked on
passage 000. Complete note and VTT bytes remained identical. Original isolated
workspace/community/plugin settings were restored; synthetic files removed.
Evidence, screenshot and installed-artifact hash audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-transcript-focus/`.

Release type checking/build, original-ID rehearsal packaging and diff checks
pass. No new unit tests were added for this CSS-only change. The previous runtime
checkpoint passed 321 tests; this change was verified through the actual Android
render. Dark theme, measured contrast, desktop and assistive-technology output
remain open. No personal vault or physical tablet was used.

## Video annotation-search composition — 0.0.76

Video card search now defers filtering during IME composition and applies the
query when composition ends. Events from replaced reader epochs or closed views
are ignored. Filtering does not rebuild the editor or the search field. The host
regression checks focus, editor-node identity, unfinished comment retention,
filtering after composition and delayed events after reader reopening, with the
entire annotation note unchanged. Actual Android/iOS IME and screen-reader
checks remain open; this is automated host evidence, not a new installed-artifact
or native-replacement completion claim.

0.0.76 validation: all 322 tests, release build, original-ID rehearsal packaging
and diff checks pass.

## Native video comment preview — 0.0.77

The video editor now offers Preview comment using Obsidian's MarkdownRenderer and
the annotation note as its source path. Preview components have a separate
lifecycle from card rendering; replacing/cancelling an editor or closing the view
unloads them. Repeated previews use separate targets/components, so late responses
cannot overwrite newer previews. Render failures show literal comment text.
Preview does not save the annotation.

All 323 tests and release/original-ID rehearsal builds pass. The new test checks
out-of-order renders, literal fallback, source-path resolution, cancellation and
whole-note preservation. A test-only entry point exposes the mocked renderer; it
is excluded from the shipped bundle.

Actual Android Obsidian 1.14.4 renders bold text and inline math in the editor
preview and saved card. An initial stale-coordinate tap hit Save in the synthetic
test instead of Preview; after-test-save.md records that committed baseline.
The subsequent verified preview and cancellation left that complete saved note
byte-identical and cleared its recovery draft. Original isolated workspace/plugin
settings were restored and the synthetic note removed. No personal vault or
physical tablet was used. Raw screenshots, note copies, exact installed hashes
and audit: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-video-preview/`.
Images, transclusions, custom blocks, desktop and screen-reader rendering remain
open. This is native-editor consistency evidence, not a claim of a complete
Annotate.tv feature inventory. The checksum-pinned published source at commit
3647dd92 confirms its transcript proxy requested English captions and numbered
returned cues; the externally loaded application still needs separate inventory.

## Preview invalidation after comment edits — 0.0.78

Regular and video editors now discard the preview target and unload its component
when the comment changes. Formatting buttons in the regular editor do the same.
A pending older render can finish only into its detached target, leaving the
visible preview empty until the user requests a new snapshot. Title/time/tag
edits do not invalidate a comment-only preview.

The host regressions cover typing after preview, formatting-button invalidation,
a late render after resumed typing, retained draft text and whole-note equality.
All 324 tests, release build, original-ID rehearsal packaging and diff checks
pass. These are automated host checks; earlier Android preview screenshots
precede this change and do not establish live invalidation or resource cleanup.
Actual embed lifecycle and mobile/desktop IME checks remain open. No wire format,
Bend theorem, personal-vault content or installed artifact changed in this check.

## Local reload and stale controls — 0.0.92

Loading an existing vault transcript no longer validates the remote caption
language field. A mistyped or empty language still prevents a network caption
request, but cannot block offline companion recovery. Failed remote validation
retains the currently displayed transcript.

Transcript load and import handlers now check reader ownership before advancing
the request generation or starting work. A detached control from a replaced
reader therefore cannot invalidate a current pending transcript load. Existing
post-await checks still reject late results from changed collections.

Two host-boundary regressions cover local reload with invalid remote language,
remote validation retaining the transcript, and a detached caption button while
a new reader has a pending local load. All 345 tests pass. These are simulated
host checks, not new Android interaction or provider-network evidence. No Bend
codec or proof changed, and no annotation Markdown is written by these actions.

## Transcript action ownership — 0.0.93

Save, selection-to-annotation, follow/manual browsing and passage seek/focus/
keyboard handlers now retain their owning reader context. Detached controls do
nothing after a reader is replaced. Passage handlers also retain the displayed
transcript identity: refreshing the transcript in the same reader invalidates
old passage actions without disabling the current passages while another load
is pending. Source text and annotation formats are unchanged.

The regression keeps old control references across reader replacement, checks
that they cannot save/annotate/seek or toggle current following, then replaces
only the transcript and verifies old passages cannot seek while new ones can.
This is host-boundary lifecycle coverage; actual mobile gestures and screen-reader
behavior remain release gates.

## Android offline reload and current actions — 0.0.93

Actual Android Obsidian 1.14.4 cold-opened the isolated fixture with local
`flower.mp4` and four synthetic VTT passages. With the language field containing
`enainvalid language` (ADB's attempted Select All inserted an extra character),
Load captions reported the language validation error. Load saved transcript then
restored all four passages and the companion source label despite that same
invalid input. Tapping the 1.00-second timestamp updated the current-passage label
to 1.00 seconds. Follow playback could still be enabled after the ownership
checks; its accent state and the active passage are visible in screenshot 08.
Touching a passage switches following off by design.

The accessibility dump reports `checked=false` even for the visibly enabled
`aria-pressed` follow toggle. This is recorded as an accessibility validation
limitation; no TalkBack announcement or checked-state correctness is established.
The synthetic cues establish local interaction, not provider/network behavior or
continuous playback tracking. Detached-control refusal remains automated evidence.

Private screenshots, installed artifact hashes and storage/configuration audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-transcript-reload`.
The annotation note and VTT stayed byte-identical. Original workspace, plugin
data and community-plugin configuration were restored exactly; synthetic files
were removed. Installed experimental files match the 0.0.93 release. No personal
vault or physical tablet was touched. No production code or Bend proof changed
in this live-validation step.

## Preserve signature-shaped cue identifiers — 0.0.94

The VTT parser previously skipped every block whose first line began `WEBVTT`.
That silently discarded valid cues with identifiers such as `WEBVTT-introduction`
and even `WEBVTT` after the file header. Only the first VTT block is now treated
as the file header. VTT metadata blocks retain their separate handling; metadata
skipping no longer applies to SRT input.

The [W3C cue identifier grammar](https://www.w3.org/TR/webvtt1/#webvtt-cue-identifier)
permits signature-shaped identifiers. A regression imports header metadata,
comments, style/region blocks and three identified cues, then verifies exact
text/timing through VTT export/reparse. All 347 tests pass. Cue IDs and visual
subtitle positioning remain outside the plain transcript data model; this change
prevents lost passages, not a claim of full WebVTT rendering conformance. No
annotation format or Bend proof changed. Actual device import of this fixture
remains unverified.

### Live retrieval recheck — 2026-11-02

Rechecked the production `loadYouTubeTranscript` implementation against public videos `M7lc1UVf-VE` and `aircAruvnKk`: each completed in three requests (watch metadata, fresh player metadata, signed JSON3 track), returning 466 and 286 English cues respectively. Exporting each result with `transcriptVtt` and reparsing it preserved every cue's text, start and end exactly. This was a live network/module check, not a new Obsidian UI run or a guarantee for restricted videos or other providers. The full native suite passed 365 tests in this checkpoint.

## Real-pointer cross-passage selection — 2026-11-02

`test-support/browser-transcript-check.mjs` loads the production VideoView bundle with the existing test-only Obsidian boundary in fresh headless Chromium 151.0.7922.34. A synthetic three-cue transcript is provided locally. Clicking the second passage records a 20.25-second seek request. A real mouse drag across the first two passages, followed by clicking Annotate selected transcript, creates a 12.5-second draft containing exactly `> First passage text` and `> Second passage text`, with no timestamp-button text. Saving preserves the complete prior note prefix and clears the draft. The frozen published video parser then decodes exactly one annotation with the expected title, time and quoted content.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-browser-transcript/published-checked` (draft/saved screenshots and structured observations). The initial fixture dragged through the vertically stretched span's empty area and selected only the second cue; using the actual text line corrected the fixture. This is real browser selection/focus evidence with synthetic captions and a recorded seek adapter, not new provider retrieval, real playback, Obsidian UI, mobile gesture or screen-reader verification. The test MarkdownRenderer is a stub, so the saved screenshot does not establish comment rendering fidelity. No production runtime, installed artifact, vault or Bend proof changed; the preceding full suite remains 367 passing tests.

Run after `npm run build` with the optional `ANNOTATOR_PLAYWRIGHT_MODULE` path and a private evidence directory argument.

## Android touch selection, save and delete — 0.0.103

Actual Obsidian 1.14.4 on emulator-5554 loaded four local synthetic cues beside the existing local `flower.mp4`. Tapping the 1-second timestamp produced the native seek confirmation and current-passage label. Long-pressing `synthetic` in that passage opened Android's native text selection. Tapping Annotate selected transcript retained the selected word and opened a native sidebar draft with timestamp `1` and comment `> synthetic`. Entering `TouchCaption` and saving produced a rendered annotation card. The frozen published video parser decoded the actual pulled note with exactly that title, time and comment. The annotation was then deleted through the confirmation UI.

The original 104-byte note remained the exact prefix of the created 190-byte note. After deletion it was 105 bytes: the original plus one newline. This is first-cycle normalization, not exact receipt-free undo. A production codec create/delete check using that actual post-deletion document returned the complete 105-byte document unchanged; this second-cycle check was at the module boundary, not a second UI cycle. The VTT remained byte-identical. Recovery contained no remaining fixture draft. Workspace, plugin data and community-plugin configuration were restored exactly and both synthetic files removed. Installed experimental files match the 0.0.103 release; no personal vault or physical tablet was touched.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-transcript-touch`, including screenshots 03 (native selection), 04/05 (draft), 06 (rendered saved annotation), 07/08 (delete), pulled note snapshots, published parser check, repeat-cycle module check and artifact/configuration audit. This establishes a single-word touch selection and actual local seek/create/delete. Cross-passage mobile handles, remote retrieval in this build, TalkBack and desktop remain outside this run. No runtime or Bend theorem changed; the preceding suite remains 367 passing tests.

## Additional real automatic tracks and Android saved reading — unchanged 0.0.127

A fresh public-player investigation explicitly filtered metadata to English automatic tracks in the harness; production retrieval remains human-first. M7lc1UVf-VE supplied 572 text passages from 1,144 events, with 566 adjacent timing overlaps. aircAruvnKk supplied 533 from 1,066 events, with 525 overlaps. Both had zero text-bearing append events and zero text-bearing events missing duration. Both complete tracks survived VTT save/reparse with exactly equal text, starts and ends. The additional jNQXAC9IVRw sample supplied no English automatic track in this request; that availability result is not a parser failure or a claim about every language/provider request.

The repeatable explicit-network development harness is test-support/check-automatic-captions.mjs. After npm test/build, pass an evidence directory and optional video IDs. It uses the production loader/parser/exporter, filters only its player metadata to ASR, verifies the returned track is automatic, records event/overlap counts and exact VTT equality, and exits nonzero on an unavailable/failed sample. Network results are not part of the offline unit suite. It stores caption JSON/VTT, not watch-page/player keys or signed metadata URLs.

Actual Android Obsidian1.14.4 / emulator-5554 loaded the real 572-passage VTT companion in a synthetic collection targeting its actual video. Read-only DOM inspection compares every displayed passage text and two-decimal timestamp label against the parsed saved track, initially and after a process cold restart. Both match exactly. Searching Jeff returns exactly the one source-matching passage. The filtered screenshot was visually inspected. Note/companion bytes and saved drafts remain unchanged. Exact original workspace/community-plugin/native settings restored, fixtures/forwarding removed, native0.0.127 artifacts match dist. No personal vault or physical tablet used.

The embedded timestamp seek did not pass: the player frame contains chrome-error://chromewebdata and net::ERR_INTERNET_DISCONNECTED. Emulator Wi-Fi was enabled but disconnected, cellular settings/radio reported enabled/home, and there was no default network or route. An idempotent svc data enable attempt did not establish a route; airplane/Wi-Fi/mobile setting values stayed unchanged. This is saved-caption reading while disconnected, not successful online playback/seek. Earlier real-caption seek evidence remains separate. Network recovery and a fresh online check are still needed.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-automatic-caption-corpus/`: initial audit/JSON/VTT, repeated and final retrieval audits; android/02-loaded-cues.json, 04-filtered-visible.json/.png, 05-seek.json, 06-player-frame.json, 07-cold-cues.json, cue-audit.json, network-observation.json and audit.json. The prior 396-test/release/rehearsal result still applies; no production runtime, installed version, wire format or Bend proof changed. This extends two real English automatic-track examples; text-bearing append events, arbitrary rolling tracks, languages/providers, actual transcript selection/annotation on this ASR sample and complete video parity remain open.

## Restored Android connection: real ASR seek, touch-create and cold reopen — unchanged 0.0.127

The prior no-route blocker was resolved by connecting emulator-5554 to its observed standard AndroidWifi open network. Android then reports a connected Wi-Fi interface, VALIDATED/INTERNET capabilities and active default network101. This is an intentional emulator-network repair; the previous broken no-route state was not reintroduced. Airplane/Wi-Fi/mobile global settings remain enabled as before. No physical device, Mac network or personal vault was changed.

With the same saved 572-passage automatic track and actual M7lc1UVf-VE target, the in-Obsidian embedded player reports Video ready. Touching the first caption's timestamp produces Seek confirmed at10.24 seconds. A real Android long press on the settled first passage selects hey; Annotate selected transcript opens a draft with timestamp10.24 and Markdown quote > hey. Saving creates one annotation accepted by the frozen published video parser at start10.24/content > hey. The original complete note is a byte-identical prefix of the saved note. No provider-specific external action or out-of-Obsidian playback was used.

Cold restarting Obsidian retains the saved annotation's rendered quote and10.24 timestamp action, plus all572 captions. The saved note remains byte-identical to its post-save baseline, the VTT companion remains unchanged and recovery drafts match their initial state. Native0.0.127 main/manifest/styles match dist. Original workspace/community-plugin/native settings were restored exactly and QA note/companion/forwarding removed. The emulator remains connected for subsequent online QA.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-online-automatic-captions/`: 01-started.json,02-seek-requested.json,04-selected-settled.json,05-caption-draft.json,06-draft-settled.json,07-saved-card.json/.png,08-cold-card.json,08-cold-cues.json,store-audit.json,connected-network.txt and audit.json. The saved-card screenshot was visually inspected. The first attempted selection occurred while the preceding scroll was still settling and selected nothing; the settled geometry was reread before the successful long press.

This closes the immediately observed disconnected-emulator seek uncertainty for this sample and adds an actual one-word ASR touch-create/cold-read workflow. It is not full published video application UI, all-provider/language, ASR edit/delete or assistive-technology parity. Production runtime and prior396-test/release/rehearsal artifacts are unchanged; broader video/replacement gates remain open.

## Compact transcript controls — 0.0.128

Load captions, Annotate selected transcript, search and Follow playback remain outside a native Transcript options disclosure. Language, saved reload, save, VTT/SRT import, source path and detailed keyboard/selection instructions move inside it. The default status is now the passage count rather than a multi-line instruction paragraph; empty search-match status is hidden. All previous controls/actions remain available, with the same selection-preserving annotation handler and validation. The native summary has a 44 CSS-pixel minimum height on phones. Single passage/annotation counts use singular wording.

The host regression checks the closed default, primary/advanced control placement, source/help availability, singular counts, and expanded state surviving saved-transcript reload without annotation writes. It fails on the preceding build, which has no disclosure. All 397 tests, release build and original-ID rehearsal artifact generation pass.

Actual Android Obsidian 1.14.4 / emulator-5554 uses the real 572-passage companion. Touch expands and collapses options; saved reload while expanded retains all passages and leaves options open. checkVisibility confirms advanced controls are hidden when closed and primary actions remain rendered. Their nonzero bounding rectangles alone would be insufficient, because Chromium can retain geometry for closed details content. The summary measures 44 pixels high. At the same unscrolled initial state, the first timestamp button moves from y1000.42 to819.65, saving180.76 CSS pixels versus the recorded preceding layout. This improves first-passage placement; it does not claim the complete passage fits above host chrome without scrolling.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-compact-transcript/`: 01-collapsed-controls.json/.png,02-collapsed-visibility.json,03-expanded-visibility.json,05-reloaded-expanded.json/.png,06-collapsed-again.json/.png and audit.json. The final collapsed screenshot was visually inspected. Note/companion bytes stay identical, installed 0.0.128 artifacts match dist, original workspace/community-plugin/native settings are restored exactly and QA files/forwarding removed. No personal vault, physical tablet, caption grammar, annotation format or Bend proof changed. Other themes/viewports, desktop/native keyboard and assistive-technology checks remain open.
