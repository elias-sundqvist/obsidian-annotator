# Native PDF page appearance — 0.0.43

PDF and EPUB now share the saved reader appearance preferences. PDF explicit
Light, Dark and Sepia use Obsidian's own renderer background/inversion API;
System leaves native page-color selection in charge. Numeric brightness,
contrast and sepia adjustments apply to page canvas wrappers only while the
actual native page is inverted. They do not filter host chrome, text layers,
links or the plugin's annotation overlays. Neutral numeric adjustments install
no filter class. Source PDF bytes and annotation Markdown are never edited by
this adapter.

The command **Toggle PDF and EPUB dark appearance** switches the shared setting
between Light and Dark. When starting from System, its effective application
theme determines the next setting. Settings labels explicitly name PDF/EPUB;
website appearance remains a separate gate. These are shared reader settings,
not a new per-pane appearance preference.

## Native integration and ownership

Static inspection of installed desktop Obsidian 1.14.5 and Android Obsidian
1.14.4 found the identical native PDF viewer module (SHA-256
`7060308a7ffa11ab3112458ec58f740eb90643849beeaa6d9c9ff4441e9d35af`). Its
`setBackground(background,invert)` updates rendered pages and thumbnails. No
extracted application source is bundled or checked in. The adapter extends the
existing guarded `view.viewer.child.pdfViewer` dependency and waits for its inner
PDF document before applying appearance. This is a private host capability, not
a newly claimed stable public Obsidian API or proof of minimum-host support.

The adapter avoids a second CSS inversion over native inverted ink. Explicit
Light/Sepia turn off the native themed-form class; Dark enables it where that
container exists. Application chrome and other native UI remain governed by
Obsidian. Numeric adjustments are one scoped CSS custom property and class;
existing inline property values/priorities and unrelated classes are retained
on cleanup where still owned.

Each renderer's initial state is held in memory. Native changes observed while
overridden update the restoration baseline. System, renderer replacement and
disposal restore owned state; an externally replaced state is not overwritten.
The current native view's CSS/theme reconciliation runs on release so current
application preferences can win. Missing/throwing/non-confirming methods do not
throw through annotation lifecycle or repeatedly redraw on the existing polling
cycle. Actual capability errors appear alongside annotation location status.
There are no extra polling timers, persisted renderer snapshots or annotation
format fields.

## Automated validation

254 tests and the release build pass. The new appearance tests cover light/dark/
sepia/system transitions, no redundant native calls, existing native inversion,
rendering-engine replacement/readiness, stale baseline prevention, external
changes, filter cleanup, DOM/text selection retention, missing/throwing native
capabilities and non-confirming methods. A plugin-boundary test exercises the
command's system-theme choice and preservation of numeric/opaque preferences.
These are host/adapter regression tests; no Bend source or formal theorem changed.

## Android checkpoint

On emulator-5554 / Obsidian 1.14.4, the existing 14-page TraceMonkey PDF opened in
Light with its existing “Time” highlight. The new command changed the actual
native page canvas to dark paper/light ink with brightness 145%, contrast 85%
and sepia 12% retained in the saved reader settings. The highlight remained at
the same bounds. Tapping it opened its native annotation card, reporting Page 1
without an appearance capability error. A force-stop/cold restart retained dark
pages; the same command restored light pages. Across Light, Dark, cold Dark and
returned Light, the existing highlight retained accessibility bounds
`[414,540][488,580]`. The PDF and annotation Markdown remained byte-identical.

The original test workspace, enabled-plugin list and plugin data were restored
and verified before restarting. Installed main.js, manifest.json and styles.css
matched the release artifacts. Bundle SHA256:
`86cab440bf4ac74cdd5f1fe8f30639795cc3c3c9492dd439bb11facbd5b2ffb4`.

Raw screenshots, accessibility trees, before/after documents, configuration
backups, installed artifact checks and host-module fingerprints are retained at
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-pdf-appearance/`.

## Remaining gates

Actual desktop/pop-out/iOS UI, older/minimum host versions, multiple simultaneous
PDF panes, forced colors/accessibility, interactive forms/popups, thumbnail
adjustment colors and broad image/color corpora are not established here. The
source-inspected native thumbnail update is not an actual thumbnail UI check.
Native shared appearance is not pixel-equivalence to legacy DarkReader or a
complete per-pane theme affordance migration. Web appearance, PDF virtualization
and the remaining native-replacement release gates stay open.

## Pictures on dark pages (2026-11-12)

The app's renderer makes a page dark by recolouring its text and leaving
pictures as they are. Measured on a figure-heavy page: labels inside coloured
boxes keep their contrast (black on pastel, about 11:1), but line art drawn in
black on a clear ground sits at about 1.1:1 against the dark paper and cannot
be seen.

**Darken pictures too** (Page appearance) takes the other road: the renderer
is left on white paper and the page's pixels are turned as a whole
(`invert(0.89) hue-rotate(180deg)`, so white paper lands on the app's dark
surface and colours keep their hue). Every contrast on the page is then what
it was on paper. The cost is that photographs look like negatives, which is
why it is a choice and off by default. Annotation marks, the text layer and
the pictures saved for areas are not turned.
