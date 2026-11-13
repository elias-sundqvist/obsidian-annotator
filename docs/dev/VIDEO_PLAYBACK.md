# Video playback session checkpoint

## Current implementation — 0.0.26

The [transcript panel](VIDEO_TRANSCRIPTS.md) adds passage seeking, search, current-passage tracking, opt-in following and text-selection annotation inside Obsidian; real YouTube caption retrieval is now verified in desktop and Android Obsidian, with broader provider/language coverage still open.

`embedded-video.ts` now powers the production experimental view: an isolated YouTube iframe or browser video element for HTTP media and vault files. Every annotation uses **Go to timestamp**; **Annotate current time** opens the shared editor. No external provider annotation action remains. Android playback, observed seeks and fractional capture/save have been exercised on the emulator while the Mac was locked. See [embedded results](EMBEDDED_VIDEO_RESULTS.md). Desktop and remaining video parity gates are still open.

The YouTube messaging protocol is source-inspected implementation behavior, not a documented public protocol contract. Remote player scripts stay inside the cross-origin iframe. The older session/host spikes described below are historical and are not the production embedded adapter.

## Historical checkpoint

The native experiment now has a pure YouTube target resolver and a playback
session controller. The session controller is development-built and tested, but **not connected
to a live player**. The target resolver and Bend timestamp store now feed the
native video collection view; that view explicitly offers manual timestamps
and external playback only. This is a prerequisite implementation,
not evidence of embedded playback/capture/seek or a completed video reader.

`video-provider.ts` recognizes explicit watch/short/embed/shorts/live URL forms,
checks provider host and video ID, preserves the entire original target, and
produces a canonical runtime identity. URL start offsets do not change identity;
conflicting offsets are refused. Playlist/query values remain in the original
note target rather than merging annotation collections. External timestamp links
use whole seconds (rounded down); internal captures and storage retain fractions.
The supported URL forms are tested native behavior, not proof that the historical
external Annotate.tv application accepted every variant.

(The session and transport described in the next two paragraphs were a design
that the plugin never ran; the code was removed on 2026-11-13. The embedded
players in `embedded-video.ts` make their own checks that the source is still
the one opened.)

`video-session.ts` bound captures to a collection note, exact original target,
video ID, random session and navigation generation. Playback advancement does
not invalidate a timestamp already captured. Note retargeting, another session,
observed surface navigation, invalid/stale responses and disposal do. The source
and outgoing protocol requests are copied/frozen. Only bounded playback identity,
request numbers and optional seek seconds are sent to a transport: collection
paths, comments and private annotation JSON are never included.

Each request checks the isolation adapter's trusted `current()` attestation
before and after exchange, then validates/copies the response fields. An echoed
guest URL or nonce alone is not sufficient host attestation. Requests are bounded
by cancellation/timeouts, overlap is refused, and late work cannot update a new
generation. Disposing cancels pending work and disposes the adapter exactly once.
The future adapter must actually cancel/clean up its guest work and listen to
host navigation/destruction; no concrete implementation is claimed here.

Capture and seek require ready, valid VOD timing. Live/unknown timeline capture
is explicitly unsupported; the future provider adapter must establish timeline
semantics rather than invent a VOD classification from a finite duration. Player
errors retain distinct messages for missing/private video, embedding denied,
HTML5 failure and missing client identification. Autoplay refusal remains visible
and does not preclude a valid manually cued timestamp. Seek first checks readiness
and duration, then sends a fractional timestamp command. Its response acknowledges
the command; a later observed position is needed to measure keyframe accuracy.

Nine tests cover URL normalization/refusal, start offsets, no private fields in
requests, capture identity across playback advancement, defensive state copies,
readiness/provider failures, unknown/live timelines, malformed/wrong-video/replayed
responses, overlap, navigation, delayed work, disposal, timeout cancellation and
seek commands, including navigation between validation and capture delivery. They use a transport double, not YouTube or Obsidian runtime.
These host/TypeScript tests add no new Bend guarantee.

## Remaining host gate

With the desktop unlocked, establish whether the core Web viewer can host a
minimal isolated official player controller with legitimate provider identity.
Verify actual playback, current-time capture, seek with declared tolerance,
provider errors, navigation, restart and disposal. Do not load remote player
scripts in Obsidian's privileged document or spoof provider identity. No browser
security/Obsidian isolation settings were changed to make this checkpoint pass.
After this gate, connect the controller and Bend video store to the shared native
sidebar, target routing, draft recovery, block links and awaited vault transactions.
Transcripts and full published-application UI comparison remain separate gates.

## Checked provider documentation (2026-11-01)

