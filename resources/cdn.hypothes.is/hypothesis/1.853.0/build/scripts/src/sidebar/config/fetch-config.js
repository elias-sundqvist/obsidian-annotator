import getApiUrl from './get-api-url';
import hostConfig from './host-config';
import * as postMessageJsonRpc from '../util/postmessage-json-rpc';

/**
 * @typedef {import('../../types/config').SidebarConfig} SidebarConfig
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 */

/**
 * @deprecated
 */
function ancestors(window_) {
  if (window_ === window_.top) {
    return [];
  }

  // nb. The top window's `parent` is itself!
  const ancestors = [];
  do {
    window_ = window_.parent;
    ancestors.push(window_);
  } while (window_ !== window_.top);

  return ancestors;
}

/**
 * Returns the global embedder ancestor frame.
 *
 * @param {number} levels - Number of ancestors levels to ascend.
 * @param {Window=} window_
 * @return {Window}
 */
function getAncestorFrame(levels, window_ = window) {
  let ancestorWindow = window_;
  for (let i = 0; i < levels; i++) {
    if (ancestorWindow === ancestorWindow.top) {
      throw new Error(
        'The target parent frame has exceeded the ancestor tree. Try reducing the `requestConfigFromFrame.ancestorLevel` value in the `hypothesisConfig`'
      );
    }
    ancestorWindow = ancestorWindow.parent;
  }
  return ancestorWindow;
}

/**
 * @deprecated
 * Fetch client configuration from an ancestor frame.
 *
 * @param {string} origin - The origin of the frame to fetch config from.
 * @param {Window} window_ - Test seam.
 * @return {Promise<any>}
 */
function fetchConfigFromAncestorFrame(origin, window_ = window) {
  const configResponses = [];

  for (let ancestor of ancestors(window_)) {
    const timeout = 3000;
    const result = postMessageJsonRpc.call(
      ancestor,
      origin,
      'requestConfig',
      [],
      timeout
    );
    configResponses.push(result);
  }

  if (configResponses.length === 0) {
    configResponses.push(Promise.reject(new Error('Client is top frame')));
  }

  return Promise.race(configResponses);
}

/**
 * @deprecated
 * Merge client configuration from h service with config fetched from
 * embedding frame.
 *
 * Typically the configuration from the embedding frame is passed
 * synchronously in the query string. However it can also be retrieved from
 * an ancestor of the embedding frame. See tests for more details.
 *
 * @param {Object} appConfig - Settings rendered into `app.html` by the h service.
 * @param {Window} window_ - Test seam.
 * @return {Promise<Object>} - The merged settings.
 */
function fetchConfigLegacy(appConfig, window_ = window) {
  const hostPageConfig = hostConfig(window_);

  let embedderConfig;
  const origin = /** @type string */ (hostPageConfig.requestConfigFromFrame);
  embedderConfig = fetchConfigFromAncestorFrame(origin, window_);

  return embedderConfig.then(embedderConfig => {
    const mergedConfig = Object.assign({}, appConfig, embedderConfig);
    mergedConfig.apiUrl = getApiUrl(mergedConfig);
    return mergedConfig;
  });
}

/**
 * Merge client configuration from h service with config from the hash fragment.
 *
 * @param {Object} appConfig - App config settings rendered into `app.html` by the h service.
 * @param {Object} hostPageConfig - App configuration specified by the embedding frame.
 * @return {Object} - The merged settings.
 */
function fetchConfigEmbed(appConfig, hostPageConfig) {
  const mergedConfig = {
    ...appConfig,
    ...hostPageConfig,
  };
  mergedConfig.apiUrl = getApiUrl(mergedConfig);
  return mergedConfig;
}

/**
 * Merge client configuration from h service with config fetched from
 * a parent frame asynchronously.
 *
 * Use this method to retrieve the config asynchronously from a parent
 * frame via RPC. See tests for more details.
 *
 * @param {Object} appConfig - Settings rendered into `app.html` by the h service.
 * @param {Window} parentFrame - Frame to send call to.
 * @param {string} origin - Origin filter for `window.postMessage` call.
 * @return {Promise<Object>} - The merged settings.
 */
