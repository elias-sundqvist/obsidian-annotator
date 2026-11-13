import type { ActivationPoint } from './annotation-choices';
/** Mouse, keyboard and touch activation without opening marks during a swipe. */
export function bindMarkAction(mark: HTMLElement, open: (point?: ActivationPoint) => void) {
    let openedOnPointer = false;
    let suppressTouchClickUntil = 0;
    let touch: { x: number; y: number; time: number; moved: boolean } | null = null;
    mark.addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.pointerType === 'touch' || event.pointerType === 'pen') return;
        event.preventDefault();
        event.stopPropagation();
        openedOnPointer = true;
        open({ x: event.clientX, y: event.clientY });
    });
    mark.addEventListener(
        'touchstart',
        event => {
            const first = event.touches.length === 1 ? event.touches[0] : null;
            touch = first ? { x: first.clientX, y: first.clientY, time: Date.now(), moved: false } : null;
        },
        { passive: true }
    );
    mark.addEventListener(
        'touchmove',
        event => {
            const first = event.touches[0];
            if (touch && (!first || Math.hypot(first.clientX - touch.x, first.clientY - touch.y) > 8))
                touch.moved = true;
        },
        { passive: true }
    );
    mark.addEventListener('touchcancel', () => {
        touch = null;
        suppressTouchClickUntil = Date.now() + 600;
    });
    mark.addEventListener(
        'touchend',
        event => {
            const point = touch ? { x: touch.x, y: touch.y } : undefined;
            const tapped = touch && !touch.moved && Date.now() - touch.time < 500;
            touch = null;
            suppressTouchClickUntil = Date.now() + 600;
            if (!tapped) return;
            event.preventDefault();
            event.stopPropagation();
            openedOnPointer = true;
            open(point);
        },
        { passive: false }
    );
    mark.addEventListener('click', event => {
        event.stopPropagation();
        if (event.detail === 0 || (!openedOnPointer && Date.now() > suppressTouchClickUntil))
            open(event.detail === 0 ? undefined : { x: event.clientX, y: event.clientY });
        openedOnPointer = false;
    });
}
