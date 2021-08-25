import { watch } from '../util/watch';

const DEFAULT_KEYS = {
  annotationPrivacy: 'hypothesis.privacy',
  focusedGroup: 'hypothesis.groups.focus',
};

/**
 * A service for reading and persisting convenient client-side defaults for
 * the (browser) user.
 *
 * @inject
 */
export class PersistedDefaultsService {
  /**
   * @param {import('./local-storage').LocalStorageService} localStorage
   * @param {import('../store').SidebarStore} store
   */
  constructor(localStorage, store) {
    this._storage = localStorage;
    this._store = store;
  }

  /**
   * Initially populate the store with any available persisted defaults,
   * then subscribe to the store in order to persist any changes to
   * those defaults.
   */
  init() {
    /**
     * Store subscribe callback for persisting changes to defaults. It will only
     * persist defaults that it "knows about" via `DEFAULT_KEYS`.
     */
    const persistChangedDefaults = (defaults, prevDefaults) => {
      for (let defaultKey in defaults) {
        if (
          prevDefaults[defaultKey] !== defaults[defaultKey] &&
          defaultKey in DEFAULT_KEYS
        ) {
          this._storage.setItem(DEFAULT_KEYS[defaultKey], defaults[defaultKey]);
        }
      }
    };

    // Read persisted defaults into the store
    Object.keys(DEFAULT_KEYS).forEach(defaultKey => {
      // `localStorage.getItem` will return `null` for a non-existent key
      const defaultValue = this._storage.getItem(DEFAULT_KEYS[defaultKey]);
      this._store.setDefault(defaultKey, defaultValue);
    });

    // Listen for changes to those defaults from the store and persist them
    watch(
      this._store.subscribe,
      () => this._store.getDefaults(),
      persistChangedDefaults
    );
  }
}
