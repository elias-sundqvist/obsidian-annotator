/**
 * This module handles the state affecting the visibility and presence of
 * annotations and threads in the UI.
 */

/**
 * @typedef {import('../../../types/api').Annotation} Annotation
 * @typedef {import("../../../types/sidebar").TabName} TabName
 */

/**
 * @typedef SelectionState
 *   @prop {Object<string,boolean>} expanded
 *   @prop {string[]} forcedVisible
 *   @prop {string[]} selected
 *   @prop {string} sortKey
 *   @prop {'annotation'|'note'|'orphan'} selectedTab
 */

import { createSelector } from 'reselect';

import * as metadata from '../../helpers/annotation-metadata';
import { countIf, trueKeys, toTrueMap } from '../../util/collections';
import * as util from '../util';
import { createStoreModule } from '../create-store';

/**
 * Default sort keys for each tab.
 */
const TAB_SORTKEY_DEFAULT = {
  annotation: 'Location',
  note: 'Oldest',
  orphan: 'Location',
};

function initialSelection(settings) {
  const selection = {};
  // TODO: Do not take into account existence of `settings.query` here
  // once root-thread-building is fully updated: the decision of whether
  // selection trumps any query is not one for the store to make
  if (settings.annotations && !settings.query) {
    selection[settings.annotations] = true;
  }
  return selection;
}

function initialState(settings) {
  return {
    /**
     * The following objects map annotation identifiers to a boolean
     * (typically `true`). They are objects (i.e. instead of Arrays) for two
     * reasons:
     * - Allows explicit setting of `false`
     * - Prevents duplicate entries for a single annotation
     */

    // A set of annotations that are currently "selected" by the user —
    // these will supersede other filters/selections
    selected: initialSelection(settings),

    // Explicitly-expanded or -collapsed annotations (threads). A collapsed
    // annotation thread will not show its replies; an expanded thread will
    // show its replies. Note that there are other factors affecting
    // collapsed states, e.g., top-level threads are collapsed by default
    // until explicitly expanded.
    expanded: initialSelection(settings) || {},

    // Set of threads that have been "forced" visible by the user
    // (e.g. by clicking on "Show x more" button) even though they may not
    // match the currently-applied filters
    forcedVisible: {},

    selectedTab: 'annotation',
    // Key by which annotations are currently sorted.
    sortKey: TAB_SORTKEY_DEFAULT.annotation,
  };
}

/**
 *
 * @param {TabName} newTab
 * @param {TabName} oldTab
 */
const setTab = (newTab, oldTab) => {
  // Do nothing if the "new tab" is the same as the tab already selected.
  // This will avoid resetting the `sortKey`, too.
  if (oldTab === newTab) {
    return {};
  }
  return {
    selectedTab: newTab,
    sortKey: TAB_SORTKEY_DEFAULT[newTab],
  };
};

const resetSelection = () => {
  return {
    forcedVisible: {},
    selected: {},
  };
};

const reducers = {
  CLEAR_SELECTION: function () {
    return resetSelection();
  },

  SELECT_ANNOTATIONS: function (state, action) {
    return { selected: action.selection };
  },

  SELECT_TAB: function (state, action) {
    return setTab(action.tab, state.selectedTab);
  },

  SET_EXPANDED: function (state, action) {
    const newExpanded = { ...state.expanded };
    newExpanded[action.id] = action.expanded;
    return { expanded: newExpanded };
  },

  SET_FORCED_VISIBLE: function (state, action) {
    return {
      forcedVisible: { ...state.forcedVisible, [action.id]: action.visible },
    };
  },

  SET_SORT_KEY: function (state, action) {
    return { sortKey: action.key };
  },

  TOGGLE_SELECTED_ANNOTATIONS: function (state, action) {
    const selection = { ...state.selected };
    action.toggleIds.forEach(id => {
      selection[id] = !selection[id];
    });
    return { selected: selection };
  },

  /** Actions defined in other modules */

  /**
   * Automatically select the Page Notes tab, for convenience, if all of the
   * top-level annotations in `action.annotations` are Page Notes and the
   * previous annotation count was 0 (i.e. collection empty).
   */
  ADD_ANNOTATIONS(state, action) {
    const topLevelAnnotations = action.annotations.filter(
      annotation => !metadata.isReply(annotation)
    );
    const noteCount = countIf(action.annotations, metadata.isPageNote);

    const haveOnlyPageNotes = noteCount === topLevelAnnotations.length;
    if (action.currentAnnotationCount === 0 && haveOnlyPageNotes) {
      return setTab('note', state.selectedTab);
    }
    return {};
  },

  CHANGE_FOCUS_MODE_USER: function () {
    return resetSelection();
  },

  SET_FILTER: function () {
    return { ...resetSelection(), expanded: {} };
  },

  SET_FILTER_QUERY: function () {
    return { ...resetSelection(), expanded: {} };
  },

  SET_FOCUS_MODE: function () {
    return resetSelection();
  },

  REMOVE_ANNOTATIONS: function (state, action) {
    let newTab = state.selectedTab;
    // If the orphans tab is selected but no remaining annotations are orphans,
    // switch back to annotations tab
    if (
      newTab === 'orphan' &&
      countIf(action.remainingAnnotations, metadata.isOrphan) === 0
    ) {
      newTab = 'annotation';
    }

    const removeAnns = collection => {
      action.annotationsToRemove.forEach(annotation => {
        if (annotation.id) {
          delete collection[annotation.id];
        }
        if (annotation.$tag) {
          delete collection[annotation.$tag];
        }
      });
      return collection;
    };
    return {
      ...setTab(newTab, state.selectedTab),
      expanded: removeAnns({ ...state.expanded }),
      forcedVisible: removeAnns({ ...state.forcedVisible }),
      selected: removeAnns({ ...state.selected }),
    };
  },
};

