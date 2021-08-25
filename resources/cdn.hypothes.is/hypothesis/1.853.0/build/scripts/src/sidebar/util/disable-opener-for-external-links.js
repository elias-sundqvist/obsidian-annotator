/**
 * Prevent windows or tabs opened via links under `root` from accessing their
 * opening `Window`.
 *
 * This makes links with `target="blank"` attributes act as if they also had
 * the `rel="noopener"` [1] attribute set.
 *
 * In addition to preventing tab-jacking [2], this also enables multi-process
 * browsers to more easily use a new process for instances of Hypothesis in the
 * newly-opened tab and works around a bug in Chrome [3]
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types#noopener
 * [2] https://mathiasbynens.github.io/rel-noopener/
 * [3] https://bugs.chromium.org/p/chromium/issues/detail?id=753314
 *
 * @param {Element} root - Root element
 */
export default function disableOpenerForExternalLinks(root) {
  root.addEventListener('click', event => {
    const target = /** @type {HTMLElement} */ (event.target);

    if (target.tagName === 'A') {
      const linkEl = /** @type {HTMLAnchorElement} */ (target);
      if (linkEl.target === '_blank') {
        linkEl.rel = 'noopener';
      }
    }
  });
}
