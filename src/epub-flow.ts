/** Geometry in reading progression order. CSS vertical-rl uses negative
 * scrollLeft; vertical pagination advances along the inline (physical Y) axis. */
export class ReadingAxis {
    constructor(
        readonly horizontal: boolean,
        readonly reverse = false
    ) {}
    start(rect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>) {
        return this.horizontal ? (this.reverse ? -rect.right : rect.left) : rect.top;
    }
    end(rect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>) {
        return this.horizontal ? (this.reverse ? -rect.left : rect.right) : rect.bottom;
    }
    size(viewport: HTMLElement) {
        return this.horizontal ? viewport.clientWidth : viewport.clientHeight;
    }
    extent(viewport: HTMLElement) {
        return this.horizontal ? viewport.scrollWidth : viewport.scrollHeight;
    }
    position(viewport: HTMLElement) {
        return (this.horizontal ? viewport.scrollLeft : viewport.scrollTop) * (this.reverse ? -1 : 1);
    }
    set(viewport: HTMLElement, value: number) {
        if (this.horizontal) viewport.scrollLeft = value * (this.reverse ? -1 : 1);
        else viewport.scrollTop = value;
    }
    advance(viewport: HTMLElement, value: number) {
        viewport.scrollBy(this.horizontal ? { left: value * (this.reverse ? -1 : 1) } : { top: value });
    }
}
type Box = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;
/**
 * Whether a passage, by the boxes of its lines, is all inside a box (the reader's viewport): it has a box with room,
 * and none that takes up room is outside. Within a pixel counts, for the fractions a scaled screen leaves.
 */
export function wholly(boxes: ArrayLike<Box>, within: Box): boolean {
    const sized = Array.from(boxes).filter(box => box.right > box.left && box.bottom > box.top);
    return (
        sized.length > 0 &&
        sized.every(
            box =>
                box.left >= within.left - 1 &&
                box.right <= within.right + 1 &&
                box.top >= within.top - 1 &&
                box.bottom <= within.bottom + 1
        )
    );
}
