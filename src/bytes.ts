/**
 * Whether `whole` begins with exactly the bytes of `start` (so two files of one length are compared for equality).
 * Whole files are compared with this: four bytes at a time where they line up, with no call per byte.
 */
export function startsWithBytes(whole: Uint8Array, start: Uint8Array): boolean {
    const length = start.length;
    if (whole.length < length) return false;
    let at = 0;
    if (whole.byteOffset % 4 === 0 && start.byteOffset % 4 === 0) {
        const words = length >>> 2,
            a = new Uint32Array(whole.buffer, whole.byteOffset, words),
            b = new Uint32Array(start.buffer, start.byteOffset, words);
        for (let i = 0; i < words; i++) if (a[i] !== b[i]) return false;
        at = words << 2;
    }
    for (; at < length; at++) if (whole[at] !== start[at]) return false;
    return true;
}
