import { fetchJSON } from '../util/fetch';
import { replaceURLParams } from '../util/url';

/**
 * @typedef {import('../../types/api').Annotation} Annotation
 * @typedef {import('../../types/api').Group} Group
 * @typedef {import('../../types/api').RouteMap} RouteMap
 * @typedef {import('../../types/api').RouteMetadata} RouteMetadata
 * @typedef {import('../../types/api').Profile} Profile
 */

/**
 * Return a shallow clone of `obj` with all client-only properties removed.
 * Client-only properties are marked by a '$' prefix.
 *
 * @param {Record<string, unknown>} obj
 */
function stripInternalProperties(obj) {
  /** @type {Record<string, unknown>} */
  const result = {};
  for (let [key, value] of Object.entries(obj)) {
    if (!key.startsWith('$')) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * @template {object} Body
 * @typedef APIResponse
 * @prop {Body} data -
 *  The JSON response from the API call, unless this call returned a
 *  "204 No Content" status.
 * @prop {string|null} token - The access token that was used to make the call
 *   or `null` if unauthenticated.
 */

/**
 * Types of value that can be passed as a parameter to API calls.
 *
 * @typedef {string|number|boolean} Param
 */

/**
 * Function which makes an API request.
 *
 * @template {Record<string, Param|Param[]>} [Params={}]
 * @template [Body=void]
 * @template [Result=void]
 * @callback APICall
 * @param {Params} params - A map of URL and query string parameters to include with the request.
 * @param {Body} [data] - The body of the request.
 * @return {Promise<Result>}
 */

/**
 * Callbacks invoked at various points during an API call to get an access token etc.
 *
 * @typedef APIMethodCallbacks
 * @prop {() => Promise<string|null>} getAccessToken -
 *   Function which acquires a valid access token for making an API request.
 * @prop {() => string|null} getClientId -
 *   Function that returns a per-session client ID to include with the request
 *   or `null`.
 * @prop {() => void} onRequestStarted - Callback invoked when the API request starts.
 * @prop {() => void} onRequestFinished - Callback invoked when the API request finishes.
 */

/**
 * @param {RouteMap|RouteMetadata} link
 * @return {link is RouteMetadata}
 */
function isRouteMetadata(link) {
  return 'url' in link;
}

/**
 * Lookup metadata for an API route in the result of an `/api/` response.
 *
 * @param {RouteMap} routeMap
 * @param {string} route - Dot-separated path of route in `routeMap`
 */
function findRouteMetadata(routeMap, route) {
  /** @type {RouteMap} */
  let cursor = routeMap;
  const pathSegments = route.split('.');
  for (let [index, segment] of pathSegments.entries()) {
    const nextCursor = cursor[segment];
    if (!nextCursor || isRouteMetadata(nextCursor)) {
      if (nextCursor && index === pathSegments.length - 1) {
        // Found the RouteMetadata at the end of the path.
        return nextCursor;
      }
      // Didn't find the route, or found a RouteMetadata before we reached the
      // end of the path.
      break;
    }
    cursor = nextCursor;
  }
  return null;
}

/**
 * Creates a function that will make an API call to a named route.
 *
 * @param {Promise<RouteMap>} links - API route data from API index endpoint (`/api/`)
 * @param {string} route - The dotted path of the named API route (eg. `annotation.create`)
 * @param {APIMethodCallbacks} callbacks
 * @return {APICall<Record<string, any>, Record<string, any>|void, unknown>} - Function that makes
 *   an API call. The returned `APICall` has generic parameter, body and return types.
 *   This can be cast to an `APICall` with more specific types.
 */
function createAPICall(
  links,
  route,
  { getAccessToken, getClientId, onRequestStarted, onRequestFinished }
) {
  return async (params, data) => {
    onRequestStarted();
    try {
      const [linksMap, token] = await Promise.all([links, getAccessToken()]);
      const descriptor = findRouteMetadata(linksMap, route);
      if (!descriptor) {
        throw new Error(`Missing API route: ${route}`);
      }

      /** @type {Record<string, string>} */
      const headers = {
        'Content-Type': 'application/json',
        'Hypothesis-Client-Version': '__VERSION__',
      };

      if (token) {
        headers.Authorization = 'Bearer ' + token;
      }

      const clientId = getClientId();
      if (clientId) {
        headers['X-Client-Id'] = clientId;
      }

      const { url, unusedParams: queryParams } = replaceURLParams(
        descriptor.url,
        params
      );

      const apiURL = new URL(url);
      for (let [key, value] of Object.entries(queryParams)) {
        if (!Array.isArray(value)) {
          value = [value];
        }
        for (let item of value) {
          // eslint-disable-next-line eqeqeq
          if (item == null) {
            // Skip all parameters with nullish values.
            continue;
          }
          apiURL.searchParams.append(key, item.toString());
        }
      }

      // nb. Don't "simplify" the lines below to `return fetchJSON(...)` as this
      // would cause `onRequestFinished` to be called before the API response
      // is received.
      const result = await fetchJSON(apiURL.toString(), {
        body: data ? JSON.stringify(stripInternalProperties(data)) : null,
        headers,
        method: descriptor.method,
      });
      return result;
    } finally {
      onRequestFinished();
    }
  };
}

/**
 * API client for the Hypothesis REST API.
 *
 * Returns an object that with keys that match the routes in
 * the Hypothesis API (see http://h.readthedocs.io/en/latest/api/).
 * @see APICall for the syntax of API calls. For example:
 *
 * ```
 * api.annotations.update({ id: '1234' }, annotation).then(ann => {
 *   // Do something with the updated annotation.
 * }).catch(err => {
 *   // Do something if the API call fails.
 * });
 * ```
 *
 * This service makes authenticated calls to the API, using `AuthService`
 * to get auth tokens. The URLs for API endpoints are provided by the `APIRoutesService`
 * service.
 */
// @inject
export class APIService {
  /**
   * @param {import('./api-routes').APIRoutesService} apiRoutes
   * @param {import('./auth').AuthService} auth
   * @param {import('../store').SidebarStore} store
   */
  constructor(apiRoutes, auth, store) {
    const links = apiRoutes.routes();

    /**
     * Client session identifier included with requests. Used by the backend
     * to associate API requests with WebSocket connections from the same client.
     *
     * @type {string|null}
     */
    this._clientId = null;

    const getClientId = () => this._clientId;

    /** @param {string} route */
    const apiCall = route =>
      createAPICall(links, route, {
        getAccessToken: auth.getAccessToken,
        getClientId,
        onRequestStarted: store.apiRequestStarted,
        onRequestFinished: store.apiRequestFinished,
      });

    // Define available API calls.
    //
    // The type syntax is APICall<Parameters, Body, Result>, where `void` means
    // no body / empty response.

    /**
     * @typedef AnnotationSearchResult
     * @prop {Annotation[]} rows
     * @prop {Annotation[]} replies
     * @prop {number} total
     */

    /** @typedef {{ id: string }} IDParam */

    this.search = /** @type {APICall<{}, void, AnnotationSearchResult>} */ (
      apiCall('search')
    );
    this.annotation = {
      create: /** @type {APICall<{}, Partial<Annotation>, Annotation>} */ (
        apiCall('annotation.create')
      ),
      delete: /** @type {APICall<IDParam>} */ (apiCall('annotation.delete')),
      get: /** @type {APICall<IDParam, void, Annotation>} */ (
        apiCall('annotation.read')
      ),
      update: /** @type {APICall<IDParam, Partial<Annotation>, Annotation>} */ (
        apiCall('annotation.update')
      ),
      flag: /** @type {APICall<IDParam>} */ (apiCall('annotation.flag')),
      hide: /** @type {APICall<IDParam>} */ (apiCall('annotation.hide')),
      unhide: /** @type {APICall<IDParam>} */ (apiCall('annotation.unhide')),
    };
    this.group = {
      member: {
        delete: /** @type {APICall<{ pubid: string, userid: string }>} */ (
          apiCall('group.member.delete')
        ),
      },
      read: /** @type {APICall<{ id: string, expand: string[] }, void, Group>} */ (
        apiCall('group.read')
      ),
    };

    /**
     * @typedef ListGroupParams
     * @prop {string} [authority]
     * @prop {string} [document_uri]
     * @prop {string[]} [expand]
     */

    this.groups = {
      list: /** @type {APICall<ListGroupParams, void, Group[]>} */ (
        apiCall('groups.read')
      ),
    };
    this.profile = {
      groups: {
        read: /** @type {APICall<{ expand: string[] }, void, Group[]>} */ (
          apiCall('profile.groups.read')
        ),
      },
      read: /** @type {APICall<{ authority?: string }, void, Profile>} */ (
        apiCall('profile.read')
      ),
      update: /** @type {APICall<{}, Partial<Profile>, Profile>} */ (
        apiCall('profile.update')
      ),
    };
  }

  /**
   * Set the "client ID" sent with API requests.
   *
   * This is a per-session unique ID which the client sends with REST API
   * requests and in the configuration for the real-time API to prevent the
   * client from receiving real-time notifications about its own actions.
   *
   * @param {string} clientId
   */
  setClientId(clientId) {
    this._clientId = clientId;
  }
}
