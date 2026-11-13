# Native-only parity work and Android validation

Experimental branch: `experiment/obsidian-native-pdf`; native plugin 0.0.9.
This is an incremental development checkpoint, **not full feature parity**.
The remaining release gates are tracked in [PARITY.md](PARITY.md).

## Implemented

- Native release builds no longer import code from the Hypothesis client
  submodule. HTML selector generation/resolution is standalone and differential
  tests compare it with the pinned reference client. A local, attributed EPUB
  identity compatibility module preserves old wire conventions.
- `npm run build:release` builds the native artifact without building the legacy
  compatibility-test bundles. A bundle-input guard rejects client-submodule,
  offline-iframe and test-support inputs in the shipped main bundle.
- EPUB scrolling/pagination, font size, system/light/dark/sepia appearance, and
  persisted chapter/UTF-16 text position. Position recovery handles a paragraph
  spanning pages and a workspace layout older than the persisted position.
- Mobile selection handles are observed after selection changes. Annotate and
  Highlight actions sit above the mobile navigation bar, away from Android's
  system text-selection toolbar. The annotation drawer expands explicitly.
- Touch-click fallback and keyboard activation for saved highlight marks.
- Copy/drag annotation block links and routing through Obsidian's link API;
  unrelated links, destinations and later plugin wrappers are preserved.
- Legacy target shapes (including arrays and Dataview links), custom base path,
  file-menu action, opt-in automatic reader opening and Markdown/reader toggle.
- Legacy EPUB/target-path/Markdown preferences can be copied into native settings
  without rewriting the original settings file. Serialized preference writes
  preserve unknown settings and associations.
- Remote PDF/EPUB targets download to a local source cache without changing the
  annotation note. URLs, aliases and associations survive cache-file renames.
  Downloads reject HTTP failures, non-document payloads and excessive size;
  cache refresh still needs a separate explicit workflow.
- Offline website reading copies can use the existing website annotation note
  instead of creating an incompatible annotation collection. On mobile, opening
  a website annotation note chooses its unique existing reading copy.

## Actual Android evidence

Used only emulator `emulator-5554`, AVD `ThinQ`, Android 16/API 36, and the official
Obsidian 1.14.4 APK linked by https://obsidian.md/download. The connected physical
Samsung tablet was not modified. Created an app-private disposable vault called
`Annotator Native Test`; no global Android file permission was needed.

Observed in Obsidian through the emulator UI:

1. Native EPUB opened and restored its pre-existing highlight.
2. Long-press selection displayed Android's own text controls plus the separate
   native Annotate/Highlight actions.
3. Highlight saved immediately to Markdown, then its comment was edited and saved.
4. Pagination mode rendered the book and Next page advanced into chapter two.
5. Built-in PDF reader opened the 14-page test paper; long-press selection and
   Highlight saved a PDF annotation with its page and document selectors.

Pulled the resulting Markdown notes and audited them with the compiled codec:
original EPUB record unchanged, one new EPUB annotation with the exact saved
comment, and one highlight-only PDF record on page 1. The personal vault was not
modified. Private screenshots and storage audit are at:
`~/Documents/obsidian-annotator-native-test-validation/2026-10-31-android`.

The Mac locked before final desktop/Android UI checks of the later changes.
Those changes have automated checks, not a claim of live verification. Native
mobile enablement remains experimental; Android evidence does not establish iOS
support or cover every device.

## Compatibility finding

The pinned Hypothesis PDF implementation explicitly rejects selections spanning
PDF pages. Its anchor routine also does not restore the complete newly emitted
cross-page quote. Native cross-page **creation remains refused**, preserving the
cross-compatibility requirement. The new document resolver can split imported
cross-page passages for native painting without rewriting them. Tests retain the
negative reference-client case rather than pretending it succeeds.

## Automated validation

65 tests cover the native codec, selector/reader interoperation, lifecycle and
host boundaries. Added boundary checks exercise preference import/persistence,
remote target caching/rename, offline copy association and link routing. These
host tests use a minimal Obsidian stub; they complement the actual Android UI
checks rather than replacing them. Bend sources/laws were unchanged in this work.

## Follow-up after unlocking the Mac

The native-only desktop test vault now has the legacy plugin disabled. Its old
rendered-link handlers conflicted with native navigation when both were active;
rerendering the test note after disabling it removed that conflict.

Verified in actual UI:

- The remote Mozilla test PDF downloaded and opened in Obsidian's built-in PDF
  reader. A file audit confirmed the annotation note stayed byte-for-byte intact
  and the cached source remained associated with it.
- Copy annotation link produced the expected block reference. Following that
  reference from a normal note's Reading view opened the native EPUB passage.
- The EPUB restored chapter two after a desktop app reload without saving the
  workspace. Android restored chapter two and pagination after plugin reload.
- Android saved-highlight taps exposed a touch-specific activation issue. Added
  explicit tap handling that ignores scrolling swipes, cancellation and long
  presses, and suppresses duplicate compatibility clicks. A restored PDF
  highlight then opened its saved card by touch in the actual Android UI.
- Android's Copy annotation link action succeeded and its system clipboard
  preview displayed the annotation block reference.

