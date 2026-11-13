var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../submodules/hypothesis-client-annotator-fork/node_modules/lodash.debounce/index.js
var require_lodash = __commonJS({
  "../../submodules/hypothesis-client-annotator-fork/node_modules/lodash.debounce/index.js"(exports, module) {
    var FUNC_ERROR_TEXT = "Expected a function";
    var NAN = 0 / 0;
    var symbolTag = "[object Symbol]";
    var reTrim = /^\s+|\s+$/g;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var freeParseInt = parseInt;
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    var nativeMax = Math.max;
    var nativeMin = Math.min;
    var now = function() {
      return root.Date.now();
    };
    function debounce2(func, wait, options) {
      var lastArgs, lastThis, maxWait, result, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
      if (typeof func != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      wait = toNumber(wait) || 0;
      if (isObject(options)) {
        leading = !!options.leading;
        maxing = "maxWait" in options;
        maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
        trailing = "trailing" in options ? !!options.trailing : trailing;
      }
      function invokeFunc(time) {
        var args = lastArgs, thisArg = lastThis;
        lastArgs = lastThis = void 0;
        lastInvokeTime = time;
        result = func.apply(thisArg, args);
        return result;
      }
      function leadingEdge(time) {
        lastInvokeTime = time;
        timerId = setTimeout(timerExpired, wait);
        return leading ? invokeFunc(time) : result;
      }
      function remainingWait(time) {
        var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, result2 = wait - timeSinceLastCall;
        return maxing ? nativeMin(result2, maxWait - timeSinceLastInvoke) : result2;
      }
      function shouldInvoke(time) {
        var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
        return lastCallTime === void 0 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
      }
      function timerExpired() {
        var time = now();
        if (shouldInvoke(time)) {
          return trailingEdge(time);
        }
        timerId = setTimeout(timerExpired, remainingWait(time));
      }
      function trailingEdge(time) {
        timerId = void 0;
        if (trailing && lastArgs) {
          return invokeFunc(time);
        }
        lastArgs = lastThis = void 0;
        return result;
      }
      function cancel() {
        if (timerId !== void 0) {
          clearTimeout(timerId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timerId = void 0;
      }
      function flush() {
        return timerId === void 0 ? result : trailingEdge(now());
      }
      function debounced() {
        var time = now(), isInvoking = shouldInvoke(time);
        lastArgs = arguments;
        lastThis = this;
        lastCallTime = time;
        if (isInvoking) {
          if (timerId === void 0) {
            return leadingEdge(lastCallTime);
          }
          if (maxing) {
            timerId = setTimeout(timerExpired, wait);
            return invokeFunc(lastCallTime);
          }
        }
        if (timerId === void 0) {
          timerId = setTimeout(timerExpired, wait);
        }
        return result;
      }
      debounced.cancel = cancel;
      debounced.flush = flush;
      return debounced;
    }
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    function toNumber(value) {
      if (typeof value == "number") {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject(value)) {
        var other = typeof value.valueOf == "function" ? value.valueOf() : value;
        value = isObject(other) ? other + "" : other;
      }
      if (typeof value != "string") {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, "");
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    module.exports = debounce2;
  }
});

// ../../submodules/hypothesis-client-annotator-fork/node_modules/shallowequal/index.js
var require_shallowequal = __commonJS({
  "../../submodules/hypothesis-client-annotator-fork/node_modules/shallowequal/index.js"(exports, module) {
    module.exports = function shallowEqual2(objA, objB, compare, compareContext) {
      var ret = compare ? compare.call(compareContext, objA, objB) : void 0;
      if (ret !== void 0) {
        return !!ret;
      }
      if (objA === objB) {
        return true;
      }
      if (typeof objA !== "object" || !objA || typeof objB !== "object" || !objB) {
        return false;
      }
      var keysA = Object.keys(objA);
      var keysB = Object.keys(objB);
      if (keysA.length !== keysB.length) {
        return false;
      }
      var bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);
      for (var idx = 0; idx < keysA.length; idx++) {
        var key = keysA[idx];
        if (!bHasOwnProperty(key)) {
          return false;
        }
        var valueA = objA[key];
        var valueB = objB[key];
        ret = compare ? compare.call(compareContext, valueA, valueB, key) : void 0;
        if (ret === false || ret === void 0 && valueA !== valueB) {
          return false;
        }
      }
      return true;
    };
  }
});

// ../../submodules/hypothesis-client-annotator-fork/node_modules/tiny-emitter/index.js
var require_tiny_emitter = __commonJS({
  "../../submodules/hypothesis-client-annotator-fork/node_modules/tiny-emitter/index.js"(exports, module) {
    function E() {
    }
    E.prototype = {
      on: function(name, callback, ctx) {
        var e = this.e || (this.e = {});
        (e[name] || (e[name] = [])).push({
          fn: callback,
          ctx
        });
        return this;
      },
      once: function(name, callback, ctx) {
        var self2 = this;
        function listener() {
          self2.off(name, listener);
          callback.apply(ctx, arguments);
        }
        ;
        listener._ = callback;
        return this.on(name, listener, ctx);
      },
      emit: function(name) {
        var data = [].slice.call(arguments, 1);
        var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
        var i = 0;
        var len = evtArr.length;
        for (i; i < len; i++) {
          evtArr[i].fn.apply(evtArr[i].ctx, data);
        }
        return this;
      },
      off: function(name, callback) {
        var e = this.e || (this.e = {});
        var evts = e[name];
        var liveEvents = [];
        if (evts && callback) {
          for (var i = 0, len = evts.length; i < len; i++) {
            if (evts[i].fn !== callback && evts[i].fn._ !== callback)
              liveEvents.push(evts[i]);
          }
        }
        liveEvents.length ? e[name] = liveEvents : delete e[name];
        return this;
      }
    };
    module.exports = E;
    module.exports.TinyEmitter = E;
  }
});

// .generated/published-client/src/sidebar/services/frame-sync.js
var import_lodash = __toESM(require_lodash(), 1);
var import_shallowequal = __toESM(require_shallowequal(), 1);

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

// .generated/published-client/src/shared/random.js
function byteToHex(val) {
  const str = val.toString(16);
  return str.length === 1 ? "0" + str : str;
}
function generateHexString(len) {
  const bytes = new Uint8Array(len / 2);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes).map(byteToHex).join("");
}

// .generated/published-client/src/shared/messaging/port-util.js
function isMessage(data) {
  if (data === null || typeof data !== "object") {
    return false;
  }
  for (let property of ["frame1", "frame2", "type", "requestId"]) {
    if (typeof data[property] !== "string") {
      return false;
    }
  }
  return true;
}
function isMessageEqual(data, message) {
  if (!isMessage(data)) {
    return false;
  }
  return JSON.stringify(data, Object.keys(message).sort()) === JSON.stringify(message, Object.keys(message).sort());
}

// .generated/published-client/src/shared/messaging/port-finder.js
var MAX_WAIT_FOR_PORT = 1e3 * 20;
var POLLING_INTERVAL_FOR_PORT = 250;
var PortFinder = class {
  /**
   * @param {object} options
   *   @param {Exclude<Frame, 'host'>} options.source - the role of this frame
   *   @param {Window} options.hostFrame - the frame where the `PortProvider` is
   *     listening for messages.
   */
  constructor({ hostFrame, source }) {
    this._hostFrame = hostFrame;
    this._source = source;
    this._listeners = new ListenerCollection();
  }
  destroy() {
    this._listeners.removeAll();
  }
  /**
   * Request a specific port from the host frame
   *
   * @param {Frame} target - the frame aiming to be discovered
   * @return {Promise<MessagePort>}
   */
  async discover(target) {
    let isValidRequest = false;
    if (this._source === "guest" && target === "host" || this._source === "guest" && target === "sidebar" || this._source === "sidebar" && target === "host" || this._source === "notebook" && target === "sidebar") {
      isValidRequest = true;
    }
    if (!isValidRequest) {
      throw new Error("Invalid request of channel/port");
    }
    const requestId = generateHexString(6);
    return new Promise((resolve, reject) => {
      const postRequest = () => {
        this._hostFrame.postMessage(
          {
            frame1: this._source,
            frame2: target,
            type: "request",
            requestId
          },
          "*"
        );
      };
      const intervalId = setInterval(postRequest, POLLING_INTERVAL_FOR_PORT);
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        reject(
          new Error(
            `Unable to establish ${this._source}-${target} communication channel`
          )
        );
      }, MAX_WAIT_FOR_PORT);
      const listenerId = this._listeners.add(window, "message", (event) => {
        const { data, ports } = event;
        if (isMessageEqual(data, {
          frame1: this._source,
          frame2: target,
          type: "offer",
          requestId
        })) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          this._listeners.remove(listenerId);
          resolve(ports[0]);
        }
      });
      postRequest();
    });
  }
};

