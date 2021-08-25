let shownWarnings = {};

/**
 * Log a warning if it has not already been reported.
 *
 * This is useful to avoid spamming the console if a warning is emitted in a
 * context that may be called frequently.
 *
 * @param {...any} args -
 *   Arguments to forward to `console.warn`. The arguments `toString()` values
 *   are concatenated into a string key which is used to determine if the warning
 *   has been logged before.
 */
export default function warnOnce(...args) {
  const key = args.join();
  if (key in shownWarnings) {
    return;
  }
  console.warn(...args);
  shownWarnings[key] = true;
}

warnOnce.reset = () => {
  shownWarnings = {};
};
