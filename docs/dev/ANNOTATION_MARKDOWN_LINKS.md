# Native annotation Markdown links — 0.0.117

MarkdownRenderer creates internal-link markup, but custom annotation views must route those links through Obsidian. In actual Android testing, tapping a rendered `[[Referenced#Heading|Open reference]]` link previously navigated the WebView and reloaded the EPUB reader instead of opening the vault note.

A shared component-owned handler now intercepts primary/middle clicks on rendered internal links and calls workspace.openLinkText with the annotation note's source path and Keymap.isModEvent result. Relative paths, headings/block subpaths and host tab/split modifiers are preserved. Already-handled events, external links and right clicks retain their existing behavior. Closing/replacing the Markdown component removes its handlers. Failed opens produce a Notice without changing the comment. The binding is used by ordinary cards/previews and video cards/previews.

## Verification

All 380 tests and release/original-ID rehearsal checks pass. The boundary regression exercises a nested link target, annotation-relative path/subpath, host modifier forwarding, middle-click, untouched external/right clicks, failed-open feedback and cleanup after component unload. These tests use the host stub; actual modifier/popout behavior still needs device checks.

Android Obsidian 1.14.4, emulator-5554, isolated vault: a synthetic annotation in a subfolder successfully renders a relative note-heading embed, a local 240×70 SVG image, MathJax and syntax-highlighted JavaScript through the actual MarkdownRenderer. Mermaid reaches the host's trust guard; trust was not enabled and diagram execution is not claimed. The original link failure was reproduced on 0.0.116. The installed 0.0.117 opens the correct Referenced note with the requested heading highlighted, rather than reloading the reader. All four fixture files remained byte-identical.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-markdown-host/`. `06-render.json`/`06-render.png` show initial renderer output, `08-link-settled.png` the pre-fix reader after the failed link, `14-fixed-render.json`/`14-fixed-render.png` the fixed-build card, `15-fixed-link.json`/`15-fixed-link.png` the correct destination; `audit.json` records file/artifact verification and cleanup.

During navigation setup a stale ribbon-menu tap created a default Untitled.base in the isolated vault. Its exact default contents were archived and it was removed. The four explicit Markdown fixtures were also removed, original workspace/community-plugin/plugin data restored exactly, and temporary forwarding removed. Isolated installed Android is 0.0.117, with all three artifacts hash-verified. No personal vault, physical tablet, storage schema or Bend proof changed.

## Remaining scope

Actual-host video/preview links, modifier tabs/splits/popouts, embed reload/unload behavior after edits, trusted Mermaid rendering, additional custom code blocks and desktop/iOS need verification. This one-card check does not establish full sidebar/Markdown parity or native replacement readiness.

## Actual video card/preview and mobile clearance — 0.0.118

Android Obsidian 1.14.4 on emulator-5554 rendered a synthetic local-video annotation card and its unsaved editor preview with relative note-heading and SVG embeds and MathJax. The saved-card link on 0.0.117 and preview link on 0.0.118 both opened the correct Referenced note/heading. The draft survived navigating away and back, and Cancel removed it; recovery held zero video drafts afterward. No annotation save was performed. The annotation note and both resource files stayed byte-identical. The frozen published video parser agrees with native decoding on every durable field of the resulting unchanged note; this is parser evidence, not a full published-reader UI roundtrip.

The check exposed phone navigation covering the last card's action buttons at maximum scroll. The video view now adds the larger host view-bottom-spacing/safe-area-inset-bottom to its normal 12px bottom padding. In the tested portrait host, action-button bottoms move from CSS y=866.33 to 810.33, above the floating navbar at y=841.05. The actual Edit action and preview were then usable. All 380 tests and release/original-ID rehearsal checks pass.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-video-markdown-host/`. `02-card.json`/`02-card.png`, `03-card-link.json`/`03-card-link.png`, `06-before-inset.json`, `08-after-inset.json`/`08-after-inset.png`, `11-preview-visible.json`/`11-preview-visible.png`, `12-preview-link.json`/`12-preview-link.png`, `15-cancelled.json`/`15-data.json`, `published-check.json`, and `audit.json`. Screenshots were inspected. Original workspace/community-plugin/plugin data were restored exactly; all three fixture files and temporary forwarding were removed. Installed isolated Android is 0.0.118 with artifact hashes verified. No personal vault, physical tablet, schema or Bend proof changed.

This covers one portrait local-video fixture. Playback/seek, new-comment saving, video landscape/full keyboards, actual desktop modifiers/popouts, other platforms and more complex embed lifecycle remain separate gates. The Mac was checked and remains locked; no new desktop evidence was collected.

## Embedded note source contexts — unchanged 0.0.118

Actual Android Obsidian 1.14.4 verifies a video annotation containing an embedded note from a nested folder. Both the collection comment and embedded note contain the identical `./Destination#Heading` link text, with separate same-named destination files. The collection-level link opens `Native Embedded Link QA/Destination.md`; the embedded link opens `Native Embedded Link QA/Nested/Destination.md`. Obsidian's embedded Markdown renderer owns the inner click; the shared annotation handler's defaultPrevented guard preserves that ownership instead of rerouting it using the collection's source path.

Private evidence: `~/Documents/obsidian-annotator-native-test-validation/2026-11-02-embedded-link-context/`. `02-links-visible.json` records identical hrefs in separate source contexts; `03-embedded-destination.json`/`03-embedded-destination.png` record the nested destination breadcrumb; `07-collection-destination.json`/`07-collection-destination.png` record the collection destination and content. `audit.json` includes exact file/artifact checks. All four fixture files stayed byte-identical, test workspace/community-plugin/plugin data were restored exactly, and copied files/directories plus forwarding were removed.

A new boundary regression gives the embedded renderer its own link handler and verifies the parent does not open a second/wrong destination; the unhandled collection link still uses the collection source path. That regression and the existing vault-link routing regression both pass (`/tmp/annotator-embedded-link-tests.log`). Runtime/build/installed version remains 0.0.118; the preceding full suite remains 380 passing tests, with this additional focused regression checked separately. One embed level in one Android video card is covered; deeper embeds, other hosts, modifiers/popouts and edit/reload lifecycle remain open. No personal vault, storage or Bend change.
