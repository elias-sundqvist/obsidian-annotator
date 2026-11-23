/**
 * Where a web address handed to Annotator really leads, before anything of it is downloaded. The app's own request
 * function follows a redirect without saying where to, so on a computer each step is asked here instead, with Node's
 * own client, which follows none: every address on the way must pass the same rules as the first (https only, no
 * user name or password), and after five steps it is given up. A phone has no such client: there only the address
 * handed over can be checked.
 */
import { checkAddress } from './open-address';

/** One step: a HEAD request that follows no redirect. */
export interface HopAnswer {
    status: number;
    location: string | null;
    type: string;
}
export interface HopTools {
    /** Asks the address itself (HEAD); null where it gave no answer. */
    head(url: string): Promise<HopAnswer | null>;
}
export const HOP_LIMIT = 5;
/**
 * The address a web address leads to, and what its server says it is (`type`, empty where it said nothing). Throws
 * an Error with words for the reader where a step is refused.
 */
export async function settleAddress(
    start: string,
    tools: HopTools,
    limit = HOP_LIMIT
): Promise<{ url: string; type: string; steps: number }> {
    let url = start;
    for (let steps = 0; ; steps++) {
        const checked = checkAddress(url);
        if ('refused' in checked)
            throw new Error(
                steps
                    ? `The address sends Annotator on to one it does not open (${shown(url)}). Nothing was downloaded.`
                    : checked.refused
            );
        url = checked.url;
        const answer = await tools.head(url).catch(() => null);
        if (!answer || answer.status < 300 || answer.status >= 400 || !answer.location)
            return { url, type: answer && answer.status < 300 ? answer.type : '', steps };
        if (steps >= limit) throw new Error('The address sends Annotator on too many times. Nothing was downloaded.');
        try {
            url = new URL(answer.location, url).href;
        } catch {
            throw new Error(
                'The address sends Annotator on to something that is not an address. Nothing was downloaded.'
            );
        }
    }
}
function shown(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return 'an address';
    }
}

/** The part of Node's `https` module the steps are asked with on a computer. */
export interface NodeHops {
    https: {
        request(
            options: Record<string, unknown>,
            answered: (response: {
                statusCode?: number;
                headers: Record<string, string | string[] | undefined>;
                resume(): void;
            }) => void
        ): { on(event: string, heard: (error?: Error) => void): unknown; end(): void; destroy(): void };
    };
}
/** The steps, asked with Node on a computer. */
export function nodeHops(node: NodeHops): HopTools {
    return {
        head: url =>
            new Promise(done => {
                let parsed: URL;
                try {
                    parsed = new URL(url);
                } catch {
                    done(null);
                    return;
                }
                const request = node.https.request(
                    {
                        protocol: 'https:',
                        hostname: parsed.hostname.replace(/^\[|\]$/g, ''),
                        ...(parsed.port ? { port: Number(parsed.port) } : {}),
                        path: `${parsed.pathname}${parsed.search}`,
                        method: 'HEAD',
                        headers: { accept: '*/*' },
                        timeout: 10000
                    },
                    response => {
                        response.resume();
                        const header = (name: string) => {
                            const value = response.headers[name];
                            return Array.isArray(value) ? value[0] || null : value || null;
                        };
                        done({
                            status: response.statusCode || 0,
                            location: header('location'),
                            type: (header('content-type') || '').toLowerCase()
                        });
                    }
                );
                request.on('error', () => done(null));
                request.on('timeout', () => {
                    request.destroy();
                    done(null);
                });
                request.end();
            })
    };
}
