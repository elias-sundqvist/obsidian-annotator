/**
 * Fallback in-memory store if `localStorage` is not read/writable.
 */
class InMemoryStorage {
  constructor() {
    this._store = {};
  }

  getItem(key) {
    return key in this._store ? this._store[key] : null;
  }

  setItem(key, value) {
    this._store[key] = value;
  }

  removeItem(key) {
    delete this._store[key];
  }
}

/**
 * A wrapper around the `localStorage` API which provides a fallback to
 * in-memory storage in browsers that block access to `window.localStorage`.
 * in third-party iframes.
 *
 * This service also provides convenience methods set and fetch JSON-serializable
 * values.
 */
// @inject
export class LocalStorageService {
  /**
   * @param {Window} $window
   */
  constructor($window) {
    let testKey = 'hypothesis.testKey';

    try {
      // Test whether we can read/write localStorage.
      this._storage = $window.localStorage;
      $window.localStorage.setItem(testKey, testKey);
      $window.localStorage.getItem(testKey);
      $window.localStorage.removeItem(testKey);
    } catch (e) {
      this._storage = new InMemoryStorage();
    }
  }

  /**
   * Look up a value in local storage.
   *
   * @param {string} key
   * @return {string|null}
   */
  getItem(key) {
    return this._storage.getItem(key);
  }

  /**
   * Look up and deserialize a value from storage.
   *
   * @param {string} key
   */
  getObject(key) {
    const item = this._storage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  /**
   * Set a value in local storage.
   *
   * @param {string} key
   * @param {string} value
   */
  setItem(key, value) {
    this._storage.setItem(key, value);
  }

  /**
   * Serialize `value` to JSON and persist it.
   *
   * @param {string} key
   * @param {any} value
   */
  setObject(key, value) {
    const repr = JSON.stringify(value);
    this._storage.setItem(key, repr);
  }

  /**
   * Remove an item from storage.
   *
   * @param {string} key
   */
  removeItem(key) {
    this._storage.removeItem(key);
  }
}
