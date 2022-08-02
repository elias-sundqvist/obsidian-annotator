import { requestUrl } from 'obsidian';

// This fetch can be used to get internal(like blob) and external resources with CORS policies
export async function fetchUrl(requestInfo: RequestInfo, requestInit?: RequestInit): Promise<Response> {

    // Use regular fetch for blobs, because obsidian.requestUrl can't access files by path
    if (requestInfo.toString().startsWith('blob:')) return await fetch(requestInfo, requestInit);

    try {
        const response = await requestUrl({
            url: requestInfo instanceof Request ? requestInfo.url : requestInfo,
            method: requestInit?.method
        });

        return new Response(response.arrayBuffer, {
            status: response.status,
            statusText: 'ok',
            headers: new Headers(response.headers)
        });
    } catch (e) {
        // fallback to regular fetch, because requestUrl sometimes fails on iPad
        return await fetch(requestInfo, requestInit);
    }
}

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function get_url_extension(url) {
    return url.split(/[#?]/)[0].split('.').pop().trim();
}

export function isUrl(potentialUrl: string) {
    try {
        new URL(potentialUrl);
        return true;
    } catch (e) {
        return false;
    }
}

export function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

export function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
}

// Used to prevent spamming the callback function
// will only call the last callback after no calls have
// been made for ms milliseconds. The preceeding callbacks
// will be ignored.
export function callDelayer() {
    let timeoutId: NodeJS.Timeout;
    return (callback, ms) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        timeoutId = setTimeout(() => {
            timeoutId = null;
            callback();
        }, ms);
    };
}
