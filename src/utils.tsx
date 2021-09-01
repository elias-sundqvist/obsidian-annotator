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
