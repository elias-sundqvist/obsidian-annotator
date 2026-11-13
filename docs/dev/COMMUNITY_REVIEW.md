# What the community wrote about Annotator, November 2021 to November 2026

Read on 2026-11-13, for the 0.3.0 release. This is a reading of public posts on
the Obsidian forum and the Obsidian community Discord, set against what
Annotator 0.3 does according to [README.md](../../README.md), the 0.3.0
section of [CHANGELOG.md](../../CHANGELOG.md) and
[ISSUE_PLAN.md](ISSUE_PLAN.md). Nothing was posted, replied to, reacted to or
sent anywhere while doing it.

Line references such as "README L30" point at the files as released in tag
`0.3.0`. The README has had small additions since (Windows paths, *Search all
annotations…*, Canvas), and those are referred to by section.

Part 6 is a second pass, made the same day. It looks only at discussions
active since May 2026, to find where a post or a reply about 0.3 is worth
making now.

## 1. Coverage

### Forum (forum.obsidian.md)

- **How:** the forum's public search API, every query limited to
  `after:2021-10-01`. Twenty-five keyword queries (`annotator`,
  `"obsidian annotator"`, `obsidian-annotator`, `annotation-target`,
  `annotator plugin epub`, `annotator plugin pdf`, `hypothes.is annotator`,
  `hypothesis annotator`, `annotator epub`, `annotator plugin`, and
  `annotator` with mobile, android, ipad, ios, highlights, not working,
  video, web page, zotero, pdf++, alternative, dark mode, sync, plus
  `annotate pdf plugin` and the author's name), then `annotator` again in
  eight date slices so no slice reached the page limit. Results were merged
  by topic id. Requests were paced at about one a second; topic downloads
  ran at about eight a minute.
- **Candidates:** 889 topics. The forum's search treats "annotator",
  "annotate" and "annotation" as one word, so most candidates were about
  annotation in general. 142 had a search snippet that names Annotator,
  `annotation-target` or Hypothesis; those were opened, together with 21
  PDF and EPUB plugin threads where comparisons were likely and 10 recent
  PDF-annotation threads: **170 topics, 1,806 posts, of which 1,341 are
  from November 2021 on**.
- **Counted:** **50 topics (410 posts since November 2021, 80 of them naming
  Annotator)** are about the plugin: questions, bug reports, requests,
  comparisons and recommendations. They are all in the
  [index at the end](#forum-topics-counted). Left out: 69 topics that name
  Annotator only in a list of installed plugins (debug info) or a stack
  trace, and 11 that use the word for something else (Zotero's reader,
  other apps, a Go file format).
- **Not read:** the 719 candidates whose snippet named only
  "annotate/annotation" were not opened. A later post in one of them could
  mention Annotator and be missed. No forum showcase or announcement thread
  for the plugin was found.

### Discord (Obsidian Members Group)

- **Reached:** yes. The built-in browser pane showed Discord's sign-in page
  and was not used. The owner signed in themselves in their own browser, and
  the server was read from there. Nothing was typed except search terms in
  the server's search box. The owner's account can post in `#updates`, so
  nothing was typed anywhere else.
- **How:** the server's own search, all channels:
  `"annotation-target"` (60 results), `elias-sundqvist` (68),
  `hypothesis annotator` (19), `annotator plugin` (325),
  `annotator epub` (67), `annotator pdf` (953), `annotator mobile` (6),
  `annotator android` (9), `annotator ipad` (24), `annotator ios` (8),
  `annotator zotero` (492), `annotator pdf++` (953), `annotator video` (24),
  `annotator working` (101), `annotator web` (53),
  `annotator highlights` (327). Every result page was read.
- **Read:** about 2,100 distinct messages; 372 contain "annotator" or
  "annotation-target"; **304 from November 2021 on are about the plugin**
  (messages about "a good PDF annotator app" were left out; a question
  cross-posted to several channels counts once per channel). By year:
  2021 (Nov–Dec) about 20, 2022 about 75, 2023 about 105, 2024 about 80,
  2025 about 15, 2026 about 6. Channels: `#general-help` about a third,
  `#plugin` about a quarter, then `#academia-workflows`,
  `#mobile-archive`, `#academic-tools`, `#plugin-dev`,
  `#knowledge-management`, `#insider-desktop-release`, `#updates`, and the
  Portuguese, Spanish, German, Chinese and Vietnamese channels.
- **Not reached:** a plain `annotator` search gives 7,481 results, because
  Discord's search also matches "annotate" and "annotation", so it was not
  paged through. A message that names Annotator without any of the paired
  words above could be missed. Threads and forum channels were covered only
  as far as the server search returns them.
- **`#updates`:** its topic, its two pinned messages, 60 posts from
  26 October to 2 November 2026 and the 10 latest (12–13 November) were read
  for part 4.

### Things seen that were not acted on

No post on either site addressed instructions to an assistant. Nothing asked
for a sign-in beyond Discord's own sign-in page, and no form was submitted.

## 2. What people wrote, by theme

Counts are threads or messages that are mainly about the theme. A thread can
fall under more than one theme. Discord references give only channel and
month.

### 2.1 Setting a source up: "where is the Annotate option?"

- **How often:** the most common subject on both sites. Forum: 12 topics,
  2022 to 2025. Discord: about 65 messages, October 2021 to September 2025,
  nearly all in `#general-help` and `#plugin`.
- **What was said:** people could not get the Annotate option to appear.
  They did not know how to write `annotation-target`: a vault path, a link
  copied from somewhere, a Windows drive path with backslashes, a path in
  quotes, the target inside backticks. From late 2023, Obsidian's Properties
  editor turned the `---` they typed into a property table or a horizontal
  rule, and some ended up with a property literally named
  `annotation-target:`, with the colon inside the key. Several asked for the
  note to be made for them when a PDF is added. One wrote a Templater script
  for it, and another asked to open a PDF in the reader straight from a
  search result. Helpers on both sites called the setup "picky", "not user
  friendly" and "too complicated".
  Discord: `#plugin` and `#general-help` throughout; `#academia-workflows`
  2023-09 (the Properties editor and `::` fields); `#general-help` 2023-01
  (a long thread about a Windows path) and 2024-05/06 (quotes, "the target
  must be at the very top"); `#plugin` 2024-02 (create the note
  automatically); `#plugin` 2023-01 (open from search results).
- **Forum:** [#66911](https://forum.obsidian.md/t/annotator-help-pdf-doesnt-load-despite-property-line-annotation-target-loads/66911),
  [#73048](https://forum.obsidian.md/t/annotations-plug-in/73048),
  [#95337](https://forum.obsidian.md/t/help-with-annotator/95337),
  [#71314](https://forum.obsidian.md/t/annotator-plugin-problem-seperate-note-with-annotations/71314),
  [#58929](https://forum.obsidian.md/t/automation-of-annotator/58929),
  [#78721](https://forum.obsidian.md/t/templater-script-to-create-a-new-note-for-annotating-selected-pdf/78721),
  [#1403](https://forum.obsidian.md/t/native-epub-support/1403),
  [#4233](https://forum.obsidian.md/t/create-a-note-that-linked-to-a-specific-paragraph-in-a-pdf/4233),
  [#38097](https://forum.obsidian.md/t/how-to-embed-a-pdf-file/38097),
  [#70924](https://forum.obsidian.md/t/highlight-pdf-not-working-anymore-on-macos-win-12/70924),
  [#58025](https://forum.obsidian.md/t/link-file-from-cloud-to-use-with-annotator-plugin/58025),
  [#82778](https://forum.obsidian.md/t/no-annotator-menu-shows-up-when-i-highlight-text/82778).
- **GitHub:** #42, #69, #93, #202, #227, #247, #253, #303, #319, #352, #370,
  #385, #390, #402, #405.
- **In 0.3:** open a PDF or book and run *Open annotations sidebar*;
  selecting text highlights it (README L30–31). The note is made on first
  use (ISSUE_PLAN #390: "no target line has to be written"). Every common way
  of writing a target is accepted, with a table (README L50–60), and a target
  that leads nowhere says what was looked for and where (ISSUE_PLAN, checks
  table, #352). **Not covered:** a target written as a Windows drive path
  with backslashes, and a property key with a stray colon or a near miss
  (`annotator-target` was the spelling in the #356 report). See todo 3.1.

### 2.2 Broken after an Obsidian update: blank, shrinking or black views, "failed to load"

- **How often:** forum 10 topics; Discord about 25 messages. Peaks: December
  2023 to January 2024 (Obsidian 1.5.x), and again in 2024-09/10, 2025-04/06
  and 2026-09.
- **What was said:** with Obsidian 1.5.0 and 1.5.2 the reader showed a blank
  pane, a PDF that halved its width on each click, or black highlights.
  People pointed to GitHub #356. Some held back Obsidian updates; others
  said the plugin had not been updated for a year and moved on. Earlier
  reports: "failed to load plugin" (2022), an iPad that would not enable it
  (2022), a Chromebook crash on install (2024), an uncaught "render frame was
  disposed" error (2024), and new files that failed to open with Annotator's
  code in the stack (2023).
  Discord: `#insider-desktop-release` 2023-11 and 2023-12; `#plugin`,
  `#general-help` and the Chinese channel 2023-12; `#plugin`,
  `#general-help` and `#plugin-advanced-archived` 2024-01; `#plugin`
  2024-09; `#general-help` 2024-10, 2025-04 and 2026-09;
  `#academic-tools` 2025-06.
- **Forum:** [#72095](https://forum.obsidian.md/t/annotator-plugin-bug-with-recent-catalyst-update-pdf-flushes-to-left-side-and-cant-click-on-it/72095),
  [#74272](https://forum.obsidian.md/t/problem-with-annotation-display/74272),
  [#74091](https://forum.obsidian.md/t/annotator-plugin-crashing-obsidian-on-install-and-refusing-to-enable/74091),
  [#31015](https://forum.obsidian.md/t/highlighting-annotation-of-pdfs-as-a-core-feature-of-obsidian-annotate/31015)
  (posts 51 and 63),
  [#92206](https://forum.obsidian.md/t/built-in-library-for-pdf-en-epub-workflow-read-highlight-annotate-extract-highlights-annotations-to-a-note-synchronized/92206),
  [#38353](https://forum.obsidian.md/t/plugin-annotator-fails-to-load/38353),
  [#40279](https://forum.obsidian.md/t/problem-with-the-plugin-annotator-wich-doesn-t-work-on-ipad/40279),
  [#39585](https://forum.obsidian.md/t/annitator-fix-for-ipad-bug/39585),
  [#76406](https://forum.obsidian.md/t/uncaught-exception/76406),
  [#52659](https://forum.obsidian.md/t/if-i-create-a-new-file-it-creates-it-but-cant-open-it-afterwards-failed-to-load-untitled-enonent-no-such-file-or-directory/52659).
- **GitHub:** #360, #370, #383, #393, #396, #409, #411; #356 itself is not
  among the 271 open issues.
- **In 0.3:** PDFs open in Obsidian's own PDF view and nothing is loaded from
  the Hypothesis client (README L401–403; CHANGELOG "The reader"). It loads
  with no console error on macOS, Windows 11, Ubuntu 24.04 and Android 12 and
  16 (ISSUE_PLAN #360/#411 and the Android table; CHANGELOG "Where it has
  been run"). ChromeOS was not tried (see part 5).

### 2.3 Is it maintained, and will my notes be stranded?

- **How often:** forum 6 topics; Discord about 10 messages, 2024 to 2026.
- **What was said:** "last updated a year ago", "no longer supported?". One
  user feared that a future built-in Obsidian feature would make them
  annotate every book again. A widely read forum post by the author of
  PDF++ called PDF++ more future-proof than plugins that keep annotations as
  JSON blocks in their own format, naming Annotator. Someone who tried to
  build the plugin from source in 2025 was stopped by its submodule and
  build setup; a 2023 attempt on Discord hit the same wall. Discord:
  `#plugin-advanced-archived` and `#general-help` 2024-01;
  `#academic-tools` 2025-06; `#plugin-dev` 2023-07.
- **Forum:** [#31015](https://forum.obsidian.md/t/highlighting-annotation-of-pdfs-as-a-core-feature-of-obsidian-annotate/31015)
  (post 69),
  [#102595](https://forum.obsidian.md/t/linking-notes-to-exact-passages-from-pdfs/102595),
  [#92206](https://forum.obsidian.md/t/built-in-library-for-pdf-en-epub-workflow-read-highlight-annotate-extract-highlights-annotations-to-a-note-synchronized/92206),
  [#95337](https://forum.obsidian.md/t/help-with-annotator/95337),
  [#98813](https://forum.obsidian.md/t/debugging-a-plugin-that-cant-be-enabled/98813),
  [#84634](https://forum.obsidian.md/t/obsidian-has-become-very-slow-lags-constantly/84634).
- **GitHub:** #391, #395, #415.
- **In 0.3:** a new reader on Obsidian's own PDF view (README L15–17).
  Existing notes are read as they are and not converted (README L369–378).
  Notes can be exported to clean Markdown, to one note per annotation with
  a Base, to a PDF with standard annotations, and to Hypothesis JSON
  (README L300–311, L139–149). CONTRIBUTING.md says how to build
  (README L441–442). The note format stays the original's by decision
  (ISSUE_PLAN #24).

### 2.4 Phones and tablets

- **How often:** forum 6 topics; Discord about 15 messages, December 2021 to
  August 2024.
- **What was said:** it "doesn't work on iOS" or on Android (2022). It worked
  on phone and laptop but not iPad (2023). Annotations made on iOS did not
  show on a PC because file names were encoded differently (2021). On mobile
  it took about 4 seconds to load and was behind slow starts and start-up
  crashes, found by disabling plugins one by one (2023). With an Apple Pencil
  on an iPad Pro, selecting text was hard and the system Copy/Look Up menu
  covered the Annotate button (forum, 2022). Touch selection on Android was
  called unusable (2024). In October 2026 someone chose neither Annotator nor
  PDF++ because they read that Annotator "doesn't sync between devices".
  Discord: `#plugin` 2021-12, 2023-02 and 2023-04; `#mobile-archive`
  2022-08, 2023-07, 2023-08, 2023-11, 2023-12 and 2024-08; `#obsidian-sync`
  2022-08; `#general-help` 2023-08.
- **Forum:** [#31015](https://forum.obsidian.md/t/highlighting-annotation-of-pdfs-as-a-core-feature-of-obsidian-annotate/31015)
  (post 8),
  [#40279](https://forum.obsidian.md/t/problem-with-the-plugin-annotator-wich-doesn-t-work-on-ipad/40279),
  [#39585](https://forum.obsidian.md/t/annitator-fix-for-ipad-bug/39585),
  [#50926](https://forum.obsidian.md/t/bug-obsidian-window-totally-freezes-on-my-ipad-and-on-iphone-keeps-on-reloading/50926),
  [#78005](https://forum.obsidian.md/t/text-selection-on-mobile/78005),
  [#118957](https://forum.obsidian.md/t/highlights-and-annotation-on-pdf-and-epub/118957).
- **GitHub:** #89, #166, #177, #181, #201, #205, #207, #221, #225, #236,
  #289, #322, #338, #348, #396.
- **In 0.3:** desktop and Android; on iOS and iPadOS only the reader's code
  was run, in the Simulator (README L23–26, L433–437). Phone and tablet
  layouts, full-screen reading, touch marking and drawing (README L313–345).
  Enabling the plugin on an Android emulator went from 6.0–8.6 s to
  0.05–0.13 s (README L394). Annotations live in ordinary notes that sync
  like the rest (README L8–9). The iOS check on a device is still open
  (plan task `issues-check-ios`).

### 2.5 EPUB books

- **How often:** forum 2 topics; Discord about 13 messages, November 2021 to
  April 2025.
- **What was said:** no highlight menu on selection (2022, 2023, in English
  and Spanish), books that would not open (2023), books opening outside
  Obsidian (2024), how to change the font size (2021), books on mobile
  (2023). People asked for EPUB support to become a core feature, and
  suggested Annotator as the reference (forum, 2023).
  Discord: `#plugin` 2021-11, 2022-04, 2022-07, 2022-08, 2023-02 and
  2023-06; `#general-help` 2022-07, 2023-08, 2024-08 and 2025-04; the
  Spanish channel 2023-02.
- **Forum:** [#70359](https://forum.obsidian.md/t/epub-file-misbehaving/70359),
  [#1403](https://forum.obsidian.md/t/native-epub-support/1403).
- **GitHub:** #82, #99, #105, #185, #192, #196, #237, #342, #367, #375,
  #379, #413.
- **In 0.3:** a book reader with contents, find, Scroll and Pages layouts,
  and type controls (README L188–214). Books that failed before open and
  take highlights in both layouts (ISSUE_PLAN, books checks: #82, #367,
  #375).

### 2.6 Freezes, slowness and clashes with other plugins

- **How often:** forum 4 topics; Discord about 10 messages, 2021 to 2024.
- **What was said:** with Annotator enabled, opening a PDF in Obsidian's own
  reader froze the app (2022). It was blamed for a Dataview fault (2022),
  for not being able to enable plugins after setting up Sync (2022), for
  broken internal links in reading view (2022), and for Japanese text
  missing from PDFs (2021). One user patched it to keep Obsidian responsive
  (this is PR #330). A helper on a "slow Obsidian" thread advised removing
  it in favour of PDF++ (2024). Discord: `#dataview` 2022-08;
  `#obsidian-sync` 2022-09; `#insider-desktop-release` 2022-09 and 2023-01;
  `#plugin` 2023-09; `#general-help` 2023-10 ("style.css not found").
- **Forum:** [#42018](https://forum.obsidian.md/t/internal-links-not-working/42018),
  [#26315](https://forum.obsidian.md/t/japanese-pdf-text-not-being-displayed-in-obsidian/26315),
  [#84634](https://forum.obsidian.md/t/obsidian-has-become-very-slow-lags-constantly/84634),
  [#50926](https://forum.obsidian.md/t/bug-obsidian-window-totally-freezes-on-my-ipad-and-on-iphone-keeps-on-reloading/50926).
- **GitHub:** #136, #214, #264, #272, #315, #401, #409; PR #330.
- **In 0.3:** plugin files 26.3 MB → 1.5 MB, enabling 1.1 s → 0.014 s, memory
  kept after closing a PDF 9.7 MB → 0.2 MB (README L390–397). Nothing runs on
  a timer while the reader is hidden (CHANGELOG "Better"). The core PDF view
  still shows pages with the plugin enabled (ISSUE_PLAN #409). It was used
  beside PDF++ and beside Excalidraw with no error (ISSUE_PLAN #136, #137).

### 2.7 Links to annotations

- **How often:** forum 4 topics; Discord about 7 messages, 2021 to 2023.
- **What was said:** "show annotation" opened the last page read instead of
  the highlight, or did not scroll. Dragging a highlight's link did not
  work. People wanted to link an annotation into Excalidraw, or to link to
  any paragraph without the generated text, which they called ugly
  (2022–2023). Discord: `#plugin-advanced-archived` 2021-11; `#general-help`
  2021-12 and 2022-01; `#plugin` 2022-10 and 2023-01.
- **Forum:** [#4233](https://forum.obsidian.md/t/create-a-note-that-linked-to-a-specific-paragraph-in-a-pdf/4233),
  [#68258](https://forum.obsidian.md/t/how-to-annotation-from-annotator-obsidian-linked-to-excalidraw/68258),
  [#62233](https://forum.obsidian.md/t/new-pdf-reader-automatic-pdf-link-descriptions/62233),
  [#71695](https://forum.obsidian.md/t/embed-part-of-a-pdf/71695).
- **GitHub:** #91, #101, #137, #165, #225, #234, #251, #280, #321, #333, #413.
- **In 0.3:** a card's quote goes to the passage, and a card can copy a link
  (README L79–80). The copied link has a template (ISSUE_PLAN, work items:
  "A template for copied and dragged links", done). A card dropped on an
  Excalidraw drawing becomes a link (ISSUE_PLAN #137).

### 2.8 Turning highlights into notes; what the note looks like

- **How often:** forum 6 topics; Discord about 15 messages, 2022 to 2026.
- **What was said:** the plugin was good at reading but poor at turning
  highlights into notes. People asked how to pull highlights into other
  notes or Dataview (posted in four channels in 2023-12), wanted one note
  per idea, wanted to hide the "ugly markdown chunks" in edit mode, and
  wanted to restyle the quote. One person said that searching their
  annotations with Obsidian's search was "a nightmare" (2026-10). On the
  other side, one person valued that the notes are just Markdown and record
  exactly where each highlight is. Discord: `#general-help` 2023-01,
  2023-05 and 2026-10; `#academia-workflows` 2023-02 and 2023-12;
  `#dataview` 2023-12; `#academic-tools` 2023-10, 2023-12 and 2024-08.
- **Forum:** [#67952](https://forum.obsidian.md/t/help-bringing-highlights-from-zotero-to-obsidian-how-to-hide-ugly-markdown-chunks-in-annotator-in-edit-mode/67952),
  [#72289](https://forum.obsidian.md/t/how-to-export-and-change-style-for-quotes-from-pdf-annotations/72289),
  [#4233](https://forum.obsidian.md/t/create-a-note-that-linked-to-a-specific-paragraph-in-a-pdf/4233)
  (post 68),
  [#31779](https://forum.obsidian.md/t/how-to-extract-paragraph-with-hashtag-in-new-notes-coding-text-as-in-nvivo-maxqda/31779),
  [#53345](https://forum.obsidian.md/t/zotero-versus-annotator-plugin/53345),
  [#31015](https://forum.obsidian.md/t/highlighting-annotation-of-pdfs-as-a-core-feature-of-obsidian-annotate/31015)
  (post 69).
- **GitHub:** #24, #32, #88, #122, #162, #212, #256, #308, #388, #400.
- **In 0.3:** *Copy all as Markdown*, *Export to a summary note* with a
  template, and *Export as individual notes + Base* (README L300–311). A CSS
  class on annotation notes (ISSUE_PLAN, work items, #308) and styling
  variables (README L361–365). The stored block keeps its JSON in a `%%`
  comment, which does not show in Reading view (ISSUE_PLAN #24, declined);
  one file per annotation was decided against (plan task
  `per-annotation-decision`). Searching across sources with Obsidian's own
  search is not addressed; see part 5.

### 2.9 Annotations kept outside the PDF

- **How often:** forum 4 topics; Discord about 6 messages, 2022 to 2024.
- **What was said:** people wanted highlights saved in the PDF file, as
  Preview, Acrobat or Okular do, so other apps see them. Without that, some
  chose Zotero. One person tried Annotator to fill in a PDF form.
  Discord: `#plugin` 2022-04 and 2024-08; `#academia-workflows` 2023-12;
  `#academic-tools` 2023-11 and 2024-08.
- **Forum:** [#31015](https://forum.obsidian.md/t/highlighting-annotation-of-pdfs-as-a-core-feature-of-obsidian-annotate/31015)
  (post 33),
  [#53345](https://forum.obsidian.md/t/zotero-versus-annotator-plugin/53345),
  [#61283](https://forum.obsidian.md/t/cannot-edit-fillable-sections-of-pdf/61283),
  [#35704](https://forum.obsidian.md/t/failed-to-load-pdf-in-0-14-5/35704)
  (here Annotator was the workaround while Obsidian's own PDF view was
  broken).
- **GitHub:** #25, #102, #110, #252, #389.
- **In 0.3:** *Export PDF with annotations* writes a copy that any PDF reader
  shows; the original is never changed (README L139–149). Annotations made
  in other programs can be taken in (README L160–186). Form fields are not
  taken (README L184).

### 2.10 Drawing, boxes and typed text on the page

- **How often:** forum 1 topic; Discord about 6 messages, 2022 to 2024.
- **What was said:** no area or figure highlight (2022). People wanted
  inking like Edge's or Notability's, and typed text boxes placed anywhere
  on the page; one person had expected Annotator to do this (the same
  question was posted in three channels in 2024-02). Others noted that
  comments could only be attached to words already on the page.
  Discord: `#general-help` 2024-02 and 2024-05; `#academia-workflows` and
  `#academic-tools` 2024-02 and 2024-08.
- **Forum:** [#4233](https://forum.obsidian.md/t/create-a-note-that-linked-to-a-specific-paragraph-in-a-pdf/4233)
  (post 65).
- **GitHub:** #40, #64, #343.
- **In 0.3:** *Mark an area* and *Draw on the page* with pen pressure and an
  eraser (README L111–137). **Not covered:** typed text that stays visible on
  the page. A note on an area shows in the sidebar, not on the page. See
  todo 3.2.

### 2.11 Colours, dark mode and the sidebar

- **How often:** forum 3 topics; Discord about 6 messages, 2021 to 2024.
- **What was said:** only one highlight colour; dark mode "not good enough";
  no way to set the page's background colour; highlights shown black.
  Every highlight became a card even without a note, so people wanted a
  filter for cards with notes. The annotation window floated over the text
  or took half the screen and could not be resized. Discord:
  `#academia-workflows` 2021-12; `#general-help` 2023-11; `#plugin` 2023-11
  and 2024-01.
- **Forum:** [#64511](https://forum.obsidian.md/t/help-is-there-any-way-to-self-define-pdf-background-color/64511),
  [#70920](https://forum.obsidian.md/t/annotation-window-in-annotation-plugin/70920),
  [#74272](https://forum.obsidian.md/t/problem-with-annotation-display/74272).
- **GitHub:** #44, #73, #90, #211, #240, #244, #245, #296, #298, #311, #313,
  #341, #369, #372, #399, #404.
- **In 0.3:** six inks (README L72), Auto, Light, Sepia and Dark paper, and
  *Darken pictures too* (README L101–109). The sidebar filters to what has a
  note (README L86–87) and can be docked anywhere (README L401–402).

### 2.12 Sources outside the vault

- **How often:** forum 3 topics; Discord about 5 messages, 2023 to 2025.
- **What was said:** people wanted to annotate files on Google Drive or Mega,
  in a Zotero storage folder, or on a local drive, without filling the vault.
  One forum request asked for Obsidian's own reader to open files outside the
  vault for privacy and size reasons, with Annotator named as the workaround.
  Discord: `#general-help` 2023-01; `#plugin` 2025-01.
- **Forum:** [#58025](https://forum.obsidian.md/t/link-file-from-cloud-to-use-with-annotator-plugin/58025),
  [#78182](https://forum.obsidian.md/t/open-read-pdfs-out-of-vault-with-obsidians-embedded-pdf-reader/78182),
  [#92206](https://forum.obsidian.md/t/built-in-library-for-pdf-en-epub-workflow-read-highlight-annotate-extract-highlights-annotations-to-a-note-synchronized/92206).
- **GitHub:** #75, #78, #80, #150, #159, #168, #364.
- **In 0.3:** the reader asks first, then copies or downloads the file once
  into `Annotator sources` in the vault (README L281–286). So the file does
  end up in the vault; see part 5.

### 2.13 Video, web pages and embedding

- **How often:** forum 3 topics; Discord about 7 messages, 2021 to 2025.
- **What was said:** a YouTube target did nothing (2022). Someone tried
  adding annotate.tv to the plugin (2022). People asked to embed and
  annotate a PDF inside the note itself or on a Canvas (2021, 2023). A PDF
  shown through Annotator looked unsharp (2022). One user printed long web
  pages to PDF to annotate them (2023). Discord: `#plugin` 2021-11 and
  2022-11; `#plugin-dev` 2022-02 and 2022-10; `#insider-desktop-release`
  2023-02 (Canvas); `#general-help` 2025-02.
- **Forum:** [#38097](https://forum.obsidian.md/t/how-to-embed-a-pdf-file/38097),
  [#71695](https://forum.obsidian.md/t/embed-part-of-a-pdf/71695),
  [#72092](https://forum.obsidian.md/t/is-there-a-way-to-use-obsidian-to-take-notes-on-web-pages-or-html-files-zotero-snapshot-obsidian-does-not-support-browsing-long-page-pdfs-a4-pdfs-will-lose-web-page-information/72092).
- **GitHub:** #59, #92, #170, #207, #262, #278, #351, #412.
- **In 0.3:** videos and recordings with timed and frame notes
  (README L216–238). Live web pages in Obsidian's Web viewer, reading
  copies, and HTML files in the vault (README L240–279). An area's picture
  is saved as an attachment that can be embedded (README L111–115). An
  inline reader inside a note is declined (ISSUE_PLAN #92). Canvas is not
  mentioned; see part 5.

### 2.14 What people moved to, and why

- **How often:** forum 9 topics; Discord about 25 messages, 2022 to 2026.
- **What was said:**
  - **PDF++** is recommended most often from 2024 on. People called it
    actively maintained and easier to start with, built on Obsidian's own
    PDF view, and storing links rather than JSON. Discord: `#general-help`
    2024-03, 2025-01 and 2025-04; `#windows` 2024-10; `#mobile-archive`
    2024-08.
  - **Zotero**, alone or through Zotero Integration or Citations, for
    academic work and for annotating on a tablet. Discord: German channel
    2023-04; `#academia-workflows` 2023-09; `#academic-tools` 2024-08.
  - **Logseq's built-in PDF annotation** as the thing people wished Obsidian
    had; a few nearly switched for it. Discord: `#general-help` 2022-09;
    `#plugin` 2022-12.
  - **Markmind**, as well as other PDF annotation plugins announced in
    `#updates` in 2024-07 and 2025-12 to 2026-01.
  - Outside apps: Highlights, PDF Expert, Okular, LiquidText, Skim, Readwise
    Reader.
  - A built-in Obsidian feature: the forum request
    [#31015](https://forum.obsidian.md/t/highlighting-annotation-of-pdfs-as-a-core-feature-of-obsidian-annotate/31015)
    has 109 posts and about 68,000 views. Its latest visible posts
    (June to September 2026) say that PDF.js can now do annotation and ask
    Obsidian to build it.
- **Forum:** [#94030](https://forum.obsidian.md/t/understanding-javascript-in-obsidian/94030),
  [#84634](https://forum.obsidian.md/t/obsidian-has-become-very-slow-lags-constantly/84634),
  [#95337](https://forum.obsidian.md/t/help-with-annotator/95337),
  [#53345](https://forum.obsidian.md/t/zotero-versus-annotator-plugin/53345),
  [#34372](https://forum.obsidian.md/t/pdf-zotero-obsidian-current-state-and-collaboration-for-the-one-plugin/34372),
  [#92206](https://forum.obsidian.md/t/built-in-library-for-pdf-en-epub-workflow-read-highlight-annotate-extract-highlights-annotations-to-a-note-synchronized/92206),
  [#31015](https://forum.obsidian.md/t/highlighting-annotation-of-pdfs-as-a-core-feature-of-obsidian-annotate/31015),
  [#102595](https://forum.obsidian.md/t/linking-notes-to-exact-passages-from-pdfs/102595),
  [#118957](https://forum.obsidian.md/t/highlights-and-annotation-on-pdf-and-epub/118957).
- **Positive mentions and recommendations** of Annotator, mostly 2022–2023:
  [#7947](https://forum.obsidian.md/t/automatically-retrieve-highlights-in-pdf-and-link-it-with-obsidian-note-blocks/7947),
  [#54439](https://forum.obsidian.md/t/auto-importing-highlights-from-pdfs-articles-epubs-etc-into-obsidian/54439),
  [#54342](https://forum.obsidian.md/t/twitter-favorites-as-an-obsidian-brain-with-graphs-and-canvases/54342),
  [#82125](https://forum.obsidian.md/t/how-do-i-mass-import-bookmarked-or-saved-instagram-posts/82125),
  [#62233](https://forum.obsidian.md/t/new-pdf-reader-automatic-pdf-link-descriptions/62233);
  on Discord, recommendations appear in nearly every year and in five
  languages.
- **In 0.3:** the reader now builds on Obsidian's PDF view as PDF++ does
  (README L93), and the two run side by side without error
  (ISSUE_PLAN #136).

### 2.15 Hypothes.is

- **How often:** Discord 2 messages (`#knowledge-management` 2022-04,
  `#other-tools` 2025-06).
- **What was said:** one user liked that it was built on hypothes.is;
  another wished they could self-host hypothes.is.
- **GitHub:** #35, #38, #87, #173, #199, #224, #232, #271, #328, #381.
- **In 0.3:** no Hypothesis client or account (README L401–403); annotations
  can be exchanged as Hypothesis JSON (README L311).

## 3. Not covered yet: proposed todos

Only things that 0.3 does not do or has not checked, and that no row of
`ISSUE_PLAN.md` and no task on the board covers.

### 3.1 Windows drive paths and near-miss property names in `annotation-target`

- **Asked or reported:** targets written as Windows paths
  (`C:\Users\…\book.pdf`, with backslashes, sometimes quoted or with a
  `file:` prefix) that did not open; a property key that ended up as
  `annotation-target:`, with the colon inside the key, after typing in the
  Properties editor; and the key spelled `annotator-target` (in the #356
  report). In each case the person did not know what was wrong.
- **Evidence:** Discord `#general-help` 2022-09, 2023-01 (one long thread)
  and 2025-09, `#plugin` 2025-01; forum
  [#71314](https://forum.obsidian.md/t/annotator-plugin-problem-seperate-note-with-annotations/71314)
  and [#66911](https://forum.obsidian.md/t/annotator-help-pdf-doesnt-load-despite-property-line-annotation-target-loads/66911).
  About 6 people.
- **Why it is not covered:** README L50–60 lists the accepted forms, and none
  is a Windows drive path. ISSUE_PLAN #227 and #303 cover spaces, `#` and
  `?`; #80 and #159 cover outside-vault and `file:` targets in general. No
  row mentions backslash paths or a misspelled key.
- **Size:** small. **Kind:** a bug to check (backslash paths), plus a small
  feature: a hint when a note has a property that looks like a misspelled
  `annotation-target`.
- **Status (2026-11-13):** README "Sources outside the vault" now shows
  Windows paths and `file:` addresses and says how to write the key in the
  Properties editor. The hint is board task `target-key-hint`.

### 3.2 Typed text that stays on the PDF page

- **Asked or reported:** a text box placed anywhere on the page with typed
  words shown on the page, as in Notability, Apple Notes, Edge or Acrobat's
  free-text tool. One person had expected Annotator to do this.
- **Evidence:** Discord 2024-02 (one person, the same question in
  `#general-help`, `#academia-workflows` and `#academic-tools`) and
  `#general-help` 2024-05 (comments only attach to existing words). About
  2 people. Weak evidence.
- **Why it is not covered:** 0.3 has areas with a note (shown in the
  sidebar), freehand drawing, and page notes (README L81–84, L111–137).
  Taking in a PDF's own text boxes turns them into areas (README L171).
  Nothing puts typed text on the page, and no ISSUE_PLAN row asks for it.
- **Size:** medium (a new annotation kind, its card, export as a FreeText
  PDF annotation). **Kind:** feature. Worth doing only if more people ask.
- **Status (2026-11-13):** board task `page-text-boxes`. The second pass
  (part 6) found one more person: in Discord `#plugin`, 2026-10, a PDF++ user
  could add highlights and comments but no text box. That makes about 3
  people.

The next three come from the second pass over 2026 discussions (part 6).

### 3.3 A PDF's note as its property sheet, and a Base of sources

- **Asked or reported:** people want PDFs in Bases and Dataview, with tags
  and properties. PDFs cannot carry properties, so they make "sidecar" notes
  by hand, find that clunky, and complain that the sidecar does not open the
  PDF.
- **Evidence:** the forum request
  [#64386 "Property support for non-markdown files"](https://forum.obsidian.md/t/property-support-for-non-markdown-files/64386)
  (24 posts, 38 likes on the first, active in November 2026); a closed
  November 2026 request to tag PDFs for Bases; Discord `#dataview` 2026-08
  (a database of PDFs, where an `.md` per PDF "won't open the PDF itself"),
  `#obsidian-bases` 2026-05 and `#general-help` 2026-11. About 6 people
  recently, many more behind the forum request.
- **Why it is not covered:** 0.3 already has that sidecar. Each source has
  one annotation note (README L38–48), opening it opens the source, and
  *Add the PDF's details to the note* makes the note even before any
  annotation exists (`addPdfDetails` calls `ensureNote` in `src/main.ts`).
  But nothing says this in the README, and no Base lists the sources: the
  Base export is per annotation (README L308–309), and ISSUE_PLAN #242 says
  "reading progress across files is not shown".
- **Size:** small. **Kind:** documentation (say that the annotation note is
  the PDF's property note, and show the filter `annotation-target` for a
  Base), plus a small feature: a command that makes a Base of all annotated
  sources (title, author, year, `annotation-progress`, count, tags).

### 3.4 A short guide for Zotero users

- **Asked or reported:** Zotero is the alternative named most after PDF++
  (2.14). In September and October 2026, ZotLit 2.2 began reading and
  annotating Zotero PDFs inside Obsidian, and Discord `#academic-tools` and
  `#academia-workflows` discussed it at length. People there ask how to keep
  Zotero for the library and still annotate in Obsidian.
- **Evidence:** Discord `#academic-tools` 2026-09 to 2026-10 (ZotLit 2.2
  thread and replies), `#academia-workflows` 2026-05, 2026-06 and 2026-08;
  forum [#118957](https://forum.obsidian.md/t/highlights-and-annotation-on-pdf-and-epub/118957)
  (Zotero recommended over Annotator).
- **Why it is not covered:** ISSUE_PLAN #22 declines a Zotero integration
  and says only that `annotation-target` can point at the file in Zotero's
  storage, with Zotero Integration for metadata. Neither the README nor a
  guide says how to do it, or what happens to highlights made in Zotero's
  own reader (Zotero keeps them in its database, not in the PDF).
- **Size:** small. **Kind:** documentation. Write it only after checking
  that a Zotero storage path works as a target on each desktop system.

### 3.5 When Obsidian's own PDF annotation arrives

- **Asked or reported:** PDF annotation is in the "Planned" column of
  Obsidian's public roadmap, and people on Discord and the forum say that
  PDF.js, which Obsidian's PDF view uses, gained annotation support in 2026.
  Users who fear re-annotating everything once core ships (2.3) will ask
  what happens to their Annotator notes then.
- **Evidence:** forum #118957 (post 4) and #31015 (posts 109–114,
  June–September 2026); Discord `#general-help` 2026-08 (twice) and
  `#vip-lounge` 2026-11.
- **Why it is not covered:** nothing in the plan or the docs. 0.3 can
  already move annotations both ways through the PDF itself: it takes in
  annotations another program wrote (README L160–186) and exports its own as
  standard PDF annotations (README L139–149). Whether that carries over to
  what Obsidian will write is untested, because Obsidian hasn't written
  anything yet.
- **Size:** small now (one paragraph in the README, "If Obsidian adds PDF
  annotation"), medium later. **Kind:** documentation now; a check when the
  core feature ships: take in what Obsidian writes, and see whether exported
  annotations show in its viewer.

Considered and not proposed: flashcards from highlights (one EPUB plugin
offers them; asked once on Discord), and region screenshots of a PDF (one
competing plugin's headline feature, which 0.3's areas already do; README
L111–115). Writing annotations into the original PDF (2.9; a competing
plugin's headline in 2025–2026), an inline reader in a note (2.13), OCR of
scans and a citations panel are covered by ISSUE_PLAN decisions or board
tasks (#25, #92, `scan-text-recognition`, `pdf-citations-panel`).

## 4. For the release write-up

### What people asked for most that 0.3 now does

Ranked by how often it came up on both sites.

1. **Annotate without setup.** Setup questions are the largest theme (2.1:
   12 forum topics, about 65 Discord messages). Now: open the PDF or book,
   select text; the note is made for you (README L30–31; ISSUE_PLAN #390).
2. **It works on current Obsidian.** The 1.5 breakage and "is it dead?"
   (2.2 and 2.3: about 16 forum topics, about 35 Discord messages). Now: built
   on Obsidian's own PDF view, no Hypothesis frame (README L15–17,
   L401–403), loaded on macOS, Windows, Linux and Android (CHANGELOG "Where
   it has been run").
3. **Phones and tablets.** 2.4: 6 forum topics, about 15 Discord messages.
   Android works, starts in 0.05–0.13 s on the emulator instead of 6–8.6 s
   (README L394), and has phone and tablet layouts (README L313–345). iOS has
   been tested only in the Simulator (README L23–26).
4. **Faster and lighter.** 2.6. The before-and-after table (README L390–397).
5. **Highlights you can use outside Obsidian.** 2.9. Export a PDF with the
   annotations, and take in annotations made in other apps
   (README L139–186).
6. **Notes from highlights.** 2.8. Summary note, Markdown copy, one note per
   annotation with a Base (README L300–311); notes written in Obsidian's own
   editor (README L76–77).
7. **Colours and dark pages.** 2.11. Six inks; Auto, Light, Sepia and Dark
   paper (README L72, L101–109).
8. **Books that work.** 2.5. Contents, find, layouts and type controls
   (README L188–214).
9. **Drawing and areas.** 2.10 (README L111–137).
10. **Video and live web pages.** 2.13 (README L216–279).

### Worries the write-up should answer

- **Do my old notes still work?** Yes, as they are; nothing is converted;
  *Check annotation notes (migration)* counts and lists them; settings and
  open tabs come along (README L369–386). Mention the one-character change
  to the tags line (README L375–378).
- **Will it break again with the next Obsidian update?** Say what changed,
  not a promise: no Hypothesis iframe and no second copy of PDF.js
  (CHANGELOG "The reader"); the note format's rules are proved and tested
  (README L412–420).
- **Am I locked in?** The note is Markdown in the same format as before, with
  four ways out: Markdown summary, notes + Base, a PDF with standard
  annotations, Hypothesis JSON (README L300–311). This answers the
  "JSON is fragile" comparison directly.
- **Does it sync between devices?** Annotations are ordinary notes and sync
  like the rest (README L8–9). This was misread as recently as October 2026.
- **Does it change my PDF?** No; export writes a copy (README L148).
- **Do I need a Hypothesis account?** No (README L401–403).
- **iPhone and iPad?** Tested in the Simulator only; YouTube may refuse to
  play (README L433–437). Say so plainly, since iPad users were among the
  most frustrated.
- **PDF++ users:** the two run side by side (ISSUE_PLAN #136).
- **Scanned PDFs:** areas and drawing work; there is no OCR (README L120–121,
  L428).

### Forum topics where a short note about 0.3 would be welcome

List only; nothing is to be posted. "Open" means the topic still takes
replies (checked 2026-11-13).

| Topic | State | Why |
| --- | --- | --- |
| [Highlighting / annotation of PDFs as a core feature](https://forum.obsidian.md/t/highlighting-annotation-of-pdfs-as-a-core-feature-of-obsidian-annotate/31015) | open, last post 2026-11-13 | The main PDF thread (109 posts, about 68,000 views). Annotator is named as broken in posts 51 and 63 and as fragile in post 69 |
| [Highlights and annotation on pdf and epub](https://forum.obsidian.md/t/highlights-and-annotation-on-pdf-and-epub/118957) | open, October 2026 | Asks for PDF and EPUB across Android, Linux and Windows; believes Annotator does not sync |
| [Built-in Library for PDF and epub workflow](https://forum.obsidian.md/t/built-in-library-for-pdf-en-epub-workflow-read-highlight-annotate-extract-highlights-annotations-to-a-note-synchronized/92206) | open, last post 2026-07 | Lists Annotator among plugins that stopped working |
| [Native EPUB Support](https://forum.obsidian.md/t/native-epub-support/1403) | open, last post 2025-03 | Proposed Annotator as the model for core EPUB support |
| [PDF - Zotero - Obsidian: current state](https://forum.obsidian.md/t/pdf-zotero-obsidian-current-state-and-collaboration-for-the-one-plugin/34372) | open, last post 2023-10 | The overview of PDF plugins (about 29,000 views); its Annotator entry is out of date |
| [Open & read PDFs out of vault](https://forum.obsidian.md/t/open-read-pdfs-out-of-vault-with-obsidians-embedded-pdf-reader/78182) | open | Names Annotator as the workaround for files outside the vault |
| [New PDF reader: automatic PDF link descriptions](https://forum.obsidian.md/t/new-pdf-reader-automatic-pdf-link-descriptions/62233) | open, last post 2023-09 | A user liked Annotator for exactly this |

Closed, so no reply is possible: #95337, #102595, #74272, #72095, #53345,
#4233. The forum's usual place for a plugin announcement is
Share & showcase › Plugins (for example "New plugin: Starlight PDF", 2025-12).

### How announcements are made in Discord's `#updates`

- **Rules:** the channel topic and two pinned messages from the Obsidian team
  say: the channel is for developers to post updates to their plugins,
  themes and snippets so users can keep up; no chat, and non-updates are
  deleted; posting needs the plugin-dev or css-stylist role, which is claimed
  in `#announcements`; since March 2023 a thread may be started under an
  update for discussion, and all talk belongs in threads. The owner's
  account shows a message box in the channel, so it appears to have the
  role already.
- **Volume:** about 5 to 10 posts a day (60 between 26 October and
  2 November 2026).
- **Shape:** a bold title line with the plugin's name and version ("X 1.2.0
  is out" or a one-line pitch), one or two sentences on what it is or what
  changed, then short headed sections (New / Improved / Changed / Fixed, or
  "What's new") of one-line bullets, and links at the end: the plugin's page
  on `community.obsidian.md/plugins/…` (28 of the 60 posts measured) and/or
  the GitHub release (27 of 60). Lengths in the last 60: median about 1,060
  characters, middle half 570 to 1,620, longest about 2,850. A few
  maintainers thank contributors or forks by name.
- **Images:** none of the 60 recent posts had an image or video attached,
  and link previews appeared suppressed. A short text post with links is the
  norm.
- **Comparable launches** in the same channel: another PDF annotation
  plugin in 2024-07, and Starlight PDF 1.0.0 in 2025-12, with two follow-up
  posts (one apologising for iOS and Safari performance) by 2026-01.

## 5. Open questions for the owner

1. **Canvas.** People asked to annotate PDFs on a Canvas (Discord
   `#insider-desktop-release` 2023-02). Do 0.3's highlights show on a PDF in
   a Canvas card? None of the three source files says.
   *Answered 2026-11-13:* no. Checked in the running app: a PDF with three
   highlights shows none of them in a Canvas card and all three in a tab.
   The README's limits now say so.
2. **ChromeOS.** A Chromebook crash on install was reported on the forum
   ([#74091](https://forum.obsidian.md/t/annotator-plugin-crashing-obsidian-on-install-and-refusing-to-enable/74091),
   2024). ChromeOS is not in the list of platforms tried (CHANGELOG "Where it
   has been run"). Check it, or leave it at "Android, untested on ChromeOS"?
3. **Searching across all annotations.** *Answered 2026-11-13: the command
   exists and searches every annotation note in the vault by quote, note,
   tag and title; the README now describes it.* ISSUE_PLAN rows #108, #174, #243
   and #266 cite a command "Search all annotations…", but README does not
   mention it. If it searches every source, it answers the "searching with
   Obsidian's search is a nightmare" complaint (2.8) and belongs in the
   README and the write-up.
4. **Reading without copying into the vault.** People who keep PDFs outside
   the vault for size or privacy (2.12) will find that 0.3 copies the file
   in once (README L281–286). Is that the answer the write-up should give,
   or is reading in place planned?
5. **CHANGELOG heading.** *Fixed 2026-11-13: the heading now carries the
   release date and ISSUE_PLAN says the reader is released.* The 0.3.0 section was titled
   "0.3.0 (not yet released)" (CHANGELOG L6), and ISSUE_PLAN L7 says the
   branch "is not released". The background to this review says 0.3.0 was
   released on 2026-11-13. One of them needs updating before the write-up
   links to them.
6. **Where to announce.** Discord `#updates` (the owner's account appears to
   have the role), a Share & showcase › Plugins thread on the forum, short
   notes in the open topics listed in part 4, or a mix? *Part 6 now proposes
   a ranked answer.*
7. **The forum's disclaimer.** Every plugin showcase thread in 2026 opens
   with three questions: is it open source, is it completely free, and "is
   this plugin vibe-coded beyond the author's ability to comprehend how it
   works?". Only the owner can answer the third for 0.3.
8. **Writing into the original PDF.** One competing plugin's main pitch
   (2025–2026) is that it writes annotations into the PDF itself, "no
   lock-in". 0.3 deliberately never changes the original (README L148). Keep
   that, and answer lock-in with the export (part 4)? Or offer an opt-in
   "keep the annotated copy up to date"?

## 6. Second pass: recent discussions, and where to post

### What was read

- **Forum:** 23 searches limited to `after:2026-05-01` (PDF and EPUB
  annotation and highlights, PDF++, Zotero, readers, video notes and so on)
  found 285 topics active since May 2026. 144 have titles about PDFs, books,
  video or research, and 24 of them were opened, together with the five
  competing plugins' showcase threads. Each topic's open or closed state
  and last post were taken from the forum.
- **Discord:** six searches limited to `after:2026-05-01` (`pdf annotation`,
  `annotate pdf`, `epub`, `pdf`, `annotator`, `highlights`) gave about
  1,040 messages. 221 are about reading or annotating PDFs and EPUBs, and
  all were read. Five promising messages were opened in their channel to see
  whether anyone had answered.
- Nothing was posted or reacted to. The drafts mentioned below, and the
  direct links to the Discord messages, are kept with the session notes,
  outside the repository.

### What people are saying in 2026

- **The core feature is coming.** PDF annotation is in the "Planned" column
  of Obsidian's roadmap. People quote it when they recommend waiting
  (forum #118957, Discord `#general-help` 2026-08), and look forward to it
  (Discord `#vip-lounge` 2026-11). See todo 3.5.
- **PDF++ is the default recommendation.** Nearly every Discord answer from
  May to November 2026 that recommends a PDF plugin names PDF++. Its
  complaints: settings that stopped showing after an Obsidian update
  (2026-07, 2026-08, 2026-10), highlights not shown (2026-10), and no text
  box (2026-10).
- **New competitors since late 2025,** all with showcase threads on the
  forum: Starlight PDF (pen-first, writes into the PDF itself, paid,
  2025-12); Foxycape PDF (highlight-to-note sync, region screenshots, remote
  PDFs, theme-adapted pages, 2026-08); HandNote (Apple Pencil handwriting on
  imported documents, 2026-10); Tome Reader (EPUB, highlights to notes and
  flashcards, 2026-08). ZotLit 2.2 (2026-09/10) reads and annotates Zotero
  PDFs inside Obsidian. On Discord, small drawing plugins
  (`freedraw-pdf`, `ink-annotation`, `hand-note-layers`) were suggested to
  someone who wanted to draw on PDFs (2026-09).
- **Questions that 0.3 now answers,** asked from September 2026 on: how to
  draw or underline on a PDF (Discord `#plugin` 2026-09; forum
  [#118217](https://forum.obsidian.md/t/which-plugin-is-the-best-for-freehand-stylus-annotations-within-a-note/118217));
  how to search one's annotations (`#general-help` 2026-10); how to bring
  highlights made in another PDF app into a note (`#obsidian-clipper`
  2026-11); PDF and EPUB across Android, Linux and Windows (forum #118957);
  hiding the bars while reading a PDF on a phone (forum
  [#113544](https://forum.obsidian.md/t/go-full-screen-for-pdfs-on-mobile/113544),
  Discord `#plugin` 2026-11).
- **Annotator's own reputation** in 2026: it is still mentioned as an
  option (Discord `#plugin` 2026-08), and as a plugin whose annotations are
  hard to search (2026-10). No 2026 post found knew about 0.3.

### Where to post, ranked

"Necro" here means a reply to a closed thread, or to one that has been quiet
for about a year. Feature-request threads are the exception: a "current
workaround" note is normal there.

| Rank | Where | Last active | Recommendation |
| ---: | --- | --- | --- |
| 1 | Discord `#updates` | – | Post the announcement, following the channel's format (part 4); talk goes in a thread under it |
| 2 | Forum, Share & showcase › Plugins, a new thread | – | The forum's place for plugin launches; open with the three disclaimer answers (part 5, question 7) |
| 3 | Discord `#obsidian-clipper`: how to get highlights made in another PDF app (on Windows) into a note | 2026-11-13, no answer from anyone else | Reply: *Take in the annotations this PDF already holds*, then *Export annotations to a summary note* |
| 4 | Forum [#118957 Highlights and annotation on pdf and epub](https://forum.obsidian.md/t/highlights-and-annotation-on-pdf-and-epub/118957) | 2026-10-09, open | Reply: PDF and EPUB on Windows, Linux and Android; annotations are notes that sync with the vault |
| 5 | Forum [#31015 PDF annotation as a core feature](https://forum.obsidian.md/t/highlighting-annotation-of-pdfs-as-a-core-feature-of-obsidian-annotate/31015) | 2026-11-13, open | A short, non-promotional note correcting "broken since 1.5" and "fragile format", without arguing against the request |
| 6 | Discord `#general-help`: searching annotations was "a nightmare" | 2026-10-31, unanswered | Maybe: a short reply about *Search all annotations…*; they may have meant another plugin |
| 7 | Forum [#113544 Go full screen for PDFs on mobile](https://forum.obsidian.md/t/go-full-screen-for-pdfs-on-mobile/113544) (feature request) | 2026-05-27, open | Maybe: a workaround note about *Read full screen*, once it is confirmed to work on any PDF |
| 8 | Forum [#92206 Built-in Library for PDF and epub](https://forum.obsidian.md/t/built-in-library-for-pdf-en-epub-workflow-read-highlight-annotate-extract-highlights-annotations-to-a-note-synchronized/92206) | 2026-07-26, open | Maybe: it lists Annotator among plugins that stopped working |

Not recommended:
- **Necro-posts:** the older topics in part 4's list (#1403, #34372,
  #78182, #62233).
- **Discord conversations that have moved on or been answered:**
  `#plugin` 2026-09 (drawing on PDFs), `#academia-workflows` 2026-10
  (annotating papers purely in Obsidian), `#general-help` 2026-11
  (annotations into Canvas cards). The `#updates` post covers them.
- **Competitors' showcase threads.**

Not looked at: Reddit (r/ObsidianMD), which posts on both sites link to for
PDF-plugin discussions, and other social sites.

## Forum topics counted

All 50, oldest first, with the month of the first post since November 2021
that names Annotator. "Posts" counts posts since November 2021; "naming"
counts those that name Annotator or `annotation-target`.

| First | Topic | Posts | Naming | Themes |
| --- | --- | ---: | ---: | --- |
| 2021-11 | [Japanese PDF text not being displayed in Obsidian](https://forum.obsidian.md/t/japanese-pdf-text-not-being-displayed-in-obsidian/26315) | 2 | 1 | 2.6 |
| 2022-01 | [Highlighting / annotation of PDFs as a core feature of Obsidian](https://forum.obsidian.md/t/highlighting-annotation-of-pdfs-as-a-core-feature-of-obsidian-annotate/31015) | 109 | 8 | 2.2, 2.3, 2.4, 2.8, 2.9, 2.14 |
| 2022-02 | [How to extract paragraph with hashtag in new notes](https://forum.obsidian.md/t/how-to-extract-paragraph-with-hashtag-in-new-notes-coding-text-as-in-nvivo-maxqda/31779) | 5 | 1 | 2.8 |
| 2022-03 | [Create a note that linked to a specific paragraph in a pdf](https://forum.obsidian.md/t/create-a-note-that-linked-to-a-specific-paragraph-in-a-pdf/4233) | 29 | 7 | 2.1, 2.7, 2.8, 2.10 |
| 2022-03 | [PDF - Zotero - Obsidian: current state and collaboration for the ONE plugin?](https://forum.obsidian.md/t/pdf-zotero-obsidian-current-state-and-collaboration-for-the-one-plugin/34372) | 63 | 2 | 2.14 |
| 2022-04 | [Failed to load pdf in 0.14.5](https://forum.obsidian.md/t/failed-to-load-pdf-in-0-14-5/35704) | 6 | 1 | 2.9 |
| 2022-05 | [How to embed a pdf file?](https://forum.obsidian.md/t/how-to-embed-a-pdf-file/38097) | 8 | 1 | 2.1, 2.13 |
| 2022-06 | [Plugin annotator fails to load](https://forum.obsidian.md/t/plugin-annotator-fails-to-load/38353) | 4 | 2 | 2.2 |
| 2022-06 | [Annotator fix for iPad](https://forum.obsidian.md/t/annitator-fix-for-ipad-bug/39585) | 3 | 1 | 2.2, 2.4 |
| 2022-07 | [Problem with the plugin Annotator which doesn't work on iPad](https://forum.obsidian.md/t/problem-with-the-plugin-annotator-wich-doesn-t-work-on-ipad/40279) | 2 | 1 | 2.2, 2.4 |
| 2022-07 | [Automatically retrieve highlights in PDF and link it with Obsidian note blocks](https://forum.obsidian.md/t/automatically-retrieve-highlights-in-pdf-and-link-it-with-obsidian-note-blocks/7947) | 1 | 1 | 2.14 |
| 2022-08 | [Internal Links Not working](https://forum.obsidian.md/t/internal-links-not-working/42018) | 4 | 1 | 2.6 |
| 2023-01 | [Zotero versus Annotator plugin](https://forum.obsidian.md/t/zotero-versus-annotator-plugin/53345) | 5 | 2 | 2.8, 2.9, 2.14 |
| 2023-01 | [Obsidian window totally freezes on iPad, iPhone keeps reloading](https://forum.obsidian.md/t/bug-obsidian-window-totally-freezes-on-my-ipad-and-on-iphone-keeps-on-reloading/50926) | 4 | 1 | 2.4, 2.6 |
| 2023-01 | [If I "create a new file" it creates it, but can't open it afterwards](https://forum.obsidian.md/t/if-i-create-a-new-file-it-creates-it-but-cant-open-it-afterwards-failed-to-load-untitled-enonent-no-such-file-or-directory/52659) | 6 | 1 | 2.2 |
| 2023-02 | [Auto-importing highlights from PDFs, articles, EPUBs into Obsidian](https://forum.obsidian.md/t/auto-importing-highlights-from-pdfs-articles-epubs-etc-into-obsidian/54439) | 3 | 1 | 2.14 |
| 2023-04 | [Link file from cloud to use with Annotator plugin](https://forum.obsidian.md/t/link-file-from-cloud-to-use-with-annotator-plugin/58025) | 4 | 2 | 2.1, 2.12 |
| 2023-04 | [Twitter favorites as an Obsidian brain](https://forum.obsidian.md/t/twitter-favorites-as-an-obsidian-brain-with-graphs-and-canvases/54342) | 8 | 1 | 2.14 |
| 2023-05 | [Automation of Annotator](https://forum.obsidian.md/t/automation-of-annotator/58929) | 2 | 1 | 2.1 |
| 2023-06 | [Native EPUB Support](https://forum.obsidian.md/t/native-epub-support/1403) | 12 | 1 | 2.1, 2.5 |
| 2023-06 | [Cannot edit fillable sections of pdf](https://forum.obsidian.md/t/cannot-edit-fillable-sections-of-pdf/61283) | 2 | 1 | 2.9 |
| 2023-08 | [New PDF reader: automatic PDF link descriptions](https://forum.obsidian.md/t/new-pdf-reader-automatic-pdf-link-descriptions/62233) | 7 | 1 | 2.7, 2.14 |
| 2023-08 | [Is there any way to self-define pdf background color?](https://forum.obsidian.md/t/help-is-there-any-way-to-self-define-pdf-background-color/64511) | 3 | 1 | 2.11 |
| 2023-09 | [Annotator help: PDF doesn't load despite the annotation-target property](https://forum.obsidian.md/t/annotator-help-pdf-doesnt-load-despite-property-line-annotation-target-loads/66911) | 4 | 2 | 2.1 |
| 2023-09 | [Bringing highlights from Zotero / hiding the markdown chunks in Annotator](https://forum.obsidian.md/t/help-bringing-highlights-from-zotero-to-obsidian-how-to-hide-ugly-markdown-chunks-in-annotator-in-edit-mode/67952) | 4 | 1 | 2.8 |
| 2023-09 | [How to link an annotation from Annotator to Excalidraw?](https://forum.obsidian.md/t/how-to-annotation-from-annotator-obsidian-linked-to-excalidraw/68258) | 3 | 1 | 2.7 |
| 2023-11 | [Annotation window in annotation plugin](https://forum.obsidian.md/t/annotation-window-in-annotation-plugin/70920) | 3 | 1 | 2.11 |
| 2023-11 | [Annotator plugin problem: separate note with annotations](https://forum.obsidian.md/t/annotator-plugin-problem-seperate-note-with-annotations/71314) | 7 | 3 | 2.1 |
| 2023-11 | [Annotator plugin bug with recent update: pdf flushes to left side](https://forum.obsidian.md/t/annotator-plugin-bug-with-recent-catalyst-update-pdf-flushes-to-left-side-and-cant-click-on-it/72095) | 7 | 2 | 2.2 |
| 2023-11 | [Epub file misbehaving](https://forum.obsidian.md/t/epub-file-misbehaving/70359) | 6 | 2 | 2.5 |
| 2023-11 | [Highlight PDF not working (anymore?) on macOS / Windows](https://forum.obsidian.md/t/highlight-pdf-not-working-anymore-on-macos-win-12/70924) | 2 | 1 | 2.1 |
| 2023-11 | [Embed part of a pdf](https://forum.obsidian.md/t/embed-part-of-a-pdf/71695) | 4 | 1 | 2.7, 2.13 |
| 2023-11 | [Notes on web pages or HTML files (Zotero snapshot)](https://forum.obsidian.md/t/is-there-a-way-to-use-obsidian-to-take-notes-on-web-pages-or-html-files-zotero-snapshot-obsidian-does-not-support-browsing-long-page-pdfs-a4-pdfs-will-lose-web-page-information/72092) | 2 | 1 | 2.13 |
| 2023-12 | [How to export and change style for quotes from pdf annotations](https://forum.obsidian.md/t/how-to-export-and-change-style-for-quotes-from-pdf-annotations/72289) | 2 | 1 | 2.8 |
| 2023-12 | [Annotations plug in](https://forum.obsidian.md/t/annotations-plug-in/73048) | 2 | 1 | 2.1 |
| 2024-01 | [Annotator plugin crashing Obsidian on install and refusing to enable](https://forum.obsidian.md/t/annotator-plugin-crashing-obsidian-on-install-and-refusing-to-enable/74091) | 3 | 2 | 2.2 |
| 2024-01 | [Problem with Annotation display](https://forum.obsidian.md/t/problem-with-annotation-display/74272) | 4 | 2 | 2.2, 2.11 |
| 2024-02 | [Uncaught Exception: Error](https://forum.obsidian.md/t/uncaught-exception/76406) | 2 | 1 | 2.2 |
| 2024-03 | [Text Selection on Mobile](https://forum.obsidian.md/t/text-selection-on-mobile/78005) | 2 | 1 | 2.4 |
| 2024-03 | [Open & read PDFs out of vault with Obsidian's embedded PDF reader](https://forum.obsidian.md/t/open-read-pdfs-out-of-vault-with-obsidians-embedded-pdf-reader/78182) | 1 | 1 | 2.12 |
| 2024-03 | [Templater script to create a new note for annotating selected pdf](https://forum.obsidian.md/t/templater-script-to-create-a-new-note-for-annotating-selected-pdf/78721) | 2 | 1 | 2.1 |
| 2024-05 | [No annotator menu shows up when I highlight text](https://forum.obsidian.md/t/no-annotator-menu-shows-up-when-i-highlight-text/82778) | 3 | 1 | 2.1 |
| 2024-07 | [Obsidian has become very slow, lags constantly](https://forum.obsidian.md/t/obsidian-has-become-very-slow-lags-constantly/84634) | 5 | 2 | 2.3, 2.6, 2.14 |
| 2024-11 | [Built-in Library for PDF and epub workflow](https://forum.obsidian.md/t/built-in-library-for-pdf-en-epub-workflow-read-highlight-annotate-extract-highlights-annotations-to-a-note-synchronized/92206) | 9 | 1 | 2.2, 2.3, 2.12, 2.14 |
| 2024-12 | [Understanding JavaScript in Obsidian](https://forum.obsidian.md/t/understanding-javascript-in-obsidian/94030) | 6 | 2 | 2.14 |
| 2025-01 | [Help with Annotator](https://forum.obsidian.md/t/help-with-annotator/95337) | 7 | 4 | 2.1, 2.3, 2.14 |
| 2025-03 | [Debugging a plugin that can't be enabled](https://forum.obsidian.md/t/debugging-a-plugin-that-cant-be-enabled/98813) | 8 | 2 | 2.3 |
| 2025-07 | [Linking notes to exact passages from PDFs](https://forum.obsidian.md/t/linking-notes-to-exact-passages-from-pdfs/102595) | 3 | 1 | 2.3, 2.14 |
| 2026-08 | [How do I mass import saved Instagram posts?](https://forum.obsidian.md/t/how-do-i-mass-import-bookmarked-or-saved-instagram-posts/82125) | 4 | 1 | 2.14 |
| 2026-10 | [Highlights and annotation on pdf and epub](https://forum.obsidian.md/t/highlights-and-annotation-on-pdf-and-epub/118957) | 13 | 1 | 2.4, 2.14 |
