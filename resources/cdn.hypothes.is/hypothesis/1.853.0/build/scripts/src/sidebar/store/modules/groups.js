import { createSelector } from 'reselect';

import * as util from '../util';
import { createStoreModule } from '../create-store';

import session from './session';

/**
 * @typedef {import('../../../types/api').Group} Group
 */

const initialState = {
  /**
   * List of groups.
   * @type {Group[]}
   */
  groups: [],

  /**
   * ID of currently selected group.
   * @type {string|null}
   */
  focusedGroupId: null,
};

const reducers = {
  FOCUS_GROUP(state, action) {
    const group = state.groups.find(g => g.id === action.id);
    if (!group) {
      console.error(
        `Attempted to focus group ${action.id} which is not loaded`
      );
      return {};
    }
    return { focusedGroupId: action.id };
  },

  LOAD_GROUPS(state, action) {
    const groups = action.groups;
    let focusedGroupId = state.focusedGroupId;

    // Reset focused group if not in the new set of groups.
    if (
      state.focusedGroupId === null ||
      !groups.find(g => g.id === state.focusedGroupId)
    ) {
      if (groups.length > 0) {
        focusedGroupId = groups[0].id;
      } else {
        focusedGroupId = null;
      }
    }

    return {
      focusedGroupId,
      groups: action.groups,
    };
  },

  CLEAR_GROUPS() {
    return {
      focusedGroupId: null,
      groups: [],
    };
  },
};

const actions = util.actionTypes(reducers);

function clearGroups() {
  return {
    type: actions.CLEAR_GROUPS,
  };
}

/**
 * Set the current focused group.
 *
 * @param {string} id
 */
function focusGroup(id) {
  return {
    type: actions.FOCUS_GROUP,
    id,
  };
}

/**
 * Update the set of loaded groups.
 *
 * @param {Group[]} groups
 */
function loadGroups(groups) {
  return {
    type: actions.LOAD_GROUPS,
    groups,
  };
}

/**
 * Return the currently focused group.
 *
 * @return {Group|undefined|null}
 */
function focusedGroup(state) {
  if (!state.focusedGroupId) {
    return null;
  }
  return getGroup(state, state.focusedGroupId);
}

/**
 * Return the current focused group ID or `null`.
 *
 * @return {string|null}
 */
function focusedGroupId(state) {
  return state.focusedGroupId;
}

/**
 * Return the list of all groups.
 *
 * @return {Group[]}
 */
function allGroups(state) {
  return state.groups;
}

/**
 * Return the group with the given ID.
 *
 * @param {string} id
 * @return {Group|undefined}
 */
function getGroup(state, id) {
  return state.groups.find(g => g.id === id);
}

/**
 * Return groups the user isn't a member of that are scoped to the URI.
 *
 * @type {(state: any) => Group[]}
 */
const getFeaturedGroups = createSelector(
  state => state.groups,
  groups => groups.filter(group => !group.isMember && group.isScopedToUri)
);

/**
 * Return groups that are scoped to the uri. This is used to return the groups
 * that show up in the old groups menu. This should be removed once the new groups
 * menu is permanent.
 *
 * @type {(state: any) => Group[]}
 */
const getInScopeGroups = createSelector(
  state => state.groups,
  groups => groups.filter(g => g.isScopedToUri)
);

// Selectors that receive root state.

/**
 * Return groups the logged in user is a member of.
 *
 * @type {(state: any) => Group[]}
 */
const getMyGroups = createSelector(
  rootState => rootState.groups.groups,
  rootState => session.selectors.isLoggedIn(rootState.session),
  (groups, loggedIn) => {
    // If logged out, the Public group still has isMember set to true so only
    // return groups with membership in logged in state.
    if (loggedIn) {
      return groups.filter(g => g.isMember);
    }
    return [];
  }
);

/**
 * Return groups that don't show up in Featured and My Groups.
 *
 * @type {(state: any) => Group[]}
 */
const getCurrentlyViewingGroups = createSelector(
  rootState => allGroups(rootState.groups),
  rootState => getMyGroups(rootState),
  rootState => getFeaturedGroups(rootState.groups),
  (allGroups, myGroups, featuredGroups) => {
    return allGroups.filter(
      g => !myGroups.includes(g) && !featuredGroups.includes(g)
    );
  }
);

export default createStoreModule(initialState, {
  namespace: 'groups',
  reducers,
  actionCreators: {
    focusGroup,
    loadGroups,
    clearGroups,
  },
  selectors: {
    allGroups,
    focusedGroup,
    focusedGroupId,
    getFeaturedGroups,
    getGroup,
    getInScopeGroups,
  },
  rootSelectors: {
    getCurrentlyViewingGroups,
    getMyGroups,
  },
});
