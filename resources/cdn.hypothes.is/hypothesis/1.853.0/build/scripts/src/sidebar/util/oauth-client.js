import { fetchJSON } from './fetch';
import { generateHexString } from './random';

/**
 * An object holding the details of an access token from the tokenUrl endpoint.
 *
 * @typedef TokenInfo
 * @prop {string} accessToken  - The access token itself.
 * @prop {number} expiresAt    - The date when the timestamp will expire.
 * @prop {string} refreshToken - The refresh token that can be used to
 *                               get a new access token.
 */

/**
 * Error thrown if fetching or revoking an access token fails.
 */
export class TokenError extends Error {
  /**
   * @param {string} message
   * @param {Error} cause - The error which caused the token fetch to fail
   */
  constructor(message, cause) {
    super(message);
    this.cause = cause;
  }
}

/**
 * OAuthClient configuration.
 *
 * @typedef Config
 * @prop {string} clientId - OAuth client ID
 * @prop {string} tokenEndpoint - OAuth token exchange/refresh endpoint
 * @prop {string} authorizationEndpoint - OAuth authorization endpoint
 * @prop {string} revokeEndpoint - RFC 7009 token revocation endpoint
 */

/**
 * OAuthClient handles interaction with the annotation service's OAuth
 * endpoints.
 */
export default class OAuthClient {
  /**
   * Create a new OAuthClient
   *
   * @param {Config} config
   */
  constructor(config) {
    this.clientId = config.clientId;
    this.tokenEndpoint = config.tokenEndpoint;
    this.authorizationEndpoint = config.authorizationEndpoint;
    this.revokeEndpoint = config.revokeEndpoint;
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   *
   * @param {string} code
   * @return {Promise<TokenInfo>}
   */
  exchangeAuthCode(code) {
    return this._getAccessToken({
      client_id: this.clientId,
      grant_type: 'authorization_code',
      code,
    });
  }

  /**
   * Exchange a grant token for access and refresh tokens.
   *
   * See https://tools.ietf.org/html/rfc7523#section-4
   *
   * @param {string} token
   * @return {Promise<TokenInfo>}
   */
  exchangeGrantToken(token) {
    return this._getAccessToken({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    });
  }

  /**
   * Refresh an access and refresh token pair.
   *
   * See https://tools.ietf.org/html/rfc6749#section-6
   *
   * @param {string} refreshToken
   * @return {Promise<TokenInfo>}
   */
  refreshToken(refreshToken) {
    return this._getAccessToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  /**
   * Revoke an access and refresh token pair.
   *
   * @param {string} accessToken
   * @return {Promise}
   */
  async revokeToken(accessToken) {
    try {
      await this._formPost(this.revokeEndpoint, { token: accessToken });
    } catch (err) {
      throw new TokenError('Failed to revoke access token', err);
    }
  }

  /**
   * Prompt the user for permission to access their data.
   *
   * Returns an authorization code which can be passed to `exchangeAuthCode`.
   *
   * @param {Window} $window - Window which will receive the auth response.
   * @param {Window} authWindow - Popup window where the login prompt will be shown.
   *   This should be created using `openAuthPopupWindow`.
   * @return {Promise<string>}
   */
  authorize($window, authWindow) {
    // Random state string used to check that auth messages came from the popup
    // window that we opened.
    //
    // See https://tools.ietf.org/html/rfc6749#section-4.1.1.
    const state = generateHexString(16);

    // Promise which resolves or rejects when the user accepts or closes the
    // auth popup.
    const authResponse = new Promise((resolve, reject) => {
      function authRespListener(event) {
        if (typeof event.data !== 'object') {
          return;
        }

        if (event.data.state !== state) {
          // This message came from a different popup window.
          return;
        }

        if (event.data.type === 'authorization_response') {
          resolve(event.data);
        }
        if (event.data.type === 'authorization_canceled') {
          reject(new Error('Authorization window was closed'));
        }
        $window.removeEventListener('message', authRespListener);
      }
      $window.addEventListener('message', authRespListener);
    });

    // Authorize user and retrieve grant token
    const authURL = new URL(this.authorizationEndpoint);
    authURL.searchParams.set('client_id', this.clientId);
    authURL.searchParams.set('origin', $window.location.origin);
    authURL.searchParams.set('response_mode', 'web_message');
    authURL.searchParams.set('response_type', 'code');
    authURL.searchParams.set('state', state);

    // @ts-ignore - TS doesn't support `location = <string>`. We have to
    // use this method to set the URL rather than `location.href = <string>`
    // because `authWindow` is cross-origin.
    authWindow.location = authURL.toString();

    return authResponse.then(rsp => rsp.code);
  }

  /**
   * Make an `application/x-www-form-urlencoded` POST request.
   *
   * @param {string} url
   * @param {Record<string, string>} data - Parameter dictionary
   */
  async _formPost(url, data) {
    const params = new URLSearchParams();
    for (let [key, value] of Object.entries(data)) {
      params.set(key, value);
    }

    // Tests currently expect sorted parameters.
    params.sort();

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    return fetchJSON(url, {
      method: 'POST',
      headers,
      body: params.toString(),
    });
  }

  /**
   * Fetch an OAuth access token.
   *
   * @param {Record<string, string>} data - Parameters for form POST request
   * @return {Promise<TokenInfo>}
   */
  async _getAccessToken(data) {
    // The request to `tokenEndpoint` returns an OAuth "Access Token Response".
    // See https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.4
    let response;
    try {
      response = await this._formPost(this.tokenEndpoint, data);
    } catch (err) {
      throw new TokenError('Failed to fetch access token', err);
    }

    return {
      accessToken: response.access_token,

      // Set the expiry date to some time slightly before that implied by
      // `expires_in` to account for the delay in the client receiving the
      // response.
      expiresAt: Date.now() + (response.expires_in - 10) * 1000,

      refreshToken: response.refresh_token,
    };
  }

  /**
   * Create and show a pop-up window for use with `OAuthClient#authorize`.
   *
   * This function _must_ be called in the same turn of the event loop as the
   * button or link which initiates login to avoid triggering the popup blocker
   * in certain browsers. See https://github.com/hypothesis/client/issues/534
   * and https://github.com/hypothesis/client/issues/535.
   *
   * @param {Window} $window - The parent of the created window.
   * @return {Window} The new popup window.
   */
  static openAuthPopupWindow($window) {
    // In Chrome & Firefox the sizes passed to `window.open` are used for the
    // viewport size. In Safari the size is used for the window size including
    // title bar etc. There is enough vertical space at the bottom to allow for
    // this.
    //
    // See https://bugs.webkit.org/show_bug.cgi?id=143678
    const width = 475;
    const height = 430;
    const left = $window.screen.width / 2 - width / 2;
    const top = $window.screen.height / 2 - height / 2;

    // Generate settings for `window.open` in the required comma-separated
    // key=value format.
    const authWindowSettings = `left=${left},top=${top},width=${width},height=${height}`;
    const authWindow = $window.open(
      'about:blank',
      'Log in to Hypothesis',
      authWindowSettings
    );

    if (!authWindow) {
      throw new Error('Failed to open login window');
    }

    return authWindow;
  }
}
