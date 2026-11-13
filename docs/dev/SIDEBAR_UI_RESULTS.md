# Native annotation sidebar and selection actions

Implemented on `experiment/obsidian-native-pdf`, native plugin version 0.0.8.

The sidebar follows the bundled Annotator/Hypothesis interaction pattern while
using Obsidian controls and Markdown rendering: annotation cards, quoted passages,
comments, tags, dates, threaded replies, edit/delete actions, search, location/date
sorting, Annotations and Page Notes tabs, and a highlight visibility toggle.
The composer opens explicitly for new annotations, edits, replies and page notes;
Save, Cancel, Markdown preview and formatting controls are available.

Selecting text offers Annotate (A) and Highlight (H). Annotate opens the composer;
Highlight immediately saves a highlight-only record. PDF, EPUB and reading-copy
views share the selection toolbar; live websites use equivalent guest controls.
The website guest exports selectors and a versioned action intent, never comments,
tags or vault paths. Owned toolbar DOM is excluded from text indexing and mutation
revisions. Website highlights still use browser CSS Custom Highlights.

## Validation

- Native strict TypeScript build and all 54 tests pass. Added tests exercise
  selection action dispatch, shortcuts, cancellation, retained selectors and
  exclusion of guest UI mutations from document revision tracking.
- In the isolated test vault, the OpenAI ChatGPT article was used to create an
  immediate highlight, a formatted comment with tags, a reply and a page note.
  Search, highlight visibility, edit cancellation and page-note deletion worked.
- A storage audit confirmed all three pre-existing legacy-created records were
  unchanged, the new highlight had an empty comment, tags and reply references
  persisted, the cancelled draft was absent and the deleted page note was absent.
- The selection toolbar was visibly verified in the native Alice EPUB view.
  The Mac locked before the optional EPUB H-key save check. PDF selection actions
  use the same tested toolbar but were not separately exercised live in this pass.
- Final small fixes (reply tab selection, initial editor focus, navigation intent
  tracking and preventing capture while saving) passed the build/tests. A final
  live reload was unavailable after the Mac locked.

Screenshots and the storage audit are private local artifacts under
`~/Documents/obsidian-annotator-native-test-validation/2026-10-31-sidebar`.
Only the isolated test vault was modified. The storage schema and Bend CRUD rules
are unchanged; no public service received test annotations.
