import { useEffect, useRef, useReducer } from 'preact/hooks';

import { useService } from '../service-context';

/** @typedef {import("redux").Store} Store */

/** @typedef {import("./index").SidebarStore} SidebarStore */

/**
 * Result of a cached store selector method call.
 */
class CacheEntry {
  /**
   * @param {string} name - Method name
   * @param {Function} method - Method implementation
   * @param {any[]} args - Arguments to the selector
   * @param {any} result - Result of the invocation
   */
  constructor(name, method, args, result) {
    this.name = name;
    this.method = method;
    this.args = args;
    this.result = result;
  }

  /**
   * @param {string} name
   * @param {any[]} args
   */
  matches(name, args) {
    return (
      this.name === name && this.args.every((value, i) => args[i] === value)
    );
  }
}

/**
 * Return a wrapper around the `store` service that UI components can use to
 * extract data from the store and call actions on it.
 *
 * Unlike using the `store` service directly, the wrapper tracks what data from
 * the store the current component uses, via selector methods, and re-renders the
 * component when that data changes.
 *
 * The returned wrapper has the same API as the store itself.
 *
 * @example
 *   function MyComponent() {
 *     const store = useStoreProxy();
 *     const currentUser = store.currentUser();
 *
 *     return (
 *       <div>
 *         Current user: {currentUser}.
 *         <button onClick={() => store.logOut()}>Log out</button>
 *       </div>
 *     );
 *   }
 *
 * @return {SidebarStore}
 */
export function useStoreProxy() {
  const store = useService('store');

  // Hack to trigger a component re-render.
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Cache of store method calls made by the current UI component and associated
  // results. There is one entry per combination of method and arguments.
  //
  // This is currently just an array on the assumption that it will
  // only have a small number of entries. It could be changed to a map keyed
  // by method to handle many entries better.
  const cacheRef = useRef(/** @type {CacheEntry[]} */ ([]));
  const cache = cacheRef.current;

  // Create the wrapper around the store.
  const proxy = useRef(/** @type {SidebarStore|null} */ (null));
  if (!proxy.current) {
    // Cached method wrappers.
    const wrappedMethods = {};

    /**
     * @param {typeof store} store
     * @param {string} prop
     */
    const get = (store, prop) => {
      const method = store[prop];
      if (typeof method !== 'function') {
        return method;
      }

      // Check for pre-existing method wrapper.
      let wrapped = wrappedMethods[prop];
      if (wrapped) {
        return wrapped;
      }

      // Create method wrapper.
      wrapped = (...args) => {
        const cacheEntry = cache.find(entry => entry.matches(prop, args));
        if (cacheEntry) {
          return cacheEntry.result;
        }

        // Call the original method. It may be a selector that does not modify
        // the store but returns a result, or an action that modifies the state.
        const prevState = store.getState();
        const result = method.apply(store, args);
        const newState = store.getState();

        if (prevState === newState) {
          cache.push(new CacheEntry(prop, method, args, result));
        }
        return result;
      };
      wrappedMethods[prop] = wrapped;

      return wrapped;
    };

    proxy.current = new Proxy(store, { get });
  }

  // Register a subscriber which clears cache and re-renders component when
  // relevant store state changes.
  useEffect(() => {
    const cleanup = store.subscribe(() => {
      const invalidEntry = cache.find(
        // nb. A potential problem here is that the method arguments may refer
        // to things which no longer exist (for example, an object ID for an object
        // which has been unloaded). It is assumed that store selector methods are
        // robust to this.
        entry => entry.method.apply(store, entry.args) !== entry.result
      );

      if (invalidEntry) {
        // We currently just invalidate the entire cache when any entry becomes
        // invalid, but we could do more fine-grained checks.
        cache.splice(0, cache.length);
        forceUpdate(0);
      }
    });
    return cleanup;
  }, [cache, store]);

  return proxy.current;
}
