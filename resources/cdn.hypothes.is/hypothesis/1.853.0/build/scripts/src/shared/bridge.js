import { PortRPC } from './port-rpc';

/** @typedef {import('../types/annotator').Destroyable} Destroyable */

/**
 * The Bridge service sets up a channel between frames and provides an events
 * API on top of it.
 *
 * @implements Destroyable
 */
export class Bridge {
  constructor() {
    /** @type {PortRPC[]} */
    this.links = [];
    /** @type {Record<string, (...args: any[]) => void>} */
    this.channelListeners = {};
    /** @type {Array<(channel: PortRPC) => void>} */
    this.onConnectListeners = [];
  }

  /**
   * Destroy all channels created with `createChannel`.
   *
   * This removes the event listeners for messages arriving from other ports.
   */
  destroy() {
    this.links.forEach(channel => channel.destroy());
    this.links = [];
  }

  /**
   * Create a communication channel using a `MessagePort`.
   *
   * The created channel is added to the list of channels which `call`
   * and `on` send and receive messages over.
   *
   * @param {MessagePort} port
   * @return {PortRPC} - Channel for communicating with the reciprocal port.
   */
  createChannel(port) {
    const listeners = { connect: cb => cb(), ...this.channelListeners };

    // Set up a channel
    const channel = new PortRPC(port, listeners);

    let connected = false;
    const ready = () => {
      if (connected) {
        return;
      }
      connected = true;
      this.onConnectListeners.forEach(cb => cb(channel));
    };

    // Fire off a connection attempt
    channel.call('connect', ready);

    // Store the newly created channel in our collection
    this.links.push(channel);

    return channel;
  }

  /**
   * Make a method call on all channels, collect the results and pass them to a
   * callback when all results are collected.
   *
   * @param {string} method - Name of remote method to call.
   * @param {any[]} args - Arguments to method. Final argument is an optional
   *   callback with this type: `(error: string|Error|null, ...result: any[]) => void`.
   *   This callback, if any, will be triggered once a response (via `postMessage`)
   *   comes back from the other frame/s. If the first argument (error) is `null`
   *   it means successful execution of the whole remote procedure call.
   *   TODO: July 2021, it has been suggested to retire the callback API and rely
   *   solely on the `Promise`-based API
   *   (see https://github.com/hypothesis/client/pull/3598#discussion_r678096863).
   * @return {Promise<any[]>} - Array of results, one per connected frame
   */
  call(method, ...args) {
    let cb;
    const finalArg = args[args.length - 1];
    if (typeof finalArg === 'function') {
      cb = finalArg;
      args = args.slice(0, -1);
    }

    /** @param {PortRPC} channel */
    const _makeDestroyFn = channel => {
      return error => {
        channel.destroy();
        this.links = this.links.filter(
          registeredChannel => registeredChannel !== channel
        );
        throw error;
      };
    };

    const promises = this.links.map(channel => {
      const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve(null), 1000);
        try {
          channel.call(method, ...args, (err, result) => {
            clearTimeout(timeout);
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        } catch (error) {
          reject(error);
        }
      });

      // Don't assign here. The disconnect is handled asynchronously.
      return promise.catch(_makeDestroyFn(channel));
    });

    let resultPromise = Promise.all(promises);

    if (cb) {
      resultPromise = resultPromise
        .then(results => cb(null, results))
        .catch(error => cb(error));
    }

    return resultPromise;
  }

  /**
   * Register a listener to be invoked when any connected channel sends a
   * message to this `Bridge`.
   *
   * @param {string} method
   * @param {(...args: any[]) => void} listener -- Final argument is an optional
   *   callback of the type: `(error: string|Error|null, ...result: any[]) => void`.
   *   This callback must be invoked in order to respond (via `postMessage`)
   *   to the other frame/s with a result or an error.
   * @throws {Error} If trying to register a callback after a channel has already been created
   * @throws {Error} If trying to register a callback with the same name multiple times
   */
  on(method, listener) {
    if (this.links.length > 0) {
      throw new Error(
        `Listener '${method}' can't be registered because a channel has already been created`
      );
    }
    if (this.channelListeners[method]) {
      throw new Error(`Listener '${method}' already bound in Bridge`);
    }
    this.channelListeners[method] = listener;
    return this;
  }

  /**
   * Add a listener to be called upon a new connection.
   *
   * @param {(channel: PortRPC) => void} listener
   */
  onConnect(listener) {
    this.onConnectListeners.push(listener);
    return this;
  }
}
