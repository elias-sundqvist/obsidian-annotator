/**
 * Return a normalized version of a URI.
 *
 * This makes it absolute and strips the fragment identifier.
 *
 * @param {string} uri - Relative or absolute URL
 * @param {string} [base] - Base URL to resolve relative to. Defaults to
 *   the document's base URL.
 */
export function normalizeURI(uri, base = document.baseURI) {
  const absUrl = new URL(uri, base).href;

  // Remove the fragment identifier.
  // This is done on the serialized URL rather than modifying `url.hash` due to
  // a bug in Safari.
  // See https://github.com/hypothesis/h/issues/3471#issuecomment-226713750
  return absUrl.toString().replace(/#.*/, '');
}
