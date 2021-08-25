import shallowEqual from 'shallowequal';

/**
 * Watch for changes of computed values.
 *
 * This utility is a shorthand for a common pattern for reacting to changes in
 * some data source:
 *
 * ```
 * let prevValue = getCurrentValue();
 * subscribe(() => {
 *   const newValue = getCurrentValue();
 *   if (prevValue !== newValue) {
 *     // Respond to change of value.
 *     // ...
 *
 *     // Update previous value.
 *     prevValue = new value;
 *   }
 * });
 * ```
 *
 * Where `getCurrentValue` calculates the value of interest and
 * `subscribe` registers a callback to receive change notifications for
 * whatever data source (eg. a Redux store) is used by `getCurrentValue`.
 *
 * With the `watch` utility this becomes:
 *
 * ```
 * watch(subscribe, getCurrentValue, (newValue, prevValue) => {
 *   // Respond to change of value
 * });
 * ```
 *
 * `watch` can watch a single value, if the second argument is a function,
 * or many if the second argument is an array of functions. In the latter case
 * the callback will be invoked whenever _any_ of the watched values changes.
 *
 * Values are compared using strict equality (`===`).
 *
 * @param {(callback: () => void) => Function} subscribe - Function used to
 *   subscribe to notifications of _potential_ changes in the watched values.
 * @param {Function|Array<Function>} watchFns - A function or array of functions
 *   which return the current watched values
 * @param {(current: any, previous: any) => any} callback -
 *   A callback that is invoked when the watched values changed. It is passed
 *   the current and previous values respectively. If `watchFns` is an array,
 *   the `current` and `previous` arguments will be arrays of current and
 *   previous values.
 * @return {Function} - Return value of `subscribe`. Typically this is a
 *   function that removes the subscription.
 */
export function watch(subscribe, watchFns, callback) {
  const isArray = Array.isArray(watchFns);

  const getWatchedValues = () =>
    isArray
      ? /** @type {Function[]} */ (watchFns).map(fn => fn())
      : /** @type {Function} */ (watchFns)();

  let prevValues = getWatchedValues();
  const unsubscribe = subscribe(() => {
    const values = getWatchedValues();

    const equal = isArray
      ? shallowEqual(values, prevValues)
      : values === prevValues;

    if (equal) {
      return;
    }

    // Save and then update `prevValues` before invoking `callback` in case
    // `callback` triggers another update.
    const savedPrevValues = prevValues;
    prevValues = values;

    callback(values, savedPrevValues);
  });

  return unsubscribe;
}