- [Official player API](https://developers.google.com/youtube/iframe_api_reference)
  documents ready/state/error events, current time, seek, duration, current video
  URL, and errors including 100/101/150/153. Seek placement can depend on keyframes.
- [Embedded player identity requirements](https://developers.google.com/youtube/terms/required-minimum-functionality)
  describe Referer/client identity requirements and platform-specific WebView
  integration. A local HTML page plus `origin` is not a verified solution for the
  available Obsidian host.
- [Player parameters](https://developers.google.com/youtube/player_parameters)
  document supported embedding parameters. Native URL parsing tests do not prove
  a parameter is honored by a live player.

## Native timestamp workspace — 0.0.20

`video-view.ts` opens video annotation notes in a native FileView. It moves its
cards/editor into the shared native annotation sidebar while keeping the source
pane separate for playback. Existing blocks are inspected without writes; title,
raw timestamp, comment Markdown, search, location ordering, native block links,
create/edit/delete, a deletion confirmation and unfinished-draft recovery are
implemented. Unknown/malformed candidates are visible and block mutation.
`video-store.ts` supplies awaited vault transactions with source/path identity
checks inside the mutation callback and raw-record comparison on edit/delete.
Unrelated concurrent prose survives. An unchanged legacy timestamp spelling is
not converted merely because its comment is edited.

Drafts are scoped to note and exact original target, with session ownership so
two panes cannot overwrite each other's recovery data. One persisted unfinished
session per collection is supported: a second session is refused with a visible
recovery error until the first is saved/cancelled. Invalid older recovery values
are retained separately before replacement. This is local recovery, not a
cross-device merge protocol. Rename/retarget failures retain the original draft;
reassociation/recovery navigation remains a device/lifecycle acceptance gate.

The host tests execute actual projected controls and the compiled Bend store,
compare authored Markdown with the frozen published parser, and cover failed
writes, concurrent prose, stale edits, retargeting, restart recovery, source
routing/default-open recursion and sidebar editor retention. They do not prove
Obsidian runtime behavior or real playback. The 0.0.20 test fixture is synthetic.

The Mac was locked at this checkpoint. No real video UI screenshot, embedded
playback, automatic capture, in-app seek, transcript retrieval or published
external-app UI parity is claimed. The existing session controller still needs
its trusted isolated transport and the real host gate described above. Provider
scripts never load in the privileged source/sidebar DOM. An external timestamp
link rounds down to a whole second; stored fractional seconds stay unchanged.

Verification for this checkpoint: **153 native tests pass**, TypeScript check and
release build pass. No Bend source/law changed; transaction, UI and draft tests
add no new formal claim. Release bundle SHA-256:
`2670d03d0493d374060e117764f2e1fdc83bb777929ce3b6dda7c8aca49dc42c`.
The isolated desktop test vault has this build staged, its previous 0.0.18 plugin
files backed up, and `Native video annotation test.md` prepared using the compiled
codec. Its two timestamps are explicitly synthetic. Activation/reload, live
CRUD, screenshots, Android video and real player checks are still pending.
Staging audit: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-video-workspace/staging-audit.json`.

## Concrete isolated adapter checkpoint

A self-contained public-player guest controller, exact-document core guest
transport and development-only loopback host now exist. The full suite passes
158 tests. [Host code, evidence limits and live procedure](VIDEO_HOST_GATE.md)
separate simulated-provider/real-loopback tests from the pending Obsidian/YouTube
run. The modules are not in the production main dependency graph yet. Timeline
classification remains unknown, so native session capture/seek are not enabled
by a guessed finite-duration rule. No new video screenshot or playback claim.

## Actual Android UI evidence — 0.0.22

With explicit user authorization, direct ADB now controls the isolated emulator
while macOS stays locked. Native video cards/editor, unchanged-save whole-note
identity, cold reopening and shared-sidebar reveal have actual screenshots.
[Locked-Mac Android evidence](LOCKED_ANDROID_RESULTS.md) records 163 passing tests,
a startup-context reconciliation fix, installed build hash and unchanged note
hashes. This closes the previous absence of **all** real video UI screenshots;
it does not establish provider playback, automatic capture/seek or transcripts.

## Native playback controls — 0.0.27

The source toolbar now provides the same Play and Pause actions for browser video and embedded YouTube. Success waits for an observed playback state; buffering alone does not confirm playback. Requests are bounded, replaced by newer requests, and cancelled on player closure, reload, errors or source changes. Browser play is invoked during the button gesture. YouTube remains isolated in its sandboxed iframe.

Validation: 185 automated tests passed, including pending controls, replacement, autoplay blocking, source changes and disposal. Android emulator-5554 running Obsidian 1.14.4 exercised the toolbar on the local five-second flower video: Play advanced to a decoded frame and Pause returned `Playback paused.` with the player paused. Screenshot: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-playback-controls/01-android-local-paused.png`. This does not yet establish a frozen timestamp across separated captures; live YouTube and desktop toolbar checks remain pending. Existing caption validation is documented separately in VIDEO_TRANSCRIPTS.md.

## Android embedded-provider controls — 0.0.28

On emulator-5554 with Obsidian 1.14.4, the installed release's native Play toolbar action started the real `M7lc1UVf-VE` embedded video and reported `Playback started.`. Native Pause reported `Playback paused.`. Two separate Annotate current time actions, with cancellation and return to the player between them, captured exactly **15.153862 seconds** both times, establishing that Pause froze the recorded timeline. Both test drafts were cancelled; no recovery drafts remained and annotation Markdown was unchanged between captures/cancellation. Playback was left paused. No physical device or personal vault was used.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-android-provider-controls/` contains both timestamp screenshots, the final paused player, note copies, installed artifacts and `audit.json`. Installed bundle SHA256 `0809bbd2c4286904e4d73361f21d594a3d6430c9769a467db2454480c85f19c4` matches the release build. This closes the Android real-provider native Play/Pause check left open in the 0.0.27 entry; desktop toolbar, rapid alternating live controls, other providers and broader device coverage remain separate gates.

## Pending opposite controls — 0.0.29

A cached paused state could previously acknowledge Pause immediately after a pending Play was replaced, even though that Play command had already been sent to the frame. Commands now invalidate cached playback state and replacements require a fresh state observation. Already-satisfied requests with no pending control return as true no-ops without sending another command. The regression test delays the earlier state transition and verifies the replacement stays pending until its requested state is observed.

This closes that cached-state race; the provider transport still supplies no per-command acknowledgement identifier, so observations are not formal proof of which command caused a transition. Live rapid multi-command sequences and desktop playback control coverage remain required. The earlier Android frozen-timestamp evidence applies to the tested 0.0.28 artifact.
