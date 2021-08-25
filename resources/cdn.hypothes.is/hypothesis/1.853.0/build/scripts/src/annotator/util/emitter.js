import { TinyEmitter } from 'tiny-emitter';

/** @typedef {import('../../types/annotator').Destroyable} Destroyable */

/**
 * Emitter is a communication class that implements the publisher/subscriber
 * pattern. It allows sending and listening events through a shared EventBus.
 * The different elements of the application can communicate with each other
 * without being tightly coupled.
 *
 * @implements Destroyable
 */
class Emitter {
  /**
   * @param {TinyEmitter} emitter
   */
  constructor(emitter) {
    this._emitter = emitter;

    /** @type {[event: string, callback: Function][]} */
    this._subscriptions = [];
  }

  /**
   * Fire an event.
   *
   * @param {string} event
   * @param {any[]} args
   */
  publish(event, ...args) {
    this._emitter.emit(event, ...args);
  }

  /**
   * Register an event listener.
   *
   * @param {string} event
   * @param {Function} callback
   */
  subscribe(event, callback) {
    this._emitter.on(event, callback);
    this._subscriptions.push([event, callback]);
  }

  /**
   * Remove an event listener.
   *
   * @param {string} event
   * @param {Function} callback
   */
  unsubscribe(event, callback) {
    this._emitter.off(event, callback);
    this._subscriptions = this._subscriptions.filter(
      ([subEvent, subCallback]) =>
        subEvent !== event || subCallback !== callback
    );
  }

  /**
   * Remove all event listeners.
   */
  destroy() {
    for (let [event, callback] of this._subscriptions) {
      this._emitter.off(event, callback);
    }
    this._subscriptions = [];
  }
}

export class EventBus {
  constructor() {
    this._emitter = new TinyEmitter();
  }

  createEmitter() {
    return new Emitter(this._emitter);
  }
}
