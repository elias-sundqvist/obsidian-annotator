import { actionTypes } from '../util';
import { replaceURLParams } from '../../util/url';
import { createStoreModule } from '../create-store';

const initialState = /** @type {Record<string, string>|null} */ (null);

const reducers = {
  UPDATE_LINKS(state, action) {
    return {
      ...action.links,
    };
  },
};

const actions = actionTypes(reducers);

/**
 * Update the link map
 *
 * @param {Record<string, string>} links - Link map fetched from the `/api/links` endpoint
 */
function updateLinks(links) {
  return {
    type: actions.UPDATE_LINKS,
    links,
  };
}

/**
 * Render a service link (URL) using the given `params`
 *
 * Returns an empty string if links have not been fetched yet.
 *
 * @param {string} linkName
 * @param {Record<string, string>} [params]
 * @return {string}
 */
function getLink(state, linkName, params = {}) {
  if (!state) {
    return '';
  }
  const template = state[linkName];
  if (!template) {
    throw new Error(`Unknown link "${linkName}"`);
  }
  const { url, unusedParams } = replaceURLParams(template, params);
  const unusedKeys = Object.keys(unusedParams);
  if (unusedKeys.length > 0) {
    throw new Error(`Unused parameters: ${unusedKeys.join(', ')}`);
  }
  return url;
}

export default createStoreModule(initialState, {
  namespace: 'links',
  reducers,
  actionCreators: {
    updateLinks,
  },
  selectors: {
    getLink,
  },
});
