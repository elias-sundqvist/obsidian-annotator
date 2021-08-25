import warnOnce from '../../shared/warn-once';
import { generateHexString } from '../util/random';
import { Socket } from '../websocket';
import { watch } from '../util/watch';

/**
 * `StreamerService` manages the WebSocket connection to the Hypothesis Real-Time
 * API [1]
 *
 * This service is responsible for opening the WebSocket connection and sending
 * messages to configure what notifications are delivered to the client.
 * Other services call `setConfig` to specify the filtering configuration.
 *
 * When notifications are received via the WebSocket, this service adds them to
 * the store. Depending on the update they may be applied immediately or added
 * to the "pending real time updates" state so that they can be applied by the
 * user at a convenient time.
 *
 * [1] https://h.readthedocs.io/en/latest/api/realtime/
 *
 * @inject
 */
export class StreamerService {
  /**
   * @param {import('../store').SidebarStore} store
   * @param {import('./auth').AuthService} auth
   * @param {import('./groups').GroupsService} groups
   * @param {import('./session').SessionService} session
   * @param {Record<string, any>} settings
   */
  constructor(store, auth, groups, session, settings) {
    this._auth = auth;
    this._groups = groups;
    this._session = session;
    this._store = store;
    this._websocketURL = settings.websocketUrl;

    /** The randomly generated session ID */
    this.clientId = generateHexString(32);

    /** @type {Socket|null} */
    this._socket = null;

    /**
     * Flag that controls whether to apply updates immediately or defer them
     * until "manually" applied via `applyPendingUpdates`
     */
    this._updateImmediately = true;

    /**
     * Client configuration messages, to be sent each time a new connection is
     * established.
     *
     * @type {Record<string, object>}
     */
    this._configMessages = {};

    this._reconnectSetUp = false;
  }

  /**
   * Apply updates to annotations which have been received but not yet
   * applied.
   */
  applyPendingUpdates() {
    const updates = Object.values(this._store.pendingUpdates());
    if (updates.length) {
      this._store.addAnnotations(updates);
    }

    const deletions = Object.keys(this._store.pendingDeletions()).map(id => ({
      id,
    }));
    if (deletions.length) {
      this._store.removeAnnotations(deletions);
    }

    this._store.clearPendingUpdates();
  }

  /** @param {ErrorEvent} event */
  _handleSocketError(event) {
    warnOnce('Error connecting to H push notification service:', event);

    // In development, warn if the connection failure might be due to
    // the app's origin not having been whitelisted in the H service's config.
    //
    // Unfortunately the error event does not provide a way to get at the
    // HTTP status code for HTTP -> WS upgrade requests.
    const websocketHost = new URL(this._websocketURL).hostname;
    if (['localhost', '127.0.0.1'].indexOf(websocketHost) !== -1) {
      /* istanbul ignore next */
      warnOnce(
        'Check that your H service is configured to allow ' +
          'WebSocket connections from ' +
          window.location.origin
      );
    }
  }

  /** @param {MessageEvent} event */
  _handleSocketMessage(event) {
    const message = JSON.parse(event.data);
    if (!message) {
      return;
    }

    if (message.type === 'annotation-notification') {
      const annotations = message.payload;
      switch (message.options.action) {
        case 'create':
        case 'update':
        case 'past':
          this._store.receiveRealTimeUpdates({
            updatedAnnotations: annotations,
          });
          break;
        case 'delete':
          this._store.receiveRealTimeUpdates({
            deletedAnnotations: annotations,
          });
          break;
      }

      if (this._updateImmediately) {
        this.applyPendingUpdates();
      }
    } else if (message.type === 'session-change') {
      this._session.update(message.model);
      this._groups.load();
    } else if (message.type === 'whoyouare') {
      const userid = this._store.profile().userid;
      if (message.userid !== userid) {
        console.warn(
          'WebSocket user ID "%s" does not match logged-in ID "%s"',
          message.userid,
          userid
        );
      }
    } else {
      warnOnce('Received unsupported notification', message.type);
    }
  }

  /** @param {Socket} socket */
  _sendClientConfig(socket) {
    Object.keys(this._configMessages).forEach(key => {
      if (this._configMessages[key]) {
        socket.send(this._configMessages[key]);
      }
    });
  }

  /**
   * Send a configuration message to the push notification service.
   * Each message is associated with a key, which is used to re-send
   * configuration data to the server in the event of a reconnection.
   *
   * @param {string} key
   * @param {object} configMessage
   */
  setConfig(key, configMessage) {
    this._configMessages[key] = configMessage;
    if (this._socket?.isConnected()) {
      this._socket.send(configMessage);
    }
  }

  async _reconnect() {
    // If we have no URL configured, don't do anything.
    if (!this._websocketURL) {
      return;
    }
    this._socket?.close();

    let token;
    try {
      token = await this._auth.getAccessToken();
    } catch (err) {
      console.error('Failed to fetch token for WebSocket authentication', err);
      throw err;
    }

    let url;
    if (token) {
      // Include the access token in the URL via a query param. This method
      // is used to send credentials because the `WebSocket` constructor does
      // not support setting the `Authorization` header directly as we do for
      // other API requests.
      const parsedURL = new URL(this._websocketURL);
      parsedURL.searchParams.set('access_token', token);
      url = parsedURL.toString();
    } else {
      url = this._websocketURL;
    }

    const newSocket = new Socket(url);
    newSocket.on('open', () => this._sendClientConfig(newSocket));
    newSocket.on('error', err => this._handleSocketError(err));
    newSocket.on('message', event => this._handleSocketMessage(event));
    this._socket = newSocket;

    // Configure the client ID
    this.setConfig('client-id', {
      messageType: 'client_id',
      value: this.clientId,
    });

    // Send a "whoami" message. The server will respond with a "whoyouare"
    // reply which is useful for verifying that authentication worked as
    // expected.
    this.setConfig('auth-check', {
      type: 'whoami',
      id: 1,
    });
  }

  /**
   * Connect to the Hypothesis real time update service.
   *
   * If the service has already connected this does nothing.
   *
   * @param {Object} [options]
   *   @param {boolean} [options.applyUpdatesImmediately] - true if pending updates should be applied immediately
   * @return {Promise<void>} Promise which resolves once the WebSocket connection
   *    process has started.
   */
  async connect(options = {}) {
    this._updateImmediately = options.applyUpdatesImmediately ?? true;

    // Setup reconnection when user changes, as auth token will have changed.
    if (!this._reconnectSetUp) {
      this._reconnectSetUp = true;
      watch(
        this._store.subscribe,
        () => this._store.profile().userid,
        () => {
          this._reconnect();
        }
      );
    }

    if (this._socket) {
      return;
    }
    await this._reconnect();
  }
}
