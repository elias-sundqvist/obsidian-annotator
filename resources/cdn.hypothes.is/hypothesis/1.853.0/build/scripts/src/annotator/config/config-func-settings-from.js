/**
 * @typedef HypothesisWindowProps
 * @prop {() => Object} [hypothesisConfig] - Function that returns configuration
 *   for the Hypothesis client
 */

/**
 * Return an object containing config settings from window.hypothesisConfig().
 *
 * Return an object containing config settings returned by the
 * window.hypothesisConfig() function provided by the host page:
 *
 *   {
 *     fooSetting: 'fooValue',
 *     barSetting: 'barValue',
 *     ...
 *   }
 *
 * If there's no window.hypothesisConfig() function then return {}.
 *
 * @param {Window & HypothesisWindowProps} window_ - The window to search for a hypothesisConfig() function
 * @return {Object} - Any config settings returned by hypothesisConfig()
 *
 */
export default function configFuncSettingsFrom(window_) {
  if (!window_.hasOwnProperty('hypothesisConfig')) {
    return {};
  }

  if (typeof window_.hypothesisConfig !== 'function') {
    const docs =
      'https://h.readthedocs.io/projects/client/en/latest/publishers/config/#window.hypothesisConfig';
    console.warn('hypothesisConfig must be a function, see: ' + docs);
    return {};
  }

  return window_.hypothesisConfig();
}
