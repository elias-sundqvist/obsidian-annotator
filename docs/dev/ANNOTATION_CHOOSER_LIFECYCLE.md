# Overlapping-annotation chooser lifecycle

## Retired controls and PDF ownership — 0.0.125

The shared chooser used by native highlights now retires a dialog exactly once. Detached choice buttons cannot invoke their old annotation callback, and a detached Cancel button cannot restore old focus over a newer dialog. A second activation after a successful choice is ignored. The regression fails against 0.0.124 by opening old-one after its dialog was replaced.

The chooser returns an idempotent dismissal handle. Native PDF retains its own handle and expires its dialog when annotation records change, the renderer generation changes, or its adapter is disposed. Disposing that PDF does not dismiss another pane's subsequently opened dialog. Detached PDF marks cannot reopen a choice; selection also rechecks renderer generation before opening an annotation. Other adapters still need a complete ownership audit; this is not a universal multiple-pane lifecycle guarantee.

All 392 tests, release build and original-ID rehearsal artifact generation pass. The PDF host regression verifies record-change and renderer-replacement dismissal, inert old choices/marks, and disposal preserving a different chooser. Existing overlap hit-testing and touch/keyboard regressions still pass.

A fresh headless Chromium 151.0.7922.34 fixture uses the production chooser and CSS with synthetic choices. Replacing a dialog, then invoking retained old choice/Cancel controls leaves the current dialog and Current inner focus intact. A real pointer click opens new1 once; invoking the detached chosen button again has no effect. Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-choice-lifecycle/`, replacement.png and audit.json. This is real browser DOM/focus evidence, not a new Obsidian UI, PDF geometry, Android or assistive-technology check.

No vault, installed device artifact, stored annotation format or Bend proof changed. Installed isolated Android remains 0.0.124. Broader mobile PDF CRUD, overlap geometry/groups, pop-outs, source-adapter ownership and accessibility gates remain open.

## Scoped saved-content and live-web ownership — 0.0.126

RangePainter, shared by EPUB and saved website reading surfaces, now retains its own dismissal handle. Repaint/disposal retires only that painter's picker; detached old marks cannot recreate it. Choice callbacks require the current paint generation, connected root and an extant range ID. A failing regression on the preceding build left a picker active after repaint; it now verifies invalidation, inert retired controls and disposal preserving a different pane's dialog.

LiveWebHost now retains its own handle instead of globally dismissing another reader's picker on navigation/disposal. Record replacement and observed guest revision changes retire its choices. Before opening even a single selected annotation, the host requests fresh status and requires unchanged navigation, rows, revision and source URL. A changed page cannot open a stale choice in the interval before the normal poll. The polling/choice path is split into readable methods without shipping the Hypothesis application.

The live regression uses the actual guest agent in a separate test DOM: record replacement expires a picker; mutating the selected paragraph before choosing prevents opening; navigation/disposal preserve a different picker. It waits for the real guest paint frame before clicking. The existing overlap/privacy check now awaits the additional status round trip and still proves private labels are not sent into the guest. All 394 tests, release build and original-ID rehearsal artifact generation pass.

This is automated host/guest and synthetic geometry evidence, not new installed Obsidian, Android, pop-out or assistive-technology validation. Installed isolated Android remains 0.0.124. No vault, stored-format or Bend change. Source-adapter lifetime coverage is stronger, but arbitrary multiple-pane races and platform UI gates remain open.
