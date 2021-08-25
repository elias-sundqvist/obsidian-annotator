import bridgeEvents from '../../shared/bridge-events';
import { watch } from '../util/watch';

/**
 * Service that provides operations related to feature flags.
 *
 * Feature flags information is part of the user's profile and in the sidebar
 * is accessed via the store. This service synchronizes the state of feature
 * flags to the `annotator` side of the application.
 *
 * Note that the state of feature flags can change whenever the active profile
 * information changes.
 *
 * @inject
 */
export class FeaturesService {
  /**
   * @param {import('../../shared/bridge').Bridge} bridge
   * @param {import('../store').SidebarStore} store
   */
  constructor(bridge, store) {
    this._bridge = bridge;
    this._store = store;
  }

  init() {
    const currentFlags = () => this._store.profile().features;
    const sendFeatureFlags = () => {
      this._bridge.call(
        bridgeEvents.FEATURE_FLAGS_UPDATED,
        currentFlags() || {}
      );
    };

    // Re-send feature flags to connected frames when flags change or a new
    // frame connects.
    watch(
      this._store.subscribe,
      [currentFlags, () => this._store.frames()],
      sendFeatureFlags
    );
  }
}
