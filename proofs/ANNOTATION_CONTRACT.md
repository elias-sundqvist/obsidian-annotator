# Typed local annotation contract

This contract models the plugin as the annotation backend, as the old reader
used it. There is no Hypothesis server in this path. The evidence is the client
the old plugin bundled, at commit
`6e9f06ad6bd8b096a79614b16b0733e0491a2d30`, together with the local adapter:

- `fixtures/contract/defineGenericAnnotation.tsx`: intercepted routes and dispatch (the old plugin's, frozen).
- `fixtures/legacy-annotationUtils.tsx`: defaults, storage omissions, display and read overlay.
- `fixtures/contract/client-types-api.js` (the Hypothesis client's `src/types/api.js` at the pinned commit): selectors and targets; its Annotation typedef explicitly says it is incomplete.
- The client's `src/types/annotator.js`, `src/sidebar/services/annotations.js`,
  `src/sidebar/services/api.js`, and `src/sidebar/test/annotation-fixtures.js`:
  metadata, producers, HTTP serialization and actual fixture shapes.

These are source-derived types for supported data. The old JavaScript adapter
does not validate these types: it also accepts malformed objects until some
later property access fails. The typed layer rejects malformed known fields
before returning a changed document. It retains unknown fields as JSON rather
than claiming the incomplete upstream typedef is exhaustive.

## Data model

Executable definitions: [annotation_types.bend](annotation_types.bend).
`Field<A>` distinguishes missing from present; `Nullable<A>` distinguishes null
from a value. Present empty strings and arrays are not missing.

| Data | Representation |
| --- | --- |
| Content | Optional text string, tags string list, targets list, references string list |
| Target | Required source string, optional selector list; replies may omit selectors |
| TextQuoteSelector | Required exact string; optional prefix and suffix strings |
| TextPositionSelector | Required start/end numeric offsets in UTF-16 units |
| RangeSelector | Required startContainer/endContainer XPath strings and numeric startOffset/endOffset |
| Unknown selector type | Type string and preserved JSON members |
| Identity | Optional string id/group/user, permissions and user_info |
| Permissions | Independently optional read/update/delete string lists; actual fixtures contain partial objects |
| User info | Nullable object; optional nullable display_name string |
| Document | Optional title, links, fingerprint, favicon and metadata dictionaries |
| Title | String or string list, reflecting observed source shapes |
| Document links | Required href, optional rel/type strings |
| Metadata | dc/eprints/facebook/highwire/prism/twitter: string keys to string lists |
| Audit | Optional created/updated/uri strings |
| Visibility | Optional hidden/flagged booleans; moderation with optional numeric flagCount |
| Links | Optional html/incontext/json strings |
| Extensions | Preserved JSON members on annotations and nested supported objects |

Numbers use `JsonNumber{literal: String}` rather than narrowing to a Bend
machine integer. The JavaScript boundary validates numeric syntax and retains
numeric lexemes, including large integers and exponents. UTF-16 offsets are not
converted into Bend string character counts. No unsupported assumption about
nonnegative offsets, ordering, maximum size, ISO dates, valid URLs or server
principal syntax is imposed. Local permissions use `Obsidian User`.

Separate types represent `WriteRequest`, `StoredAnnotation`, `WriteResponse`,
and `LoadedAnnotation`, plus delete/search response shapes. Loaded values have
required fields for the defaults actually supplied on read. A typed local read
helper does not imply the intercepted HTTP GET annotation route works: the
legacy route advertises it but dispatches non-DELETE requests to the body-based
writer. Search is the actual intercepted read path. The annotate.tv video API
has a separate `_id` format and is outside this model.

## Write, store and read

The client's HTTP serializer removes only top-level `$` properties; nested ones
survive. PATCH sends a full object, not a merge patch. The local backend chooses
the body ID, ignoring the PATCH path ID; a missing or empty body ID uses the
caller-supplied fresh ID. Both methods are upserts.

Every write sets `flagged=false`. The immediate response retains other supplied
fields. Storage omits id, group, permissions, user and user_info. It also omits
**all tags**: the default object is constructed with those same tags, which are
stored in the visible section instead. Empty text/target, false hidden/flagged,
and empty links are omitted. `references=[]`, empty document metadata and
unknown fields survive. An immediate response and later read can therefore
have different identity metadata.

Reads restore anchor ID, empty text/tags/targets, group `__world__`, user/display
name `Obsidian User`, all three permissions containing that user, false
hidden/flagged, and empty links. Imported stored values override defaults except
group, which is always `__world__`.

Visible comments and tags override stored values. Visible quote prefix/suffix
overlay every quote selector in the first target only; JSON exact remains
authoritative. The writer uses the last quote selector of the first target for
display and trims displayed context/exact. Tests compare all eight display
setting combinations with the actual old codec.

The codec distinguishes absent visible sections from present
empty sections: absence falls back to JSON/default, while empty clears the
field. This deliberately improves on the old reader's absent-tags exception
and possible undefined comment. The typed writer rejects tags that cannot
round-trip through the legacy comma display (written with one space in front,
so that the quoted line is `> #a, #b` and Obsidian takes its first tag for a
tag; both readers trim it), including commas, empty tags and
trailing whitespace, before returning a mutation.

## Example

Run using the official Bend Node import hook described in README.md:

```js
import { createTypedAnnotation, readTypedAnnotation,
         updateTypedAnnotation, deleteTypedAnnotation } from './typed-crud.mjs';
const created = createTypedAnnotation(markdown, {
  id: 'annotation1', text: 'A comment', tags: ['example'],
  target: [{ source: 'document.pdf', selector: [
    { type: 'TextQuoteSelector', exact: 'selected text' },
    { type: 'TextPositionSelector', start: 12, end: 25 },
  ] }],
}, 'fallbackFreshId');
const loaded = readTypedAnnotation(created.source, 'annotation1');
const updated = updateTypedAnnotation(created.source, 'annotation1', {
  id: 'annotation1', text: 'Edited comment', tags: [],
}, 'anotherFreshId');
const deleted = deleteTypedAnnotation(updated.source, 'annotation1');
```

Wrappers use the existing source recognizer and CRUD. Requests/results are
actual compiled Bend values. `typed-annotations.mjs` also exposes JSON
encoding/decoding and write planning. The caller supplies fresh IDs; no
filesystem writes occur here.

## Proofs and tested boundaries

New checked laws cover body-ID choice, ignored path ID, normalization, clearing
flagged state, preserving content/document/extensions, default omission,
identity restoration, idempotent visible overlays, exact-quote preservation
and first-target-only changes. JSON-AST encode/decode round trips are checked
for the three known selectors with empty extension sets, including all
prefix/suffix presence combinations. Rejecting a known quote without exact is
checked too. Existing whole-document and reparsed source-cycle laws remain.

This does not prove a universal round trip for the complete annotation schema,
arbitrary extension sets, or raw JSON parsing. Extension-key disjointness is
enforced by the decoder, not every arbitrary typed constructor. Numeric literal
validity likewise belongs to the JSON boundary. JS adapters, generated-code ABI,
JSON parsing, source/byte conversion and compiler/runtime remain trusted/tested.
JSON.parse follows the old adapter's last-value behavior for duplicate keys;
the schema rejects duplicate keys supplied directly in an AST. Untouched
Markdown retains its original JSON bytes rather than reserializing them.

`typed.test.mjs` imports pinned client fixtures and executes the actual local
annotationUtils functions as a differential oracle. It compares both real note
fixtures, wire stripping, storage defaults and every display setting; it tests
nullable/absent/empty values, malformed known fields, extensions, numeric
lexemes, identity and source CRUD. Mutation controls require selected broken
implementations to fail proof checking.

The initial Bend 2.0.5 typed-module import took roughly 44 seconds and 2.4 GB
peak memory. Native PDF integration exposed enormous JS functions generated
from literal-string patterns. Selector dispatch and recognizer opener checks
now use explicit String.eq with the same strict rules; all existing laws are
unchanged. This substantially reduces generated code and test import time.
The plugin is compiled ahead of time rather than loading the Bend
compiler inside Obsidian: see `build.mjs`.
