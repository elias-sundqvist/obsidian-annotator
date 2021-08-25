import debounce from 'lodash.debounce';

import bridgeEvents from '../../shared/bridge-events';
import { isReply, isPublic } from '../helpers/annotation-metadata';
import { watch } from '../util/watch';

/**
 * Return a minimal representation of an annotation that can be sent from the
 * sidebar app to a connected frame.
 *
 * Because this representation will be exposed to untrusted third-party
 * JavaScript, it includes only the information needed to uniquely identify it
 * within the current session and anchor it in the document.
 */
export function formatAnnot(ann) {
  return {
    tag: ann.$tag,
    msg: {
      document: ann.document,
      target: ann.target,
      uri: ann.uri,
    },
  };
}

/**
 * Service that synchronizes annotations between the sidebar and host page.
 *
 * Annotations are synced in both directions. New annotations created in the host
 * page are added to the store in the sidebar and persisted to the backend. Annotations
 * fetched from the API and added to the sidebar's store are sent to the host
 * page in order to create highlights in the document. When an annotation is
 * deleted in the sidebar it is removed from the host page.
 *
 * This service also synchronizes the selection and focus states of annotations,
 * so that clicking a highlight in the page filters the selection in the sidebar
 * and hovering an annotation in the sidebar highlights the corresponding
 * highlights in the page.
 *
 * For annotations sent from the sidebar to host page, only the subset of annotation
 * data needed to create the highlights is sent. This is a security/privacy
 * feature to prevent the host page observing the contents or authors of annotations.
 *
 * @inject
 */
export class FrameSyncService {
  /**
   * @param {Window} $window - Test seam
   * @param {import('./annotations').AnnotationsService} annotationsService
   * @param {import('../../shared/bridge').Bridge} bridge
   * @param {import('../store').SidebarStore} store
   */
  constructor($window, annotationsService, bridge, store) {
    this._bridge = bridge;
    this._store = store;
    this._window = $window;

    // Set of tags of annotations that are currently loaded into the frame
    const inFrame = new Set();

    /**
     * Watch for changes to the set of annotations displayed in the sidebar and
     * notify connected frames about new/updated/deleted annotations.
     */
    this._setupSyncToFrame = () => {
      let prevPublicAnns = 0;

      watch(
        store.subscribe,
        [() => store.allAnnotations(), () => store.frames()],
        ([annotations, frames], [prevAnnotations]) => {
          let publicAnns = 0;
          const inSidebar = new Set();
          const added = [];

          annotations.forEach(annot => {
            if (isReply(annot)) {
              // The frame does not need to know about replies
              return;
            }

            if (isPublic(annot)) {
              ++publicAnns;
            }

            inSidebar.add(annot.$tag);
            if (!inFrame.has(annot.$tag)) {
              added.push(annot);
            }
          });
          const deleted = prevAnnotations.filter(
            annot => !inSidebar.has(annot.$tag)
          );

          // We currently only handle adding and removing annotations from the frame
          // when they are added or removed in the sidebar, but not re-anchoring
          // annotations if their selectors are updated.
          if (added.length > 0) {
            bridge.call('loadAnnotations', added.map(formatAnnot));
            added.forEach(annot => {
              inFrame.add(annot.$tag);
            });
          }
          deleted.forEach(annot => {
            bridge.call('deleteAnnotation', formatAnnot(annot));
            inFrame.delete(annot.$tag);
          });

          if (frames.length > 0) {
            if (frames.every(frame => frame.isAnnotationFetchComplete)) {
              if (publicAnns === 0 || publicAnns !== prevPublicAnns) {
                bridge.call(
                  bridgeEvents.PUBLIC_ANNOTATION_COUNT_CHANGED,
                  publicAnns
                );
                prevPublicAnns = publicAnns;
              }
            }
          }
        }
      );
    };

    /** @param {string|null} frameIdentifier */
    const destroyFrame = frameIdentifier => {
      const frames = store.frames();
      const frameToDestroy = frames.find(frame => frame.id === frameIdentifier);
      if (frameToDestroy) {
        store.destroyFrame(frameToDestroy);
      }
    };

    /**
     * Listen for messages coming in from connected frames and add new annotations
     * to the sidebar.
     */
    this._setupSyncFromFrame = () => {
      // A new annotation, note or highlight was created in the frame
      bridge.on('beforeCreateAnnotation', event => {
        const annot = Object.assign({}, event.msg, { $tag: event.tag });
        // If user is not logged in, we can't really create a meaningful highlight
        // or annotation. Instead, we need to open the sidebar, show an error,
        // and delete the (unsaved) annotation so it gets un-selected in the
        // target document
        if (!store.isLoggedIn()) {
          bridge.call('openSidebar');
          store.openSidebarPanel('loginPrompt');
          bridge.call('deleteAnnotation', formatAnnot(annot));
          return;
        }
        inFrame.add(event.tag);

        // Create the new annotation in the sidebar.
        annotationsService.create(annot);
      });

      bridge.on('destroyFrame', frameIdentifier =>
        destroyFrame(frameIdentifier)
      );

      // Map of annotation tag to anchoring status
      // ('anchored'|'orphan'|'timeout').
      //
      // Updates are coalesced to reduce the overhead from processing
      // triggered by each `UPDATE_ANCHOR_STATUS` action that is dispatched.

      /** @type {Record<string,'anchored'|'orphan'|'timeout'>} */
      let anchoringStatusUpdates = {};
      const scheduleAnchoringStatusUpdate = debounce(() => {
        store.updateAnchorStatus(anchoringStatusUpdates);
        anchoringStatusUpdates = {};
      }, 10);

      // Anchoring an annotation in the frame completed
      bridge.on('sync', events_ => {
        events_.forEach(event => {
          inFrame.add(event.tag);
          anchoringStatusUpdates[event.tag] = event.msg.$orphan
            ? 'orphan'
            : 'anchored';
          scheduleAnchoringStatusUpdate();
        });
      });

      bridge.on('showAnnotations', tags => {
        store.selectAnnotations(store.findIDsForTags(tags));
        store.selectTab('annotation');
      });

      bridge.on('focusAnnotations', tags => {
        store.focusAnnotations(tags || []);
      });

      bridge.on('toggleAnnotationSelection', tags => {
        store.toggleSelectedAnnotations(store.findIDsForTags(tags));
      });

      bridge.on('sidebarOpened', () => {
        store.setSidebarOpened(true);
      });

      // These invoke the matching methods by name on the Guests
      bridge.on('openSidebar', () => {
        bridge.call('openSidebar');
      });
      bridge.on('closeSidebar', () => {
        bridge.call('closeSidebar');
      });
      bridge.on('setVisibleHighlights', state => {
        bridge.call('setVisibleHighlights', state);
      });
    };
  }

