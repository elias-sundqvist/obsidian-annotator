# Isolated video host gate

Historical 0.0.20 checkpoint. Production embedded playback/transcripts now exist;
use `VIDEO_PLAYBACK.md`, `VIDEO_TRANSCRIPTS.md` and
`RELEASE_EVIDENCE_MATRIX.md` for current implementation and remaining acceptance.
The old development transport described here is not the production adapter.

That transport (`video-player.ts`, `video-session.ts`, `video-transport.ts`, their
two test files and `npm run video:host`) was removed on 2026-11-13: nothing the
plugin runs used it. It is in the history before that date. What follows is the
record of the checkpoint.

This checkpoint adds concrete guest/controller and transport code, not a passed
playback milestone. `video-player.ts` installs the official YouTube IFrame API in
an unprivileged playback document. `video-transport.ts` binds that document to a
core Web viewer guest by its exact random URL, connection state and navigation
lifecycle. Neither module is imported by the production main module yet. Native
0.0.20 still offers manual timestamp CRUD and external playback only.

## What is implemented and checked

- Playback-only requests carry session/request counters, provider/video identity
  and optional seek seconds. Private note paths and comments are not sent.
- The guest uses public `getVideoUrl`, `getCurrentTime`, `getDuration`,
  `getPlayerState`, `seekTo` and `destroy` methods. Standard provider controls stay
  visible, no autoplay is requested, and observed fractional times stay intact.
- Provider errors and autoplay refusal remain distinct. Unknown or wrong-video
  identity is refused by the existing session validator. A seek acknowledgement
  is not an observed landing.
- Top-level navigation, reload, DOM replacement/disconnection or destruction
  permanently expires the transport. Subframe navigation does not. Cancellation
  rejects pending work and late results cannot become a capture. Disposal removes
  listeners/cancels work and destroys the player only in the original document.
- Duration alone does not classify a timeline as recorded/VOD. This controller
  reports `unknown`, so `VideoSession.capture/seek` deliberately refuse it until
  a supported classification path exists. The guest's direct seek probe exists
  to test the public player API; it does not bypass that session rule or save
  annotations.
- The development-only HTTP host binds **127.0.0.1**, chooses an ephemeral port
  and random path, verifies Host/path/method, serves only the generated document,
  and exposes no filesystem/proxy/write API. It uses an ordinary browser-set
  Referer with `strict-origin-when-cross-origin`; it does not claim another site's
  origin or change browser security. Whether YouTube accepts this host still
  needs a real run. CSP excludes privileged scripts and framing of this document.

Five new tests run the actual generated guest code with a **fake provider API**,
execute transport requests against that code, and start/close a real loopback
server. They cover observations, seek acknowledgements, wrong-video data,
provider errors, page teardown, private-field refusal, cancellation/navigation,
invalid configuration, foreign Host/path/method refusal and HTTP closure.
The full native suite has **158 passing tests**. These are host checks, not new
Bend proofs, actual YouTube playback or Obsidian Web viewer evidence.

## Live procedure when the Mac is available

1. Run `npm run video:host` from this directory. Retain the returned live process
   handle/PID and exact URL. Do not start another host just because observing the
   handle times out. The host prints a new random URL on each run.
2. Through the actual Obsidian UI, open that URL in the core Web viewer. Record
   the host/app version and screenshot. The page clearly says **Isolated playback
   test** and contains no annotation editor. Do not use a normal browser run as
   evidence of the Obsidian host.
3. Use provider controls to play/pause. Click **Read current time** repeatedly and
   record ready/video ID/time/duration/state or the actual provider error. An
   error such as 153 is evidence of a missing host capability, not permission to
   spoof another origin or disable isolation.
4. Probe a timestamp within the returned duration using **Seek**, then separately
   read current time. Record requested/observed times and playback state. Measure
   the actual error with a declared tolerance; do not call the immediate seek
   response proof of exact landing.
5. Complete the trusted core guest attachment and timeline classification before
   connecting automatic capture/seek to the native editor. Then test actual
   native create at observed time, annotation-card seek, target changes,
   close/reload/pop-out and restart. The development UI controls alone cannot
   pass the native annotation-capture gate.
6. Stop the exact host process and verify it has terminated. Keep actual CUA
   screenshots outside the repo alongside source/annotation whole-file hashes.
   No personal vault or OS security setting should be changed for this test.

## Evidence status

The Mac was locked on this checkpoint's actual computer-use attempt. No provider
script was downloaded by the automated tests, no UI screenshot was taken, and no
real player was observed. The default public video ID is the example in the
[official player API guide](https://developers.google.com/youtube/iframe_api_reference),
not a claim about its current availability or live/recorded status.
[Provider identity requirements](https://developers.google.com/youtube/terms/required-minimum-functionality)
remain a real host gate. This work does not close playback, capture, transcripts,
mobile video, original published-app UI or complete native-replacement parity.
