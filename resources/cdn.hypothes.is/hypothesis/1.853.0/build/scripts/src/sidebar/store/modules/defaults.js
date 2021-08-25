import * as util from '../util';

import { createStoreModule } from '../create-store';

/**
 * A store module for managing client-side user-convenience defaults.
 *
 * Example: the default privacy level for newly-created annotations
 * (`private` or `shared`). This default is updated when a user selects a
 * different publishing destination (e.g. `Post to [group name]` versus
 * `Post to Only Me`) from the menu rendered by the `AnnotationPublishControl`
 * component.
 *
 * At present, these defaults are persisted between app sessions in `localStorage`,
 * and their retrieval and re-persistence on change is handled in the
 * `persistedDefaults` service.
 */

const initialState = {
  annotationPrivacy: /** @type {'private'|'shared'|null} */ (null),
  focusedGroup: /** @type {string|null} */ (null),
};

const reducers = {
  SET_DEFAULT: function (state, action) {
    return { [action.defaultKey]: action.value };
  },
};

const actions = util.actionTypes(reducers);

function setDefault(defaultKey, value) {
  return { type: actions.SET_DEFAULT, defaultKey, value };
}

/** Selectors */

/**
 * Retrieve the state's current value for `defaultKey`.
 *
 * @return {string|null} - The current value for `defaultKey` or `undefined` if it is not
 *               present
 */
function getDefault(state, defaultKey) {
  return state[defaultKey];
}

function getDefaults(state) {
  return state;
}

export default createStoreModule(initialState, {
  namespace: 'defaults',
  reducers,
  actionCreators: {
    setDefault,
  },
  selectors: {
    getDefault,
    getDefaults,
  },
});
