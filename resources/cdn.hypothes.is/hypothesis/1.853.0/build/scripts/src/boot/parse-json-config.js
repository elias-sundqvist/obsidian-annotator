// `Object.assign()`-like helper. Used because this script needs to work
// in IE 10/11 without polyfills.
function assign(dest, src) {
  for (const k in src) {
    if (src.hasOwnProperty(k)) {
      dest[k] = src[k];
    }
  }
  return dest;
}

/**
 * Return a parsed `js-hypothesis-config` object from the document, or `{}`.
 *
 * Find all `<script class="js-hypothesis-config">` tags in the given document,
 * parse them as JSON, and return the parsed object.
 *
 * If there are no `js-hypothesis-config` tags in the document then return
 * `{}`.
 *
 * If there are multiple `js-hypothesis-config` tags in the document then merge
 * them into a single returned object (when multiple scripts contain the same
 * setting names, scripts further down in the document override those further
 * up).
 *
 * @param {Document|Element} document - The root element to search.
 */
export function parseJsonConfig(document) {
  const config = {};
  const settingsElements = document.querySelectorAll(
    'script.js-hypothesis-config'
  );

  for (let i = 0; i < settingsElements.length; i++) {
    let settings;
    try {
      settings = JSON.parse(settingsElements[i].textContent || '');
    } catch (err) {
      console.warn(
        'Could not parse settings from js-hypothesis-config tags',
        err
      );
      settings = {};
    }
    assign(config, settings);
  }

  return config;
}
