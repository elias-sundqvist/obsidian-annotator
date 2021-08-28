export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function get_url_extension(url) {
    return url.split(/[#?]/)[0].split('.').pop().trim();
}
