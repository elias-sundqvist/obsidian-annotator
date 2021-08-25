/**
 * This module contains state related to real-time updates received via the
 * WebSocket connection to h's real-time API.
 */

/**
 * @typedef {import('../../../types/api').Annotation} Annotation
 */

import { createSelector } from 'reselect';

import { createStoreModule } from '../create-store';
import { actionTypes } from '../util';

import annotations from './annotations';
import groups from './groups';
import route from './route';

const initialState = {
  /**
   * Map of ID -> updated annotation for updates that have been received over
   * the WebSocket but not yet applied (ie. saved to the "annotations" store
   * module and shown in the UI).
   *
   * @type {Record<string, Annotation>}
   */
  pendingUpdates: {},

  /**
   * Set of IDs of annotations which have been deleted but for which the
   * deletion has not yet been applied
   *
   * @type {Record<string, boolean>}
   */
  pendingDeletions: {},
};

const reducers = {
  RECEIVE_REAL_TIME_UPDATES(state, action) {
    return {
      pendingUpdates: { ...action.pendingUpdates },
      pendingDeletions: { ...action.pendingDeletions },
    };
  },

  CLEAR_PENDING_UPDATES() {
    return { pendingUpdates: {}, pendingDeletions: {} };
  },

  ADD_ANNOTATIONS(state, { annotations }) {
    // Discard any pending updates which conflict with an annotation added
    // locally or fetched via an API call.
    //
    // If there is a conflicting local update/remote delete then we keep
    // the pending delete. The UI should prevent the user from editing an
    // annotation that has been deleted on the server.
    const pendingUpdates = { ...state.pendingUpdates };

    annotations.forEach(ann => delete pendingUpdates[ann.id]);

    return { pendingUpdates };
  },

  REMOVE_ANNOTATIONS(state, { annotationsToRemove }) {
    // Discard any pending updates which conflict with an annotation removed
    // locally.

    const pendingUpdates = { ...state.pendingUpdates };
    const pendingDeletions = { ...state.pendingDeletions };

    annotationsToRemove.forEach(ann => {
      delete pendingUpdates[ann.id];
      delete pendingDeletions[ann.id];
    });

    return { pendingUpdates, pendingDeletions };
  },

  FOCUS_GROUP() {
    // When switching groups we clear and re-fetch all annotations, so discard
    // any pending updates.
    return { pendingUpdates: {}, pendingDeletions: {} };
  },
};

const actions = actionTypes(reducers);

/**
 * Record pending updates representing changes on the server that the client
 * has been notified about but has not yet applied.
 *
 * @param {Object} args
 * @param {Annotation[]} [args.updatedAnnotations]
 * @param {Annotation[]} [args.deletedAnnotations]
 */
function receiveRealTimeUpdates({
  updatedAnnotations = [],
  deletedAnnotations = [],
}) {
  return (dispatch, getState) => {
    const pendingUpdates = { ...getState().realTimeUpdates.pendingUpdates };
    const pendingDeletions = { ...getState().realTimeUpdates.pendingDeletions };

    updatedAnnotations.forEach(ann => {
      // In the sidebar, only save pending updates for annotations in the
      // focused group, since we only display annotations from the focused
      // group and reload all annotations and discard pending updates
      // when switching groups.
      const groupState = getState().groups;
      const routeState = getState().route;

      if (
        ann.group === groups.selectors.focusedGroupId(groupState) ||
        route.selectors.route(routeState) !== 'sidebar'
      ) {
        pendingUpdates[/** @type {string} */ (ann.id)] = ann;
      }
    });
    deletedAnnotations.forEach(ann => {
      const id = /** @type {string} */ (ann.id);
      // Discard any pending but not-yet-applied updates for this annotation
      delete pendingUpdates[id];

      // If we already have this annotation loaded, then record a pending
      // deletion. We do not check the group of the annotation here because a)
      // that information is not included with deletion notifications and b)
      // even if the annotation is from the current group, it might be for a
      // new annotation (saved in pendingUpdates and removed above), that has
      // not yet been loaded.
      const annotationsState = getState().annotations;
      if (annotations.selectors.annotationExists(annotationsState, id)) {
        pendingDeletions[id] = true;
      }
    });
    dispatch({
      type: actions.RECEIVE_REAL_TIME_UPDATES,
      pendingUpdates,
      pendingDeletions,
    });
  };
}

/**
 * Clear the queue of real-time updates which have been received but not applied.
 */
function clearPendingUpdates() {
  return {
    type: actions.CLEAR_PENDING_UPDATES,
  };
}

/**
 * Return added or updated annotations received via the WebSocket
 * which have not been applied to the local state.
 *
 * @return {Object.<string, Annotation>}
 */
function pendingUpdates(state) {
  return state.pendingUpdates;
}

/**
 * Return IDs of annotations which have been deleted on the server but not
 * yet removed from the local state.
 *
 * @return {Object.<string, Annotation>}
 */
function pendingDeletions(state) {
  return state.pendingDeletions;
}

/**
 * Return a total count of pending updates and deletions.
 *
 * @type {(state: any) => number}
 */
const pendingUpdateCount = createSelector(
  state => [state.pendingUpdates, state.pendingDeletions],
  ([pendingUpdates, pendingDeletions]) =>
    Object.keys(pendingUpdates).length + Object.keys(pendingDeletions).length
);

/**
 * Return true if an annotation has been deleted on the server but the deletion
 * has not yet been applied.
 *
 * @param {string} id
 */
function hasPendingDeletion(state, id) {
  return state.pendingDeletions.hasOwnProperty(id);
}

export default createStoreModule(initialState, {
  namespace: 'realTimeUpdates',
  reducers,
  actionCreators: {
    receiveRealTimeUpdates,
    clearPendingUpdates,
  },
  selectors: {
    hasPendingDeletion,
    pendingDeletions,
    pendingUpdates,
    pendingUpdateCount,
  },
});
