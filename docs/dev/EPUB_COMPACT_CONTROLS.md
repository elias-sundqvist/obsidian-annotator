# Compact native EPUB controls — 0.0.42

The previous EPUB toolbar repeated the book title and wrapped every navigation,
font, mode and search control into several rows. The default reader now keeps
Back, chapter selection, page turning and a Reading controls toggle in one row.
The book title remains in Obsidian's own view/tab title. Font size, reading mode,
previous/next chapter and search remain available in the expandable panel.

Buttons use Obsidian icons with explicit accessible names and titles. The toggle
exposes its panel through a unique aria-controls ID and aria-expanded state. The
panel is initially hidden, with an explicit hidden CSS rule; Escape closes it
and returns focus to the toggle. Enter runs chapter search. IME composition
prevents either shortcut from interrupting composition. Status updates have a
status role. This is not a complete screen-reader/keyboard accessibility audit.

Desktop icon targets are 32px and mobile targets 44px. The chapter picker shrinks
without forcing horizontal overflow in ordinary phone widths. Extremely narrow
primary rows can scroll horizontally. Expanded controls have bounded height and
scrolling, while their primary navigation row stays sticky. Page arrows reflect
the effective EPUB page progression, including a chapter's RTL declaration when
no package progression overrides it. Scroll mode hides page-turn buttons.

Opening/closing the panel feeds the existing viewport resize lifecycle, keeping
reading positions as original text offsets rather than displaced page geometry.
Preference and navigation handlers retain their existing implementation; no
annotation format, source archive or Bend proof changed.

## Automated validation

245 tests and release build pass. A compiled-reader regression checks all
primary accessible names, panel linkage/state, secondary control availability,
search Enter, Escape focus restoration, composition guards, page-turn callbacks,
font/mode preference callbacks and inherited RTL direction. Controlled geometry
changes panel-open viewport height from 100 to 60 and back; original offset 8,
the selected capture and original text-node identity remain stable. EPUB bytes
are unchanged. Existing continuous/paginated/RTL/hidden-pane lifecycle tests
continue to pass. CSS sizing/layout itself requires actual-host evidence.

## Android evidence

On emulator-5554 / Obsidian 1.14.4, the same Publisher Variables Field Guide
fixture begins its book heading at y=567 instead of y=1050 in the saved native
0.0.41 portrait reference (1080x2400 capture). Both images contain the same
saved highlight. The 483-pixel change is screen geometry in this one fixture,
not a universal CSS-pixel or percentage claim.

The collapsed row and existing “passage” highlight render correctly. Expanding
shows text size, mode, chapter navigation and search. Typing an absent query and
pressing Enter produced the expected No match notice; Escape collapsed the panel
and Android's accessibility tree confirmed focus returned to Reading controls.
Portrait/landscape reflow retained the highlight. Selecting Scroll through the
actual native mode dropdown removed page-turn controls and retained the saved
annotation.

Evidence: raw screenshots, accessibility trees, original workspace/settings and
stage-by-stage artifact/document checks at
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-compact-reader-toolbar/`.
The before image/XML are copied unchanged from the previous 0.0.41 comparison
checkpoint; they were not regenerated or presented as the current release.

Desktop/pop-out/iOS, very narrow panes, actual screen readers, Android IME text
composition and long/RTL-book live open-close position checks remain separate
coverage. This does not establish complete native replacement parity.

Cold reopen retained the UI-selected Scroll preference with the panel collapsed.
Switching back to Pagination restored both page buttons. With the final CSS,
landscape controls could scroll to expose Find while Android's navigation-row
bounds stayed unchanged (screenshots 18–19). Keyboard focus reached the font
slider; one right-arrow step persisted 105%, and the reverse step restored 100%.
The highlight stayed aligned through these changes and the final portrait view.

The source EPUB and complete annotation note remained byte-identical. Original
workspace, enabled-plugin list, native settings and emulator rotation preferences
were restored; native 0.0.42 remains installed. The final artifact audit records
main.js SHA-256 `cac9af50586db1a0caed674cc49474dbdabb251a91e9524e0267acefb2d39bb1`
and stylesheet SHA-256 `d178599a520f492818b8ebc67abf35902c4ae8234a7590d2695090e97008e433`.
Both installed artifacts match dist. Screenshots 02–10 preceded the final sticky
row CSS refinement; 12–23 use the final stylesheet. The source/controls handlers
are the same in both sets. Full tests, release output and integrity/geometry
checks are retained alongside audit.json.
