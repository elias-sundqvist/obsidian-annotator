# Mobile EPUB viewport allowance — 0.0.113

The phone EPUB reader now adds Obsidian's inherited `--view-bottom-spacing` to its normal eight-pixel bottom padding. The allowance applies to the root phone reader, so the flex reading viewport and its pagination geometry shrink together. It uses the host's current value, clamps negative spacing to zero, and falls back to the host safe-area value when that variable is absent. Desktop and non-phone layouts retain their existing padding.

## Reproduced issue and actual-host evidence

Android Obsidian 1.14.4, emulator-5554, portrait, unmodified IDPF Kusamakura chapter 2: the floating navigation began at CSS y=841.05 but the EPUB viewport ended at y=907.05. Our eight-pixel publication padding displaced the host's normal mobile clearance. Read-only DOM/CSS inspection found `--view-bottom-spacing: calc(24px - 0px + 52px)` on the reader.

With the fix the reader bottom padding is 84px and the viewport ends at y=831.05, ten pixels above navigation. The screenshot shows complete vertical lines above the floating bar. Page-forward still advances; it saves chapter 2, offset 437, and cold reopening preserves that saved position and the unobstructed geometry. These checks use the actual installed plugin and native taps, with read-only WebView inspection. All 377 tests and release/original-ID rehearsal builds pass.

Evidence directory: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-mobile-viewport/`. `before.json`/`before.png`, `after.json`/`after.png`, `next-data.json`/`next.png`, `cold.json`/`cold-data.json`/`cold.png`, and `audit.json` retain measurements, screenshots, position and installed-artifact hashes.

The EPUB hash and annotation-note bytes remained unchanged. Original workspace, community-plugin configuration and plugin data were restored exactly; copied sample files and temporary forwarding were removed. The isolated Android installation is now 0.0.113. No personal vault or physical device was used.

## Remaining checks

This establishes one published vertical chapter on the tested portrait phone host. Landscape, keyboard opening/closing, custom themes, tablets, iOS and minimum-host behavior need checks. Other readers/sidebar layouts are outside this change. It does not establish full CRUD, full published-application interoperability, media overlays or replacement readiness. No storage schema or Bend proof changed.

## Landscape compact keyboard — 0.0.114

Android landscape rendering remained above the floating navigation. Opening reading controls requires scrolling within the bounded toolbar to reach Find. Focusing Find opened the compact Gboard toolbar: Obsidian reported safe-area-inset-bottom 88px, keyboard-height 88px and view-bottom-spacing 52px. Version 0.0.113 therefore left the reading viewport ending at CSS y=352.19, beneath the top of the keyboard-safe region (412.19 − 88 = 324.19).

The padding now uses eight pixels plus the maximum of zero, view-bottom-spacing and safe-area-inset-bottom. Actual 0.0.114 padding is 96px and the viewport ends at y=316.19, above that safe region. A settled screenshot confirms the source lines stop above the compact keyboard. Reading controls remain scrollable in the reduced landscape height. Returning to portrait restores the larger reading surface.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-mobile-orientation/`: `keyboard.json`/`keyboard.png` (before), `114-keyboard.json`/`114-keyboard.png`, `114-keyboard-settled.json`/`114-keyboard-scrolled.png`, `114-portrait-return.json`/`114-portrait.png`, `114-portrait-data.json`, and `audit.json`.

Position retention is not established for this gesture sequence: saved offset started at 200 and ended at 178 after rotation, expanding/scrolling controls, focusing/typing in Find, and returning to portrait. No Find action was submitted. The cause could be an intervening reading gesture or reflow; it needs isolation. The geometry fix does not close that issue. Full keyboard layouts, other IMEs, iOS, tablets and minimum-host coverage remain open.

All 377 tests and release/original-ID rehearsal checks pass. EPUB/note bytes remained unchanged; test workspace/plugin configuration and emulator rotation settings (accelerometer_rotation=1, user_rotation=0) were restored; copied fixtures and forwarding were removed. Isolated installed Android is now 0.0.114. No personal vault, storage schema or Bend proof changed.

## Offset isolation follow-up — unchanged 0.0.114

A fresh actual-Android run separated every action with a read-only DOM snapshot: portrait → landscape → portrait → controls open → landscape with controls → toolbar scroll → Find focus/type `test` → keyboard dismiss → portrait → controls closed. At all seven captured persisted-position checkpoints, chapter 2/offset 200 remained unchanged. Independent DOM text-node probing confirmed the source character at offset 200 (`ど`, ruby reading text) physically intersected the EPUB viewport at every captured geometry checkpoint. Controls were scrolled only after their layout had settled; no Find was submitted.

Evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-offset-isolation/`, numbered DOM geometry and saved-data snapshots, `10-final.png`, and `audit.json`. Book/note bytes and all three installed 0.0.114 artifact hashes were verified. Test workspace/community/plugin configuration and emulator rotation settings were restored, copied files removed, and temporary forwarding removed.

This narrows the earlier drift report: the settled path preserves the requested anchor, but the prior 200→178 observation remains unexplained. It does not prove a gesture caused that result or rule out rapid reflow/input races. No production code, installed version or Bend proof changed. Existing 377-test/release results remain the relevant code checks; they were not rerun for documentation alone.
