/**
 * State management for the set of annotations currently loaded into the
 * sidebar.
 */

/** @typedef {import('../../../types/api').Annotation} Annotation */

/**
 * @typedef AnnotationStub
 * @prop {string} [id] - service-provided identifier if annotation has been
 *       persisted to the service
 * @prop {string} [$tag] - local-generated identifier
 */

import { createSelector } from 'reselect';

import * as metadata from '../../helpers/annotation-metadata';
import { countIf, toTrueMap, trueKeys } from '../../util/collections';
import * as util from '../util';
import { createStoreModule } from '../create-store';

import route from './route';

/**
 * Return a copy of `current` with all matching annotations in `annotations`
 * removed (matched on identifier—`id` or `$tag`)
 *
 * Annotations in `annotations` may be complete annotations or "stubs" with only
 * the `id` field set.
 *
 * @param {Annotation[]} current
 * @param {AnnotationStub[]} annotations
 */
function excludeAnnotations(current, annotations) {
  const ids = {};
  const tags = {};
  annotations.forEach(annot => {
    if (annot.id) {
      ids[annot.id] = true;
    }
    if (annot.$tag) {
      tags[annot.$tag] = true;
    }
  });
  return current.filter(annot => {
    const shouldRemove =
      (annot.id && annot.id in ids) || (annot.$tag && annot.$tag in tags);
    return !shouldRemove;
  });
}

function findByID(annotations, id) {
  return annotations.find(annot => {
    return annot.id === id;
  });
}

function findByTag(annotations, tag) {
  return annotations.find(annot => {
    return annot.$tag === tag;
  });
}

/**
 * Set custom private fields on an annotation object about to be added to the
 * store's collection of `annotations`.
 *
 * `annotation` may either be new (unsaved) or a persisted annotation retrieved
 * from the service.
 *
 * @param {Object} annotation
 * @param {string} tag - The `$tag` value that should be used for this
 *                       if it doesn't have a `$tag` already
 * @return {Object} - annotation with local (`$*`) fields set
 */
function initializeAnnotation(annotation, tag) {
  let orphan = annotation.$orphan;

  if (!annotation.id) {
    // New annotations must be anchored
    orphan = false;
  }

  return Object.assign({}, annotation, {
    // Flag indicating whether waiting for the annotation to anchor timed out.
    $anchorTimeout: false,
    $tag: annotation.$tag || tag,
    $orphan: orphan,
  });
}

const initialState = {
  /**
   * Set of all currently loaded annotations.
   *
   * @type {Annotation[]}
   */
  annotations: [],
  /**
   * A set of annotations that are currently "focused" — e.g. hovered over in
   * the UI.
   *
   * @type {Record<string, boolean>}
   */
  focused: {},
  /**
   * A map of annotations that should appear as "highlighted", e.g. the
   * target of a single-annotation view
   *
   * @type {Record<string, boolean>}
   */
  highlighted: {},
  /** The local tag to assign to the next annotation that is loaded into the app. */
  nextTag: 1,
};

const reducers = {
  ADD_ANNOTATIONS: function (state, action) {
    const updatedIDs = {};
    const updatedTags = {};

    const added = [];
    const unchanged = [];
    const updated = [];
    let nextTag = state.nextTag;

    action.annotations.forEach(annot => {
      let existing;
      if (annot.id) {
        existing = findByID(state.annotations, annot.id);
      }
      if (!existing && annot.$tag) {
        existing = findByTag(state.annotations, annot.$tag);
      }

      if (existing) {
        // Merge the updated annotation with the private fields from the local
        // annotation
        updated.push(Object.assign({}, existing, annot));
        if (annot.id) {
          updatedIDs[annot.id] = true;
        }
        if (existing.$tag) {
          updatedTags[existing.$tag] = true;
        }
      } else {
        added.push(initializeAnnotation(annot, 't' + nextTag));
        ++nextTag;
      }
    });

    state.annotations.forEach(annot => {
      if (!updatedIDs[annot.id] && !updatedTags[annot.$tag]) {
        unchanged.push(annot);
      }
    });

    return {
      annotations: added.concat(updated).concat(unchanged),
      nextTag,
    };
  },

  CLEAR_ANNOTATIONS: function () {
    return { annotations: [], focused: {}, highlighted: {} };
  },

  FOCUS_ANNOTATIONS: function (state, action) {
    return { focused: toTrueMap(action.focusedTags) };
  },

  HIDE_ANNOTATION: function (state, action) {
    const anns = state.annotations.map(ann => {
      if (ann.id !== action.id) {
        return ann;
      }
      return { ...ann, hidden: true };
    });
    return { annotations: anns };
  },

  HIGHLIGHT_ANNOTATIONS: function (state, action) {
    return { highlighted: action.highlighted };
  },

  REMOVE_ANNOTATIONS: function (state, action) {
    return {
      annotations: [...action.remainingAnnotations],
    };
  },

  UNHIDE_ANNOTATION: function (state, action) {
    const anns = state.annotations.map(ann => {
      if (ann.id !== action.id) {
        return ann;
      }
      return Object.assign({}, ann, { hidden: false });
    });
    return { annotations: anns };
  },

  UPDATE_ANCHOR_STATUS: function (state, action) {
    const annotations = state.annotations.map(annot => {
      if (!action.statusUpdates.hasOwnProperty(annot.$tag)) {
        return annot;
      }

      const state = action.statusUpdates[annot.$tag];
      if (state === 'timeout') {
        return Object.assign({}, annot, { $anchorTimeout: true });
      } else {
        return Object.assign({}, annot, { $orphan: state === 'orphan' });
      }
    });
    return { annotations };
  },

  UPDATE_FLAG_STATUS: function (state, action) {
    const annotations = state.annotations.map(annot => {
      const match = annot.id && annot.id === action.id;
      if (match) {
        if (annot.flagged === action.isFlagged) {
          return annot;
        }

        const newAnn = Object.assign({}, annot, {
          flagged: action.isFlagged,
        });
        if (newAnn.moderation) {
          const countDelta = action.isFlagged ? 1 : -1;
          newAnn.moderation = Object.assign({}, annot.moderation, {
            flagCount: annot.moderation.flagCount + countDelta,
          });
        }
        return newAnn;
      } else {
        return annot;
      }
    });
    return { annotations };
  },
};

