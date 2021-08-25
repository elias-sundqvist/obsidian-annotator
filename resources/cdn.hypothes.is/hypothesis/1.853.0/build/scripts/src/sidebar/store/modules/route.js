import { actionTypes } from '../util';

import { createStoreModule } from '../create-store';

/**
 * @typedef {'annotation'|'notebook'|'sidebar'|'stream'} RouteName
 */

const initialState = {
  /**
   * The current route.
   *
   * @type {RouteName|null}
   */
  name: null,

  /**
   * Parameters of the current route.
   *
   * - The "annotation" route has an "id" (annotation ID) parameter.
   * - The "stream" route has a "q" (query) parameter.
   * - The "sidebar" route has no parameters.
   *
   * @type {Record<string, string>}
   */
  params: {},
};

const reducers = {
  CHANGE_ROUTE(state, { name, params }) {
    return { name, params };
  },
};

const actions = actionTypes(reducers);

/**
 * Change the active route.
 *
 * @param {string} name - Name of the route to activate. See `initialState` for possible values
 * @param {Object.<string,string>} params - Parameters associated with the route
 */
function changeRoute(name, params = {}) {
  return {
    type: actions.CHANGE_ROUTE,
    name,
    params,
  };
}

/**
 * Return the name of the current route.
 */
function route(state) {
  return state.name;
}

/**
 * Return any parameters for the current route, extracted from the path and
 * query string.
 */
function routeParams(state) {
  return state.params;
}

export default createStoreModule(initialState, {
  namespace: 'route',
  reducers,
  actionCreators: {
    changeRoute,
  },
  selectors: {
    route,
    routeParams,
  },
});
