# Native editor keymap routing — 0.0.58

Actual Android Obsidian 1.14.4 rejected Ctrl+Enter in the annotation textarea even
with a 200-ms ADB key chord. A temporary probe in the isolated emulator build
observed key=Enter, ctrlKey=true, isComposing=false and defaultPrevented=true at
window capture; it never reached document bubble. The installed app's keymap
runs at window capture, so a textarea onkeydown handler could not override the
host binding. The probe was removed before the final release build and commit.

AnnotationView and VideoView now use Obsidian's public View.scope/Scope API for
owned editor Enter/Escape commands. Ctrl/Meta+Enter saves; Escape cancels. The
handlers gate on the live owned input/textarea and edit/draft state. Composition,
keyCode 229 and busy state suppress annotation actions. Other focused elements
fall through to host bindings. Native comment and tags fields share the handler.
The native sidebar delegates to the video editor when hosting that panel, while
the video view also owns a scope for its direct editor. DOM handlers remain a
fallback through the same command guards. These are public host APIs; no private
keymap patch, global shortcut override or shipped keyboard logging is added.

284 tests and release build pass. Capture-phase regressions simulate a host that
prevents target delivery and verify single saves, Ctrl/Meta, tags, cancellation,
IME suppression, busy/focus boundaries and a video panel moved into a sidebar.
They do not substitute for real host/device checks.

The exact 0.0.58 artifact in Android Obsidian used the same held Ctrl+Enter chord
that failed on 0.0.57; it saved `Scoped shortcut validation` and closed the editor.
The whole saved note matched the intended codec update, retaining its one record,
ID, selectors and document metadata. A subsequent edited draft cancelled through
Escape: annotation bytes stayed unchanged and recovery contained zero drafts.
PDF bytes unchanged. Original note/workspace/plugin data/enabled plugins restored
and verified. The probe file was removed from the test vault and the final
source/bundle contain no instrumentation. Installed artifacts matched dist.
Main SHA256: `2b7ffc09e8d3c1e11dcbbc45eea9504dc710bc89f42e423c32399e0c4c116a7e`.

