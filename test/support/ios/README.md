# iOS WebKit harness (not Obsidian)

Runs the plugin's real `dist/main.js` and `styles.css` inside iOS WebKit in the Simulator, the engine
Obsidian for iOS runs on. Obsidian for iOS itself is App Store only and cannot be installed in the
Simulator, so this is **the reader in iOS WebKit, not the reader in Obsidian for iOS**. Results are in
[docs/dev/IOS_SIMULATOR_RESULTS.md](../../../docs/dev/IOS_SIMULATOR_RESULTS.md).

## What it is

- `host/AnnotatorHost.swift`: a tiny UIKit app with one full-screen `WKWebView`, the page served from a
  custom scheme at `capacitor://localhost` (as Capacitor serves Obsidian), `viewport-fit=cover` with no
  automatic insets, the keyboard height handed to the page as `--keyboard-height`. It runs scripts the Mac
  drops into its `Documents/commands/` and writes the page's vault changes to `Documents/vault/`.
- `web/`: a stand-in for the `obsidian` module (`base.js`, `app.js`): vault, metadata cache (simple YAML),
  workspace with Obsidian 1.15's mobile DOM shape (leaves in the root split, right drawer
  `.workspace-drawer.mod-secondary` that pins beside the root on iPad, floating `.mobile-navbar` on phones),
  a PDF view on **Obsidian desktop's own pdf.js** (`lib/pdfjs`, read from the installed app), a Markdown
  reading view with a small renderer, menus as bottom sheets, modals, notices. `harness.js` loads the plugin
  as Obsidian does (CommonJS, `require('obsidian')`) and exposes `window.harness` for checks.
- `make-fixtures.mjs`: the starting vault (synthetic, "Robin Reader"): a 60-page PDF named with spaces and
  its note with two highlights written as a desktop install would, a note linking to them, a 16-chapter
  EPUB, a saved web page, a YouTube video note.
- `build.mjs` assembles `AnnotatorHost.app` outside the repository; `ios-run.mjs` installs, launches,
  evaluates scripts in the page, screenshots and pulls the vault; `serve.mjs` serves the same page over
  `http://localhost` for Mobile Safari in the Simulator (the second vehicle) or a desktop browser.

What it is not: Obsidian's app shell (its drawers, ribbon, toolbar above the keyboard, command palette,
plugin loading and settings), Obsidian's Markdown editor and renderer, Obsidian's PDF viewer wrapper
(its toolbar, pinch zoom and find bar are imitated or absent; pdf.js itself is Obsidian's), sync.

## Rerun

Needs Xcode with an iOS Simulator runtime for current devices (`xcodebuild -downloadPlatform iOS`; on Xcode 27.1
that installs iOS 27.1, which only runs "iPhone Duo", and then iOS 27.0 (24A434), which runs iPhones and iPads),
`node_modules`, and Obsidian desktop installed (for its `app.css` and pdf.js; nothing is downloaded).

```bash
npm run build
```

```bash
node test/support/ios/build.mjs --out "$TMPDIR/annotator-ios-harness"
```

```bash
xcrun simctl create "Annotator iPhone" "iPhone 17 Pro" com.apple.CoreSimulator.SimRuntime.iOS-27-0 && xcrun simctl boot "Annotator iPhone"
```

```bash
node test/support/ios/ios-run.mjs install "Annotator iPhone" "$TMPDIR/annotator-ios-harness/AnnotatorHost.app"
```

```bash
node test/support/ios/ios-run.mjs checks "Annotator iPhone" "$TMPDIR/annotator-ios-checks/iphone"
```

Use an iPad the same way (`xcrun simctl create "Annotator iPad" com.apple.CoreSimulator.SimDeviceType.iPad-Pro-13-inch-M5-12GB com.apple.CoreSimulator.SimRuntime.iOS-27-0`). Touch
selection, the composer with the keyboard, drawing and rotation are done by hand in the Simulator (or the
Simulator tool's tap/drag/`touch_path`), with `ios-run.mjs eval <device> 'return harness.summary()'`
to read the state. `ios-run.mjs pull <device> <dir>` copies the vault out to inspect the note text.
`ios-run.mjs launch <device> --reset` starts again from the seed vault.

Mobile Safari instead of the app: `node test/support/ios/serve.mjs --app "$TMPDIR/annotator-ios-harness/AnnotatorHost.app"`,
then open `http://localhost:8137/index.html?device=phone` in Safari in the Simulator (add `&probe=1` to have the page run the engine checks and open the PDF, reported to `safari-log.jsonl`). Differences from the
app: the page is an `http:` origin rather than `capacitor://`, Safari's own toolbars take space, there is
no `--keyboard-height` from the host, and results come back through `serve.mjs` (`safari-vault/`,
`safari-log.jsonl`).

`checks` writes `checks.json` (engine probes, PDF/EPUB open, sidebar, and every tappable element under a safe-area
inset) and screenshots to the folder given. Bring the app to the front first; `eval` times out when Safari is in front.