const actions = util.actionTypes(reducers);

/* Action Creators */

/**
 * Clear all selected annotations and filters. This will leave user-focus
 * alone, however.
 */
function clearSelection() {
  return {
    type: actions.CLEAR_SELECTION,
  };
}

/**
 * Set the currently selected annotation IDs. This will replace the current
 * selection. All provided annotation ids will be set to `true` in the selection.
 *
 * @param {string[]} ids - Identifiers of annotations to select
 */
function selectAnnotations(ids) {
  return dispatch => {
    dispatch({ type: actions.CLEAR_SELECTION });
    dispatch({
      type: actions.SELECT_ANNOTATIONS,
      selection: toTrueMap(ids),
    });
  };
}

/**
 * Set the currently-selected tab to `tabKey`.
 *
 * @param {TabName} tabKey
 */
function selectTab(tabKey) {
  return {
    type: actions.SELECT_TAB,
    tab: tabKey,
  };
}

/**
 * Set the expanded state for a single annotation/thread.
 *
 * @param {string} id - annotation (or thread) id
 * @param {boolean} expanded - `true` for expanded replies, `false` to collapse
 */
function setExpanded(id, expanded) {
  return {
    type: actions.SET_EXPANDED,
    id,
    expanded,
  };
}

/**
 * A user may "force" an thread to be visible, even if it would be otherwise
 * not be visible because of applied filters. Set the force-visibility for a
 * single thread, without affecting other forced-visible threads.
 *
 * @param {string} id - Thread id
 * @param {boolean} visible - Should this annotation be visible, even if it
 *        conflicts with current filters?
 */
function setForcedVisible(id, visible) {
  return {
    type: actions.SET_FORCED_VISIBLE,
    id,
    visible,
  };
}

/** Sets the sort key for the annotation list. */
function setSortKey(key) {
  return {
    type: actions.SET_SORT_KEY,
    key,
  };
}

/**
 * Toggle the selected state for the annotations in `toggledAnnotations`:
 * unselect any that are selected; select any that are unselected.
 *
 * @param {string[]} toggleIds - identifiers of annotations to toggle
 */
function toggleSelectedAnnotations(toggleIds) {
  return {
    type: actions.TOGGLE_SELECTED_ANNOTATIONS,
    toggleIds,
  };
}

/* Selectors */

/**
 * Retrieve map of expanded/collapsed annotations (threads)
 *
 * @return {Object<string,boolean>}
 */
function expandedMap(state) {
  return state.expanded;
}

/**
 * @type {(state: any) => string[]}
 */
const forcedVisibleThreads = createSelector(
  state => state.forcedVisible,
  forcedVisible => trueKeys(forcedVisible)
);

/**
 * Are any annotations currently selected?
 *
 * @type {(state: any) => boolean}
 */
const hasSelectedAnnotations = createSelector(
  state => state.selected,
  selection => trueKeys(selection).length > 0
);

/**
 * @type {(state: any) => string[]}
 */
const selectedAnnotations = createSelector(
  state => state.selected,
  selection => trueKeys(selection)
);

/**
 * Return the currently-selected tab
 *
 * @return {TabName}
 */
function selectedTab(state) {
  return state.selectedTab;
}

/**
 * @return {SelectionState}
 */
const selectionState = createSelector(
  state => state,
  selection => {
    return {
      expanded: expandedMap(selection),
      forcedVisible: forcedVisibleThreads(selection),
      selected: selectedAnnotations(selection),
      sortKey: sortKey(selection),
      selectedTab: selectedTab(selection),
    };
  }
);

/**
 * Retrieve the current sort option key
 * TODO: sortKey could be typedef'd
 *
 * @return {string}
 */
function sortKey(state) {
  return state.sortKey;
}

/**
 * Retrieve applicable sort options for the currently-selected tab.
 *
 * @type {(state: any) => string[]}
 */
const sortKeys = createSelector(
  state => state.selectedTab,
  selectedTab => {
    const sortKeysForTab = ['Newest', 'Oldest'];
    if (selectedTab !== 'note') {
      // Location is inapplicable to Notes tab
      sortKeysForTab.push('Location');
    }
    return sortKeysForTab;
  }
);

export default createStoreModule(initialState, {
  namespace: 'selection',
  reducers,

  actionCreators: {
    clearSelection,
    selectAnnotations,
    selectTab,
    setExpanded,
    setForcedVisible,
    setSortKey,
    toggleSelectedAnnotations,
  },

  selectors: {
    expandedMap,
    forcedVisibleThreads,
    hasSelectedAnnotations,
    selectedAnnotations,
    selectedTab,
    selectionState,
    sortKey,
    sortKeys,
  },
});