Screenshots/XML, key-event probe, before/save/cancel notes, restoration backups,
artifact copies and storage audit:
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-editor-shortcuts/`.

Actual video/shared-panel, EPUB/web, Mac Meta-key, mobile IME and assistive-
technology workflows still need device evidence. This closes the reproduced
Android PDF shortcut failure, not complete keyboard/platform parity.

## Additional actual EPUB host check — 2026-11-02

Android Obsidian 1.14.4 / emulator-5554, exact native 0.0.60: after creating an
EPUB selection draft and rotating twice with a typed comment, held Ctrl+Enter
saved exactly one annotation and closed the editor. No recovery draft remained.
The actual saved record passed frozen published parsing/anchoring and cold
reopening. See EPUB_FIXED_LAYOUT.md and the private 2026-11-02-spread-selection
evidence. This extends the actual PDF scope check to EPUB; video, desktop Meta,
IME and other keyboard/a11y gates remain separate.

## Selection and overlap controls — 0.0.98

Native selection actions and the isolated website guest's matching A/H shortcuts
now ignore `isComposing` and legacy keyCode 229 events. Previously, a composing
H/A could emit a Highlight/Annotate action while the toolbar was visible; an IME
Escape could also dismiss it. Suppressed events retain the selection/menu and do
not consume the event or emit an annotation intent. Ordinary A/H remains active.

The overlap chooser now ignores composition, Ctrl/Meta/Alt navigation and shifted
keys other than Shift+Tab. Plain arrows/Tab still traverse choices; Shift+Tab
reverses traversal and ordinary Escape dismisses/restores focus. This avoids
consuming IME or host-modified shortcuts in the modal's capture listener.

The native selection and overlap regressions failed against the previous built
implementation, then passed after the guards. A separate website guest regression
checks no intent or selection loss during composition and an ordinary action
afterward. All 360 tests pass, including TypeScript/build; release/original-ID
rehearsal packaging and diff checks pass. These are browser-event host tests,
not actual soft-IME, macOS Meta-key or assistive-technology validation. No vault,
installed artifact or Bend theorem changed in this code/build checkpoint.

## Editable website/native contexts — 0.0.99

Selection controls now resolve the actual HTML editing context rather than
matching only `[contenteditable=true]`. Empty/true/plaintext-only values and
inherited editing are recognized case-insensitively; invalid values inherit,
and an explicit false value stops inheritance so read-only islands remain
annotatable. Form inputs, textareas and selects own their keystrokes. Document
designMode is recognized where no explicit editing value overrides it.

The native selection toolbar does not appear for selections in editable text,
and its shortcuts leave editing targets alone. The isolated website helper does
the same and avoids opening saved highlights from clicks in an editor. Capturing
while a form control owns focus, or while an editor owns a collapsed selection,
clears the prior cached quote instead of returning stale source text. A fresh
selection inside an explicit read-only island remains capturable even when its
parent editor retains focus. Editable text remains in the source index: stored
public selectors and offsets are not rewritten by this interaction policy.

The native helper and a local copy inside the serialized guest intentionally have
matching semantics; the guest cannot import host functions. Both new regressions
failed against the previous built code. Coverage includes empty and plaintext-only
editors, uppercase/inherited/invalid values, read-only islands, stale capture when
an input gains focus and document designMode. All 362 tests pass, including
TypeScript/build; release/original-ID rehearsal packaging and diff checks pass.
No vault, installed artifact or Bend theorem changed in this checkpoint. This is
host/DOM evidence, not an actual website-editor, closed shadow DOM, IME-device or
assistive-technology validation; those release gates remain open.

## Explicit website actions across editor focus — 0.0.100

A real headless Chromium check found a focus edge that the 0.0.99 DOM tests did
not cover. Selecting an explicit read-only island inside an editor shows the
expected toolbar. Clicking Highlight clears the browser selection while its
parent editor retains focus. The host's ordinary follow-up capture then correctly
refused an editor-owned collapsed selection, but also lost that explicit action's
quote. Ordinary manual capture and a pending toolbar action need separate paths.

The guest now retains the public quote/selectors chosen for the latest action.
The host requests that action's exact safe-integer version through `capture-intent`;
a missing/mismatched version yields no selection. Manual `capture` retains its
editing-focus/stale-cache refusal. The retained selection must still match the
current source URL/revision and pass the existing bounded public-selector checks.
A source edit after the action rejects it. Host intent version tracking prevents
repeated polls from processing the same action twice. No comments, tags, vault
paths or privileged APIs enter the website guest.

The new LiveWebHost regression checks editor focus after the toolbar action,
correct Highlight delivery, explicit versioned capture, ordinary capture refusal,
duplicate-poll suppression and rejection after a source edit. All 363 tests pass,
including TypeScript/build. Release/original-ID rehearsal packaging and diff checks
pass. No Bend codec/proof or annotation format changed.

`test-support/browser-editing-check.mjs` serves an isolated local fixture and
launches a fresh headless Chromium; it never attaches to Obsidian or a user browser.
Actual mouse double-clicks/toolbar clicks and typed keys verify empty,
plaintext-only and inherited/invalid editable contexts, input-owned stale capture,
and the read-only action across real editor focus. It requires the compiled guest
from `npm run build` and an optional externally supplied Playwright module:

```sh
ANNOTATOR_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node test-support/browser-editing-check.mjs /absolute/private/evidence-directory
```

Chromium 151.0.7922.34 passes the final run. Browser observations and screenshots,
including the pre-fix missing quote, are under
`~/Documents/obsidian-annotator-native-test-validation/2026-11-02-browser-editing`.
The fixture's source module loads normally through a local HTTP server; no user
page or app was modified. The server and temporary browser close after the run.
The Mac was locked, so this remains isolated-browser plus simulated-host evidence,
not actual desktop Obsidian webview, minimum-version, soft-IME or closed-shadow
validation. No vault or installed artifact changed during this checkpoint.
