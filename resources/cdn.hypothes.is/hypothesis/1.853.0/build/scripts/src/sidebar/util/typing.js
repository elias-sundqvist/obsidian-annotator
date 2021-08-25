/**
 * Helper function for cases in which logically a reference is definitely
 * not nullish, but TS can't infer that correctly. This will cast the `arg`
 * and appease type-checking.
 *
 * @template T
 * @param {T} arg
 */
export function notNull(arg) {
  return /** @type {NonNullable<T>} */ (arg);
}
