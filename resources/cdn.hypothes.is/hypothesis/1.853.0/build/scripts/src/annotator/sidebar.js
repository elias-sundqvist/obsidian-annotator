import Hammer from 'hammerjs';

import annotationCounts from './annotation-counts';
import sidebarTrigger from './sidebar-trigger';
import { createSidebarConfig } from './config/sidebar';
import events from '../shared/bridge-events';
import features from './features';

import { ToolbarController } from './toolbar';
import { createShadowRoot } from './util/shadow-root';
import BucketBar from './bucket-bar';
import { ListenerCollection } from './util/listener-collection';

/**
 * @typedef {import('./guest').default} Guest
 *
 * @typedef LayoutState
 * @prop {boolean} expanded
 * @prop {number} width
 * @prop {number} height
 *
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

// Minimum width to which the iframeContainer can be resized.
export const MIN_RESIZE = 280;

/**
 * Create the iframe that will load the sidebar application.
 *
 * @return {HTMLIFrameElement}
 */
function createSidebarIframe(config) {
  const sidebarConfig = createSidebarConfig(config);
  const configParam =
    'config=' + encodeURIComponent(JSON.stringify(sidebarConfig));
  const sidebarAppSrc = config.sidebarAppUrl + '#' + configParam;

  const sidebarFrame = document.createElement('iframe');

  // Enable media in annotations to be shown fullscreen
  sidebarFrame.setAttribute('allowfullscreen', '');

  sidebarFrame.src = sidebarAppSrc;
  sidebarFrame.title = 'Hypothesis annotation viewer';
  sidebarFrame.className = 'h-sidebar-iframe';

  return sidebarFrame;
}

/**
 * The `Sidebar` class creates (1) the sidebar application iframe, (2) its container,
 * as well as (3) the adjacent controls.
 *
 * @implements Destroyable
 */
export default class Sidebar {
  /**
   * @param {HTMLElement} element
   * @param {import('./util/emitter').EventBus} eventBus -
   *   Enables communication between components sharing the same eventBus
   * @param {Guest} guest -
   *   The `Guest` instance for the current frame. It is currently assumed that
   *   it is always possible to annotate in the frame where the sidebar is
   *   displayed.
   * @param {Record<string, any>} [config]
   */
  constructor(element, eventBus, guest, config = {}) {
    this._emitter = eventBus.createEmitter();

    /**
     * The `<iframe>` element containing the sidebar application.
     */
    this.iframe = createSidebarIframe(config);

    this.options = config;

    /** @type {BucketBar|null} */
    this.bucketBar = null;

    if (config.externalContainerSelector) {
      this.externalFrame =
        /** @type {HTMLElement} */
        (document.querySelector(config.externalContainerSelector)) ?? element;
      this.externalFrame.appendChild(this.iframe);
    } else {
      this.iframeContainer = document.createElement('div');
      this.iframeContainer.style.display = 'none';
      this.iframeContainer.className = 'annotator-frame';

      if (config.theme === 'clean') {
        this.iframeContainer.classList.add('annotator-frame--theme-clean');
      } else {
        const bucketBar = new BucketBar(this.iframeContainer, guest, {
          contentContainer: guest.contentContainer(),
        });
        this._emitter.subscribe('anchorsChanged', () => bucketBar.update());
        this.bucketBar = bucketBar;
      }

      this.iframeContainer.appendChild(this.iframe);

      // Wrap up the 'iframeContainer' element into a shadow DOM so it is not affected by host CSS styles
      this.hypothesisSidebar = document.createElement('hypothesis-sidebar');
      const shadowDom = createShadowRoot(this.hypothesisSidebar);
      shadowDom.appendChild(this.iframeContainer);

      element.appendChild(this.hypothesisSidebar);
    }

    this.guest = guest;

    this._listeners = new ListenerCollection();

    this._emitter.subscribe('panelReady', () => {
      // Show the UI
      if (this.iframeContainer) {
        this.iframeContainer.style.display = '';
      }
    });

    this._emitter.subscribe('beforeAnnotationCreated', annotation => {
      // When a new non-highlight annotation is created, focus
      // the sidebar so that the text editor can be focused as
      // soon as the annotation card appears
      if (!annotation.$highlight) {
        /** @type {Window} */ (this.iframe.contentWindow).focus();
      }
    });

    if (
      config.openSidebar ||
      config.annotations ||
      config.query ||
      config.group
    ) {
      this._emitter.subscribe('panelReady', () => this.open());
    }

    // Set up the toolbar on the left edge of the sidebar.
    const toolbarContainer = document.createElement('div');
    this.toolbar = new ToolbarController(toolbarContainer, {
      createAnnotation: () => guest.createAnnotation(),
      setSidebarOpen: open => (open ? this.open() : this.close()),
      setHighlightsVisible: show => this.setAllVisibleHighlights(show),
    });

    if (config.theme === 'clean') {
      this.toolbar.useMinimalControls = true;
    } else {
      this.toolbar.useMinimalControls = false;
    }

    this._emitter.subscribe('highlightsVisibleChanged', visible => {
      this.toolbar.highlightsVisible = visible;
    });
    this._emitter.subscribe('hasSelectionChanged', hasSelection => {
      this.toolbar.newAnnotationType = hasSelection ? 'annotation' : 'note';
    });

    if (this.iframeContainer) {
      // If using our own container frame for the sidebar, add the toolbar to it.
      this.iframeContainer.prepend(toolbarContainer);
      this.toolbarWidth = this.toolbar.getWidth();
    } else {
      // If using a host-page provided container for the sidebar, the toolbar is
      // not shown.
      this.toolbarWidth = 0;
    }

    this._listeners.add(window, 'resize', () => this._onResize());

    this._gestureState = {
      // Initial position at the start of a drag/pan resize event (in pixels).
      initial: /** @type {number|null} */ (null),

      // Final position at end of drag resize event.
      final: /** @type {number|null} */ (null),
    };
    this._setupGestures();
    this.close();

    // Publisher-provided callback functions
    const [serviceConfig] = config.services || [];
    if (serviceConfig) {
      this.onLoginRequest = serviceConfig.onLoginRequest;
      this.onLogoutRequest = serviceConfig.onLogoutRequest;
      this.onSignupRequest = serviceConfig.onSignupRequest;
      this.onProfileRequest = serviceConfig.onProfileRequest;
      this.onHelpRequest = serviceConfig.onHelpRequest;
    }

    this.onLayoutChange = config.onLayoutChange;

    // Initial layout notification
    this._notifyOfLayoutChange(false);
    this._setupSidebarEvents();

    /**
     * A promise that resolves when the sidebar application is ready to
     * communicate with the host and guest frames.
     *
     * @type {Promise<void>}
     */
    this.ready = new Promise(resolve => {
      this._listeners.add(window, 'message', event => {
        const data = /** @type {MessageEvent} */ (event).data;
        if (data?.type === 'hypothesisSidebarReady') {
          resolve();
        }
      });
    });
  }

