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