const actions = util.actionTypes(reducers);

/* Action creators */

/**
 * Add these `annotations` to the current collection of annotations in the store.
 *
 * @param {Annotation[]} annotations - Array of annotation objects to add.
 */
function addAnnotations(annotations) {
  return function (dispatch, getState) {
    const added = annotations.filter(annot => {
      return !findByID(getState().annotations.annotations, annot.id);
    });

    dispatch({
      type: actions.ADD_ANNOTATIONS,
      annotations,
      currentAnnotationCount: getState().annotations.annotations.length,
    });

    // If we're not in the sidebar, we're done here.
    // FIXME Split the annotation-adding from the anchoring code; possibly
    // move into service
    if (route.selectors.route(getState().route) !== 'sidebar') {
      return;
    }

    // If anchoring fails to complete in a reasonable amount of time, then
    // we assume that the annotation failed to anchor. If it does later
    // successfully anchor then the status will be updated.
    const ANCHORING_TIMEOUT = 500;

    const anchoringIDs = added
      .filter(metadata.isWaitingToAnchor)
      .map(ann => ann.id);
    if (anchoringIDs.length > 0) {
      setTimeout(() => {
        // Find annotations which haven't yet been anchored in the document.
        const anns = getState().annotations.annotations;
        const annsStillAnchoring = anchoringIDs
          .map(id => findByID(anns, id))
          .filter(ann => ann && metadata.isWaitingToAnchor(ann));

        // Mark anchoring as timed-out for these annotations.
        const anchorStatusUpdates = annsStillAnchoring.reduce(
          (updates, ann) => {
            updates[ann.$tag] = 'timeout';
            return updates;
          },
          {}
        );
        dispatch(updateAnchorStatus(anchorStatusUpdates));
      }, ANCHORING_TIMEOUT);
    }
  };
}

/** Set the currently displayed annotations to the empty set. */
function clearAnnotations() {
  return { type: actions.CLEAR_ANNOTATIONS };
}

/**
 * Replace the current set of focused annotations with the annotations
 * identified by `tags`. All provided annotations (`tags`) will be set to
 * `true` in the `focused` map.
 *
 * @param {string[]} tags - Identifiers of annotations to focus
 */
function focusAnnotations(tags) {
  return {
    type: actions.FOCUS_ANNOTATIONS,
    focusedTags: tags,
  };
}

/**
 * Update the local hidden state of an annotation.
 *
 * This updates an annotation to reflect the fact that it has been hidden from
 * non-moderators.
 */
function hideAnnotation(id) {
  return {
    type: actions.HIDE_ANNOTATION,
    id,
  };
}

/**
 * Highlight annotations with the given `ids`.
 *
 * This is used to indicate the specific annotation in a thread that was
 * linked to for example. Replaces the current map of highlighted annotations.
 * All provided annotations (`ids`) will be set to `true` in the `highlighted`
 * map.
 *
 * @param {string[]} ids - annotations to highlight
 */
function highlightAnnotations(ids) {
  return {
    type: actions.HIGHLIGHT_ANNOTATIONS,
    highlighted: toTrueMap(ids),
  };
}

/**
 * Remove annotations from the currently displayed set.
 *
 * @param {AnnotationStub[]} annotations -
 *   Annotations to remove. These may be complete annotations or stubs which
 *   only contain an `id` property.
 */
export function removeAnnotations(annotations) {
  return (dispatch, getState) => {
    const remainingAnnotations = excludeAnnotations(
      getState().annotations.annotations,
      annotations
    );
    dispatch({
      type: actions.REMOVE_ANNOTATIONS,
      annotationsToRemove: annotations,
      remainingAnnotations,
    });
  };
}

/**
 * Update the local hidden state of an annotation.
 *
 * This updates an annotation to reflect the fact that it has been made visible
 * to non-moderators.
 */
