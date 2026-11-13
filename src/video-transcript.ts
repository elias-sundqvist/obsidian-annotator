/* eslint-disable @typescript-eslint/no-explicit-any -- Caption data comes from the video provider as untyped JSON;
   every field is tested for its type before it is used. */
import { decodeHTML } from 'entities';
import { resolveVideoTarget } from './video-provider';
export interface TranscriptCue {
    start: number;
    end: number;
    text: string;
}
export interface Transcript {
    cues: TranscriptCue[];
    source: string;
    language: string;
}
export interface CaptionTrack {
    url: string;
    language: string;
    label: string;
    automatic: boolean;
}
export interface TranscriptRequestOptions {
    method: 'POST';
    contentType: 'application/json';
    body: string;
}
export type TranscriptRequest = (url: string, options?: TranscriptRequestOptions) => Promise<string>;
const MAX = 5_000_000;
function plain(text: string) {
    return (
        decodeHTML(text.replace(/<[^>]*>/g, ''))
            // Control characters are what this pattern is there to find.
            // eslint-disable-next-line no-control-regex
            .replace(/\u0000/g, '')
            .trim()
    );
}
function checked(cues: TranscriptCue[]): TranscriptCue[] {
    if (!cues.length) throw new Error('No timed transcript passages were found.');
    if (
        cues.length > 30_000 ||
        cues.some(
            c => !Number.isFinite(c.start) || !Number.isFinite(c.end) || c.start < 0 || c.end <= c.start || !c.text
        )
    )
        throw new Error('The transcript contains invalid timing or empty passages.');
    return cues
        .map((cue, index) => ({ cue, index }))
        .sort((a, b) => a.cue.start - b.cue.start || a.index - b.index)
        .map(row => row.cue);
}
function seconds(value: string) {
    const parts = /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)[.,](\d{3})$/.exec(value);
    if (!parts) throw new Error('Invalid transcript timestamp.');
    // Accumulate integer milliseconds before converting once. Adding fractional
    // seconds to minutes can differ by an IEEE-754 rounding step from JSON3.
    const milliseconds =
        ((Number(parts[1] || 0) * 60 + Number(parts[2])) * 60 + Number(parts[3])) * 1000 + Number(parts[4]);
    if (!Number.isSafeInteger(milliseconds)) throw new Error('Transcript timestamp exceeds supported precision.');
    return milliseconds / 1000;
}
export function parseTranscript(source: string, format: 'vtt' | 'srt' | 'json3'): TranscriptCue[] {
    if (source.length > MAX) throw new Error('Transcript exceeds the 5 MB limit.');
    if (format === 'json3') {
        const value = JSON.parse(source);
        if (!value || !Array.isArray(value.events)) throw new Error('Invalid caption response.');
        if (
            value.events.some(
                (e: any) =>
                    !e ||
                    typeof e !== 'object' ||
                    (Array.isArray(e.segs) &&
                        e.segs.some((s: any) => typeof s?.utf8 === 'string' && s.utf8.trim()) &&
                        (typeof e.tStartMs !== 'number' || typeof e.dDurationMs !== 'number'))
            )
        )
            throw new Error('The transcript contains invalid timing.');
        return checked(
            value.events
                .filter(
                    (e: any) =>
                        Array.isArray(e.segs) && e.segs.some((s: any) => typeof s?.utf8 === 'string' && s.utf8.trim())
                )
                .map((e: any) => ({
                    start: e.tStartMs / 1000,
                    end: (e.tStartMs + e.dDurationMs) / 1000,
                    text: e.segs
                        .map((s: any) => (typeof s?.utf8 === 'string' ? s.utf8 : ''))
                        .join('')
                        .trim()
                }))
        );
    }
    const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (format === 'vtt' && !/^WEBVTT(?:[ \t].*)?(?:\n|$)/.test(normalized))
        throw new Error('Expected a WebVTT transcript.');
    const cues: TranscriptCue[] = [];
    for (const [index, block] of normalized.split(/\n[ \t]*\n/).entries()) {
        const lines = block.trim().split('\n');
        if (!block.trim()) continue;
        // Only the first VTT block is the file header. Cue identifiers can
        // begin with WEBVTT (or NOTEbook), and must not disappear as metadata.
        if (format === 'vtt' && (index === 0 || /^(?:NOTE(?:[ \t]|$)|STYLE$|REGION$)/.test(lines[0]))) continue;
        const at = lines.findIndex(line => line.includes('-->'));
        if (at < 0 || at > 1) throw new Error('A transcript block has no valid timing line.');
        const match = /^(\S+)\s+-->\s+(\S+)(?:[ \t].*)?$/.exec(lines[at]);
        if (!match) throw new Error('Invalid transcript timing line.');
        const text = plain(lines.slice(at + 1).join('\n'));
        if (text) cues.push({ start: seconds(match[1]), end: seconds(match[2]), text });
    }
    return checked(cues);
}
/** Signed caption URLs are client-specific. This public player request follows
 * youtube-transcript-api's source-inspected client contract, not an official
 * captions API. No cookies, Origin/Referer override or remote JS is needed. */