// .generated/published-client/src/shared/messaging/port-provider.js
var import_tiny_emitter = __toESM(require_tiny_emitter(), 1);

// .generated/published-client/src/shared/messaging/port-rpc.js
var VERSION = "1.0.0";
var PROTOCOL = "frame-rpc";
function sendCall(port, method, args = [], sequence = -1) {
  port.postMessage(
    /** @type {RequestMessage} */
    {
      protocol: PROTOCOL,
      version: VERSION,
      arguments: args,
      method,
      sequence
    }
  );
}
function shouldUseSafariWorkaround(userAgent) {
  const webkitVersionMatch = userAgent.match(/\bAppleWebKit\/([0-9]+)\b/);
  if (!webkitVersionMatch) {
    return false;
  }
  const version = parseInt(webkitVersionMatch[1]);
  if (version <= 537) {
    return false;
  }
  return true;
}
function isCallback(value) {
  return typeof value === "function";
}
var PortRPC = class {
  /**
   * @param {object} options
   *   @param {string} [options.userAgent] - Test seam
   *   @param {Window} [options.currentWindow] - Test seam
   */
  constructor({
    userAgent = navigator.userAgent,
    currentWindow = window
  } = {}) {
    this._port = null;
    this._methods = /* @__PURE__ */ new Map();
    this._sequence = 1;
    this._callbacks = /* @__PURE__ */ new Map();
    this._listeners = new ListenerCollection();
    this._listeners.add(currentWindow, "unload", () => {
      if (this._port) {
        sendCall(this._port, "close");
        if (currentWindow !== currentWindow.parent && shouldUseSafariWorkaround(userAgent)) {
          currentWindow.parent.postMessage(
            { type: "hypothesisPortClosed" },
            "*",
            [this._port]
          );
        }
      }
    });
    this._pendingCalls = [];
    this._receivedCloseEvent = false;
  }
  /**
   * Register a method handler for incoming RPC requests.
   *
   * This can also be used to register a handler for the built-in "connect"
   * and "close" events.
   *
   * All handlers must be registered before {@link connect} is invoked.
   *
   * @template {function} Handler
   * @param {OnMethod|'close'|'connect'} method
   * @param {Handler} handler
   */
  on(method, handler) {
    if (this._port) {
      throw new Error("Cannot add a method handler after a port is connected");
    }
    this._methods.set(
      method,
      /** @type {any} */
      handler
    );
  }
  /**
   * Connect to a MessagePort and process any queued RPC requests.
   *
   * @param {MessagePort} port
   */
  connect(port) {
    this._port = port;
    this._listeners.add(port, "message", (event) => this._handle(event));
    port.start();
    sendCall(port, "connect");
    for (let [method, args] of this._pendingCalls) {
      this.call(method, ...args);
    }
    this._pendingCalls = [];
  }
  /**
   * Disconnect the RPC channel and close the MessagePort.
   */
  destroy() {
    if (this._port) {
      sendCall(this._port, "close");
      this._port.close();
    }
    this._destroyed = true;
    this._listeners.removeAll();
  }
  /**
   * Send an RPC request via the connected port.
   *
   * If this client is not yet connected to a port, the call will be queued and
   * sent when {@link connect} is called.
   *
   * If the final argument in `args` is a function, it is treated as a callback
   * which is invoked with the response in the form of (error, result) arguments.
   *
   * @param {CallMethod} method
   * @param {unknown[]} args
   */
  call(method, ...args) {
    if (!this._port) {
      this._pendingCalls.push([method, args]);
    }
    if (!this._port || this._destroyed) {
      return;
    }
    const seq = this._sequence++;
    const finalArg = args[args.length - 1];
    if (isCallback(finalArg)) {
      this._callbacks.set(seq, finalArg);
      args = args.slice(0, -1);
    }
    sendCall(this._port, method, args, seq);
  }
  /**
   * Validate message
   *
   * @param {MessageEvent} event
   * @return {null|Message}
   */
  _parseMessage({ data }) {
    if (!data || typeof data !== "object") {
      return null;
    }
    if (data.protocol !== PROTOCOL) {
      return null;
    }
    if (data.version !== VERSION) {
      return null;
    }
    if (!Array.isArray(data.arguments)) {
      return null;
    }
    return data;
  }
  /**
   * @param {MessageEvent} event
   */
  _handle(event) {
    const msg = this._parseMessage(event);
    const port = this._port;
    if (!msg || !port) {
      return;
    }
    if ("method" in msg) {
      if (msg.method === "close") {
        if (this._receivedCloseEvent) {
          return;
        } else {
          this._receivedCloseEvent = true;
        }
      }
      const handler = this._methods.get(msg.method);
      if (!handler) {
        return;
      }
      const callback = (...args) => {
        const message = {
          arguments: args,
          protocol: PROTOCOL,
          response: msg.sequence,
          version: VERSION
        };
        port.postMessage(message);
      };
      handler(...msg.arguments, callback);
    } else if ("response" in msg) {
      const cb = this._callbacks.get(msg.response);
      this._callbacks.delete(msg.response);
      if (cb) {
        cb(...msg.arguments);
      }
    }
  }
};