function unhideAnnotation(id) {
  return {
    type: actions.UNHIDE_ANNOTATION,
    id,
  };
}

/**
 * Update the anchoring status of an annotation
 *
 * @param {{ [tag: string]: 'anchored'|'orphan'|'timeout'} } statusUpdates - A
 *        map of annotation tag to orphan status
 */
function updateAnchorStatus(statusUpdates) {
  return {
    type: actions.UPDATE_ANCHOR_STATUS,
    statusUpdates,
  };
}

/**
 * Updating the flagged status of an annotation.
 *
 * @param {string} id - Annotation ID
 * @param {boolean} isFlagged - The flagged status of the annotation. True if
 *        the user has flagged the annotation.
 *
 */
function updateFlagStatus(id, isFlagged) {
  return {
    type: actions.UPDATE_FLAG_STATUS,
    id,
    isFlagged,
  };
}

/* Selectors */

/**
 * Count the number of annotations (as opposed to notes or orphans)
 *
 * @type {(state: any) => number}
 */
const annotationCount = createSelector(
  state => state.annotations,
  annotations => countIf(annotations, metadata.isAnnotation)
);

/**
 * Retrieve all annotations currently in the store
 *
 * @type {(state: any) => Annotation[]}
 */
function allAnnotations(state) {
  return state.annotations;
}

/**
 * Does the annotation indicated by `id` exist in the collection?
 *
 * @param {string} id
 * @return {boolean}
 */
function annotationExists(state, id) {
  return state.annotations.some(annot => annot.id === id);
}

/**
 * Return the annotation with the given ID
 */
function findAnnotationByID(state, id) {
  return findByID(state.annotations, id);
}

/**
 * Return the IDs of annotations that correspond to `tags`.
 *
 * If an annotation does not have an ID because it has not been created on
 * the server, there will be no entry for it in the returned array.
 *
 * @param {string[]} tags - Local tags of annotations to look up
 */
function findIDsForTags(state, tags) {
  const ids = [];
  tags.forEach(tag => {
    const annot = findByTag(state.annotations, tag);
    if (annot && annot.id) {
      ids.push(annot.id);
    }
  });
  return ids;
}

/**
 * Retrieve currently-focused annotation identifiers
 *
 * @type {(state: any) => string[]}
 */
const focusedAnnotations = createSelector(
  state => state.focused,
  focused => trueKeys(focused)
);

/**
 * Retrieve currently-highlighted annotation identifiers
 *
 * @type {(state: any) => string[]}
 */
const highlightedAnnotations = createSelector(
  state => state.highlighted,
  highlighted => trueKeys(highlighted)
);

/**
 * Is the annotation referenced by `$tag` currently focused?
 *
 * @param {string} $tag - annotation identifier
 * @return {boolean}
 */
function isAnnotationFocused(state, $tag) {
  return state.focused[$tag] === true;
}

/**
 * Are there any annotations still waiting to anchor?
 *
 * @type {(state: any) => boolean}
 */
const isWaitingToAnchorAnnotations = createSelector(
  state => state.annotations,
  annotations => annotations.some(metadata.isWaitingToAnchor)
);

/**
 * Return all loaded annotations that are not highlights and have not been saved
 * to the server
 *
 * @type {(state: any) => Annotation[]}
 */
const newAnnotations = createSelector(
  state => state.annotations,
  annotations =>
    annotations.filter(ann => metadata.isNew(ann) && !metadata.isHighlight(ann))
);

/**
 * Return all loaded annotations that are highlights and have not been saved
 * to the server
 *
 * @type {(state: any) => Annotation[]}
 */
const newHighlights = createSelector(
  state => state.annotations,
  annotations =>
    annotations.filter(ann => metadata.isNew(ann) && metadata.isHighlight(ann))
);

/**
 * Count the number of page notes currently in the collection
 *
 @type {(state: any) => number}
 */
const noteCount = createSelector(
  state => state.annotations,
  annotations => countIf(annotations, metadata.isPageNote)
);

/**
 * Count the number of orphans currently in the collection
 *
 * @type {(state: any) => number}
 */
const orphanCount = createSelector(
  state => state.annotations,
  annotations => countIf(annotations, metadata.isOrphan)
);

/**
 * Return all loaded annotations which have been saved to the server
 *
 * @return {Annotation[]}
 */
function savedAnnotations(state) {
  return state.annotations.filter(ann => {
    return !metadata.isNew(ann);
  });
}

export default createStoreModule(initialState, {
  namespace: 'annotations',
  reducers,
  actionCreators: {
    addAnnotations,
    clearAnnotations,
    focusAnnotations,
    hideAnnotation,
    highlightAnnotations,
    removeAnnotations,
    unhideAnnotation,
    updateAnchorStatus,
    updateFlagStatus,
  },
  selectors: {
    allAnnotations,
    annotationCount,
    annotationExists,
    findAnnotationByID,
    findIDsForTags,
    focusedAnnotations,
    highlightedAnnotations,
    isAnnotationFocused,
    isWaitingToAnchorAnnotations,
    newAnnotations,
    newHighlights,
    noteCount,
    orphanCount,
    savedAnnotations,
  },
});
