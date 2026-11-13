# Frozen references

What the reader is tested against, kept as it was. These files are fixtures:
they are copied into `.generated/` by the build and never rebuilt. Each has a
checksum in `lock.json`, and a changed file stops the build.

They were built once, on 2026-11-12, with esbuild 0.25.12 (`bundle`, ESM,
`platform: browser`, `target: es2022`) from sources that were then deleted
from this repository with the old plugin. The sources remain in the history
of this repository and of the client fork at the commits named below.

| File | Built from | At |
| --- | --- | --- |
| `legacy.mjs` | `src/annotationUtils.tsx` of the original plugin (its note parser and writer) | plugin commit `f07c213c43e99feb94292eda68dcb7b107a4550d` |
| `epub-identity.mjs` | `src/shared/epub-identity.js` of the Hypothesis client fork | fork commit `ca56d84e98450e64e4344b2fa34728b94bca0a5d` |
| `hypothesis-html-metadata.mjs`, `hypothesis-frame-sync.mjs`, `hypothesis-html-anchor.mjs`, `hypothesis-pdf-anchor.mjs`, `hypothesis-service.mjs`, `hypothesis-pdf-metadata.mjs` | the fork's `src/annotator/integrations/html-metadata.js`, `src/sidebar/services/frame-sync.js`, `src/annotator/anchoring/html.js`, `src/annotator/anchoring/pdf.js`, `src/sidebar/services/annotations.js`, `src/annotator/integrations/pdf-metadata.js` | fork commit `ca56d84e98450e64e4344b2fa34728b94bca0a5d` |
| `published-*.mjs` (annotation-metadata, annotation-service, frame-sync, html-anchor, html-metadata, search-filter, selection-observer, thread-annotations, view-filter) | the same client as it was in the published plugin 0.2.11 (`frame-sync` with its private `frameForAnnotation` exported for the tests) | fork commit `6e9f06ad6bd8b096a79614b16b0733e0491a2d30` (`../published/lock.json`) |
| `published-video.mjs` | `../published/legacy-videoAnnotationUtils.tsx`, the published plugin's video note parser | plugin commit `3647dd92d0d803bae9a3f34a1aac19eacb2fd52d` |
| `epubjs-reference.cjs` | epub.js 0.3.93: `lib/utils/replacements.js`, `rendition.js`, `container.js`, `packaging.js`, `navigation.js`, `layout.js`, `contents.js`, as one CommonJS bundle (`platform: node`) exporting `replacements`, `Rendition`, `Container`, `Packaging`, `Navigation`, `Layout`, `Contents` | npm `epubjs@0.3.93` |

## Licences

- The Hypothesis client is BSD-2-Clause: `../HYPOTHESIS_LICENSE.txt`.
- epub.js is BSD-2-Clause: `../published/EPUBJS-LICENSE`.
- The original plugin's own code is MIT, like the rest of this repository.

## Related fixtures

- `../../fixtures/legacy/testfile.md`, `testfile2.md`: annotation notes written
  by the original plugin (its own test files).
- `../../test-support/fonts/LiberationSans-Regular.ttf`: the font a test book
  packages, with its licence beside it (`LICENSE_LIBERATION`, SIL OFL 1.1).
- `../published/`: the published plugin's EPUB hooks and video parser, with
  their checksums, and the tools that fetched and extracted them from the
  0.2.11 release.
