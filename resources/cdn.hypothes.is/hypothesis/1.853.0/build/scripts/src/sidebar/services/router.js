/**
 * @typedef {'annotation'|'notebook'|'stream'|'sidebar'} RouteName
 * @typedef {Record<string,string>} RouteParams
 */

/**
 * A service that manages the association between the route and route parameters
 * implied by the URL and the corresponding route state in the store.
 */
// @inject
export class RouterService {
  /**
   * @param {Window} $window
   * @param {import('../store').SidebarStore} store
   */
  constructor($window, store) {
    this._window = $window;
    this._store = store;
    this._didRegisterPopstateListener = false;
  }

  /**
   * Return the name and parameters of the current route.
   *
   * @return {{ route: RouteName, params: RouteParams }}
   */
  currentRoute() {
    const path = this._window.location.pathname;
    const pathSegments = path.slice(1).split('/');
    const searchParams = new URLSearchParams(this._window.location.search);

    /** @type {Record<string, string>} */
    const params = {};
    for (let [key, value] of searchParams) {
      params[key] = value;
    }

    // The extension puts client resources under `/client/` to separate them
    // from extension-specific resources. Ignore this part.
    if (pathSegments[0] === 'client') {
      pathSegments.shift();
    }

    // Routes loaded from h have no file extensions (eg. `/a/:id`, `/notebook`).
    //
    // Routes loaded from custom builds or the Chrome extension may have a '.html'
    // extension.
    const mainSegment = pathSegments[0].replace(/\.html$/, '');

    /** @type {RouteName} */
    let route;

    switch (mainSegment) {
      case 'a':
        route = 'annotation';
        params.id = pathSegments[1] || '';
        break;
      case 'notebook':
        route = 'notebook';
        break;
      case 'stream':
        route = 'stream';
        break;
      default:
        route = 'sidebar';
        break;
    }

    return { route, params };
  }

  /**
   * Generate a URL for a given route.
   *
   * @param {RouteName} name
   * @param {RouteParams} params
   */
  routeUrl(name, params = {}) {
    let url;
    const queryParams = { ...params };

    switch (name) {
      case 'annotation':
        {
          const id = params.id;
          // @ts-ignore - TS doesn't know what properties `queryParams` has.
          delete queryParams.id;
          url = `/a/${id}`;
        }
        break;
      case 'notebook':
        url = '/notebook';
        break;
      case 'stream':
        url = '/stream';
        break;
      default:
        throw new Error(`Cannot generate URL for route "${name}"`);
    }

    let hasParams = false;
    const searchParams = new URLSearchParams();
    for (let [key, value] of Object.entries(queryParams)) {
      hasParams = true;
      searchParams.set(key, value);
    }

    if (hasParams) {
      url += '?' + searchParams.toString();
    }

    return url;
  }

  /**
   * Synchronize the route name and parameters in the store with the current
   * URL.
   *
   * The first call to this method also registers a listener for future back/forwards
   * navigation in the browser.
   */
  sync() {
    const { route, params } = this.currentRoute();
    this._store.changeRoute(route, params);

    // Set up listener for back/forward navigation. We do this in `sync()` to
    // avoid the route being changed by a "popstate" emitted by the browser on
    // document load (which Safari and Chrome do).
    if (!this._didRegisterPopstateListener) {
      this._window.addEventListener('popstate', () => {
        // All the state we need to update the route is contained in the URL, which
        // has already been updated at this point, so just sync the store route
        // to match the URL.
        this.sync();
      });
      this._didRegisterPopstateListener = true;
    }
  }

  /**
   * Navigate to a given route.
   *
   * @param {RouteName} name
   * @param {RouteParams} params
   */
  navigate(name, params) {
    this._window.history.pushState({}, '', this.routeUrl(name, params));
    this.sync();
  }
}
