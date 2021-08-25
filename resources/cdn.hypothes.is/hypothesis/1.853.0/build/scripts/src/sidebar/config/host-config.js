import {
  toBoolean,
  toInteger,
  toObject,
  toString,
} from '../../shared/type-coercions';

/** @typedef {import('../../types/config').HostConfig} HostConfig */

/**
 * Return the app configuration specified by the frame embedding the Hypothesis
 * client.
 *
 * @return {HostConfig}
 */
export default function hostPageConfig(window) {
  const configStr = window.location.hash.slice(1);
  const configJSON = new URLSearchParams(configStr).get('config');
  const config = JSON.parse(configJSON || '{}');

  // Known configuration parameters which we will import from the host page.
  // Note that since the host page is untrusted code, the filtering needs to
  // be done here.
  const paramWhiteList = [
    // Direct-linked annotation ID
    'annotations',

    // Direct-linked group ID
    'group',

    // Default query passed by url
    'query',

    // Config param added by the extension, Via etc.  indicating how Hypothesis
    // was added to the page.
    'appType',

    // Config params documented at
    // https://h.readthedocs.io/projects/client/en/latest/publishers/config/
    'openSidebar',
    'showHighlights',
    'services',
    'branding',

    // New note button override.
    // This should be removed once new note button is enabled for everybody.
    'enableExperimentalNewNoteButton',

    // Forces the sidebar to filter annotations to a single user.
    'focus',

    // Fetch config from a parent frame.
    'requestConfigFromFrame',

    // Theme which can either be specified as 'clean'.
    // If nothing is the specified the classic look is applied.
    'theme',

    'usernameUrl',
  ];

  // We need to coerce incoming values from the host config for 2 reasons:
  //
  // 1. New versions of via may no longer support passing any type other than
  // string and our client is set up to expect values that are in fact not a
  // string in some cases. This will help cast these values to the expected
  // type if they can be.
  //
  // 2. A publisher of our sidebar could accidentally pass un-sanitized values
  // into the config and this ensures they safely work downstream even if they
  // are incorrect.
  //
  // Currently we are only handling the following config values do to the fact
  // that via3 will soon discontinue passing boolean types or integer types.
  //  - requestConfigFromFrame
  //  - openSidebar
  //
  // It is assumed we should expand this list and coerce and eventually
  // even validate all such config values.
  // See https://github.com/hypothesis/client/issues/1968
  const coercions = {
    openSidebar: toBoolean,
    requestConfigFromFrame: value => {
      if (typeof value === 'string') {
        // Legacy `requestConfigFromFrame` value which holds only the origin.
        return value;
      }
      const objectVal = toObject(value);
      return {
        origin: toString(objectVal.origin),
        ancestorLevel: toInteger(objectVal.ancestorLevel),
      };
    },
  };

  return Object.keys(config).reduce((result, key) => {
    if (paramWhiteList.indexOf(key) !== -1) {
      // Ignore `null` values as these indicate a default value.
      // In this case the config value set in the sidebar app HTML config is
      // used.
      if (config[key] !== null) {
        if (coercions[key]) {
          // If a coercion method exists, pass it through
          result[key] = coercions[key](config[key]);
        } else {
          result[key] = config[key];
        }
      }
    }
    return result;
  }, {});
}
