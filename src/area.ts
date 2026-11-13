import type { Annotation } from './codec';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { areaFit, areaValid, areaMove, areaResize, AREA_FULL, AREA_LEAST } from '../proofs/reader.mjs';

/**
 * A rectangle on one page: a figure, a table, an equation, a margin drawing.
 * Positions are hundredths of a percent of the page (0…10000), so a region
 * means the same thing at every zoom and on every screen.
 *
 * It is stored as a W3C media fragment in a FragmentSelector
 * (`page=3&xywh=percent:12.5,40,50,22.25`), beside the usual selectors, so the
 * annotation stays ordinary annotation JSON that other tools can keep even if
 * they cannot draw it.
 *
 * The geometry is the checked Bend module `proofs/area.bend`: which corner
 * comes first does not matter, a region never leaves the page however it is
 * dragged, moved or resized, and what is returned here can always be stored.
 * This file only turns screen fractions into page units and prints and reads
 * the fragment.
 */
export interface PageArea {
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
}
export type AreaWay = 'left' | 'right' | 'up' | 'down';
export const AREA_CONFORMS = 'http://www.w3.org/TR/media-frags/';
const FULL: number = AREA_FULL;
/** Smaller than this in either direction is a slip of the hand, not a region (1.5% of the page). */
export const AREA_MINIMUM: number = AREA_LEAST;

// A fraction of the page as whole units. Before the page is its start; far past it is held to a few pages, and Bend holds it to one.
const unit = (fraction: number) => Math.round(Math.max(0, Math.min(4, fraction)) * FULL);
/** The region between two corners given as fractions of the page, in any order and possibly outside it; null when it is too small to mean anything. */
export function fitArea(page: number, ax: number, ay: number, bx: number, by: number): PageArea | null {
    if (![ax, ay, bx, by].every(Number.isFinite)) return null;
    return areaFit(page, unit(ax), unit(ay), unit(bx), unit(by));
}
/** A stored region moved `by` page units; it keeps its size and stops at the page's edge. */
export function moveArea(area: PageArea, way: AreaWay, by: number): PageArea {
    return areaMove(area, way, Math.max(0, Math.round(by))) || area;
}
/** A stored region with its right ('right' widens, 'left' narrows) or bottom ('down' taller, 'up' shorter) edge moved `by` page units. */
export function resizeArea(area: PageArea, way: AreaWay, by: number): PageArea {
    return areaResize(area, way, Math.max(0, Math.round(by))) || area;
}
const percent = (value: number) => String(value / 100);
export function areaFragment(area: PageArea): string {
    return `page=${area.page}&xywh=percent:${percent(area.x)},${percent(area.y)},${percent(area.w)},${percent(area.h)}`;
}
export function areaSelector(area: PageArea) {
    return { type: 'FragmentSelector', conformsTo: AREA_CONFORMS, value: areaFragment(area) };
}
/** Read a fragment written by `areaFragment`. Anything else (another unit, a region off the page, a missing page) is not an area. */
export function parseArea(value: unknown): PageArea | null {
    const found =
        typeof value === 'string'
            ? /^page=([1-9]\d{0,6})&xywh=percent:(\d{1,3}(?:\.\d{1,2})?),(\d{1,3}(?:\.\d{1,2})?),(\d{1,3}(?:\.\d{1,2})?),(\d{1,3}(?:\.\d{1,2})?)$/.exec(
                  value
              )
            : null;
    if (!found) return null;
    const [x, y, w, h] = found.slice(2).map(part => Math.round(Number(part) * 100));
    const area = { page: Number(found[1]), x, y, w, h };
    return areaValid(area) ? area : null;
}
export function areaOf(annotation: Annotation | null | undefined): PageArea | null {
    for (const selector of annotation?.target?.[0]?.selector || []) {
        const candidate = selector as { type?: string; conformsTo?: string; value?: unknown };
        if (candidate.type === 'FragmentSelector' && candidate.conformsTo === AREA_CONFORMS) {
            const area = parseArea(candidate.value);
            if (area) return area;
        }
    }
    return null;
}
/** The first image a note embeds, as written (`![[path]]` or `![alt](path)`); an area note leads with the picture of its region. */
export function leadingImage(text: string | undefined): string | null {
    const found = /^\s*(?:!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]|!\[[^\]]*\]\(([^)\s]+)\))/.exec(text || '');
    return found ? (found[1] || found[2]).trim() : null;
}

/** The words of the page that lie inside an area, as they were when it was marked: what makes a picture findable. Kept with the reader's own details of the annotation. */
export function areaWords(annotation: Annotation | null | undefined): string {
    const own = annotation as
            | { nativePdf?: { words?: unknown }; nativeEpub?: { words?: unknown }; nativeWeb?: { words?: unknown } }
            | null
            | undefined,
        words = own?.nativePdf?.words ?? own?.nativeEpub?.words ?? own?.nativeWeb?.words;
    return typeof words === 'string' ? words : '';
}

