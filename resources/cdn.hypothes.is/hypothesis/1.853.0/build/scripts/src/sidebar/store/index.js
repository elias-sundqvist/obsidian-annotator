import { createStore } from './create-store';
import debugMiddleware from './debug-middleware';
import activity from './modules/activity';
import annotations from './modules/annotations';
import defaults from './modules/defaults';
import directLinked from './modules/direct-linked';
import drafts from './modules/drafts';
import filters from './modules/filters';
import frames from './modules/frames';
import groups from './modules/groups';
import links from './modules/links';
import realTimeUpdates from './modules/real-time-updates';
import route from './modules/route';
import selection from './modules/selection';
import session from './modules/session';
import sidebarPanels from './modules/sidebar-panels';
import toastMessages from './modules/toast-messages';
import viewer from './modules/viewer';

/**
 * @template M
 * @typedef {import('./create-store').StoreFromModule<M>} StoreFromModule
 */

/**
 * @typedef {StoreFromModule<activity> &
 *   StoreFromModule<annotations> &
 *   StoreFromModule<defaults> &
 *   StoreFromModule<directLinked> &
 *   StoreFromModule<drafts> &
 *   StoreFromModule<filters> &
 *   StoreFromModule<frames> &
 *   StoreFromModule<groups> &
 *   StoreFromModule<links> &
 *   StoreFromModule<realTimeUpdates> &
 *   StoreFromModule<route> &
 *   StoreFromModule<selection> &
 *   StoreFromModule<session> &
 *   StoreFromModule<sidebarPanels> &
 *   StoreFromModule<toastMessages> &
 *   StoreFromModule<viewer>
 *  } SidebarStore
 */

/**
 * Create the central state store for the sidebar application.
 *
 * This is a Redux [1] store composed of several modules, augmented with
 * _selector_ methods for querying it and _action_ methods for applying updates.
 * See the `createStore` documentation for API and usage details.
 *
 * [1] https://redux.js.org
 *
 * @param {import('../../types/config').SidebarConfig} settings
 * @return {SidebarStore}
 * @inject
 */
export function createSidebarStore(settings) {
  const middleware = [debugMiddleware];

  const modules = [
    activity,
    annotations,
    defaults,
    directLinked,
    drafts,
    filters,
    frames,
    links,
    groups,
    realTimeUpdates,
    route,
    selection,
    session,
    sidebarPanels,
    toastMessages,
    viewer,
  ];
  return /** @type {SidebarStore} */ (
    createStore(modules, [settings], middleware)
  );
}
