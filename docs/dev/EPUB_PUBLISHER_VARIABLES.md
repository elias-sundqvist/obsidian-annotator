# Publisher CSS variables — native 0.0.41

Publisher custom properties and `var()` now resolve in the inert original EPUB
DOM before the existing passive declarations are applied to projected elements.
No custom property, publisher class or stylesheet is installed in Obsidian's
cascade. Host theme variables are not an input. Archive and source text are not
modified, and the existing original/rendered text mapping remains in use.

## Semantics and limits

The design follows [CSS Custom Properties Level 1](https://www.w3.org/TR/css-variables-1/)
for case-sensitive names, CSS-escaped identifiers, ordinary custom-property
cascade priorities, computation before inheritance, initial/inherit/unset, empty
values, nested fallbacks, dependency cycles including fallback edges, and token
boundaries. A property invalid after substitution masks earlier declarations
with `unset`, including affected shorthand longhands; it does not resurrect an
earlier author value. These are implemented cases, not a complete CSS conformance
claim.

Definitions cascade on original elements, including the HTML root and ancestors
whose own styles are not projected. Each element inherits already-resolved
parent values. Substitution precedes passive-value checking, browser property
validation, viewport-length conversion and private packaged-font aliasing.
Conditional definitions rebuild with the existing pane/device condition refresh.
HTML inline inherited declarations now enter that root cascade as well.

The existing CSS/import/rule/selector limits remain. Collection and ordinary
declaration evaluation each permit 250,000 applications per refresh. Variable
scopes cover at most 10,000 original elements, at most 256 distinct definitions
per element, dependency depth 32, nested substitution depth 64, 16,384 characters
per expanded value, one million resolver steps, and two million cumulatively
serialized characters per refresh. Limits produce omission reporting; bounded
processing may omit otherwise valid oversized styles. Resolved values still
pass the existing property/function whitelist. URL-valued variables cannot
introduce network-loaded styles or images through this path.

Custom-property `revert`/`revert-layer`, `@property` registration, cascade layers,
animation, generated content, container queries, general positioned layout,
vertical writing and the full browser CSS grammar remain outside this feature.
Unused or inherited oversized variable graphs can exhaust the shared bounded
resolver and omit other variable-based declarations; normal literal declarations
remain independently handled. Full HTML-root/rem semantics and actual-browser
corpus/performance coverage remain release gates.

## Validation

244 automated tests and the release build pass. New regressions cover scoped
lookup versus a conflicting host custom property, specificity/inline/important
priorities, case/escaped names, parent computed values, direct/indirect/fallback
cycles, valid empty values, CSS-wide custom-property keywords, invalid computed
values and shorthand resets, token concatenation refusal, unsafe resolved
values, responsive definitions/viewport values, packaged family and shorthand
aliasing, bounded exponential expansion, source-DOM integrity, selection-node
retention and original text anchors. The complete synthetic fixture compares
variable-based properties against literal reference properties. These are
host/parser/style tests; no Bend source or formal theorem changed.

Actual emulator-5554 / Obsidian 1.14.4: Publisher Variables Field Guide rendered
matching pairs for packaged italic font, teal isolation fallback, red inherited
computed value and purple cycle fallback. Native selection created a highlight
on “passage”. Landscape changed the variable-driven heading from blue to green
and kept the highlight aligned; portrait restored blue and the original layout.
The comparison strings differ by their labels, so this is visual/property
equivalence evidence rather than pixel-identical text rendering.

The fixture, before/after annotation files, raw screenshots/accessibility trees,
configuration backups and installed artifact hashes are retained at
`~/Documents/obsidian-annotator-native-test-validation/2026-11-01-publisher-variables/`.
The source is explicitly synthetic, with the existing Liberation font's OFL
notice retained. This does not establish published UI, desktop/iOS or broad
real-book layout compatibility.

Cold reopening retained the highlight and comparison styles. After rotation and
reopening, the saved annotation note stayed byte-identical; its pre-creation
prose remained an exact prefix. The source EPUB stayed byte-identical. The
frozen published parser retrieved the record, and its selector engine resolved
“passage” in the original chapter. This is parser/selector evidence, not an
actual published UI round trip for this new fixture.

Screenshots 10–12 repeat portrait/landscape/portrait with the final release after
adding explicit excessive-nesting omission reporting. The final installed main.js
SHA-256 is `e42503bad1aac12951308a0084b5c76e55f934165f77603a259f255f6d700b34`,
matching dist. Earlier screenshots 02–08 used the same normal-value behavior
before that reporting guard; their bundle hash is separately recorded. Exact
pre-test workspace, enabled plugin list, native settings and emulator rotation
preferences were restored. The new synthetic book/note remain available in the
isolated test vault; native 0.0.41 remains installed. `audit.json` retains the
document, artifact and restoration checks.
