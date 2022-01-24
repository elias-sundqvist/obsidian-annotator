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