export const CAPTION_PLAYER_CLIENT = { clientName: 'ANDROID', clientVersion: '20.10.38' } as const;
export function youtubePlayerTracks(data: any, videoId: string): CaptionTrack[] {
    const status = data?.playabilityStatus?.status;
    if (status && status !== 'OK') throw new Error(`YouTube caption access is unavailable (${status}).`);
    if (data?.videoDetails?.videoId !== videoId) throw new Error('Caption metadata belongs to a different video.');
    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks))
        throw new Error(
            'No public caption tracks were supplied for this video. You can load a VTT or SRT file instead.'
        );
    if (tracks.length > 1000) throw new Error('Too many caption tracks in provider metadata.');
    return tracks.flatMap((track: any) => {
        try {
            const url = new URL(track.baseUrl);
            if (
                url.protocol !== 'https:' ||
                url.hostname !== 'www.youtube.com' ||
                url.port ||
                url.pathname !== '/api/timedtext' ||
                url.username ||
                url.password ||
                url.searchParams.get('v') !== videoId ||
                typeof track.languageCode !== 'string' ||
                !/^[A-Za-z0-9-]{1,35}$/.test(track.languageCode)
            )
                return [];
            const label =
                typeof track.name?.simpleText === 'string'
                    ? track.name.simpleText
                    : Array.isArray(track.name?.runs)
                      ? track.name.runs.map((run: any) => (typeof run?.text === 'string' ? run.text : '')).join('')
                      : track.languageCode;
            return [
                {
                    url: url.href,
                    language: track.languageCode,
                    label: label.slice(0, 500),
                    automatic: track.kind === 'asr'
                }
            ];
        } catch {
            return [];
        }
    });
}
/** Read JSON values, never execute provider page scripts. */
export function youtubeTracks(page: string, videoId: string): CaptionTrack[] {
    if (page.length > 15_000_000) throw new Error('Caption metadata exceeds the size limit.');
    const marker = /(?:var\s+)?ytInitialPlayerResponse\s*=\s*/g;
    let match: RegExpExecArray | null;
    while ((match = marker.exec(page))) {
        let end = match.index + match[0].length,
            depth = 0,
            quoted = false,
            escaped = false;
        const start = end;
        if (page[start] !== '{') continue;
        for (; end < page.length; end++) {
            const c = page[end];
            if (quoted) {
                if (escaped) escaped = false;
                else if (c === '\\') escaped = true;
                else if (c === '"') quoted = false;
            } else if (c === '"') quoted = true;
            else if (c === '{') depth++;
            else if (c === '}' && --depth === 0) break;
        }
        let data;
        try {
            data = JSON.parse(page.slice(start, end + 1));
        } catch {
            continue;
        }
        return youtubePlayerTracks(data, videoId);
    }
    throw new Error('YouTube did not supply readable caption metadata. Load a VTT or SRT file instead.');
}
export async function loadYouTubeTranscript(
    target: string,
    language: string,
    request: TranscriptRequest
): Promise<Transcript> {
    let identity;
    try {
        identity = resolveVideoTarget(target);
    } catch {
        throw new Error('Automatic captions are unavailable for this video source. Import a VTT or SRT transcript.');
    }
    if (!/^[A-Za-z0-9-]{1,35}$/.test(language)) throw new Error('Invalid caption language code.');
    const page = await request(`https://www.youtube.com/watch?v=${identity.id}`);
    if (page.length > 15_000_000) throw new Error('Caption metadata exceeds the size limit.');
    const key = /"INNERTUBE_API_KEY":\s*"([A-Za-z0-9_-]{1,200})"/.exec(page)?.[1];
    // If no public player key is supplied, retain support for pages whose direct
    // caption URLs work. Otherwise obtain fresh signed URLs for the API client.
    let tracks: CaptionTrack[];
    if (key) {
        const body = await request(`https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(key)}`, {
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify({ context: { client: CAPTION_PLAYER_CLIENT }, videoId: identity.id })
        });
        if (body.length > 15_000_000) throw new Error('Caption metadata exceeds the size limit.');
        let data;
        try {
            data = JSON.parse(body);
        } catch {
            throw new Error('YouTube returned invalid caption metadata.');
        }
        tracks = youtubePlayerTracks(data, identity.id);
    } else tracks = youtubeTracks(page, identity.id);
    const matching = tracks.filter(track => track.language.toLowerCase() === language.toLowerCase());
    const track = matching.find(track => !track.automatic) || matching[0];
    if (!track)
        throw new Error(
            `No ${language} captions. Available languages: ${[...new Set(tracks.map(t => t.language))].join(', ') || 'none'}.`
        );
    // Replace the existing fmt=srv3 parameter; appending a second fmt parameter
    // leaves the first one authoritative and returns XML instead of JSON3.
    const url = new URL(track.url);
    url.searchParams.set('fmt', 'json3');
    const body = await request(url.href);
    if (!body.trim())
        throw new Error('The caption provider returned an empty response. Load a VTT or SRT file instead.');
    return {
        cues: parseTranscript(body, 'json3'),
        source: `YouTube · ${track.label}${track.automatic ? ' (automatic)' : ''}`,
        language: track.language
    };
}
export function transcriptSelection(root: HTMLElement, selection: Selection | null, cues: TranscriptCue[]) {
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
    const parts: string[] = [];
    let start: number | null = null;
    for (const node of root.querySelectorAll<HTMLElement>('[data-transcript-cue]')) {
        if (node.closest('[hidden]') || !range.intersectsNode(node)) continue;
        const cue = cues[Number(node.dataset.transcriptCue)];
        if (!cue) return null;
        const clipped = node.ownerDocument.createRange();
        clipped.selectNodeContents(node);
        if (range.compareBoundaryPoints(0, clipped) > 0) clipped.setStart(range.startContainer, range.startOffset);
        if (range.compareBoundaryPoints(2, clipped) < 0) clipped.setEnd(range.endContainer, range.endOffset);
        const text = clipped.toString();
        if (text.trim()) {
            if (start === null) start = cue.start;
            parts.push(text);
        }
    }
    return start === null ? null : { seconds: start, text: parts.join('\n').trim() };
}