The expanded automated suite passes all 66 tests. Touch gesture tests include
swipes/cancellation and duplicate-click suppression; those are host-boundary
checks, not claims of exhaustive physical-device testing. Follow-up screenshots
and a remote-source storage audit are private artifacts under
`~/Documents/obsidian-annotator-native-test-validation/2026-10-31-parity-followup`.

## Version 0.0.10: overlapping annotations

Added one shared native chooser for overlapping painted ranges in PDF, EPUB and
Markdown reading copies, and for public range hits reported by live websites.
Tap/click hit testing offers all intersecting annotation IDs; a keyboard-activated
mark continues to open its individually focused annotation. Choice labels remain
in the host; website scripts never receive private comments. The chooser traps
focus, supports arrows/Tab/Escape, deduplicates multi-page IDs, and cleans up on
source disposal/navigation.

Live EPUB validation used two annotations on the same passage in the isolated
vault: the chooser displayed both comments, and selecting the second highlighted
the correct second sidebar card. Cancelling a subsequently opened editor left the
records unchanged. Screenshots `06-overlap-chooser.png` and
`07-overlap-second-selected.png` are in the follow-up evidence directory above.
PDF/snapshot adapters share the tested chooser; their overlap behavior has not
been separately exercised live in this pass. Website isolation and in-page
navigation regression checks are automated. All 68 native tests pass.

## Version 0.0.13: MathML/SVG and Android cold reopen

The synthetic fidelity book generator is in `test-support/fidelity-fixture.mjs`.
Desktop Obsidian 1.14.5 rendered its quadratic formula, inline gradient/label and
packaged SVG asset. Native UI highlights on `Vector` and `−b` were saved, anchored
through the frozen published HTML engine, and restored after a desktop app reload.
Android Obsidian 1.14.4 rendered these same records. Touching the equation selected
the correct card. Saving comment `Verified` and tag `android`, terminating the
Android process and relaunching restored the book, both highlights and edited
card. This is a real process restart, not just plugin toggling. The before/after
note audit verifies only the intended visible comment/tag bytes changed, the
other record remained identical, and cold reopening introduced no changes.
The original EPUB bytes and desktop note also remained unchanged by reopening.

Private screenshots 01–07 and storage audits are under
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-fidelity`.
The automated suite passes 84 tests. Its additional cases cover namespace-aware
rendering, original-selector round trips, removal of active/external constructs,
local SVG references, sanitized standalone assets, extensionless manifest SVGs,
and asynchronous resource completion. No Bend specification/proof was changed.
These checks do not establish arbitrary book fidelity, full mobile CRUD, or full
published-application UI compatibility; those release gates remain open.

Emulator interaction note: long multiword `typeText` and Mac clipboard bridging
produced incomplete/stale input in the Android floating IME. Those drafts were
cancelled without saving; verified short text/tag input was then saved and audited.
This limits automation evidence for long mobile text entry; it has not been
classified as an app bug without reproducing it through ordinary on-screen input.

## Version 0.0.14: continuous EPUB scrolling

Desktop and Android now render adjacent linear chapters in one scroll flow. Live
validation in the synthetic fidelity book used scrolling, rather than Next
chapter, to cross the boundary. The chapter chooser/status followed the first
visible chapter. Desktop creation from chapter two while chapter one was still
visible produced a `?loc=next.xhtml` record that anchored through the frozen
published HTML engine. Desktop reload restored chapter two and its highlight.
Android switched from pagination into Scroll, crossed the boundary, and restored
Scroll/chapter two after an actual process stop and relaunch. Existing Android
annotation bytes, including the prior `Verified`/`android` edit, remained identical.
The EPUB archive was unchanged. Private evidence and artifact/storage audits are
in `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-continuous`.

All 90 automated tests pass. New geometry tests are simulated host-boundary
checks, not browser layout evidence: they verify prepend/eviction compensation,
concurrent user scroll, original chapter selectors, selection retention without
holes, explicit non-spine navigation and cancellation of delayed loads. Live
screenshots validate the actual two-chapter flow; a large-book/device/orientation
corpus and performance budgets remain required.

## Online QA network readiness — 2026-11-02

A radio-enabled emulator can still have no default network: Wi-Fi was enabled but disconnected and the video iframe loaded chrome-error://chromewebdata with ERR_INTERNET_DISCONNECTED. The caption companion remained readable. Check the explicit emulator serial's Wi-Fi status, scan results and active default network before classifying an online player failure as a reader defect. In this instance the observed AndroidWifi open scan result was connected with:

```sh
~/Library/Android/sdk/platform-tools/adb -s emulator-5554 shell cmd wifi connect-network AndroidWifi open
~/Library/Android/sdk/platform-tools/adb -s emulator-5554 shell cmd wifi status
```

The second status observation confirmed COMPLETED, IPv4 and VALIDATED/INTERNET, with default network101. Do not assume this SSID/security type on other devices or connect a physical tablet. The emulator's repaired connection is intentionally retained. The following actual embedded-player/ASR timestamp and touch-annotation check passes; VIDEO_TRANSCRIPTS.md records exact evidence and scope. No plugin runtime change.
