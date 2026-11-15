/**
 * How a passage is marked: tinted (a highlight) or with a line (an underline,
 * a strike-out, a squiggly line). Nothing new is stored for it: a line is said
 * by one of the annotation's tags (`underline`, `strike-out`, `squiggly`), the
 * same tags a mark taken in from another PDF program is given. A version of
 * the plugin that knows nothing of styles shows a highlight with that tag.
 *
 * This file is the one place that reads and writes those tags. The page, the
 * sidebar and the PDF export all ask here, so they cannot disagree.
 */
export const MARK_STYLES = ['highlight', 'underline', 'strike-out', 'squiggly'] as const;
export type MarkStyle = (typeof MARK_STYLES)[number];
/** A style that is drawn as a line and said by a tag. */
export type LineStyle = Exclude<MarkStyle, 'highlight'>;
export const DEFAULT_STYLE: MarkStyle = 'highlight';
/** What a style is called in a menu or a label. */
export const STYLE_NAMES: Record<MarkStyle, string> = {
    highlight: 'Highlight',
    underline: 'Underline',
    'strike-out': 'Strike-out',
    squiggly: 'Squiggly'
};
/** What making such a mark is called: "Underline in Yellow". */
export const STYLE_ACTIONS: Record<MarkStyle, string> = {
    highlight: 'Highlight',
    underline: 'Underline',
    'strike-out': 'Strike out',
    squiggly: 'Squiggly underline'
};
/** The host's icon for a style, by its Lucide name (for the host's own menus). */
export const STYLE_ICON_NAMES: Record<MarkStyle, string> = {
    highlight: 'highlighter',
    underline: 'underline',
    'strike-out': 'strikethrough',
    squiggly: 'spell-check-2'
};
/** The same Lucide icons as paths, for controls built without the host (the selection bar) and so that none can be missing. */
const STYLE_ICONS: Record<MarkStyle, readonly string[]> = {
    highlight: ['m9 11-6 6v3h9l3-3', 'm22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4'],
    underline: ['M6 4v6a6 6 0 0 0 12 0V4', 'M4 20h16'],
    'strike-out': ['M16 4H9a3 3 0 0 0-2.83 4', 'M14 12a4 4 0 0 1 0 8H6', 'M4 12h16'],
    squiggly: [
        'm6 16 6-12 6 12',
        'M8 12h8',
        'M4 21c1.1 0 1.1-1 2.3-1s1.1 1 2.3 1c1.1 0 1.1-1 2.3-1 1.1 0 1.1 1 2.3 1 1.1 0 1.1-1 2.3-1 1.1 0 1.1 1 2.3 1 1.1 0 1.1-1 2.3-1'
    ]
};
/** The tags that say a style, as they may be written (a mark from another program may be tagged `strikeout`). */
const TAG_STYLES: ReadonlyMap<string, LineStyle> = new Map<string, LineStyle>([
    ['underline', 'underline'],
    ['strike-out', 'strike-out'],
    ['strikeout', 'strike-out'],
    ['squiggly', 'squiggly']
]);

export function isMarkStyle(value: unknown): value is MarkStyle {
    return typeof value === 'string' && (MARK_STYLES as readonly string[]).includes(value);
}
/** The style a tag says, if it says one. Letter case does not matter; nothing else is forgiven. */
export function styleOfTag(tag: unknown): LineStyle | undefined {
    return typeof tag === 'string' ? TAG_STYLES.get(tag.toLowerCase()) : undefined;
}
/** How an annotation's passage is marked: with the line its first style tag says, else as a highlight. */
export function styleOf(annotation: { tags?: unknown } | null | undefined): MarkStyle {
    const tags = annotation?.tags;
    if (Array.isArray(tags))
        for (const tag of tags) {
            const style = styleOfTag(tag);
            if (style) return style;
        }
    return DEFAULT_STYLE;
}
/**
 * The tags of an annotation given a style. At most one style tag is left: where the first one stood (at the end
 * when there was none), and as it was written when it already says the style. Every other tag stays, in its order.
 */
export function withStyle(tags: readonly string[], style: MarkStyle): string[] {
    const result: string[] = [];
    let placed = style === DEFAULT_STYLE;
    for (const tag of tags) {
        const said = styleOfTag(tag);
        if (!said) result.push(tag);
        else if (!placed) {
            result.push(said === style ? tag : style);
            placed = true;
        }
    }
    if (!placed) result.push(style);
    return result;
}
/** The style after this one, round and round: what one press of the style control chooses. */
export function nextStyle(style: MarkStyle): MarkStyle {
    return MARK_STYLES[(MARK_STYLES.indexOf(style) + 1) % MARK_STYLES.length];
}
/** A style's icon as the host draws its own (`svg.svg-icon`, stroked in the text colour), built from the paths above. */
export function styleIcon(document: Document, style: MarkStyle): SVGSVGElement {
    const SVG = 'http://www.w3.org/2000/svg',
        icon = document.createElementNS(SVG, 'svg') as SVGSVGElement;
    icon.setAttribute('class', 'svg-icon annotator-style-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('stroke-linejoin', 'round');
    icon.setAttribute('aria-hidden', 'true');
    for (const d of STYLE_ICONS[style]) {
        const path = document.createElementNS(SVG, 'path');
        path.setAttribute('d', d);
        icon.appendChild(path);
    }
    return icon;
}
