import { uuid } from './portable';
import { resolveVideoTarget, youtubeError } from './video-provider';
export interface VideoPlayback {
    seek(seconds: number): Promise<number>;
    time(): number | null;
    setPlaying(playing: boolean): Promise<void>;
    dispose(): void;
    subscribe?(listener: (seconds: number | null) => void): () => void;
    /** The video's length in seconds once the player knows it (never for a live stream). */ length?(): number | null;
    /** Whether it is playing now; null while the player cannot say. */ playing?(): boolean | null;
    /** Playback speed, 1 being normal. */ setRate?(rate: number): void;
    /** The frame showing now, as a picture; null where the player's pixels cannot be read (a provider's frame, a site that does not allow it). */ still?(): HTMLCanvasElement | null;
    /** The element the picture is shown in. */ readonly element?: HTMLElement;
    /** Where the video can be watched instead, at a given time, when it cannot be played here; null while it can. */ elsewhere?(
        seconds: number
    ): string | null;
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
/** Browser-native playback lives in the source pane. Remote providers remain in
 * cross-origin sandboxed frames; no provider script runs in Obsidian's DOM. */
export function embeddedVideo(
    container: HTMLElement,
    target: string,
    local: (target: string) => string | null,
    status: (message: string) => void
): VideoPlayback {
    let youtube;
    try {
        youtube = resolveVideoTarget(target);
    } catch {
        // Not a video this reader knows a provider for; it may still be a file.
    }
    if (youtube) return new EmbeddedYouTube(container, youtube.id, youtube.startSeconds, status);
    let source: string | null = null;
    try {
        const url = new URL(target);
        if (
            ['https:', 'http:'].includes(url.protocol) &&
            !url.username &&
            !url.password &&
            /\.(?:mp4|webm|ogv|ogg|m4v|mov|mp3|m4a|wav|flac|opus|oga|aac)$/i.test(url.pathname)
        )
            source = url.href;
    } catch {
        // Not an address at all: there is no file to play.
    }
    source ||= local(target);
    if (!source)
        throw new Error('This video source has no in-app player adapter yet. Its annotations remain available.');
    return new BrowserVideo(container, source, status);
}
export class BrowserVideo implements VideoPlayback {
    private listeners = new Set<(seconds: number | null) => void>();
    subscribe(listener: (seconds: number | null) => void) {
        if (this.stopped) {
            listener(null);
            return () => {};
        }
        this.listeners.add(listener);
        listener(this.time());
        return () => {
            this.listeners.delete(listener);
        };
    }
    private publish = () => {
        for (const listener of this.listeners) listener(this.time());
    };
    private control: ((error: Error) => void) | null = null;
    readonly element: HTMLVideoElement;
    private stopped = false;
    private broken = false;
    private pending: (() => void) | null = null;
    constructor(
        container: HTMLElement,
        private source: string,
        private status: (text: string) => void
    ) {
        this.element = container.ownerDocument.createElement('video');
        this.element.className = 'annotator-video-player';
        this.element.controls = true;
        this.element.playsInline = true;
        this.element.preload = 'metadata';
        this.element.src = source;
        container.append(this.element);
        this.element.addEventListener('loadedmetadata', this.loaded);
        this.element.addEventListener('error', this.failed);
        for (const name of ['timeupdate', 'seeked', 'durationchange', 'emptied'])
            this.element.addEventListener(name, this.publish);
        status('Loading video…');
    }
    // A recording with no picture (a lecture, a podcast) needs only its controls, not a dark box the shape of a film.
    private loaded = () => {
        this.broken = false;
        const sound = !this.element.videoWidth;
        this.element.classList.toggle('is-audio', sound);
        this.element.parentElement?.classList.toggle('is-audio', sound);
        this.publish();
        this.status('Video ready.');
    };
    private failed = () => {
        this.broken = true;
        this.control?.(new Error('The browser could not play this video source.'));
        this.pending?.();
        this.publish();
        this.status('The browser could not play this video source.');
    };
    time() {
        return !this.stopped &&
            !this.broken &&
            this.element.isConnected &&
            this.element.getAttribute('src') === this.source &&
            !this.element.srcObject &&
            this.element.readyState >= 1 &&
            finite(this.element.duration) &&
            this.element.duration > 0 &&
            finite(this.element.currentTime)
            ? this.element.currentTime
            : null;
    }
    length() {
        return this.time() === null ? null : this.element.duration;
    }
    still() {
        const video = this.element,
            width = video.videoWidth,
            height = video.videoHeight;
        if (this.time() === null || !width || !height || video.readyState < 2) return null;
        try {
            const canvas = video.ownerDocument.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) return null;
            context.drawImage(video, 0, 0, width, height);
            // A video from a site that does not share its pixels taints the canvas; reading one pixel says so now rather than at save.
            context.getImageData(0, 0, 1, 1);
            return canvas;
        } catch {
            return null;
        }
    }
    setRate(rate: number) {
        if (this.current() && finite(rate) && rate >= 0.25 && rate <= 4) this.element.playbackRate = rate;
    }
    playing() {
        return this.time() === null ? null : !this.element.paused && !this.element.ended;
    }
    private current() {
        return (
            !this.stopped &&
            !this.broken &&
            this.element.isConnected &&
            this.element.getAttribute('src') === this.source &&
            !this.element.srcObject
        );
    }
    async setPlaying(playing: boolean): Promise<void> {
        if (!this.current()) throw new Error('The video player is unavailable or its source changed.');
        this.control?.(new Error('Playback request replaced.'));
        return new Promise((resolve, reject) => {
            const video = this.element;
            // Set after the handlers that clear it are made.
            // eslint-disable-next-line prefer-const
            let timer: ReturnType<typeof setTimeout>;
            const finish = (error?: Error) => {
                clearTimeout(timer);
                for (const name of ['playing', 'pause', 'ended']) video.removeEventListener(name, observed);
                if (this.control === cancel) this.control = null;
                if (error) reject(error);
                else resolve();
            };
            const cancel = (error: Error) => finish(error);
            const observed = () => {
                if (!this.current()) {
                    finish(new Error('The video source changed during playback control.'));
                    return;
                }
                if (playing ? !video.paused && !video.ended : video.paused || video.ended) finish();
            };
            this.control = cancel;
            for (const name of ['playing', 'pause', 'ended']) video.addEventListener(name, observed);
            timer = setTimeout(
                () => finish(new Error('The browser did not confirm the requested playback state.')),
                8000
            );
            try {
                if (playing)
                    void video
                        .play()
                        .then(observed, error => finish(error instanceof Error ? error : new Error(String(error))));
                else {
                    video.pause();
                    observed();
                }
            } catch (error) {
                finish(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }
    async seek(seconds: number): Promise<number> {
        if (this.stopped || this.element.getAttribute('src') !== this.source || this.time() === null)
            throw new Error('Wait for the video to load.');
        if (!finite(seconds) || seconds > this.element.duration)
            throw new Error('This timestamp is outside the video duration.');
        if (this.pending) throw new Error('A seek is already in progress.');
        if (Math.abs(this.element.currentTime - seconds) < 0.05) return this.element.currentTime;
        return new Promise((resolve, reject) => {
            // Set after the handlers that clear it are made.
            // eslint-disable-next-line prefer-const
            let timer: ReturnType<typeof setTimeout>;
            const finish = (error?: Error) => {
                clearTimeout(timer);
                this.element.removeEventListener('seeked', landed);
                this.pending = null;
                if (error) reject(error);
                else resolve(this.element.currentTime);
            };
            const landed = () => {
                if (
                    !this.stopped &&
                    this.element.getAttribute('src') === this.source &&
                    finite(this.element.currentTime)
                )
                    finish();
                else finish(new Error('The video source changed during seek.'));
            };
            this.pending = () => finish(new Error('The video player closed or failed during seek.'));
            timer = setTimeout(() => finish(new Error('The video did not confirm the seek.')), 8000);
            this.element.addEventListener('seeked', landed);
            try {
                this.element.currentTime = seconds;
            } catch (error) {
                finish(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }
    dispose() {
        if (this.stopped) return;
        this.stopped = true;
        this.control?.(new Error('The video player closed.'));
        this.pending?.();
        this.publish();
        this.listeners.clear();
        for (const name of ['timeupdate', 'seeked', 'durationchange', 'emptied'])
            this.element.removeEventListener(name, this.publish);
        this.element.removeEventListener('loadedmetadata', this.loaded);
        this.element.removeEventListener('error', this.failed);
        try {
            this.element.pause();
        } catch {
            // A player that is already gone has nothing to pause.
        }
        this.element.removeAttribute('src');
        this.element.remove();
    }
}
/** Bounded message adapter matching the inspected official widget API transport.
 * This is a tested provider implementation detail, not a new public API promise. */
export class EmbeddedYouTube implements VideoPlayback {
    private listeners = new Set<(seconds: number | null) => void>();
    subscribe(listener: (seconds: number | null) => void) {
        if (this.stopped) {
            listener(null);
            return () => {};
        }
        this.listeners.add(listener);
        listener(this.time());
        return () => {
            this.listeners.delete(listener);
        };
    }
    private publish() {
        for (const listener of this.listeners) listener(this.time());
    }
    readonly element: HTMLIFrameElement;
    private owner = uuid();
    private stopped = false;
    private ready = false;
    private verified = false;
    private seconds: number | null = null;
    private duration = 0;
    private live: boolean | undefined;
    private error = '';
    private handshake: ReturnType<typeof setInterval> | null = null;
    private timeout: ReturnType<typeof setTimeout> | null = null;
    private pending: {
        seconds: number;
        resolve: (value: number) => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
    } | null = null;
    private control: {
        playing: boolean;
        resolve: () => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
    } | null = null;
    private playerState: number | null = null;
    private origin = 'https://www.youtube.com';
    private sourceUrl = '';
    private window: Window;
    private lastStatus = '';
    private report(text: string) {
        if (text !== this.lastStatus) {
            this.lastStatus = text;
            this.status(text);
        }
    }
    constructor(
        container: HTMLElement,
        private video: string,
        private start: number,
        private status: (text: string) => void
    ) {
        this.window = container.ownerDocument.defaultView!;
        this.element = container.ownerDocument.createElement('iframe');
        this.element.className = 'annotator-video-player';
        this.element.title = 'Video player';
        this.element.setAttribute(
            'sandbox',
            'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox'
        );
        this.element.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
        this.element.referrerPolicy = 'strict-origin-when-cross-origin';
        const url = new URL(`/embed/${video}`, this.origin);
        url.searchParams.set('enablejsapi', '1');
        url.searchParams.set('playsinline', '1');
        if (start) url.searchParams.set('start', String(Math.floor(start)));
        if (/^https?:$/.test(this.window.location.protocol))
            url.searchParams.set('origin', this.window.location.origin);
        this.sourceUrl = url.href;
        this.element.src = url.href;
        this.element.addEventListener('load', this.loaded);
        this.window.addEventListener('message', this.message);
        container.append(this.element);
        status('Loading video…');
    }
    private send(value: Record<string, unknown>) {
        if (!this.stopped)
            this.element.contentWindow?.postMessage(
                JSON.stringify({ ...value, id: this.owner, channel: 'widget' }),
                this.origin
            );
    }
    private loaded = () => {
        this.cancel(new Error('The video player reloaded.'));
        this.cancelControl(new Error('The video player reloaded.'));
        this.playerState = null;
        this.ready = false;
        this.verified = false;
        this.seconds = null;
        this.duration = 0;
        this.live = undefined;
        this.error = '';
        this.publish();
        this.owner = uuid();
        this.clearTimers();
        const hello = () => this.send({ event: 'listening' });
        hello();
        this.handshake = setInterval(hello, 250);
        this.timeout = setTimeout(() => {
            this.clearTimers();
            if (!this.ready) {
                this.error = 'The video player did not become ready. Check its on-screen error.';
                this.report(this.error);
            }
        }, 20000);
    };
    /** Obsidian for iOS serves its page from capacitor://, which sends YouTube no http(s) Referer, and YouTube's embedded player
     * refuses to play without one (Error 153). Nothing inside the plugin can change that, so the player gives way to a plain
     * message and a link to the video; the annotations stay where they are. */
    private unavailable() {
        this.error = 'YouTube does not play inside Obsidian on iOS.';
        this.clearTimers();
        this.cancel(new Error(this.error));
        this.cancelControl(new Error(this.error));
        const doc = this.element.ownerDocument,
            box = doc.createElement('div');
        box.className = 'annotator-video-unavailable';
        const text = doc.createElement('p');
        text.textContent = 'YouTube videos can’t play inside Obsidian on iOS. Your annotations are below.';
        this.away = true;
        const url = new URL(this.elsewhere(this.start)!);
        const link = doc.createElement('a');
        link.className = 'annotator-video-open external-link';
        link.href = url.href;
        link.textContent = 'Open in YouTube';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        // Obsidian opens window.open in the system browser (or the YouTube app); where it gives nothing back, the link is followed as it is.
        link.addEventListener('click', event => {
            if (this.window.open(url.href, '_blank')) event.preventDefault();
        });
        box.append(text, link);
        this.element.replaceWith(box);
        box.closest('.annotator-video-view')?.classList.add('is-video-unavailable');
        this.report('');
        this.publish();
    }
    private away = false;
    elsewhere(seconds: number) {
        if (!this.away) return null;
        const url = new URL('/watch', this.origin);
        url.searchParams.set('v', this.video);
        if (Number.isFinite(seconds) && seconds >= 1) url.searchParams.set('t', `${Math.floor(seconds)}s`);
        return url.href;
    }
    private clearTimers() {
        if (this.handshake) clearInterval(this.handshake);
        if (this.timeout) clearTimeout(this.timeout);
        this.handshake = null;
        this.timeout = null;
    }
    private cancel(error: Error) {
        if (this.pending) {
            clearTimeout(this.pending.timer);
            this.pending.reject(error);
            this.pending = null;
        }
    }
    private message = (event: MessageEvent) => {
        if (
            this.stopped ||
            event.source !== this.element.contentWindow ||
            event.origin !== this.origin ||
            typeof event.data !== 'string' ||
            event.data.length > 200000
        )
            return;
        // A message from the player's frame: nothing in it is trusted, and each field is checked where it is read.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any;
        try {
            data = JSON.parse(event.data);
        } catch {
            return;
        }
        if (!data || String(data.id) !== this.owner || (data.channel && data.channel !== 'widget')) return;
        if (data.event === 'onError' && Number.isSafeInteger(data.info)) {
            if (data.info === 153 && this.window.location.protocol === 'capacitor:') {
                this.unavailable();
                return;
            }
            this.error = youtubeError(data.info);
            this.cancel(new Error(this.error));
            this.cancelControl(new Error(this.error));
            this.report(this.error);
            this.publish();
            return;
        }
        if (data.event === 'initialDelivery' || data.event === 'onReady') {
            this.ready = true;
            this.clearTimers();
            for (const name of ['onReady', 'onError', 'onStateChange', 'onAutoplayBlocked'])
                this.send({ event: 'command', func: 'addEventListener', args: [name] });
        }
        if (data.event === 'onAutoplayBlocked') {
            if (this.control?.playing)
                this.cancelControl(
                    new Error('The browser blocked playback. Tap Play again or use the player controls.')
                );
            return;
        }
        if (data.event === 'onStateChange') this.observeState(data.info);
        if (['initialDelivery', 'infoDelivery'].includes(data.event) && data.info && typeof data.info === 'object') {
            const info = data.info;
            if (info.videoData && typeof info.videoData.video_id === 'string') {
                if (info.videoData.video_id !== this.video) {
                    this.error = 'The player navigated to another video. Reopen this annotation note.';
                    this.verified = false;
                    this.cancel(new Error(this.error));
                    this.cancelControl(new Error(this.error));
                    this.report(this.error);
                    this.publish();
                    return;
                }
                this.verified = true;
                if (typeof info.videoData.isLive === 'boolean') this.live = info.videoData.isLive;
            }
            if ('playerState' in info) this.observeState(info.playerState);
            if ('currentTime' in info) this.seconds = finite(info.currentTime) ? info.currentTime : null;
            if ('duration' in info) this.duration = finite(info.duration) ? info.duration : 0;
            if (
                this.pending &&
                this.ready &&
                this.verified &&
                this.seconds !== null &&
                Math.abs(this.seconds - this.pending.seconds) <= 2
            ) {
                const pending = this.pending;
                this.pending = null;
                clearTimeout(pending.timer);
                pending.resolve(this.seconds);
            }
        }
        if (this.ready && this.verified && !this.error) this.report('Video ready.');
        this.publish();
    };
    time() {
        return !this.stopped &&
            this.element.isConnected &&
            this.element.ownerDocument.defaultView === this.window &&
            this.element.src === this.sourceUrl &&
            this.ready &&
            this.verified &&
            !this.error &&
            this.live === false &&
            finite(this.seconds) &&
            this.duration > 0 &&
            this.seconds <= this.duration
            ? this.seconds
            : null;
    }
    length() {
        return this.time() === null ? null : this.duration;
    }
    setRate(rate: number) {
        if (this.current() && finite(rate) && [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].includes(rate))
            this.send({ event: 'command', func: 'setPlaybackRate', args: [rate] });
    }
    playing() {
        return this.time() === null || this.playerState === null ? null : this.playerState === 1;
    }
    private current() {
        return (
            !this.stopped &&
            this.element.isConnected &&
            this.element.ownerDocument.defaultView === this.window &&
            this.element.src === this.sourceUrl &&
            this.ready &&
            this.verified &&
            !this.error
        );
    }
    private cancelControl(error: Error) {
        if (this.control) {
            const control = this.control;
            this.control = null;
            clearTimeout(control.timer);
            control.reject(error);
        }
    }
    private observeState(value: unknown) {
        if (typeof value !== 'number' || ![-1, 0, 1, 2, 3, 5].includes(value)) return;
        this.playerState = value;
        if (this.control && this.current() && (this.control.playing ? value === 1 : [-1, 0, 2, 5].includes(value))) {
            const control = this.control;
            this.control = null;
            clearTimeout(control.timer);
            control.resolve();
        }
    }
    async setPlaying(playing: boolean): Promise<void> {
        if (!this.current()) throw new Error(this.error || 'Wait for the video player to become ready.');
        // A no-op needs no command. Once a command is sent, cached state is no
        // longer evidence: its opposite may already be in flight inside the frame.
        const satisfied = playing
            ? this.playerState === 1
            : this.playerState !== null && [-1, 0, 2, 5].includes(this.playerState);
        if (!this.control && satisfied) return;
        this.cancelControl(new Error('Playback request replaced.'));
        this.playerState = null;
        return new Promise((resolve, reject) => {
            this.control = {
                playing,
                resolve,
                reject,
                timer: setTimeout(() => {
                    this.control = null;
                    reject(new Error('The video player did not confirm the requested playback state.'));
                }, 8000)
            };
            this.send({ event: 'command', func: playing ? 'playVideo' : 'pauseVideo', args: [] });
        });
    }
    async seek(seconds: number): Promise<number> {
        if (this.error) throw new Error(this.error);
        if (
            this.stopped ||
            !this.element.isConnected ||
            this.element.ownerDocument.defaultView !== this.window ||
            this.element.src !== this.sourceUrl ||
            !this.ready ||
            !this.verified
        )
            throw new Error('Wait for the video player to become ready.');
        if (!finite(seconds) || !this.duration || seconds > this.duration)
            throw new Error('This timestamp is outside the available video duration.');
        if (this.live === true) throw new Error('Seeking stored timestamps on a live timeline is not supported yet.');
        if (this.pending) throw new Error('A seek is already in progress.');
        return new Promise((resolve, reject) => {
            this.pending = {
                seconds,
                resolve,
                reject,
                timer: setTimeout(() => {
                    this.pending = null;
                    reject(new Error('The video player did not confirm the requested timestamp.'));
                }, 8000)
            };
            this.send({ event: 'command', func: 'seekTo', args: [seconds, true] });
        });
    }
    dispose() {
        if (this.stopped) return;
        this.stopped = true;
        this.publish();
        this.listeners.clear();
        this.clearTimers();
        this.cancel(new Error('The video player closed.'));
        this.cancelControl(new Error('The video player closed.'));
        this.window.removeEventListener('message', this.message);
        this.element.removeEventListener('load', this.loaded);
        this.element.remove();
    }
}
