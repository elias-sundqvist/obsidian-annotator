export default class StyleObserver {
    style: string;
    listerners: Set<(style: string) => void>;
    interval?: NodeJS.Timeout;

    constructor() {
        this.style = '';
        this.listerners = new Set();
        this.interval = null;
    }

    watch() {
        this.interval = setInterval(() => {
            if (this.listerners.size === 0) return;
            // @ts-ignore
            const newStyle = [...top.document.getElementsByTagName('style')]
                .flatMap(x => [...x.sheet.rules].map(x => x.cssText))
                .join('\n');
            if (newStyle != this.style) {
                this.style = newStyle;
                for (const listener of this.listerners) {
                    listener(newStyle);
                }
            }
        }, 250);
    }

    listen(listener: (style: string) => void) {
        this.listerners.add(listener);
        listener(this.style);
    }

    remove(listener: (style: string) => void) {
        this.listerners.delete(listener);
    }

    unwatch() {
        if (this.interval) clearInterval(this.interval);
    }
}
