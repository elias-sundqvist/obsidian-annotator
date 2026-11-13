import { fitArea, type PageArea } from './area';

/**
 * A frame of a video kept as a picture, the way a region of a page is.
 * The frame is frozen first and the reader then keeps all of it or drags over
 * the part that matters, so what is kept is what was on screen when they
 * asked, however long choosing takes. The region uses the page geometry
 * (`area.ts`, checked in Bend): corners in any order, never past the picture.
 */
export const WHOLE_FRAME: PageArea = { page: 1, x: 0, y: 0, w: 10000, h: 10000 };

/** The part of a picture a region covers, on a new canvas no longer than `longest` pixels on its long edge. */
export function cropStill(still: HTMLCanvasElement, area: PageArea, longest = 2000): HTMLCanvasElement {
    const left = Math.round((still.width * area.x) / 10000),
        top = Math.round((still.height * area.y) / 10000);
    const width = Math.max(1, Math.min(still.width - left, Math.round((still.width * area.w) / 10000))),
        height = Math.max(1, Math.min(still.height - top, Math.round((still.height * area.h) / 10000)));
    const scale = Math.min(1, longest / Math.max(width, height));
    const canvas = still.ownerDocument.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext('2d')?.drawImage(still, left, top, width, height, 0, 0, canvas.width, canvas.height);
    return canvas;
}

export interface FrameChoice {
    close(): void;
}
/**
 * Lay the frozen frame over the player and wait for the reader: `done` gets
 * the whole frame, the part they dragged over, or null when they leave.
 * Enter keeps the whole frame and Escape leaves, so it needs no pointer.
 */
export function chooseFrame(
    surface: HTMLElement,
    still: HTMLCanvasElement,
    clock: string,
    done: (area: PageArea | null) => void,
    caution = ''
): FrameChoice {
    const document = surface.ownerDocument,
        view = document.defaultView;
    const chooser = document.createElement('div');
    chooser.className = 'annotator-frame-chooser';
    chooser.setAttribute('role', 'dialog');
    chooser.setAttribute('aria-label', `Frame at ${clock}`);
    const stage = document.createElement('div');
    stage.className = 'annotator-frame-stage';
    const picture = document.createElement('div');
    picture.className = 'annotator-frame-still';
    picture.tabIndex = 0;
    picture.setAttribute('role', 'img');
    picture.setAttribute(
        'aria-label',
        `The frame at ${clock}. Press Enter to keep the whole frame, or drag over the part to keep.`
    );
    still.classList.add('annotator-frame-picture');
    picture.appendChild(still);
    stage.appendChild(picture);
    const hint = document.createElement('div');
    hint.className = 'annotator-area-hint annotator-frame-hint';
    hint.setAttribute('role', 'status');
    const words = document.createElement('span');
    words.textContent = 'Drag over the part to keep, or keep the whole frame.';
    const whole = document.createElement('button');
    whole.type = 'button';
    whole.className = 'mod-cta';
    whole.textContent = 'Whole frame';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    // The picture takes the player's place at the player's size; what to do with it is said under it, where it covers nothing.
    const bar = document.createElement('div');
    bar.className = 'annotator-frame-bar';
    hint.append(words, whole, cancel);
    chooser.append(stage);
    bar.append(hint);
    // What the reader should know about this picture before keeping it (a paused provider player shows its controls).
    if (caution) {
        const aside = document.createElement('p');
        aside.className = 'annotator-frame-caution';
        aside.textContent = caution;
        bar.append(aside);
    }
    surface.appendChild(chooser);
    surface.after(bar);

    // The picture keeps its shape inside whatever room the player has.
    const fit = () => {
        const room = stage.getBoundingClientRect();
        if (!room.width || !room.height || !still.width || !still.height) return;
        const scale = Math.min(room.width / still.width, room.height / still.height);
        picture.style.width = `${Math.floor(still.width * scale)}px`;
        picture.style.height = `${Math.floor(still.height * scale)}px`;
    };
    fit();
    const Observer = (view as unknown as { ResizeObserver?: typeof ResizeObserver } | null)?.ResizeObserver,
        observer = Observer ? new Observer(fit) : null;
    observer?.observe(stage);

    let open = true,
        drag: { pointer: number; x: number; y: number; x2: number; y2: number; band: HTMLElement } | null = null;
    const finish = (area: PageArea | null) => {
        if (!open) return;
        open = false;
        observer?.disconnect();
        chooser.remove();
        bar.remove();
        done(area);
    };
    const at = (event: MouseEvent) => {
        const rect = picture.getBoundingClientRect();
        return [
            rect.width ? (event.clientX - rect.left) / rect.width : 0,
            rect.height ? (event.clientY - rect.top) / rect.height : 0
        ] as const;
    };
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const place = () => {
        if (!drag) return;
        const left = clamp(Math.min(drag.x, drag.x2)),
            top = clamp(Math.min(drag.y, drag.y2));
        drag.band.style.left = `${100 * left}%`;
        drag.band.style.top = `${100 * top}%`;
        drag.band.style.width = `${100 * (clamp(Math.max(drag.x, drag.x2)) - left)}%`;
        drag.band.style.height = `${100 * (clamp(Math.max(drag.y, drag.y2)) - top)}%`;
    };
    const drop = () => {
        drag?.band.remove();
        drag = null;
    };
    picture.addEventListener('pointerdown', event => {
        if (event.button !== 0 || drag) return;
        event.preventDefault();
        event.stopPropagation();
        const [x, y] = at(event),
            band = document.createElement('div');
        band.className = 'annotator-area-band';
        picture.appendChild(band);
        drag = { pointer: event.pointerId ?? 0, x, y, x2: x, y2: y, band };
        place();
        try {
            picture.setPointerCapture?.(drag.pointer);
        } catch {
            /* Not a live pointer (a test, a synthetic event). */
        }
    });
    picture.addEventListener('pointermove', event => {
        if (!drag || (event.pointerId ?? 0) !== drag.pointer) return;
        event.preventDefault();
        [drag.x2, drag.y2] = at(event);
        place();
    });
    picture.addEventListener('pointerup', event => {
        if (!drag || (event.pointerId ?? 0) !== drag.pointer) return;
        event.preventDefault();
        [drag.x2, drag.y2] = at(event);
        const area = fitArea(1, drag.x, drag.y, drag.x2, drag.y2);
        drop();
        if (area) finish(area);
        else words.textContent = 'That was too small to keep. Drag over a larger part, or keep the whole frame.';
    });
    picture.addEventListener('pointercancel', drop);
    // On a phone a sideways drag is also the app's gesture for its drawers; over the picture it is only a drag.
    for (const type of ['touchstart', 'touchmove', 'touchend'])
        picture.addEventListener(type, event => event.stopPropagation(), { passive: true });
    whole.onclick = () => finish(WHOLE_FRAME);
    cancel.onclick = () => finish(null);
    const keys = (event: KeyboardEvent) => {
        if (event.isComposing) return;
        // While a frame is being chosen the player's own keys (K, J, L, arrows…) do nothing.
        event.stopPropagation();
        if (event.key === 'Escape') {
            event.preventDefault();
            if (drag) drop();
            else finish(null);
        } else if (event.key === 'Enter' && event.target === picture) {
            event.preventDefault();
            finish(WHOLE_FRAME);
        }
    };
    chooser.addEventListener('keydown', keys);
    bar.addEventListener('keydown', keys);
    picture.focus({ preventScroll: true });
    return { close: () => finish(null) };
}
