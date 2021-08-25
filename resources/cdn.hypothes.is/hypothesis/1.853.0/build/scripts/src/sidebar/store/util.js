/** @typedef {import('redux').Store} Store */

/**
 * Return an object where each key in `updateFns` is mapped to the key itself.
 *
 * @template {Object.<string,Function>} T
 * @param {T} reducers - Object containing reducer functions
 * @return {{ [index in keyof T]: string }}
 */
export function actionTypes(reducers) {
  return Object.keys(reducers).reduce((types, key) => {
    types[key] = key;
    return types;
  }, /** @type {any} */ ({}));
}

/**
 * Create a standard Redux reducer function from a map of action types to reducers.
 *
 * @template {object} State
 * @param {Record<string, (s: State, action: any) => Partial<State>>} reducers -
 *   Object mapping action types to reducer functions. The result of the
 *   reducer is merged with the existing state.
 */
export function createReducer(reducers) {
  return (state = /** @type {State} */ ({}), action) => {
    const reducer = reducers[action.type];
    if (!reducer) {
      return state;
    }
    const stateChanges = reducer(state, action);

    // Some modules return an array rather than an object. They need to be
    // handled differently so we don't convert them to an object.
    if (Array.isArray(stateChanges)) {
      return stateChanges;
    }

    return {
      // @ts-expect-error - TS isn't certain `state` is spreadable here. Trust us!
      ...state,
      ...stateChanges,
    };
  };
}

/**
 * Takes a mapping of namespaced modules and the store's `getState()` function
 * and returns an aggregated flat object with all the selectors at the root
 * level. The keys to this object are functions that call the original
 * selectors with the `state` argument set to the current value of `getState()`.
 */
export function bindSelectors(namespaces, getState) {
  const boundSelectors = {};
  Object.keys(namespaces).forEach(namespace => {
    const { selectors, rootSelectors = {} } = namespaces[namespace];

    Object.keys(selectors).forEach(selector => {
      if (boundSelectors[selector]) {
        throw new Error(`Duplicate selector "${selector}"`);
      }
      boundSelectors[selector] = (...args) =>
        selectors[selector](getState()[namespace], ...args);
    });

    Object.keys(rootSelectors).forEach(selector => {
      if (boundSelectors[selector]) {
        throw new Error(`Duplicate selector "${selector}"`);
      }
      boundSelectors[selector] = (...args) =>
        rootSelectors[selector](getState(), ...args);
    });
  });
  return boundSelectors;
}

/**
 * Return a value from app state when it meets certain criteria.
 *
 * `await` returns a Promise which resolves when a selector function,
 * which reads values from a Redux store, returns non-null.
 *
 * @template T
 * @param {Object} store - Redux store
 * @param {(s: Store) => T|null} selector - Function which returns a value from the
 *   store if the criteria is met or `null` otherwise.
 * @return {Promise<T>}
 */
export function awaitStateChange(store, selector) {
  const result = selector(store);
  if (result !== null) {
    return Promise.resolve(result);
  }
  return new Promise(resolve => {
    const unsubscribe = store.subscribe(() => {
      const result = selector(store);
      if (result !== null) {
        unsubscribe();
        resolve(result);
      }
    });
  });
}
