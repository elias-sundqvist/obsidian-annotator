/**
 * HTTP Basic sign-in for a source that a server keeps behind a user name and
 * password (a Calibre-Web library behind nginx, a university file server).
 * The address in a note never carries them: the reader asks when the server
 * says it wants them, sends them to that address's origin only, and keeps
 * them in memory while Obsidian runs. Nothing here asks, fetches or stores.
 */

/** What a `WWW-Authenticate` header asks for, when it is Basic: the realm it names, if any. Null for any other scheme. */
export function basicChallenge(header: string | null | undefined): { realm: string } | null {
    if (typeof header !== 'string') return null;
    // A header may offer several schemes, comma separated; Basic is taken wherever it stands.
    const scheme = /(?:^|,)\s*basic(?=\s|,|$)/i.exec(header);
    if (!scheme) return null;
    // Its parameters follow it, name=value, until the next scheme (a name with no "=") or the end.
    let rest = header.slice(scheme.index + scheme[0].length),
        realm = '';
    for (;;) {
        const parameter = /^\s*,?\s*([A-Za-z0-9_-]+)\s*=\s*("(?:[^"\\]|\\.)*"|[^,\s]*)/.exec(rest);
        if (!parameter) break;
        if (parameter[1].toLowerCase() === 'realm' && !realm)
            realm = parameter[2].startsWith('"') ? parameter[2].slice(1, -1).replace(/\\(.)/g, '$1') : parameter[2];
        rest = rest.slice(parameter[0].length);
    }
    return { realm: realm.slice(0, 200) };
}

/** Bytes as base64, without the platform's own helpers, so any text (UTF-8) is encoded the same everywhere. */
function base64(bytes: Uint8Array): string {
    const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '';
    for (let at = 0; at < bytes.length; at += 3) {
        const a = bytes[at],
            b = at + 1 < bytes.length ? bytes[at + 1] : 0,
            c = at + 2 < bytes.length ? bytes[at + 2] : 0,
            n = (a << 16) | (b << 8) | c;
        out += table[(n >> 18) & 63] + table[(n >> 12) & 63];
        out += at + 1 < bytes.length ? table[(n >> 6) & 63] : '=';
        out += at + 2 < bytes.length ? table[n & 63] : '=';
    }
    return out;
}

/**
 * The `Authorization` header for a user name and password, as UTF-8 (RFC 7617).
 * A user name with a colon cannot be sent this way, and control characters
 * are no part of either: both are refused.
 */
export function basicAuthorization(user: string, password: string): string {
    // eslint-disable-next-line no-control-regex
    if (user.includes(':') || /[\x00-\x1f\x7f]/.test(user + password))
        throw new Error('A user name may not contain ":", and neither may contain control characters.');
    return `Basic ${base64(new TextEncoder().encode(`${user}:${password}`))}`;
}

/** The origin sign-ins are kept for: scheme, host and port. */
export function signInOrigin(url: string): string {
    return new URL(url).origin;
}

/** Whether the password would cross the network unencrypted: plain http to anything but this machine. */
export function sentInTheClear(url: string): boolean {
    const address = new URL(url);
    return address.protocol === 'http:' && !/^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(address.hostname);
}
