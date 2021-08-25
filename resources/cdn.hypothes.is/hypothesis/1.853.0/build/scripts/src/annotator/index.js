/* global process */

/**
 * @typedef {import('../types/annotator').HypothesisWindow} HypothesisWindow
 */

// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';

// Enable debug checks for Preact components.
if (process.env.NODE_ENV !== 'production') {
  require('preact/debug');
}

// Load icons.
import { registerIcons } from '@hypothesis/frontend-shared';
import iconSet from './icons';
registerIcons(iconSet);

import { getConfig } from './config/index';
import Guest from './guest';
import Notebook from './notebook';
import Sidebar from './sidebar';
import { EventBus } from './util/emitter';

const window_ = /** @type {HypothesisWindow} */ (window);

// Look up the URL of the sidebar. This element is added to the page by the
// boot script before the "annotator" bundle loads.
const sidebarLinkElement = /** @type {HTMLLinkElement} */ (
  document.querySelector(
    'link[type="application/annotator+html"][rel="sidebar"]'
  )
);

/**
 * Entry point for the part of the Hypothesis client that runs in the page being
 * annotated.
 *
 * Depending on the client configuration in the current frame, this can
 * initialize different functionality. In "host" frames the sidebar controls and
 * iframe containing the sidebar application are created. In "guest" frames the
 * functionality to support anchoring and creating annotations is loaded. An
 * instance of Hypothesis will have one host frame, one sidebar frame and one or
 * more guest frames. The most common case is that the host frame, where the
 * client is initially loaded, is also the only guest frame.
 */
function init() {
  // Create an internal global used to share data between same-origin guest and
  // host frames.
  window_.__hypothesis = {};

  const annotatorConfig = getConfig('annotator');
  const isPDF = typeof window_.PDFViewerApplication !== 'undefined';

  const eventBus = new EventBus();
  const guest = new Guest(document.body, eventBus, {
    ...annotatorConfig,
    // Load the PDF anchoring/metadata integration.
    // nb. documentType is an internal config property only
    documentType: isPDF ? 'pdf' : 'html',
  });

  // Create the sidebar if this is the host frame. The `subFrameIdentifier`
  // config option indicates a non-host/guest-only frame.
  let sidebar;
  if (!annotatorConfig.subFrameIdentifier) {
    sidebar = new Sidebar(document.body, eventBus, guest, getConfig('sidebar'));

    // Expose sidebar window reference for use by same-origin guest frames.
    window_.__hypothesis.sidebarWindow = sidebar.ready.then(
      () => sidebar.iframe.contentWindow
    );
  }

  // Clear `annotations` value from the notebook's config to prevent direct-linked
  // annotations from filtering the threads.
  const notebook = new Notebook(document.body, eventBus, getConfig('notebook'));

  // Set up communication between this host/guest frame and the sidebar frame.
  let sidebarWindow = window_.__hypothesis.sidebarWindow;
  try {
    // If this is a guest-only frame which doesn't have its own sidebar, try
    // to connect to the one created by the parent frame. This only works if
    // the host and guest frames are same-origin.
    if (!sidebarWindow) {
      sidebarWindow = /** @type {HypothesisWindow} */ (window.parent)
        .__hypothesis?.sidebarWindow;
    }
  } catch {
    // `window.parent` access can fail due to it being cross-origin.
  }

  if (sidebarWindow) {
    const sidebarOrigin = new URL(sidebarLinkElement.href).origin;
    sidebarWindow.then(frame =>
      guest.crossframe.connectToSidebar(frame, sidebarOrigin)
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `Hypothesis guest frame in ${location.origin} could not find a sidebar to connect to.
Guest frames can only connect to sidebars in their same-origin parent frame.`
    );
  }

  sidebarLinkElement.addEventListener('destroy', () => {
    delete window_.__hypothesis;
    sidebar?.destroy();

    notebook.destroy();
    guest.destroy();

    // Remove all the `<link>`, `<script>` and `<style>` elements added to the
    // page by the boot script.
    const clientAssets = document.querySelectorAll('[data-hypothesis-asset]');
    clientAssets.forEach(el => el.remove());
  });
}

/**
 * Returns a Promise that resolves when the document has loaded (but subresources
 * may still be loading).
 * @returns {Promise<void>}
 */
function documentReady() {
  return new Promise(resolve => {
    if (document.readyState !== 'loading') {
      resolve();
    }
    // nb. `readystatechange` may be emitted twice, but `resolve` only resolves
    // on the first call.
    document.addEventListener('readystatechange', () => resolve());
  });
}

documentReady().then(init);
