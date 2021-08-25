/**
 * Utility functions for collections: Sets, Maps, Arrays and Map-like objects
 */

/**
 * Return the number of elements in `ary` for which `predicate` returns true.
 *
 * @template T
 * @param {T[]} ary
 * @param {(item: T) => boolean} predicate
 * @return {number}
 */
export function countIf(ary, predicate) {
  return ary.reduce((count, item) => {
    return predicate(item) ? count + 1 : count;
  }, 0);
}

/**
 * Convert an array of strings into an object mapping each array entry
 * to `true`.
 *
 * @param {string[]} arr
 * @return {Object<string,true>}
 */
export function toTrueMap(arr) {
  const obj = /** @type {Object<string,true>} */ ({});
  arr.forEach(key => (obj[key] = true));
  return obj;
}

/**
 * Utility function that returns all of the properties of an object whose
 * value is `true`.
 *
 * @param {Object} obj
 * @return {string[]}
 */
export function trueKeys(obj) {
  return Object.keys(obj).filter(key => obj[key] === true);
}
