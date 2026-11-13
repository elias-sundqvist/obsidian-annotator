# Passive foreign content in native EPUB

The native reader constructs fresh MathML/SVG nodes in their proper namespaces.
It preserves source text nodes in its original↔rendered mapping rather than
flattening notation or shifting selector offsets. Supported passive presentation
includes fractions, radicals, scripts, tables, SVG shapes/text/gradients/clipping
and local references. Inline raster/SVG images go through the book resource
resolver. Standalone SVG assets are reconstructed before a blob is created;
DTD/entity declarations, scripts, handlers, arbitrary styles, external references
and foreign-object/XML-annotation content are not adopted.

This is an explicit allowlist, not support for all SVG/MathML. SVG filters,
animations, publisher CSS/fonts, content MathML and scripted documents still need
fidelity decisions and corpus coverage. Omitted content is reported; a selection
crossing omitted text must fail rather than target a different passage. Images
cannot provide text selection inside the image; inline SVG text can.

`SafeProjection.ready` settles local resource processing before initial EPUB
layout/progress restoration. Navigation epochs prevent a delayed resource load
from installing a stale chapter. Failed resources count as omissions.

Element/attribute references used when implementing the passive subset:
[W3C MathML Core](https://w3c.github.io/mathml-core/) and
[W3C SVG 2 document structure](https://www.w3.org/TR/SVG2/struct.html).
These are rendering specifications, not a claim of a standardized sanitizer.
The policy and boundary behavior are tested in `readers.test.mjs`; actual
rendering/storage evidence is recorded in `ANDROID_AND_PARITY_RESULTS.md`.
