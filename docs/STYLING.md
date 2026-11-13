# Styling the native reader

The reader is built from Obsidian's own controls and theme variables: icon
buttons are the host's `.clickable-icon`, the search box is its
`.search-input-container`, sort is a `.dropdown`, tags use the theme's tag pill
(`--tag-*`), dialogs and settings are `Modal`/`Setting`, and the note field is
Obsidian's Live Preview editor. A theme therefore restyles Annotator without
knowing about it.

## Variables

Set these on `body` from a CSS snippet, or use the **Style Settings** plugin
(the stylesheet ships a settings block for it).

| Variable | Default | What it controls |
| --- | --- | --- |
| `--annotator-yellow`, `-orange`, `-pink`, `-purple`, `-blue`, `-green` | the theme's `--color-*-rgb` | Each ink, as `r, g, b`. Used for page marks, card bars, swatches and exported callouts. |
| `--annotator-mark-opacity` | `.4` | How strongly a highlight tints the page. |
| `--annotator-mark-opacity-dark` | `.5` | The same on a dark page, where a highlight is light on dark. |
| `--annotator-paper` | `#f4ecd8` | The paper of the "Sepia" page, for PDFs and books. Set it to parchment, grey, or any colour (a hex, `rgb()` or `hsl()` value). |
| `--annotator-paper-text` | `#433422` | The text of a book on that paper. A PDF keeps its own ink. |
| `--annotator-note-underline` | `2px` | Line under highlights that carry a note (`0px` to disable). |
| `--annotator-quote-font`, `--annotator-quote-size`, `--annotator-quote-color` | text font, UI small, normal text | Quoted passages in the sidebar. |
| `--annotator-quote-lines` | `4` | Lines of a long quote before "More". |
| `--annotator-radius`, `--annotator-radius-small`, `--annotator-pill` | `--radius-m`, `--radius-s`, pill | Corner shapes; a square theme gives square cards and a square selection bar. |
| `--annotator-surface`, `--annotator-raised`, `--annotator-hairline`, `--annotator-hover` | secondary / primary background, border, hover | Sidebar surfaces. |
| `--annotator-gap` | `--size-4-3` | Sidebar gutter. |

Body classes: `annotator-compact` (tighter cards, no dates) and
`annotator-always-actions` (card actions always visible).

```css
/* Example: softer highlights, serif quotes, a teal "green". */
body {
  --annotator-mark-opacity: .28;
  --annotator-quote-font: "Iowan Old Style", Georgia, serif;
  --annotator-green: 0, 150, 136;
}
```

## Hooks

- `[data-annotator-ink="blue"]` is set on every mark, card, swatch and tick, and
  defines `--annotator-ink` for that element.
- Marks on the page: `.annotator-native-mark` (`.has-note`, `.is-active`,
  `.is-hover`). The mark layer blends with the page (`multiply` on light paper,
  `screen` on dark), so text stays crisp.
- Exported summaries write `> [!quote|blue]`; the stylesheet tints those
  callouts with the same ink via `data-callout-metadata`.

## Colour names

Settings → Highlight colours lets each ink be named ("Key idea", "Question").
Names appear in tooltips, menus, commands' results and exports; the stored
value stays the ink key (`"color": "blue"`), so renaming never rewrites notes.

## Page colours, the book and video readers, and areas

- **Page colours.** Readers choose Auto, Light, Sepia or Dark for PDF and EPUB
  pages. Auto is the app's surface: a PDF page takes the theme's own
  `--background-primary` in a dark theme, an EPUB inherits every host variable.
  A PDF view carries `data-annotator-page="dark|light"` so anything drawn over
  the page can follow the page rather than the app. Ink on dark pages uses
  `--annotator-mark-opacity-dark` (default `.5`).
  The chooser is `.annotator-page-themes` > `.annotator-page-theme[data-page-theme]`
  (`.is-current`), with a `.annotator-page-swatch` in each.
- **Book reader.** `.annotator-epub-reader` with `data-reader-theme` and
  `data-reading-mode`. Bar: `.annotator-book-toolbar`; the controls card:
  `.annotator-book-options`; the text column follows `--file-line-width` and
  `--file-margins`; the footer is `p[role="status"]`, whose hairline is driven
  by `--annotator-book-progress` (0…1).
- **Video reader.** `.annotator-video-view`; the player `.annotator-video-surface`;
  the timeline `.annotator-video-timeline` with `.annotator-video-marker`
  (`.is-selected`) and `.annotator-video-playhead`; transcript rows
  `.annotator-transcript-passage` (`.is-current`) with `.annotator-transcript-time`.
- **Areas.** A marked region is `.annotator-native-mark.annotator-area-mark`
  inside `.annotator-native-areas`: a frame in `--annotator-ink`, never blended.
  While marking, the view has `.annotator-area-mode` and the drag is
  `.annotator-area-band`. In the sidebar: `.annotator-card-area`.

## Annotation notes

A Markdown pane showing a note that has an `annotation-target` carries the
class `annotator-note`, in the editor and in reading view. A snippet can style
the note's stored quotes without guessing at its contents:

```css
/* Quieter annotation blocks in the raw note. */
.annotator-note .markdown-preview-view blockquote,
.annotator-note .cm-quote { color: var(--text-muted); }
```

The class goes when the property does.
