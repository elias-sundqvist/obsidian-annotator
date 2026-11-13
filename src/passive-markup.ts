/** Passive foreign markup constructors. Never adopt source nodes, CSS, handlers or external URLs. */
export const SVG_NS = 'http://www.w3.org/2000/svg';
export const MATH_NS = 'http://www.w3.org/1998/Math/MathML';
const svgTags = new Map(
    'svg a g defs symbol use path rect circle ellipse line polyline polygon text tspan textPath title desc clipPath mask linearGradient radialGradient stop marker image'
        .split(' ')
        .map(tag => [tag.toLowerCase(), tag])
);
const mathTags = new Set(
    'math mrow mi mn mo mtext mspace ms mfrac msqrt mroot mstyle merror mpadded mphantom mfenced menclose msub msup msubsup munder mover munderover mmultiscripts mprescripts none mtable mlabeledtr mtr mtd maligngroup malignmark semantics annotation'.split(
        ' '
    )
);
const idPattern = /^[\p{L}\p{N}_][\p{L}\p{N}_.:-]*$/u;
function local(value: string, prefix: string): string | null {
    return value.startsWith('#') && idPattern.test(value.slice(1)) ? '#' + prefix + value.slice(1) : null;
}
const number = /^[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?(?:%|px|em|ex|rem|pt|pc|cm|mm|in)?$/i;
const numbers = /^[\d\s.,+eE%-]+$/;
const color = /^(?:[a-z]+|#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([\d\s.,%+/-]+\))$/i;
const svgLengths = new Set(
    'x y x1 y1 x2 y2 cx cy r rx ry width height dx dy refX refY markerWidth markerHeight stroke-width stroke-dashoffset font-size textLength startOffset offset'.split(
        ' '
    )
);
const svgLists = new Set('viewBox points stroke-dasharray'.split(' '));
const enumValues: Record<string, string[]> = {
    'fill-rule': ['nonzero', 'evenodd'],
    'clip-rule': ['nonzero', 'evenodd'],
    'stroke-linecap': ['butt', 'round', 'square'],
    'stroke-linejoin': ['miter', 'round', 'bevel'],
    'text-anchor': ['start', 'middle', 'end'],
    'dominant-baseline': ['auto', 'middle', 'central', 'hanging', 'alphabetic', 'text-before-edge', 'text-after-edge'],
    gradientUnits: ['userSpaceOnUse', 'objectBoundingBox'],
    clipPathUnits: ['userSpaceOnUse', 'objectBoundingBox'],
    maskUnits: ['userSpaceOnUse', 'objectBoundingBox'],
    maskContentUnits: ['userSpaceOnUse', 'objectBoundingBox'],
    spreadMethod: ['pad', 'reflect', 'repeat'],
    markerUnits: ['strokeWidth', 'userSpaceOnUse'],
    'font-weight': ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
    'font-style': ['normal', 'italic', 'oblique'],
    'vector-effect': ['none', 'non-scaling-stroke']
};
const mathValues = new Set(
    'display displaystyle scriptlevel mathvariant mathsize mathcolor mathbackground linethickness numalign denomalign bevelled open close separators stretchy symmetric maxsize minsize largeop movablelimits accent accentunder fence separator form lspace rspace width height depth notation rowalign columnalign rowspacing columnspacing rowlines columnlines frame framespacing equalrows equalcolumns columnspan rowspan side minlabelspacing'.split(
        ' '
    )
);
export function foreignElement(source: Element, document: Document, prefix: string): Element | null {
    const ns = source.namespaceURI,
        lower = source.localName.toLowerCase();
    const tag = ns === SVG_NS ? svgTags.get(lower) : ns === MATH_NS && mathTags.has(lower) ? lower : null;
    if (!tag) return null;
    const out = document.createElementNS(ns, tag);
    for (const attr of Array.from(source.attributes)) {
        const name = attr.localName,
            value = attr.value.trim();
        if (!value || value.length > 65536) continue;
        if (name === 'id') {
            if (idPattern.test(value)) out.id = prefix + value;
            continue;
        }
        if (name === 'aria-label' || name === 'lang' || name === 'title') {
            out.setAttribute(name, value);
            continue;
        }
        if (name === 'dir' && ['ltr', 'rtl', 'auto'].includes(value)) {
            out.setAttribute(name, value);
            continue;
        }
        if (name === 'aria-labelledby' || name === 'aria-describedby') {
            const ids = value.split(/\s+/).filter(id => idPattern.test(id));
            if (ids.length) out.setAttribute(name, ids.map(id => prefix + id).join(' '));
            continue;
        }
        if (ns === MATH_NS) {
            // No href, src, style, class, intent, encoding, event or XML annotations.
            if (mathValues.has(name) && /^[\p{L}\p{N}\s#.,%+_()|/-]+$/u.test(value) && !/url\s*\(/i.test(value))
                out.setAttribute(name, value);
            continue;
        }
        if (name === 'href' && ['use', 'textpath', 'lineargradient', 'radialgradient'].includes(lower)) {
            const ref = local(value, prefix);
            if (ref) out.setAttribute('href', ref);
            continue;
        }
        if ((svgLengths.has(name) && number.test(value)) || (svgLists.has(name) && numbers.test(value))) {
            out.setAttribute(name, value);
            continue;
        }
        if (
            ['opacity', 'fill-opacity', 'stroke-opacity', 'stop-opacity', 'stroke-miterlimit'].includes(name) &&
            number.test(value)
        ) {
            out.setAttribute(name, value);
            continue;
        }
        if (['fill', 'stroke', 'stop-color'].includes(name)) {
            const ref = value.match(/^url\(\s*['"]?(#[\p{L}\p{N}_.:-]+)['"]?\s*\)$/u)?.[1];
            if (ref && local(ref, prefix)) out.setAttribute(name, `url(${local(ref, prefix)})`);
            else if (color.test(value)) out.setAttribute(name, value);
            continue;
        }
        if (['clip-path', 'mask', 'marker-start', 'marker-mid', 'marker-end'].includes(name)) {
            const ref = value.match(/^url\(\s*['"]?(#[\p{L}\p{N}_.:-]+)['"]?\s*\)$/u)?.[1];
            if (ref && local(ref, prefix)) out.setAttribute(name, `url(${local(ref, prefix)})`);
            continue;
        }
        if (name === 'd' && /^[MmZzLlHhVvCcSsQqTtAa\d\s.,+eE-]+$/.test(value)) {
            out.setAttribute(name, value);
            continue;
        }
        if (
            ['transform', 'gradientTransform'].includes(name) &&
            /^(?:\s*(?:matrix|translate|scale|rotate|skewX|skewY)\(\s*[\d\s.,+eE-]+\)\s*)+$/.test(value)
        ) {
            out.setAttribute(name, value);
            continue;
        }
        if (
            name === 'preserveAspectRatio' &&
            /^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max))(?:\s+(?:meet|slice))?$/.test(value)
        ) {
            out.setAttribute(name, value);
            continue;
        }
        if (name === 'orient' && (['auto', 'auto-start-reverse'].includes(value) || number.test(value))) {
            out.setAttribute(name, value);
            continue;
        }
        if (enumValues[name]?.includes(value)) out.setAttribute(name, value);
    }
    return out;
}
