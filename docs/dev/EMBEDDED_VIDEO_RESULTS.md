# Embedded video checkpoint — 0.0.23

Playback now stays inside Obsidian. Annotation cards use **Go to timestamp** for both YouTube and browser video; capture uses **Annotate current time**. There is no external provider annotation action. Unsupported players retain readable/editable notes and an in-app availability message.

169 automated tests pass; release TypeScript check and build pass. On emulator-5554, actual YouTube playback, observed seeks to 12.5 and 39.289661, and fractional capture/save succeeded. The frozen published video parser accepted the saved record, and the previous 443-byte note remained an identical prefix. A local vault MP4 also played and sought successfully. On the final build, seeking to 1.25 and capturing that time into the automatically revealed mobile editor passed; the draft was cancelled. Final YouTube source guards were tested automatically but not repeated live.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-embedded-video/` (raw screenshots, captured Markdown, fixture, audit JSON). No personal vault or physical tablet was used.

YouTube messaging was checked against the official widget implementation at `https://www.youtube.com/s/player/11a45ffb/www-widgetapi.vflset/www-widgetapi.js`, SHA256 `73121a13d3854e9bc77efcb0b507fdc377ade759268cb0248ef7ae3d7805ba66`. This is an implementation dependency, not a documented public protocol guarantee. Remote scripts stay in the cross-origin provider iframe. Seek confirmation requires observed playback time; capture requires a verified finite non-live timeline.

iOS playback, denied/private/live/ad behavior, transcripts, popout/unload corpus and complete published-app parity remain open. This checkpoint does not establish full replacement readiness or a formal runtime playback proof.

## Desktop follow-up

Obsidian 1.14.5 in the isolated desktop test vault ran 0.0.23 successfully: YouTube played inside the source pane, the first card confirmed a seek at 12.50 seconds, and current-time capture opened the sidebar editor with 19.064247. The draft was cancelled and playback paused. Screenshot `12-desktop-embedded-video.png` is in the evidence directory. A command-palette timing error briefly inserted `rget` into the synthetic fixture; it was removed and the restored file SHA256 is recorded below.

Restored desktop video fixture SHA256: `32e3039abba1c8316ab55e5e546450f16321e62d6a95d9832cbdab3330f6222b`.
