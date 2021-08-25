/**
 * A debug utility that prints information about internal application state
 * changes to the console.
 *
 * Debugging is enabled by setting `window.debug` to a truthy value.
 *
 * When enabled, every action that changes application state will be printed
 * to the console, along with the application state before and after the action
 * was handled.
 *
 * @param {import("redux").Store} store
 */
export default function debugMiddleware(store) {
  /* eslint-disable no-console */
  let serial = 0;

  return function (next) {
    return function (action) {
      // @ts-ignore The window interface needs to be expanded to include this property
      if (!window.debug) {
        next(action);
        return;
      }

      ++serial;

      const groupTitle = action.type + ' (' + serial.toString() + ')';
      console.group(groupTitle);
      console.log('Prev State:', store.getState());
      console.log('Action:', action);

      next(action);

      console.log('Next State:', store.getState());
      console.groupEnd();
    };
  };
  /* eslint-enable no-console */
}
