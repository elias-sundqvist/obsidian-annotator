import { requestUrl, RequestUrlResponse } from 'obsidian';
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

async function requestUrlFetch(requestInfo: RequestInfo, requestInit: RequestInit): Promise<Response> {
    let response: RequestUrlResponse;
    if (typeof requestInfo == 'string') {
        response = await requestUrl({
            url: requestInfo,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(requestInit as any)
        });
    } else {
        response = await requestUrl({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(requestInfo as any),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(requestInit as any)
        });
    }

    return new Response(response.arrayBuffer, {
        status: response.status,
        statusText: 'ok',
        headers: new Headers(response.headers)
    });
}
export const corsFetch = async (requestInfo: RequestInfo, requestInit?: RequestInit) => {
    try {
        // If url is blob, use regular fetch.
        if (requestInfo.toString().startsWith('blob:')) return await fetch(requestInfo, requestInit);

        // otherwise, nodeFetch is preferred, since it doesn't generate any unsupressable error messages.
        return (await requestUrlFetch(requestInfo, requestInit)) as Response;
    } catch (e) {
        try {
            const res = (await nodeFetch(requestInfo, requestInit)) as Response;
            if (!res.ok) {
                throw 'NodeFetch was not successful.';
            }
            return res;
        } catch (e2) {
            try {
                const res = await fetch(requestInfo, requestInit);
                if (!res.ok) {
                    throw 'Fetch was not successful.';
                }
                return res;
            } catch (e3) {
                const combinedError = new AggregateError([e, e2, e3], `Fetching url ${requestInfo} failed!`);
                console.error(combinedError);
                throw combinedError;
            }
        }
    }
};
