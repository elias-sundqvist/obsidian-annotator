import { ListenerCollection } from './util/listener-collection';

/**
 * Return the current selection or `null` if there is no selection or it is empty.
 *
 * @param {Document} document
 * @return {Range|null}
 */
function selectedRange(document) {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    return null;
  }
  return range;
}

/**
 * An observer that watches for and buffers changes to the document's current selection.
 */
export class SelectionObserver {
  /**
   * Start observing changes to the current selection in the document.
   *
   * @param {(range: Range|null) => any} callback -
   *   Callback invoked with the selected region of the document when it has
   *   changed.
   * @param {Document} document_ - Test seam
   */
  constructor(callback, document_ = document) {
    let isMouseDown = false;

    this._pendingCallback = null;

    const scheduleCallback = (delay = 10) => {
      this._pendingCallback = setTimeout(() => {
        callback(selectedRange(document_));
      }, delay);
    };

    /** @param {Event} event */
    this._eventHandler = event => {
      if (event.type === 'mousedown') {
        isMouseDown = true;
      }
      if (event.type === 'mouseup') {
        isMouseDown = false;
      }

      // If the user makes a selection with the mouse, wait until they release
      // it before reporting a selection change.
      if (isMouseDown) {
        return;
      }

      this._cancelPendingCallback();

      // Schedule a notification after a short delay. The delay serves two
      // purposes:
      //
      // - If this handler was called as a result of a 'mouseup' event then the
      //   selection will not be updated until the next tick of the event loop.
      //   In this case we only need a short delay.
      //
      // - If the user is changing the selection with a non-mouse input (eg.
      //   keyboard or selection handles on mobile) this buffers updates and
      //   makes sure that we only report one when the update has stopped
      //   changing. In this case we want a longer delay.

      const delay = event.type === 'mouseup' ? 10 : 100;
      scheduleCallback(delay);
    };

    this._document = document_;
    this._listeners = new ListenerCollection();
    this._events = ['mousedown', 'mouseup', 'selectionchange'];
    for (let event of this._events) {
      this._listeners.add(document_, event, this._eventHandler);
    }

    // Report the initial selection.
    scheduleCallback(1);
  }

  disconnect() {
    this._listeners.removeAll();
    this._cancelPendingCallback();
  }

  _cancelPendingCallback() {
    if (this._pendingCallback) {
      clearTimeout(this._pendingCallback);
      this._pendingCallback = null;
    }
  }
}