async function fetchConfigRpc(appConfig, parentFrame, origin) {
  const remoteConfig = await postMessageJsonRpc.call(
    parentFrame,
    origin,
    'requestConfig',
    [],
    3000
  );
  // Closure for the RPC call to scope parentFrame and origin variables.
  const rpcCall = (method, args = [], timeout = 3000) =>
    postMessageJsonRpc.call(parentFrame, origin, method, args, timeout);
  const mergedConfig = fetchConfigEmbed(appConfig, remoteConfig);
  return fetchGroupsAsync(mergedConfig, rpcCall);
}

/**
 * Potentially mutates the `groups` config object(s) to be a promise that
 * resolves right away if the `groups` value exists in the original
 * config, or returns a promise that resolves with a secondary RPC
 * call to `requestGroups` when the `groups` value is '$rpc:requestGroups'
 * If the `groups` value is missing or falsely then it won't be mutated.
 *
 * This allows the app to start with an incomplete config and then lazily
 * fill in the `groups` value(s) later when its ready. This helps speed
 * up the loading process.
 *
 * @param {Object} config - The configuration object to mutate. This should
 *  already have the `services` value
 * @param {function} rpcCall - RPC method
 *  (method, args, timeout) => Promise
 * @return {Promise<Object>} - The mutated settings
 */
async function fetchGroupsAsync(config, rpcCall) {
  if (Array.isArray(config.services)) {
    config.services.forEach((service, index) => {
      if (service.groups === '$rpc:requestGroups') {
        // The `groups` need to be fetched from a secondary RPC call and
        // there should be no timeout as it may be waiting for user input.
        service.groups = rpcCall('requestGroups', [index], null).catch(() => {
          throw new Error('Unable to fetch groups');
        });
      }
    });
  }
  return config;
}

/**
 * Fetch the host configuration and merge it with the app configuration from h.
 *
 * There are 3 ways to get the host config:
 *  Direct embed - From the hash string of the embedder frame.
 *  Legacy RPC with unknown parent - From a ancestor parent frame that passes it down via RPC. (deprecated)
 *  RPC with known parent - From a ancestor parent frame that passes it down via RPC.
 *
 * @param {SidebarConfig} appConfig
 * @param {Window} window_ - Test seam.
 * @return {Promise<MergedConfig>} - The merged settings.
 */
export async function fetchConfig(appConfig, window_ = window) {
  const hostPageConfig = hostConfig(window);

  const requestConfigFromFrame = hostPageConfig.requestConfigFromFrame;

  if (!requestConfigFromFrame) {
    // Directly embed: just get the config.
    return fetchConfigEmbed(appConfig, hostPageConfig);
  }
  if (typeof requestConfigFromFrame === 'string') {
    // Legacy: send RPC to all parents to find config. (deprecated)
    // nb. Browsers may display errors in the console when messages are sent to frames
    // that don't match the origin filter".
    return await fetchConfigLegacy(appConfig, window_);
  } else if (
    typeof requestConfigFromFrame.ancestorLevel === 'number' &&
    typeof requestConfigFromFrame.origin === 'string'
  ) {
    // Know parent frame: send RPC directly to the parent.
    const parentFrame = getAncestorFrame(
      requestConfigFromFrame.ancestorLevel,
      window_
    );

    const rpcMergedConfig = await fetchConfigRpc(
      appConfig,
      parentFrame,
      requestConfigFromFrame.origin
    );
    // Add back the optional focused group id from the host page config
    // as this is needed in the Notebook.
    return {
      ...rpcMergedConfig,
      ...(hostPageConfig.group ? { group: hostPageConfig.group } : {}),
    };
  } else {
    throw new Error(
      'Improper `requestConfigFromFrame` object. Both `ancestorLevel` and `origin` need to be specified'
    );
  }
}