// .generated/published-client/src/sidebar/helpers/annotation-metadata.js
function isReply(annotation) {
  return (annotation.references || []).length > 0;
}
function isPublic(annotation) {
  let isPublic2 = false;
  if (!annotation.permissions) {
    return isPublic2;
  }
  annotation.permissions.read.forEach((perm) => {
    const readPermArr = perm.split(":");
    if (readPermArr.length === 2 && readPermArr[0] === "group") {
      isPublic2 = true;
    }
  });
  return isPublic2;
}

// .generated/published-client/src/sidebar/util/watch.js
function watch(subscribe, getValue, callback, compare) {
  let prevValue = getValue();
  const unsubscribe = subscribe(() => {
    const currentValue = getValue();
    if (compare ? compare(currentValue, prevValue) : currentValue === prevValue) {
      return;
    }
    const savedPrevValue = prevValue;
    prevValue = currentValue;
    callback(currentValue, savedPrevValue);
  });
  return unsubscribe;
}

// .generated/published-client/src/sidebar/services/frame-sync.js
function formatAnnot({ $tag, target, uri }) {
  return {
    $tag,
    target,
    uri
  };
}
function frameForAnnotation(frames, ann) {
  const uriMatch = frames.find((f) => f.uri === ann.uri);
  if (uriMatch) {
    return uriMatch;
  }
  const mainFrame = frames.find((f) => f.id === null);
  if (mainFrame) {
    return mainFrame;
  }
  return frames[0];
}
var FrameSyncService = class {
  /**
   * @param {Window} $window - Test seam
   * @param {import('./annotations').AnnotationsService} annotationsService
   * @param {import('../store').SidebarStore} store
   */
  constructor($window, annotationsService, store) {
    this._window = $window;
    this._annotationsService = annotationsService;
    this._store = store;
    this._portFinder = new PortFinder({
      hostFrame: this._window.parent,
      source: "sidebar"
    });
    this._listeners = new ListenerCollection();
    this._hostRPC = new PortRPC();
    this._guestRPC = /* @__PURE__ */ new Map();
    this._nextGuestId = 0;
    this._inFrame = /* @__PURE__ */ new Set();
    this._highlightsVisible = false;
    this._setupSyncToGuests();
    this._setupHostEvents();
    this._setupFeatureFlagSync();
  }
  /**
   * Watch for changes to the set of annotations loaded in the sidebar and
   * notify connected guests about new/updated/deleted annotations.
   */
  _setupSyncToGuests() {
    let prevPublicAnns = 0;
    const onStoreAnnotationsChanged = (annotations, frames, prevAnnotations) => {
      let publicAnns = 0;
      const inSidebar = /* @__PURE__ */ new Set();
      const added = [];
      annotations.forEach((annot) => {
        if (isReply(annot)) {
          return;
        }
        if (isPublic(annot)) {
          ++publicAnns;
        }
        inSidebar.add(annot.$tag);
        if (!this._inFrame.has(annot.$tag)) {
          added.push(annot);
        }
      });
      const deleted = prevAnnotations.filter(
        (annot) => !inSidebar.has(annot.$tag)
      );
      if (added.length > 0) {
        const addedByFrame = /* @__PURE__ */ new Map();
        for (let annotation of added) {
          const frame = frameForAnnotation(frames, annotation);
          if (!frame) {
            continue;
          }
          const anns = addedByFrame.get(frame.id) ?? [];
          anns.push(annotation);
          addedByFrame.set(frame.id, anns);
        }
        for (let [frameId, anns] of addedByFrame) {
          const rpc = this._guestRPC.get(frameId);
          if (rpc) {
            rpc.call("loadAnnotations", anns.map(formatAnnot));
          }
        }
        added.forEach((annot) => {
          this._inFrame.add(annot.$tag);
        });
      }
      deleted.forEach((annot) => {
        this._guestRPC.forEach((rpc) => rpc.call("deleteAnnotation", annot.$tag));
        this._inFrame.delete(annot.$tag);
      });
      if (frames.length > 0) {
        if (frames.every((frame) => frame.isAnnotationFetchComplete)) {
          if (publicAnns === 0 || publicAnns !== prevPublicAnns) {
            this._hostRPC.call("publicAnnotationCountChanged", publicAnns);
            prevPublicAnns = publicAnns;
          }
        }
      }
    };
    watch(
      this._store.subscribe,
      () => (
        /** @type {const} */
        [
          this._store.allAnnotations(),
          this._store.frames()
        ]
      ),
      ([annotations, frames], [prevAnnotations]) => onStoreAnnotationsChanged(annotations, frames, prevAnnotations),
      import_shallowequal.default
    );
    watch(
      this._store.subscribe,
      () => this._store.getContentInfo(),
      (contentInfo) => {
        this._guestRPC.forEach((guest) => {
          guest.call("showContentInfo", contentInfo);
        });
      }
    );
  }
  /**
   * Set up a connection to a new guest frame.
   *
   * @param {MessagePort} port - Port for communicating with the guest
   */
  _connectGuest(port) {
    const guestRPC = new PortRPC();
    ++this._nextGuestId;
    let frameIdentifier = (
      /** @type {string|null} */
      `temp-${this._nextGuestId}`
    );
    this._guestRPC.set(frameIdentifier, guestRPC);
    guestRPC.on(
      "documentInfoChanged",
      /** @param {DocumentInfo} info */
      (info) => {
        this._guestRPC.delete(frameIdentifier);
        frameIdentifier = info.frameIdentifier;
        this._guestRPC.set(frameIdentifier, guestRPC);
        this._store.connectFrame({
          id: info.frameIdentifier,
          metadata: info.metadata,
          uri: info.uri
        });
      }
    );
    guestRPC.on("close", () => {
      const frame = this._store.frames().find((f) => f.id === frameIdentifier);
      if (frame) {
        this._store.destroyFrame(frame);
      }
      guestRPC.destroy();
      this._guestRPC.delete(frameIdentifier);
    });
    guestRPC.on(
      "createAnnotation",
      /** @param {AnnotationData} annot */
      (annot) => {
        if (!this._store.isLoggedIn()) {
          this._hostRPC.call("openSidebar");
          this._store.openSidebarPanel("loginPrompt");
          this._guestRPC.forEach(
            (rpc) => rpc.call("deleteAnnotation", annot.$tag)
          );
          return;
        }
        this._inFrame.add(annot.$tag);
        if (!annot.$highlight) {
          this._hostRPC.call("openSidebar");
        }
        this._hostRPC.call("showHighlights");
        this._annotationsService.create(annot);
      }
    );
    let anchoringStatusUpdates = {};
    const scheduleAnchoringStatusUpdate = (0, import_lodash.default)(() => {
      this._store.updateAnchorStatus(anchoringStatusUpdates);
      anchoringStatusUpdates = {};
    }, 10);
    guestRPC.on(
      "syncAnchoringStatus",
      /** @param {AnnotationData} annotation */
      ({ $tag, $orphan }) => {
        this._inFrame.add($tag);
        anchoringStatusUpdates[$tag] = $orphan ? "orphan" : "anchored";
        scheduleAnchoringStatusUpdate();
      }
    );
    guestRPC.on(
      "showAnnotations",
      /** @param {string[]} tags */
      (tags) => {
        this._store.selectAnnotations(this._store.findIDsForTags(tags));
        this._store.selectTab("annotation");
      }
    );
    guestRPC.on(
      "focusAnnotations",
      /** @param {string[]} tags */
      (tags) => {
        this._store.focusAnnotations(tags || []);
      }
    );
    guestRPC.on(
      "toggleAnnotationSelection",
      /** @param {string[]} tags */
      (tags) => {
        this._store.toggleSelectedAnnotations(this._store.findIDsForTags(tags));
      }
    );
    guestRPC.on("openSidebar", () => {
      this._hostRPC.call("openSidebar");
    });
    guestRPC.on("closeSidebar", () => {
      this._hostRPC.call("closeSidebar");
    });
    guestRPC.connect(port);
    guestRPC.call("setHighlightsVisible", this._highlightsVisible);
    guestRPC.call("featureFlagsUpdated", this._store.profile().features);
    const contentInfo = this._store.getContentInfo();
    if (contentInfo) {
      guestRPC.call("showContentInfo", contentInfo);
    }
  }
  /**
   * Listen for messages coming from the host frame.
   */
  _setupHostEvents() {
    this._hostRPC.on("sidebarOpened", () => {
      this._store.setSidebarOpened(true);
    });
    this._hostRPC.on(
      "setHighlightsVisible",
      /** @param {boolean} visible */
      (visible) => {
        this._highlightsVisible = visible;
        this._guestRPC.forEach(
          (rpc) => rpc.call("setHighlightsVisible", visible)
        );
      }
    );
  }
  /**
   * Set up synchronization of feature flags to host and guest frames.
   */
  _setupFeatureFlagSync() {
    const getFlags = () => this._store.profile().features;
    const sendFlags = (flags) => {
      this._hostRPC.call("featureFlagsUpdated", flags);
      for (let guest of this._guestRPC.values()) {
        guest.call("featureFlagsUpdated", flags);
      }
    };
    sendFlags(getFlags());
    watch(this._store.subscribe, getFlags, sendFlags);
  }
  /**
   * Connect to the host frame and guest frame(s) in the current browser tab.
   */
  async connect() {
    const hostPort = await this._portFinder.discover("host");
    this._hostRPC.connect(hostPort);
    this._listeners.add(hostPort, "message", (event) => {
      const { data, ports } = event;
      if (isMessageEqual(data, {
        frame1: "guest",
        frame2: "sidebar",
        type: "offer"
      })) {
        this._connectGuest(ports[0]);
      }
    });
  }
  /**
   * Send an RPC message to the host frame.
   *
   * @param {SidebarToHostEvent} method
   * @param {unknown[]} args
   */
  notifyHost(method, ...args) {
    this._hostRPC.call(method, ...args);
  }
  /**
   * Focus annotations with the given $tags.
   *
   * This is used to indicate the highlight in the document that corresponds to
   * a given annotation in the sidebar.
   *
   * @param {string[]} tags - annotation $tags
   */
  focusAnnotations(tags) {
    this._store.focusAnnotations(tags);
    this._guestRPC.forEach((rpc) => rpc.call("focusAnnotations", tags));
  }
  /**
   * Scroll the frame to the highlight for an annotation with a given tag.
   *
   * @param {string} tag
   */
  scrollToAnnotation(tag) {
    this._guestRPC.forEach((rpc) => rpc.call("scrollToAnnotation", tag));
  }
  // Only used to cleanup tests
  destroy() {
    this._portFinder.destroy();
    this._listeners.removeAll();
  }
};
export {
  FrameSyncService,
  formatAnnot,
  frameForAnnotation
};