  destroy() {
    this.bucketBar?.destroy();
    this._listeners.removeAll();
    this._hammerManager?.destroy();
    if (this.hypothesisSidebar) {
      this.hypothesisSidebar.remove();
    } else {
      this.iframe.remove();
    }
    this._emitter.destroy();
  }

  _setupSidebarEvents() {
    annotationCounts(document.body, this.guest.crossframe);
    sidebarTrigger(document.body, () => this.open());
    features.init(this.guest.crossframe);

    this.guest.crossframe.on('openSidebar', () => this.open());
    this.guest.crossframe.on('closeSidebar', () => this.close());

    // Sidebar listens to the `openNotebook` event coming from the sidebar's
    // iframe and re-publishes it via the emitter to the Notebook
    this.guest.crossframe.on(
      'openNotebook',
      (/** @type {string} */ groupId) => {
        this.hide();
        this._emitter.publish('openNotebook', groupId);
      }
    );
    this._emitter.subscribe('closeNotebook', () => {
      this.show();
    });

    const eventHandlers = [
      [events.LOGIN_REQUESTED, this.onLoginRequest],
      [events.LOGOUT_REQUESTED, this.onLogoutRequest],
      [events.SIGNUP_REQUESTED, this.onSignupRequest],
      [events.PROFILE_REQUESTED, this.onProfileRequest],
      [events.HELP_REQUESTED, this.onHelpRequest],
    ];
    eventHandlers.forEach(([event, handler]) => {
      if (handler) {
        this.guest.crossframe.on(event, () => handler());
      }
    });
  }

  _resetGestureState() {
    this._gestureState = { initial: null, final: null };
  }