  /**
   * Find and connect to Hypothesis clients in the current window.
   */
  connect() {
    /**
     * Query the Hypothesis annotation client in a frame for the URL and metadata
     * of the document that is currently loaded and add the result to the set of
     * connected frames.
     */
    const addFrame = channel => {
      channel.call('getDocumentInfo', (err, info) => {
        if (err) {
          channel.destroy();
          return;
        }

        this._store.connectFrame({
          id: info.frameIdentifier,
          metadata: info.metadata,
          uri: info.uri,
        });
      });
    };

    this._bridge.onConnect(addFrame);

    // Listen for messages from new guest frames that want to connect.
    //
    // The message will include a `MessagePort` to use for communication with
    // the guest. Communication with the host currently relies on the host
    // frame also always being a guest frame.
    this._window.addEventListener('message', e => {
      if (e.data?.type !== 'hypothesisGuestReady') {
        return;
      }
      if (e.ports.length === 0) {
        console.warn(
          'Ignoring `hypothesisGuestReady` message without a MessagePort'
        );
        return;
      }
      const port = e.ports[0];
      this._bridge.createChannel(port);
    });

    // Notify host frame that it is ready for guests to connect to it.
    this._window.parent.postMessage({ type: 'hypothesisSidebarReady' }, '*');

    this._setupSyncToFrame();
    this._setupSyncFromFrame();
  }

  /**
   * Focus annotations with the given $tags.
   *
   * This is used to indicate the highlight in the document that corresponds to
   * a given annotation in the sidebar.
   *
   * @param {string[]} tags - annotation $tags
   */
  focusAnnotations(tags) {
    this._store.focusAnnotations(tags);
    this._bridge.call('focusAnnotations', tags);
  }

  /**
   * Scroll the frame to the highlight for an annotation with a given tag.
   *
   * @param {string} tag
   */
  scrollToAnnotation(tag) {
    this._bridge.call('scrollToAnnotation', tag);
  }
}
