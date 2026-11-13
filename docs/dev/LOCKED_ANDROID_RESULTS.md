# Android UI testing while the Mac is locked — 2026-11-01

The user explicitly authorized direct ADB screenshots/taps/scrolling/typing on
**emulator-5554**. That route works independently of the locked macOS UI. The
native computer-use tool was rechecked after the Android run and still reported
the Mac locked. No Mac security policy was changed and the physical tablet was
not targeted.

## Live checks

- Captured the actual Obsidian screen through `adb exec-out screencap -p` and
  turned the native EPUB reader from chapter 1 to chapter 2 through `input tap`.
- Backed up the emulator test plugin, installed native 0.0.21, then 0.0.22, and
  cold-launched Obsidian. Existing EPUB highlights initially remained intact.
- Copied the already-prepared synthetic video note into the isolated Android
  vault. Opened it through the real quick switcher, then the native target command.
- Observed both video annotation cards, `12.5` and `45.25` timestamps, rendered
  Markdown comments, Edit/Copy link/Delete and New annotation controls.
- Opened the first annotation editor: title, fractional timestamp and original
  Markdown comment all populated correctly. Saved without changing any field;
  the app reported success and the **whole note stayed byte-identical**.
- Force-stopped/cold-opened again. The video view restored. On mobile the panel
  can remain in the source fallback until the deferred sidebar is revealed;
  **Open native annotations** moved it into the shared sidebar correctly.
- Startup reconciliation now discovers a restored video leaf even if no later
  active-leaf-change event arrives, keeping sidebar/command context tied to video.
  A new compiled-plugin test checks this without emitting that event.

Screenshots (unmodified full emulator frames) and the audit are outside Git:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-locked-android/`.
01 shows native video cards; 02 the editor; 03 unchanged save; 04–05 the initial
cold restore/loading and source fallback; 06 the shared sidebar after cold reopen
on corrected 0.0.22. Editor screenshot 02 is from 0.0.21, whose editor component
is unchanged in 0.0.22. None is a mockup or a desktop screenshot.

## Integrity and verification

163 native tests and release build pass. Installed Android 0.0.22 bundle SHA-256:
`bb294fed33ae8e5d84b9ea339140d8221c8b631fb814b7349be39336fb184ad8`.
Actual Android bundle bytes match the release build. The video note before open,
after unchanged save and after restart matches its prepared baseline:
`604f0cd3d2fca2e4eb337b614c508b160c9850442af43e8a510333c9bcc62020`.
Existing EPUB annotation note still matches its earlier checkpoint:
`4333b17f23193ce928c7e7a2fdab33727a7ceabc1b77c6179473cb7d100b1e07`.
No unfinished video draft remains. No Bend law/source changed.

One misplaced palette tap ran the test EPUB's export command while a keyboard
help bubble disappeared. The generated JSON was copied to evidence and moved to
the test vault's `.trash`; original annotation notes were unchanged. This was an
automation interaction error, not an annotation write or a claimed export test.

## Repeatable control route

Use `~/Library/Android/sdk/platform-tools/adb` with **`-s emulator-5554`
on every invocation**. Do not use a bare/default target: a physical device also
exists. ADB input is authorized for this test emulator, not that device or the
Mac desktop.

`uiautomator dump` exposes the Android WebView container rather than Obsidian's
full inner controls. Base taps on fresh screenshots. Dumping before a screenshot
also waits for Android UI idle; an immediate capture can precede the next frame.
`input keycombination 113 44` opens the command palette (Ctrl+P).
`input text Open%snative%sannotations` types the verified sidebar command query.
Inspect the result before Enter. The bottom magnifier opens the quick switcher.
Do not swipe from the extreme right edge to open Obsidian's sidebar: that triggers
Android's system Back gesture. Use the observed command/UI instead.

## Scope still open

This establishes real locked-Mac Android UI control, video inspection/editor and
unchanged-save/cold-reopen evidence. It is not full Android video CRUD, IME,
accessibility, embedded playback, automatic capture, in-app seek or transcripts.
Desktop native UI remains blocked by the lock; the in-app browser separately
worked while locked. Personal vault and physical tablet were untouched. Desktop
plugin files remain staged at 0.0.21; desktop last live-verified version is 0.0.18.
The overall native-only replacement goal remains incomplete.
