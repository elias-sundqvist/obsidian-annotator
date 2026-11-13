/**
 * Three things newer browsers have and older ones do not: Android's System
 * WebView before 98 (a phone that does not update it through the Play Store
 * stays where it shipped, 91 on Android 12) and iOS before 15.4. The reader
 * works there; these stand in for what is missing and use the browser's own
 * where it has it.
 */

/** A random identifier in the form of a version-4 UUID. */
export function uuid(): string {
    const source = globalThis.crypto as Crypto & { randomUUID?: () => string };
    if (typeof source?.randomUUID === 'function') return source.randomUUID();
    const bytes = new Uint8Array(16);
    source.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A copy that shares nothing with what it was made from: settings, drafts, records and the like. */
export function clone<T>(value: T): T {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return copy(value, new Map()) as T;
}
function copy(value: unknown, seen: Map<object, unknown>): unknown {
    if (value === null || typeof value !== 'object') return value;
    const before = seen.get(value);
    if (before !== undefined) return before;
    if (value instanceof Date) return new Date(value.getTime());
    if (value instanceof ArrayBuffer) return value.slice(0);
    if (ArrayBuffer.isView(value)) {
        const view = value as unknown as { slice?(): unknown };
        return typeof view.slice === 'function' ? view.slice() : value;
    }
    if (Array.isArray(value)) {
        const made: unknown[] = [];
        seen.set(value, made);
        for (let at = 0; at < value.length; at++) made[at] = copy(value[at], seen);
        return made;
    }
    if (value instanceof Map) {
        const made = new Map();
        seen.set(value, made);
        for (const [key, item] of value) made.set(copy(key, seen), copy(item, seen));
        return made;
    }
    if (value instanceof Set) {
        const made = new Set();
        seen.set(value, made);
        for (const item of value) made.add(copy(item, seen));
        return made;
    }
    const made: Record<string, unknown> = {};
    seen.set(value, made);
    for (const key of Object.keys(value)) made[key] = copy((value as Record<string, unknown>)[key], seen);
    return made;
}

/** The last of a list, or undefined for an empty one (`list.at(-1)`). */
export function last<T>(list: ArrayLike<T> | null | undefined): T | undefined {
    return list && list.length ? list[list.length - 1] : undefined;
}
