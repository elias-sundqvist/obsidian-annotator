import { options } from 'preact';

/**
 * Setup workarounds for setting certain HTML element properties or attributes
 * in some browsers.
 *
 * @param {Object} _options - Test seam
 */
export function setupBrowserFixes(_options = options) {
  let needsDirAutoFix = false;

  try {
    const el = document.createElement('div');
    // The value "auto" causes an exception in IE 11 and Edge Legacy.
    el.dir = 'auto';
  } catch (err) {
    needsDirAutoFix = true;
  }

  if (needsDirAutoFix) {
    const prevHook = _options.vnode;
    _options.vnode = vnode => {
      if (typeof vnode.type === 'string') {
        if ('dir' in vnode.props && vnode.props.dir === 'auto') {
          // Re-assign `vnode.props.dir` if its value is "auto"
          vnode.props.dir = '';
        }
      }
      // Call previously defined hook if there was any
      if (prevHook) {
        prevHook(vnode);
      }
    };
  }
}