  _setupGestures() {
    const toggleButton = this.toolbar.sidebarToggleButton;
    if (toggleButton) {
      this._hammerManager = new Hammer.Manager(toggleButton).on(
        'panstart panend panleft panright',
        /* istanbul ignore next */
        event => this._onPan(event)
      );
      this._hammerManager.add(
        new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL })
      );
    }
  }

  // Schedule any changes needed to update the sidebar layout.
  _updateLayout() {
    // Only schedule one frame at a time.
    if (this.renderFrame) {
      return;
    }

    // Schedule a frame.
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;

      if (
        this._gestureState.final !== this._gestureState.initial &&
        this.iframeContainer
      ) {
        const margin = /** @type {number} */ (this._gestureState.final);
        const width = -margin;
        this.iframeContainer.style.marginLeft = `${margin}px`;
        if (width >= MIN_RESIZE) {
          this.iframeContainer.style.width = `${width}px`;
        }
        this._notifyOfLayoutChange();
      }
    });
  }

  /**
   * Notify integrator when sidebar is opened, closed or resized.
   *
   * @param {boolean} [expanded] -
   *   `true` or `false` if the sidebar is being directly opened or closed, as
   *   opposed to being resized via the sidebar's drag handles
   */
  _notifyOfLayoutChange(expanded) {
    // The sidebar structure is:
    //
    // [ Toolbar    ][                                   ]
    // [ ---------- ][ Sidebar iframe container (@frame) ]
    // [ Bucket Bar ][                                   ]
    //
    // The sidebar iframe is hidden or shown by adjusting the left margin of
    // its container.

    const toolbarWidth = (this.iframeContainer && this.toolbar.getWidth()) || 0;
    const frame = /** @type {HTMLElement} */ (
      this.iframeContainer ?? this.externalFrame
    );
    const rect = frame.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(frame);
    const width = parseInt(computedStyle.width);
    const leftMargin = parseInt(computedStyle.marginLeft);

    // The width of the sidebar that is visible on screen, including the
    // toolbar, which is always visible.
    let frameVisibleWidth = toolbarWidth;

    if (typeof expanded === 'boolean') {
      if (expanded) {
        frameVisibleWidth += width;
      }
    } else {
      if (leftMargin < MIN_RESIZE) {
        frameVisibleWidth -= leftMargin;
      } else {
        frameVisibleWidth += width;
      }

      // Infer expanded state based on whether at least part of the sidebar
      // frame is visible.
      expanded = frameVisibleWidth > toolbarWidth;
    }

    const layoutState = /** @type LayoutState */ ({
      expanded,
      width: expanded ? frameVisibleWidth : toolbarWidth,
      height: rect.height,
    });

    if (this.onLayoutChange) {
      this.onLayoutChange(layoutState);
    }

    this.guest.fitSideBySide(layoutState);

    this._emitter.publish('sidebarLayoutChanged', layoutState);
  }

  /**
   *  On window resize events, update the marginLeft of the sidebar by calling hide/show methods.
   */
  _onResize() {
    if (this.toolbar.sidebarOpen === true) {
      if (window.innerWidth < MIN_RESIZE) {
        this.close();
      } else {
        this.open();
      }
    }
  }

  _onPan(event) {
    const frame = this.iframeContainer;
    if (!frame) {
      return;
    }

    switch (event.type) {
      case 'panstart':
        this._resetGestureState();

        // Disable animated transition of sidebar position
        frame.classList.add('annotator-no-transition');

        // Disable pointer events on the iframe.
        frame.style.pointerEvents = 'none';

        this._gestureState.initial = parseInt(
          getComputedStyle(frame).marginLeft
        );

        break;
      case 'panend':
        frame.classList.remove('annotator-no-transition');

        // Re-enable pointer events on the iframe.
        frame.style.pointerEvents = '';

        // Snap open or closed.
        if (
          this._gestureState.final === null ||
          this._gestureState.final <= -MIN_RESIZE
        ) {
          this.open();
        } else {
          this.close();
        }
        this._resetGestureState();
        break;
      case 'panleft':
      case 'panright': {
        if (typeof this._gestureState.initial !== 'number') {
          return;
        }

        const margin = this._gestureState.initial;
        const delta = event.deltaX;
        this._gestureState.final = Math.min(Math.round(margin + delta), 0);
        this._updateLayout();
        break;
      }
    }
  }

  open() {
    this.guest.crossframe.call('sidebarOpened');
    this._emitter.publish('sidebarOpened');

    if (this.iframeContainer) {
      const width = this.iframeContainer.getBoundingClientRect().width;
      this.iframeContainer.style.marginLeft = `${-1 * width}px`;
      this.iframeContainer.classList.remove('annotator-collapsed');
    }

    this.toolbar.sidebarOpen = true;

    if (this.options.showHighlights === 'whenSidebarOpen') {
      this.guest.setVisibleHighlights(true);
    }

    this._notifyOfLayoutChange(true);
  }

  close() {
    if (this.iframeContainer) {
      this.iframeContainer.style.marginLeft = '';
      this.iframeContainer.classList.add('annotator-collapsed');
    }

    this.toolbar.sidebarOpen = false;

    if (this.options.showHighlights === 'whenSidebarOpen') {
      this.guest.setVisibleHighlights(false);
    }

    this._notifyOfLayoutChange(false);
  }

  /**
   * Hide or show highlights associated with annotations in the document.
   *
   * @param {boolean} shouldShowHighlights
   */
  setAllVisibleHighlights(shouldShowHighlights) {
    this.guest.crossframe.call('setVisibleHighlights', shouldShowHighlights);
  }

  /**
   * Shows the sidebar's controls
   */
  show() {
    if (this.iframeContainer) {
      this.iframeContainer.classList.remove('is-hidden');
    }
  }

  /**
   * Hides the sidebar's controls
   */
  hide() {
    if (this.iframeContainer) {
      this.iframeContainer.classList.add('is-hidden');
    }
  }
}