/**
 * A picture in a book, kept with a note. A book's text has no pages to mark a
 * rectangle on, so what is kept is the picture itself: where it sits in its
 * chapter (a W3C CssSelector: a plain path of child steps from the chapter's
 * body, written here and read back by a strict pattern, never run as a
 * selector), and which file of the book it shows. The file is what proves the
 * place: a picture that moved in its chapter is found again by it.
 */
export interface BookFigure {
    /** The path of child steps from the chapter's root. */ path: string;
    /** The picture's file inside the book. */ src: string;
}
const FIGURE_STEP = /^([A-Za-z][A-Za-z0-9-]{0,31}):nth-child\((\d{1,5})\)$/,
    FIGURE_PATH = /^[A-Za-z][A-Za-z0-9-]{0,31}(?: > [A-Za-z][A-Za-z0-9-]{0,31}:nth-child\(\d{1,5}\)){1,64}$/;
/** The path from a chapter's root down to one of its elements, or null for an element that is not in it (or too deep to be a place). */
export function figurePath(root: Element, element: Element): string | null {
    const steps: string[] = [];
    for (let node: Element | null = element; node !== root; node = node.parentElement) {
        const parent: Element | null = node?.parentElement ?? null;
        if (!node || !parent) return null;
        steps.unshift(`${node.localName}:nth-child(${Array.prototype.indexOf.call(parent.children, node) + 1})`);
    }
    const path = [root.localName, ...steps].join(' > ');
    return FIGURE_PATH.test(path) ? path : null;
}
/** The element a stored path leads to in a chapter, or null where the chapter is not shaped that way any more. */
export function figureAt(root: Element, path: string): Element | null {
    if (typeof path !== 'string' || path.length > 4096 || !FIGURE_PATH.test(path)) return null;
    const [first, ...steps] = path.split(' > ');
    if (first !== root.localName) return null;
    let node: Element = root;
    for (const step of steps) {
        const [, name, nth] = FIGURE_STEP.exec(step)!,
            child: Element | undefined = node.children[Number(nth) - 1];
        if (!child || child.localName !== name) return null;
        node = child;
    }
    return node;
}
export function figureSelector(path: string) {
    return { type: 'CssSelector', value: path };
}
/**
 * A picture on a web page, kept with a note. The same two things as in a book:
 * the path of child steps from the page's body, and what the picture shows
 * (its address, or for a picture written into the page itself a short hash of
 * it). A page is deeper than a chapter and may name its own elements, so its
 * paths may be longer; they are still written here and read by this pattern,
 * and nothing a page reports is used until it matches.
 */
export const WEB_FIGURE_PATH = /^body(?: > [A-Za-z][A-Za-z0-9._-]{0,63}:nth-child\(\d{1,5}\)){1,160}$/;
/** What a page's picture shows, as it may be kept: an http(s) address, or `inline:` and eight hex digits. */
export function webFigureSource(value: unknown): string | null {
    if (typeof value !== 'string' || !value || value.length > 2048) return null;
    if (/^inline:[0-9a-f]{8}$/.test(value)) return value;
    try {
        const url = new URL(value);
        return (url.protocol === 'https:' || url.protocol === 'http:') && url.href === value ? value : null;
    } catch {
        return null;
    }
}
/** The picture an annotation is about, if it is about one: a path selector, what the picture shows, and no passage. In a book or on a web page. */
export function figureOf(annotation: Annotation | null | undefined): BookFigure | null {
    const own = annotation as { nativeEpub?: { src?: unknown }; nativeWeb?: { src?: unknown } } | null | undefined;
    const web = own?.nativeEpub === undefined && own?.nativeWeb !== undefined,
        pattern = web ? WEB_FIGURE_PATH : FIGURE_PATH;
    const src = web ? webFigureSource(own?.nativeWeb?.src) : own?.nativeEpub?.src;
    if (typeof src !== 'string' || !src || (!web && src.length > 1024)) return null;
    const selectors = annotation?.target?.[0]?.selector || [];
    if (selectors.some(selector => (selector as { type?: string }).type === 'TextQuoteSelector')) return null;
    for (const selector of selectors) {
        const candidate = selector as { type?: string; value?: unknown };
        if (
            candidate.type === 'CssSelector' &&
            typeof candidate.value === 'string' &&
            candidate.value.length <= 8192 &&
            pattern.test(candidate.value)
        )
            return { path: candidate.value, src };
    }
    return null;
}
/** Whether a picture note is about a picture of a web page rather than of a book. */
export function webFigure(annotation: Annotation | null | undefined): boolean {
    return (
        !!figureOf(annotation) && (annotation as { nativeEpub?: unknown } | null | undefined)?.nativeEpub === undefined
    );
}
/** Whether an annotation is about a place with a picture rather than a passage: an area of a PDF page, a drawing on one, a picture in a book or on a web page. */
export function regionNote(annotation: Annotation | null | undefined): boolean {
    return !!areaOf(annotation) || !!figureOf(annotation);
}
