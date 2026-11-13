/** Public provider identity. Never rewrite a note target while canonicalizing it. */
export interface VideoTarget {
    provider: 'youtube';
    id: string;
    original: string;
    canonical: string;
    startSeconds: number;
}
const idPattern = /^[A-Za-z0-9_-]{11}$/;
const hosts = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'www.youtu.be',
    'www.youtube-nocookie.com'
]);
function time(raw: string): number {
    if (/^\d+(?:\.\d+)?$/.test(raw)) {
        const value = Number(raw);
        if (Number.isFinite(value)) return value;
    }
    const parts = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/);
    if (parts && parts.slice(1).some(Boolean)) {
        const value = Number(parts[1] || 0) * 3600 + Number(parts[2] || 0) * 60 + Number(parts[3] || 0);
        if (Number.isFinite(value)) return value;
    }
    throw new Error('Unsupported video start time. The original target remains unchanged.');
}
export function resolveVideoTarget(original: string): VideoTarget {
    if (typeof original !== 'string' || original.length > 8192) throw new Error('Unsupported video URL.');
    const url = new URL(original);
    if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.port ||
        !hosts.has(url.hostname)
    )
        throw new Error('Use a supported YouTube URL without credentials or a custom port.');
    const path = url.pathname.split('/').filter(Boolean);
    let id: string;
    if (['youtu.be', 'www.youtu.be'].includes(url.hostname) && path.length === 1) id = path[0];
    else if (url.pathname === '/watch' && url.hostname !== 'www.youtube-nocookie.com') {
        const values = url.searchParams.getAll('v');
        if (values.length !== 1) throw new Error('A YouTube watch URL must identify exactly one video.');
        id = values[0];
    } else if (
        path.length === 2 &&
        ['embed', 'shorts', 'live'].includes(path[0]) &&
        (url.hostname !== 'www.youtube-nocookie.com' || path[0] === 'embed')
    )
        id = path[1];
    else throw new Error('Unsupported YouTube URL. Keep the original target for external playback.');
    if (!idPattern.test(id)) throw new Error('Invalid YouTube video ID.');
    // Start offsets do not participate in video identity. Reject conflicts rather
    // than guess, and retain the complete original playlist/query target.
    const offsets = [...url.searchParams.getAll('t'), ...url.searchParams.getAll('start')];
    const fragment = new URLSearchParams(url.hash.slice(1));
    offsets.push(...fragment.getAll('t'));
    const times = offsets.map(time);
    if (new Set(times).size > 1) throw new Error('Conflicting video start times.');
    return {
        provider: 'youtube',
        id,
        original,
        canonical: `https://www.youtube.com/watch?v=${id}`,
        startSeconds: times[0] ?? 0
    };
}
export function videoTimestampUrl(target: VideoTarget, seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > Number.MAX_SAFE_INTEGER)
        throw new Error('Timestamp must be finite nonnegative seconds.');
    const verified = resolveVideoTarget(target.canonical);
    if (verified.id !== target.id || target.provider !== 'youtube') throw new Error('Video identity changed.');
    const url = new URL(verified.canonical);
    url.searchParams.set('t', `${Math.floor(seconds)}s`);
    return url.href;
}
export function youtubeError(code: number): string {
    switch (code) {
        case 2:
            return 'YouTube rejected the video identifier or player parameters.';
        case 5:
            return 'YouTube could not play this video in its HTML5 player.';
        case 100:
            return 'The video was removed, is private, or could not be found.';
        case 101:
        case 150:
            return 'The owner does not allow this video to be embedded.';
        case 153:
            return 'YouTube requires player client identification. This playback host has not supplied it.';
        default:
            return `YouTube playback failed (code ${code}).`;
    }
}
