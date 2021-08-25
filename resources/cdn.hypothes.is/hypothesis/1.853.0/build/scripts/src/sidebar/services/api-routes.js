import { fetchJSON } from '../util/fetch';
import { retryPromiseOperation } from '../util/retry';

/**
 * Fetch an API metadata file, retrying the operation if it fails.
 *
 * @param {string} url
 */
function getJSON(url) {
  return retryPromiseOperation(() =>
    // nb. The `/api/` and `/api/links` routes are fetched without specifying
    // any additional headers/config so that we can use `<link rel="preload">` in
    // the `/app.html` response to fetch them early, while the client JS app
    // is loading.
    fetchJSON(url)
  );
}

/**
 * @typedef {import('../../types/api').RouteMap} RouteMap
 * @typedef {import('../../types/config').SidebarConfig} SidebarConfig
 */

/**
 * A service which fetches and caches API route metadata.
 */
// @inject
export class APIRoutesService {
  /**
   * @param {SidebarConfig} settings
   */
  constructor(settings) {
    this._apiUrl = settings.apiUrl;

    /** @type {Promise<RouteMap>|null} */
    this._routeCache = null;

    /** @type {Promise<Record<string,string>>|null} */
    this._linkCache = null;
  }

  /**
   * Fetch and cache API route metadata.
   *
   * Routes are fetched without any authentication and therefore assumed to be
   * the same regardless of whether the user is authenticated or not.
   *
   * @return {Promise<RouteMap>} - Map of routes to route metadata.
   */
  routes() {
    if (!this._routeCache) {
      this._routeCache = getJSON(this._apiUrl).then(index => index.links);
    }
    return this._routeCache;
  }

  /**
   * Fetch and cache service page links from the API.
   *
   * @return {Promise<Record<string,string>>} - Map of link name to URL
   */
  links() {
    if (!this._linkCache) {
      this._linkCache = this.routes().then(routes =>
        getJSON(/** @type {string} */ (routes.links.url))
      );
    }
    return this._linkCache;
  }
}
