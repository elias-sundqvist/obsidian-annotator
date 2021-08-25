import events from '../shared/bridge-events';
import warnOnce from '../shared/warn-once';

let _features = {};

const _set = features => {
  _features = features || {};
};

export default {
  init: function (crossframe) {
    crossframe.on(events.FEATURE_FLAGS_UPDATED, _set);
  },

  reset: function () {
    _set({});
  },

  flagEnabled: function (flag) {
    if (!(flag in _features)) {
      warnOnce('looked up unknown feature', flag);
      return false;
    }
    return _features[flag];
  },
};
