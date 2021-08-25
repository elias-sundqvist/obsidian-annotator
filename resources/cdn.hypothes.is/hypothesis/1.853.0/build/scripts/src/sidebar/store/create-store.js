/* global process */

import * as redux from 'redux';
import thunk from 'redux-thunk';

import immutable from '../util/immutable';

import { createReducer, bindSelectors } from './util';

/**
 * Helper that strips the first argument from a function type.
 *
 * @template F
 * @typedef {F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never} OmitFirstArg
 */

/**
 * Helper that converts an object of selector functions, which take a `state`
 * parameter plus zero or more arguments, into selector methods, with no `state` parameter.
 *
 * @template T
 * @typedef {{ [K in keyof T]: OmitFirstArg<T[K]> }} SelectorMethods
 */

/**
 * Map of action type to reducer function.
 *
 * @template State
 * @typedef {{ [action: string]: (s: State, action: any) => Partial<State> }} ReducerMap
 */

/**
 * Map of selector name to selector function.
 *
 * @template State
 * @typedef {{ [name: string]: (s: State, ...args: any[]) => any }} SelectorMap
 */

/**
 * Type of a store module returned by `createStoreModule`.
 *
 * @template State
 * @template {object} Actions
 * @template {object} Selectors
 * @template {object} RootSelectors
 * @typedef Module
 * @prop {string} namespace -
 *   The key under which this module's state will live in the store's root state
 * @prop {(...args: any[]) => State} initialState
 * @prop {ReducerMap<State>} reducers -
 *   Map of action types to "reducer" functions that process an action and return
 *   the changes to the state
 * @prop {Actions} actionCreators
 *   Object containing action creator functions
 * @prop {Selectors} selectors
 *   Object containing selector functions
 * @prop {RootSelectors} [rootSelectors]
 */

/**
 * Replace a type `T` with `Fallback` if `T` is `any`.
 *
 * Based on https://stackoverflow.com/a/61626123/434243.
 *
 * @template T
 * @template Fallback
 * @typedef {0 extends (1 & T) ? Fallback : T} DefaultIfAny
 */

/**
 * Helper for getting the type of store produced by `createStore` when
 * passed a given module.
 *
 * To get the type for a store created from several modules, use `&`:
 *
 * `StoreFromModule<firstModule> & StoreFromModule<secondModule>`
 *
 * @template T
 * @typedef {T extends Module<any, infer Actions, infer Selectors, infer RootSelectors> ?
 *   Store<Actions,Selectors,DefaultIfAny<RootSelectors,{}>> : never} StoreFromModule
 */

/**
 * Redux store augmented with selector methods to query specific state and
 * action methods that dispatch specific actions.
 *
 * @template {object} Actions
 * @template {object} Selectors
 * @template {object} RootSelectors
 * @typedef {redux.Store &
 *   Actions &
 *   SelectorMethods<Selectors> &
 *   SelectorMethods<RootSelectors>} Store
 */

/**
 * Create a Redux store from a set of _modules_.
 *
 * Each module defines the logic related to a particular piece of the application
 * state, including:
 *
 *  - The initial value of that state
 *  - The _actions_ that can change that state
 *  - The _selectors_ for reading that state or computing things
 *    from that state.
 *
 * In addition to the standard Redux store interface, the returned store also exposes
 * each action creator and selector from the input modules as a method. For example, if
 * a store is created from a module that has a `getWidget(<id>)` selector and
 * an `addWidget(<object>)` action, a consumer would use `store.getWidget(<id>)`
 * to fetch an item and `store.addWidget(<object>)` to dispatch an action that
 * adds an item. External consumers of the store should in most cases use these
 * selector and action methods rather than `getState` or `dispatch`. This
 * makes it easier to refactor the internal state structure.
 *
 * Preact UI components access stores via the `useStoreProxy` hook defined in
 * `use-store.js`. This returns a proxy which enables UI components to observe
 * what store state a component depends upon and re-render when it changes.
 *
 * @param {Module<any,any,any,any>[]} modules
 * @param {any[]} [initArgs] - Arguments to pass to each state module's `initialState` function
 * @param {any[]} [middleware] - List of additional Redux middlewares to use
 * @return Store<any,any,any>
 */
export function createStore(modules, initArgs = [], middleware = []) {
  // Create the initial state and state update function.

  // Namespaced objects for initial states.
  const initialState = {};

  /**
   * Namespaced reducers from each module.
   * @type {import("redux").ReducersMapObject} allReducers
   */
  const allReducers = {};
  // Namespaced selectors from each module.
  const allSelectors = {};

  // Iterate over each module and prep each module's:
  //    1. state
  //    2. reducers
  //    3. selectors
  //
  modules.forEach(module => {
    if (module.namespace) {
      initialState[module.namespace] = module.initialState(...initArgs);

      allReducers[module.namespace] = createReducer(module.reducers);
      allSelectors[module.namespace] = {
        selectors: module.selectors,
        rootSelectors: module.rootSelectors || {},
      };
    } else {
      console.warn('Store module does not specify a namespace', module);
    }
  });

  const defaultMiddleware = [
    // The `thunk` middleware handles actions which are functions.
    // This is used to implement actions which have side effects or are
    // asynchronous (see https://github.com/gaearon/redux-thunk#motivation)
    thunk,
  ];

  const enhancer = redux.applyMiddleware(...defaultMiddleware, ...middleware);

  // Create the combined reducer from the reducers for each module.
  let reducer = redux.combineReducers(allReducers);

  // In debug builds, freeze the new state after each action to catch any attempts
  // to mutate it, which indicates a bug since it is supposed to be immutable.
  if (process.env.NODE_ENV !== 'production') {
    const originalReducer = reducer;
    reducer = (state, action) => immutable(originalReducer(state, action));
  }

  // Create the store.
  const store = redux.createStore(reducer, initialState, enhancer);

  // Add actions and selectors as methods to the store.
  const actions = Object.assign({}, ...modules.map(m => m.actionCreators));
  const boundActions = redux.bindActionCreators(actions, store.dispatch);
  const boundSelectors = bindSelectors(allSelectors, store.getState);

  Object.assign(store, boundActions, boundSelectors);

  return store;
}

// The properties of the `config` argument to `createStoreModule` below are
// declared inline due to https://github.com/microsoft/TypeScript/issues/43403.

/**
 * Create a store module that can be passed to `createStore`.
 *
 * @template State
 * @template Actions
 * @template {SelectorMap<State>} Selectors
 * @template RootSelectors
 * @param {State | ((...args: any[]) => State)} initialState
 * @param {object} config
 *   @param {string} config.namespace -
 *     The key under which this module's state will live in the store's root state
 *   @param {ReducerMap<State>} config.reducers -
 *   @param {Actions} config.actionCreators
 *   @param {Selectors} config.selectors
 *   @param {RootSelectors} [config.rootSelectors]
 * @return {Module<State,Actions,Selectors,RootSelectors>}
 */
export function createStoreModule(initialState, config) {
  // The `initialState` argument is separate to `config` as this allows
  // TypeScript to infer the `State` type in the `config` argument at the
  // `createStoreModule` call site.

  if (!(initialState instanceof Function)) {
    const state = initialState;
    initialState = () => state;
  }

  return {
    initialState,
    ...config,
  };
}
