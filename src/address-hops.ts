/**
 * Where a web address handed to Annotator really leads, before anything of it is downloaded. The app's own request
 * function follows a redirect without saying where to, so on a computer each step is asked here instead, with Node's
 * own client, which follows none: every address on the way must pass the same rules as the first (https only, no
 * user name or password, nothing on this computer or its network), the name must not lead to such an address, and
 * after five steps it is given up. A phone has no such client: there only the address handed over can be checked.
 */
import { checkAddress, localNetwork } from './open-address';

/** One step: a HEAD request that follows no redirect. */
export interface HopAnswer {
    status: number;
    location: string | null;
    type: string;
}
export interface HopTools {
    /** Asks the address itself (HEAD); null where it gave no answer. */
    head(url: string): Promise<HopAnswer | null>;
    /** The addresses a name leads to; absent where that cannot be asked (a phone). */
    resolve?(host: string): Promise<string[]>;
}
export const HOP_LIMIT = 5;
/** Whether an IP address (as DNS gives it) is on this computer or its network. */
export function localAddress(ip: string): boolean {
    return localNetwork(ip.includes(':') ? `https://[${ip}]/` : `https://${ip}/`);
}
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
        if (tools.resolve) {
            const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
            let found: string[] = [];
            try {
                found = await tools.resolve(host);
            } catch {
                found = [];
            }
            if (found.some(localAddress))
                throw new Error(
                    `${host} leads to an address on this computer or its network, which a link may not open. Nothing was downloaded.`
                );
        }
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

/** The parts of Node's `https` and `dns` modules the steps are asked with on a computer. */
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
    dns: {
        lookup(
            host: string,
            options: { all: true },
            done: (error: Error | null, addresses: { address: string; family: number }[]) => void
        ): void;
    };
}
/**
 * The steps, asked with Node on a computer. The connection itself looks its name up through a check: a name that
 * now leads to this computer or its network is not connected to, whatever it led to a moment before.
 */
export function nodeHops(node: NodeHops): HopTools {
    const resolve = (host: string) =>
        new Promise<string[]>((done, failed) =>
            node.dns.lookup(host, { all: true }, (error, addresses) =>
                error ? failed(error) : done(addresses.map(each => each.address))
            )
        );
    return {
        resolve,
        head: url =>
            new Promise(done => {
                let parsed: URL;
                try {
                    parsed = new URL(url);
                } catch {
                    done(null);
                    return;
                }
                const lookup = (
                    host: string,
                    options: Record<string, unknown>,
                    answer: (error: Error | null, address?: unknown, family?: number) => void
                ) =>
                    node.dns.lookup(host, { all: true }, (error, addresses) => {
                        if (error) return answer(error);
                        if (!addresses.length || addresses.some(each => localAddress(each.address)))
                            return answer(new Error('This name leads to an address on this computer or its network.'));
                        if (options.all) return answer(null, addresses);
                        answer(null, addresses[0].address, addresses[0].family);
                    });
                const request = node.https.request(
                    {
                        protocol: 'https:',
                        hostname: parsed.hostname.replace(/^\[|\]$/g, ''),
                        ...(parsed.port ? { port: Number(parsed.port) } : {}),
                        path: `${parsed.pathname}${parsed.search}`,
                        method: 'HEAD',
                        headers: { accept: '*/*' },
                        timeout: 10000,
                        lookup
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
