/**
 * Store module which tracks activity happening in the application that may
 * need to be reflected in the UI.
 */

import { actionTypes } from '../util';
import { createStoreModule } from '../create-store';

const initialState = {
  /**
   * Annotation `$tag`s that correspond to annotations with active API requests
   *
   * @type {string[]}
   */
  activeAnnotationSaveRequests: [],
  /**
   * The number of API requests that have started and not yet completed.
   */
  activeApiRequests: 0,
  /**
   * The number of annotation fetches that have started and not yet completed.
   */
  activeAnnotationFetches: 0,
  /**
   * Have annotations ever been fetched?
   */
  hasFetchedAnnotations: false,
  /**
   * The number of total annotation results the service reported as
   * matching the most recent load/search request
   *
   * @type {number|null}
   */
  annotationResultCount: null,
};

const reducers = {
  API_REQUEST_STARTED(state) {
    return {
      ...state,
      activeApiRequests: state.activeApiRequests + 1,
    };
  },

  API_REQUEST_FINISHED(state) {
    if (state.activeApiRequests === 0) {
      throw new Error(
        'API_REQUEST_FINISHED action when no requests were active'
      );
    }

    return {
      ...state,
      activeApiRequests: state.activeApiRequests - 1,
    };
  },

  ANNOTATION_SAVE_STARTED(state, action) {
    let addToStarted = [];
    if (
      action.annotation.$tag &&
      !state.activeAnnotationSaveRequests.includes(action.annotation.$tag)
    ) {
      addToStarted.push(action.annotation.$tag);
    }
    const updatedSaves =
      state.activeAnnotationSaveRequests.concat(addToStarted);
    return {
      ...state,
      activeAnnotationSaveRequests: updatedSaves,
    };
  },

  ANNOTATION_SAVE_FINISHED(state, action) {
    const updatedSaves = state.activeAnnotationSaveRequests.filter(
      $tag => $tag !== action.annotation.$tag
    );
    return {
      ...state,
      activeAnnotationSaveRequests: updatedSaves,
    };
  },

  ANNOTATION_FETCH_STARTED(state) {
    return {
      ...state,
      activeAnnotationFetches: state.activeAnnotationFetches + 1,
    };
  },

  ANNOTATION_FETCH_FINISHED(state) {
    if (state.activeAnnotationFetches === 0) {
      throw new Error(
        'ANNOTATION_FETCH_FINISHED action when no annotation fetches were active'
      );
    }

    return {
      ...state,
      hasFetchedAnnotations: true,
      activeAnnotationFetches: state.activeAnnotationFetches - 1,
    };
  },

  SET_ANNOTATION_RESULT_COUNT(state, action) {
    return {
      annotationResultCount: action.resultCount,
    };
  },
};

const actions = actionTypes(reducers);

/** Action Creators */

function annotationFetchStarted() {
  return { type: actions.ANNOTATION_FETCH_STARTED };
}

function annotationFetchFinished() {
  return { type: actions.ANNOTATION_FETCH_FINISHED };
}

/**
 * @param {object} annotation — annotation object with a `$tag` property
 */
function annotationSaveStarted(annotation) {
  return { type: actions.ANNOTATION_SAVE_STARTED, annotation };
}

/**
 * @param {object} annotation — annotation object with a `$tag` property
 */
function annotationSaveFinished(annotation) {
  return { type: actions.ANNOTATION_SAVE_FINISHED, annotation };
}

function apiRequestStarted() {
  return { type: actions.API_REQUEST_STARTED };
}

function apiRequestFinished() {
  return { type: actions.API_REQUEST_FINISHED };
}

function setAnnotationResultCount(resultCount) {
  return { type: actions.SET_ANNOTATION_RESULT_COUNT, resultCount };
}

/** Selectors */

function annotationResultCount(state) {
  return state.annotationResultCount;
}

function hasFetchedAnnotations(state) {
  return state.hasFetchedAnnotations;
}

/**
 * Return true when annotations are actively being fetched.
 */
function isFetchingAnnotations(state) {
  return state.activeAnnotationFetches > 0;
}

/**
 * Return true when any activity is happening in the app that needs to complete
 * before the UI is ready for interactivity with annotations.
 */
function isLoading(state) {
  return state.activeApiRequests > 0 || !state.hasFetchedAnnotations;
}

/**
 * Return `true` if `$tag` exists in the array of annotation `$tag`s that
 * have in-flight save requests, i.e. the annotation in question is actively
 * being saved to a remote service.
 *
 * @param {object} state
 * @param {object} annotation
 * @return {boolean}
 */
function isSavingAnnotation(state, annotation) {
  if (!annotation.$tag) {
    return false;
  }
  return state.activeAnnotationSaveRequests.includes(annotation.$tag);
}

/** @typedef {import('../../../types/api').Annotation} Annotation */

export default createStoreModule(initialState, {
  reducers,
  namespace: 'activity',

  actionCreators: {
    annotationFetchStarted,
    annotationFetchFinished,
    annotationSaveStarted,
    annotationSaveFinished,
    apiRequestStarted,
    apiRequestFinished,
    setAnnotationResultCount,
  },

  selectors: {
    hasFetchedAnnotations,
    isLoading,
    isFetchingAnnotations,
    isSavingAnnotation,
    annotationResultCount,
  },
});
