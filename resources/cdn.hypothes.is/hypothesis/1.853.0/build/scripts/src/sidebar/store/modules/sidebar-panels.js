/**
 * This module handles the state for `SidebarPanel` components used in the app.
 * It keeps track of the "active" `panelName` (simple string) and allows the
 * opening, closing or toggling of panels via their `panelName`. It merely
 * retains the `panelName` state as a string: it has no understanding nor
 * opinions about whether a given `panelName` corresponds to one or more
 * extant `SidebarPanel` components. Only one panel (as keyed by `panelName`)
 * may be "active" (open) at one time.
 */

/**
 * @typedef {import("../../../types/sidebar").PanelName} PanelName
 */

import * as util from '../util';

import { createStoreModule } from '../create-store';

const initialState = {
  /**
   * The `panelName` of the currently-active sidebar panel.
   * Only one `panelName` may be active at a time, but it is valid (though not
   * the standard use case) for multiple `SidebarPanel` components to share
   * the same `panelName`—`panelName` is not intended as a unique ID/key.
   *
   * e.g. If `activePanelName` were `foobar`, all `SidebarPanel` components
   * with `panelName` of `foobar` would be active, and thus visible.
   *
   * @type {PanelName|null}
   */
  activePanelName: null,
};

const reducers = {
  OPEN_SIDEBAR_PANEL: function (state, action) {
    return { activePanelName: action.panelName };
  },

  CLOSE_SIDEBAR_PANEL: function (state, action) {
    let activePanelName = state.activePanelName;
    if (action.panelName === activePanelName) {
      // `action.panelName` is indeed the currently-active panel; deactivate
      activePanelName = null;
    }
    // `action.panelName` is not the active panel; nothing to do here
    return {
      activePanelName,
    };
  },

  TOGGLE_SIDEBAR_PANEL: function (state, action) {
    let activePanelName;
    // Is the panel in question currently the active panel?
    const panelIsActive = state.activePanelName === action.panelName;
    // What state should the panel in question move to next?
    const panelShouldBeActive =
      typeof action.panelState !== 'undefined'
        ? action.panelState
        : !panelIsActive;

    if (panelShouldBeActive) {
      // If the specified panel should be open (active), set it as active
      activePanelName = action.panelName;
    } else if (panelIsActive && !panelShouldBeActive) {
      // If the specified panel is currently open (active), but it shouldn't be anymore
      activePanelName = null;
    } else {
      // This panel is already inactive; do nothing
      activePanelName = state.activePanelName;
    }

    return {
      activePanelName,
    };
  },
};

const actions = util.actionTypes(reducers);

/**
 * Designate `panelName` as the currently-active panel name
 *
 * @param {PanelName} panelName
 */
function openSidebarPanel(panelName) {
  return { type: actions.OPEN_SIDEBAR_PANEL, panelName };
}

/**
 * `panelName` should not be the active panel
 *
 * @param {PanelName} panelName
 */
function closeSidebarPanel(panelName) {
  return { type: actions.CLOSE_SIDEBAR_PANEL, panelName };
}

/**
 * Toggle a sidebar panel from its current state, or set it to the
 * designated `panelState`.
 *
 * @param {PanelName} panelName
 * @param {boolean} [panelState] -
 *   Should the panel be active? Omit this prop to simply toggle the value.
 */
function toggleSidebarPanel(panelName, panelState) {
  return {
    type: actions.TOGGLE_SIDEBAR_PANEL,
    panelName,
    panelState,
  };
}

/**
 * Is the panel indicated by `panelName` currently active (open)?
 *
 * @param {PanelName} panelName
 * @return {boolean} - `true` if `panelName` is the currently-active panel
 */
function isSidebarPanelOpen(state, panelName) {
  return state.activePanelName === panelName;
}

export default createStoreModule(initialState, {
  namespace: 'sidebarPanels',
  reducers,

  actionCreators: {
    openSidebarPanel,
    closeSidebarPanel,
    toggleSidebarPanel,
  },

  selectors: {
    isSidebarPanelOpen,
  },
});
