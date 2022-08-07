import { requestUrl } from 'obsidian';

import defineNodeFetch from './node-fetch';

const nodeFetch = (() => {
    type FetchType = typeof fetch;
    const pureNodeFetch = (() => {
        try {
            return defineNodeFetch(x => {
                try {
                    //console.log(`getting module "${x}"`);
                    if (x.startsWith('node:')) {
                        return global.require(x.substr('node:'.length));
                    } else {
                        return global.require(x);
                    }
                } catch (e) {
                    //console.log(`failed to get module "${x}"`);
                }
            });
        } catch (e) {
            //console.log(e);
            return null;
        }
    })() as null | FetchType;
    if (pureNodeFetch) {
        return async (requestInfo: RequestInfo, requestInit?: RequestInit) => {
            const response: Response = await pureNodeFetch(requestInfo, requestInit);
            if (response.ok) {
                return new Response(await response.arrayBuffer(), {
                    ...response
                });
            }
        };
    }
})();

// This fetch can be used to get internal(like blob) and external resources with CORS policies
export async function fetchUrl(requestInfo: RequestInfo, requestInit?: RequestInit): Promise<Response> {
    console.log("fetching", requestInfo, requestInit);
    // Use regular fetch for blobs, because obsidian.requestUrl can't access files by path
    if (requestInfo.toString().startsWith('blob:')) return await fetch(requestInfo, requestInit);

    try {
        const requestHeaders = new Headers(requestInit?.headers);
        const response = await requestUrl({
            url: requestInfo instanceof Request ? requestInfo.url : requestInfo,
            ...(requestInit?Object.fromEntries(Object.entries({
                method: requestInit.method,
                contentType: requestHeaders.get('Content-Type'),
                body: requestInit.body,
                headers: Object.fromEntries(requestHeaders?.entries()),
                throw: true
            }).filter(kv=>kv[1]!==null)):{})
        });

        return new Response(response.arrayBuffer, {
            status: response.status,
            statusText: 'ok',
            headers: new Headers(response.headers)
        });
    } catch (e) {
        try {
            return await nodeFetch(typeof requestInfo === 'string' ? requestInfo : requestInfo.url, requestInit);
        } catch(e2) {
            // fallback to regular fetch, because requestUrl sometimes fails on iPad
            return await fetch(requestInfo, requestInit);
        }
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
