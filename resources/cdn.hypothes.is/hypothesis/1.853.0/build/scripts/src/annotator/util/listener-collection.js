/**
 * @typedef Listener
 * @prop {EventTarget} eventTarget
 * @prop {string} eventType
 * @prop {(event: Event) => void} listener
 */

/**
 * Utility that provides a way to conveniently remove a set of DOM event
 * listeners when they are no longer needed.
 */
export class ListenerCollection {
  constructor() {
    /** @type {Listener[]} */
    this._listeners = [];
  }

  /**
   * @param {Listener['eventTarget']} eventTarget
   * @param {Listener['eventType']} eventType
   * @param {Listener['listener']} listener
   * @param {AddEventListenerOptions} [options]
   */
  add(eventTarget, eventType, listener, options) {
    eventTarget.addEventListener(eventType, listener, options);
    this._listeners.push({ eventTarget, eventType, listener });
  }

  removeAll() {
    this._listeners.forEach(({ eventTarget, eventType, listener }) => {
      eventTarget.removeEventListener(eventType, listener);
    });
    this._listeners = [];
  }
}
