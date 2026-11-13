# Frozen published-reader reference

`lock.json` pins Annotator 0.2.11 (release commit and its actual client gitlink),
not the current experimental client. The official release API and downloaded
`main.js` were checked on 2026-11-01; the published bundle is 26,250,281 bytes. It is not bundled or
executed by native production builds.

`oracle.mjs` archives the immutable client commit from the local submodule object
store into `.generated`, then bundles its unchanged HTML anchoring/metadata and
frame routing, structured query parsing and local matching. One private routing function is exported to the test harness;
its implementation is unmodified. The frozen serializer is the pre-existing
`bend-codec/fixtures/legacy-annotationUtils.tsx`, byte-identical to release source,
with a checksum guard. These source-derived tests are **not** live execution of
the published release bundle, its iframe bootstrap, or an entire user workflow.
The original sources retain their license headers; see
[client license](../HYPOTHESIS_LICENSE.txt) and repository AGPL licensing.

Run `npm test` in `experiments/native-pdf` for all three reference paths (native,
patched legacy and frozen published). The submodule must contain the pinned git
object; missing objects fail the build rather than falling back to current code.
The reference is development-only. `npm run build:release` never reads it.

Run `node compat/published/fetch.mjs` from this experiment to fetch and checksum
the official 0.2.11 bundle into `.generated/published-release/main.js` for live
rehearsals. It does not install/run it or touch any vault. When using it in a
disposable vault, use the original release manifest and original plugin ID.

| Contract | Source-derived coverage | Still required |
| --- | --- | --- |
| PDF/web native blocks found by published URI search | Frozen parser alternating CRUD | Exact published UI cold-open/edit/link checks |
| Native HTML selectors | Frozen published describe/anchor engine | Live web/EPUB frame lifecycle and navigation |
| EPUB routing | Exact frozen frame routing, nested/Unicode/query chapter paths | Multiple chapters, page notes/replies, restart, repackaging in actual published UI |
| Opaque JSON/prose | Ordinary alternating edits; published account-field loss explicitly characterized | Larger historical corpus, provenance recovery through published UI |
| Settings/upgrade | Native schema adoption, defaults, opaque backup, Dataview type tests | Original-ID installed upgrade/rollback and settings UI |

A test-discovered difference was corrected: native EPUB chapter URIs must use the
published reader's canonical URL construction, rather than percent-encoding the
entire chapter href. Encoding `/` prevents exact frame routing to nested chapters.
The published writer deliberately drops account `user`/`permissions` fields. New
reader tests must preserve and report that limitation; local cloud-import
provenance is a separate recoverable exchange boundary, not a claim that the
unmodified published writer preserves every JSON field.

## Video timestamp reference

`legacy-videoAnnotationUtils.tsx` is byte-identical to the video codec at the
locked plugin commit. Development builds check both its SHA-256 and the Git
object before bundling `.generated/published-video.mjs`. Release builds neither
read nor include this reference. `video-compatibility.test.mjs` freezes full
Markdown results for ordinary CRUD, separator accumulation, LF/CRLF/mixed/EOF
boundaries, duplicate and regex-interpolated IDs, malformed/nonfinite time,
lexical time normalization, Unicode/title punctuation, quoted/fenced comments,
trailing-space loss, and unrelated prose/Hypothesis-looking blocks.

This characterizes the published source's behavior, including unsafe historical
mutations; it is not a native video codec, a proof, or playback/UI evidence.
Native authoring must refuse or explicitly explain unrepresentable input rather
than silently inherit these losses. The real embedded playback gate remains open.

### EPUB live rehearsal fixture

`test-support/published-epub-fixture.mjs` builds a package/navigation-complete variant of the synthetic fidelity book, retaining chapter markup and the publication identifier exactly. `published-epub-fixture.test.mjs` exercises the installed epub.js 0.3.93 container, packaging and navigation parsers and checks XHTML head/namespace presence and unchanged chapter bytes. This is fixture validation, not execution of the frozen reader bundle or an EPUBCheck certification.

The earlier minimal Native Reader Field Guide fixture omitted XHTML head/namespaces and a publication identifier. The unmodified published reader failed during its content hooks (`No Element Provided` / `injectIdentifier` appendChild) before annotation compatibility could be assessed. Initial cold startup also missed frontmatter until reload. No annotation corruption was observed or claimed. A complete variant is staged in the isolated upgrade rehearsal; its actual published UI/anchor check remains pending because the Mac locked. Evidence and raw console state: `~/Documents/obsidian-annotator-native-test-validation/2026-11-01-published-epub/`.
