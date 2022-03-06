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
