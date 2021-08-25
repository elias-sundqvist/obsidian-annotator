/**
 * Return all `<iframe>` elements under `container` which are annotate-able.
 *
 * To enable annotation, an iframe must be opted-in by adding the
 * `enable-annotation` attribute.
 *
 * Eventually we may want annotation to be enabled by default for iframes that
 * pass certain tests. However we need to resolve a number of issues before we
 * can do that. See https://github.com/hypothesis/client/issues/530
 *
 * @param {Element} container
 * @return {HTMLIFrameElement[]}
 */
export function findFrames(container) {
  return Array.from(container.querySelectorAll('iframe[enable-annotation]'));
}

/**
 * Check if the iframe has already been injected
 *
 * @param {HTMLIFrameElement} iframe
 */
export function hasHypothesis(iframe) {
  const iframeWindow = /** @type {Window} */ (iframe.contentWindow);
  return '__hypothesis' in iframeWindow;
}

/**
 * Inject the client's boot script into the iframe. The iframe must be from the
 * same origin as the current window.
 *
 * @param {HTMLIFrameElement} iframe
 * @param {string} scriptSrc
 * @param {Record<string, any>} config
 */
export function injectHypothesis(iframe, scriptSrc, config) {
  const configElement = document.createElement('script');
  configElement.className = 'js-hypothesis-config';
  configElement.type = 'application/json';
  configElement.innerText = JSON.stringify(config);

  const embedElement = document.createElement('script');
  embedElement.className = 'js-hypothesis-embed';
  embedElement.async = true;
  embedElement.src = scriptSrc;

  const iframeDocument = /** @type {Document} */ (iframe.contentDocument);
  iframeDocument.body.appendChild(configElement);
  iframeDocument.body.appendChild(embedElement);
}

/**
 * Check if we can access this iframe's document
 *
 * @param {HTMLIFrameElement} iframe
 */
export function isAccessible(iframe) {
  try {
    return !!iframe.contentDocument;
  } catch (e) {
    return false;
  }
}

/**
 * @param {HTMLIFrameElement} iframe
 * @param {() => void} callback
 */
export function isDocumentReady(iframe, callback) {
  const iframeDocument = /** @type {Document} */ (iframe.contentDocument);
  if (iframeDocument.readyState === 'loading') {
    iframeDocument.addEventListener('DOMContentLoaded', () => {
      callback();
    });
  } else {
    callback();
  }
}