/** Latest-starting active cue, including overlapping tracks, with gap/end handling.
 * Prefix maximum ends avoid scanning the whole transcript during silent gaps. */
export function transcriptClock(cues: readonly TranscriptCue[]) {
    const ends: number[] = [];
    let maximum = -Infinity;
    for (const cue of cues) {
        maximum = Math.max(maximum, cue.end);
        ends.push(maximum);
    }
    return (seconds: number | null): number => {
        if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return -1;
        let low = 0,
            high = cues.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (cues[middle].start <= seconds) low = middle + 1;
            else high = middle;
        }
        for (let index = low - 1; index >= 0 && ends[index] > seconds; index--)
            if (cues[index].end > seconds) return index;
        return -1;
    };
}

/** WebVTT export must not silently round annotation-relevant cue times or text. */
export function transcriptVtt(cues: readonly TranscriptCue[]): string {
    const rows = checked([...cues]);
    const stamp = (seconds: number) => {
        const ms = Math.round(seconds * 1000);
        if (!Number.isSafeInteger(ms) || ms / 1000 !== seconds)
            throw new Error('This transcript has timing precision that WebVTT cannot preserve.');
        return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
    };
    // Encoded line breaks prevent empty lines or cue-shaped text from becoming
    // new WebVTT blocks. Decode happens only into text, never active HTML.
    const escaped = (text: string) =>
        text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\r/g, '&#13;')
            .replace(/\n/g, '&#10;');
    const result =
        'WEBVTT\n\n' + rows.map(cue => `${stamp(cue.start)} --> ${stamp(cue.end)}\n${escaped(cue.text)}\n`).join('\n');
    const roundtrip = parseTranscript(result, 'vtt');
    if (
        roundtrip.some(
            (cue, index) =>
                cue.start !== rows[index].start || cue.end !== rows[index].end || cue.text !== rows[index].text
        ) ||
        roundtrip.length !== rows.length
    )
        throw new Error('This transcript cannot be saved as WebVTT without changing its passages.');
    return result;
}
