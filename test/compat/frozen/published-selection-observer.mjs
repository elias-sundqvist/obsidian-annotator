// .generated/published-client/src/shared/listener-collection.ts
var ListenerCollection = class {
  constructor() {
    this._listeners = /* @__PURE__ */ new Map();
  }
  /**
   * Add a listener and return an ID that can be used to remove it later
   */
  add(eventTarget, eventType, listener, options) {
    eventTarget.addEventListener(eventType, listener, options);
    const symbol = Symbol();
    this._listeners.set(symbol, {
      eventTarget,
      eventType,
      // eslint-disable-next-line object-shorthand
      listener
    });
    return symbol;
  }
  /**
   * Remove a specific listener.
   */
  remove(listenerId) {
    const event = this._listeners.get(listenerId);
    if (event) {
      const { eventTarget, eventType, listener } = event;
      eventTarget.removeEventListener(eventType, listener);
      this._listeners.delete(listenerId);
    }
  }
  removeAll() {
    this._listeners.forEach(({ eventTarget, eventType, listener }) => {
      eventTarget.removeEventListener(eventType, listener);
    });
    this._listeners.clear();
  }
};

// .generated/published-client/src/annotator/selection-observer.js
function selectedRange(document2) {
  const selection = document2.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    return null;
  }
  return range;
}
var SelectionObserver = class {
  /**
   * Start observing changes to the current selection in the document.
   *
   * @param {(range: Range|null) => void} callback -
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
    const eventHandler = (event) => {
      if (event.type === "mousedown") {
        isMouseDown = true;
      }
      if (event.type === "mouseup") {
        isMouseDown = false;
      }
      if (isMouseDown) {
        return;
      }
      this._cancelPendingCallback();
      const delay = event.type === "mouseup" ? 10 : 100;
      scheduleCallback(delay);
    };
    this._document = document_;
    this._listeners = new ListenerCollection();
    this._listeners.add(document_, "selectionchange", eventHandler);
    this._listeners.add(document_.body, "mousedown", eventHandler);
    this._listeners.add(document_.body, "mouseup", eventHandler);
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
};
export {
  SelectionObserver,
  selectedRange
};
