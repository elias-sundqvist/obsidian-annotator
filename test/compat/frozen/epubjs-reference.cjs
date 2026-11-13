var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// ../../node_modules/@xmldom/xmldom/lib/conventions.js
var require_conventions = __commonJS({
  "../../node_modules/@xmldom/xmldom/lib/conventions.js"(exports2) {
    "use strict";
    function find(list, predicate, ac) {
      if (ac === void 0) {
        ac = Array.prototype;
      }
      if (list && typeof ac.find === "function") {
        return ac.find.call(list, predicate);
      }
      for (var i = 0; i < list.length; i++) {
        if (Object.prototype.hasOwnProperty.call(list, i)) {
          var item = list[i];
          if (predicate.call(void 0, item, i, list)) {
            return item;
          }
        }
      }
    }
    function freeze(object, oc) {
      if (oc === void 0) {
        oc = Object;
      }
      return oc && typeof oc.freeze === "function" ? oc.freeze(object) : object;
    }
    var MIME_TYPE = freeze({
      /**
       * `text/html`, the only mime type that triggers treating an XML document as HTML.
       *
       * @see DOMParser.SupportedType.isHTML
       * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
       * @see https://en.wikipedia.org/wiki/HTML Wikipedia
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
       * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring WHATWG HTML Spec
       */
      HTML: "text/html",
      /**
       * Helper method to check a mime type if it indicates an HTML document
       *
       * @param {string} [value]
       * @returns {boolean}
       *
       * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
       * @see https://en.wikipedia.org/wiki/HTML Wikipedia
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
       * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring 	 */
      isHTML: function(value) {
        return value === MIME_TYPE.HTML;
      },
      /**
       * `application/xml`, the standard mime type for XML documents.
       *
       * @see https://www.iana.org/assignments/media-types/application/xml IANA MimeType registration
       * @see https://tools.ietf.org/html/rfc7303#section-9.1 RFC 7303
       * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
       */
      XML_APPLICATION: "application/xml",
      /**
       * `text/html`, an alias for `application/xml`.
       *
       * @see https://tools.ietf.org/html/rfc7303#section-9.2 RFC 7303
       * @see https://www.iana.org/assignments/media-types/text/xml IANA MimeType registration
       * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
       */
      XML_TEXT: "text/xml",
      /**
       * `application/xhtml+xml`, indicates an XML document that has the default HTML namespace,
       * but is parsed as an XML document.
       *
       * @see https://www.iana.org/assignments/media-types/application/xhtml+xml IANA MimeType registration
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument WHATWG DOM Spec
       * @see https://en.wikipedia.org/wiki/XHTML Wikipedia
       */
      XML_XHTML_APPLICATION: "application/xhtml+xml",
      /**
       * `image/svg+xml`,
       *
       * @see https://www.iana.org/assignments/media-types/image/svg+xml IANA MimeType registration
       * @see https://www.w3.org/TR/SVG11/ W3C SVG 1.1
       * @see https://en.wikipedia.org/wiki/Scalable_Vector_Graphics Wikipedia
       */
      XML_SVG_IMAGE: "image/svg+xml"
    });
    var NAMESPACE = freeze({
      /**
       * The XHTML namespace.
       *
       * @see http://www.w3.org/1999/xhtml
       */
      HTML: "http://www.w3.org/1999/xhtml",
      /**
       * Checks if `uri` equals `NAMESPACE.HTML`.
       *
       * @param {string} [uri]
       *
       * @see NAMESPACE.HTML
       */
      isHTML: function(uri) {
        return uri === NAMESPACE.HTML;
      },
      /**
       * The SVG namespace.
       *
       * @see http://www.w3.org/2000/svg
       */
      SVG: "http://www.w3.org/2000/svg",
      /**
       * The `xml:` namespace.
       *
       * @see http://www.w3.org/XML/1998/namespace
       */
      XML: "http://www.w3.org/XML/1998/namespace",
      /**
       * The `xmlns:` namespace
       *
       * @see https://www.w3.org/2000/xmlns/
       */
      XMLNS: "http://www.w3.org/2000/xmlns/"
    });
    exports2.find = find;
    exports2.freeze = freeze;
    exports2.MIME_TYPE = MIME_TYPE;
    exports2.NAMESPACE = NAMESPACE;
  }
});

// ../../node_modules/@xmldom/xmldom/lib/dom.js
var require_dom = __commonJS({
  "../../node_modules/@xmldom/xmldom/lib/dom.js"(exports2) {
    var conventions = require_conventions();
    var find = conventions.find;
    var NAMESPACE = conventions.NAMESPACE;
    function notEmptyString(input) {
      return input !== "";
    }
    function splitOnASCIIWhitespace(input) {
      return input ? input.split(/[\t\n\f\r ]+/).filter(notEmptyString) : [];
    }
    function orderedSetReducer(current, element) {
      if (!current.hasOwnProperty(element)) {
        current[element] = true;
      }
      return current;
    }
    function toOrderedSet(input) {
      if (!input) return [];
      var list = splitOnASCIIWhitespace(input);
      return Object.keys(list.reduce(orderedSetReducer, {}));
    }
    function arrayIncludes(list) {
      return function(element) {
        return list && list.indexOf(element) !== -1;
      };
    }
    function copy(src, dest) {
      for (var p in src) {
        if (Object.prototype.hasOwnProperty.call(src, p)) {
          dest[p] = src[p];
        }
      }
    }
    function _extends(Class, Super) {
      var pt = Class.prototype;
      if (!(pt instanceof Super)) {
        let t2 = function() {
        };
        var t = t2;
        ;
        t2.prototype = Super.prototype;
        t2 = new t2();
        copy(pt, t2);
        Class.prototype = pt = t2;
      }
      if (pt.constructor != Class) {
        if (typeof Class != "function") {
          console.error("unknown Class:" + Class);
        }
        pt.constructor = Class;
      }
    }
    var NodeType = {};
    var ELEMENT_NODE = NodeType.ELEMENT_NODE = 1;
    var ATTRIBUTE_NODE = NodeType.ATTRIBUTE_NODE = 2;
    var TEXT_NODE = NodeType.TEXT_NODE = 3;
    var CDATA_SECTION_NODE = NodeType.CDATA_SECTION_NODE = 4;
    var ENTITY_REFERENCE_NODE = NodeType.ENTITY_REFERENCE_NODE = 5;
    var ENTITY_NODE = NodeType.ENTITY_NODE = 6;
    var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
    var COMMENT_NODE = NodeType.COMMENT_NODE = 8;
    var DOCUMENT_NODE = NodeType.DOCUMENT_NODE = 9;
    var DOCUMENT_TYPE_NODE = NodeType.DOCUMENT_TYPE_NODE = 10;
    var DOCUMENT_FRAGMENT_NODE = NodeType.DOCUMENT_FRAGMENT_NODE = 11;
    var NOTATION_NODE = NodeType.NOTATION_NODE = 12;
    var ExceptionCode = {};
    var ExceptionMessage = {};
    var INDEX_SIZE_ERR = ExceptionCode.INDEX_SIZE_ERR = (ExceptionMessage[1] = "Index size error", 1);
    var DOMSTRING_SIZE_ERR = ExceptionCode.DOMSTRING_SIZE_ERR = (ExceptionMessage[2] = "DOMString size error", 2);
    var HIERARCHY_REQUEST_ERR = ExceptionCode.HIERARCHY_REQUEST_ERR = (ExceptionMessage[3] = "Hierarchy request error", 3);
    var WRONG_DOCUMENT_ERR = ExceptionCode.WRONG_DOCUMENT_ERR = (ExceptionMessage[4] = "Wrong document", 4);
    var INVALID_CHARACTER_ERR = ExceptionCode.INVALID_CHARACTER_ERR = (ExceptionMessage[5] = "Invalid character", 5);
    var NO_DATA_ALLOWED_ERR = ExceptionCode.NO_DATA_ALLOWED_ERR = (ExceptionMessage[6] = "No data allowed", 6);
    var NO_MODIFICATION_ALLOWED_ERR = ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = (ExceptionMessage[7] = "No modification allowed", 7);
    var NOT_FOUND_ERR = ExceptionCode.NOT_FOUND_ERR = (ExceptionMessage[8] = "Not found", 8);
    var NOT_SUPPORTED_ERR = ExceptionCode.NOT_SUPPORTED_ERR = (ExceptionMessage[9] = "Not supported", 9);
    var INUSE_ATTRIBUTE_ERR = ExceptionCode.INUSE_ATTRIBUTE_ERR = (ExceptionMessage[10] = "Attribute in use", 10);
    var INVALID_STATE_ERR = ExceptionCode.INVALID_STATE_ERR = (ExceptionMessage[11] = "Invalid state", 11);
    var SYNTAX_ERR = ExceptionCode.SYNTAX_ERR = (ExceptionMessage[12] = "Syntax error", 12);
    var INVALID_MODIFICATION_ERR = ExceptionCode.INVALID_MODIFICATION_ERR = (ExceptionMessage[13] = "Invalid modification", 13);
    var NAMESPACE_ERR = ExceptionCode.NAMESPACE_ERR = (ExceptionMessage[14] = "Invalid namespace", 14);
    var INVALID_ACCESS_ERR = ExceptionCode.INVALID_ACCESS_ERR = (ExceptionMessage[15] = "Invalid access", 15);
    function DOMException(code, message) {
      if (message instanceof Error) {
        var error = message;
      } else {
        error = this;
        Error.call(this, ExceptionMessage[code]);
        this.message = ExceptionMessage[code];
        if (Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
      }
      error.code = code;
      if (message) this.message = this.message + ": " + message;
      return error;
    }
    DOMException.prototype = Error.prototype;
    copy(ExceptionCode, DOMException);
    function NodeList() {
    }
    NodeList.prototype = {
      /**
       * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
       * @standard level1
       */
      length: 0,
      /**
       * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
       * @standard level1
       * @param index  unsigned long
       *   Index into the collection.
       * @return Node
       * 	The node at the indexth position in the NodeList, or null if that is not a valid index.
       */
      item: function(index) {
        return index >= 0 && index < this.length ? this[index] : null;
      },
      toString: function(isHTML, nodeFilter) {
        for (var buf = [], i = 0; i < this.length; i++) {
          serializeToString(this[i], buf, isHTML, nodeFilter);
        }
        return buf.join("");
      },
      /**
       * @private
       * @param {function (Node):boolean} predicate
       * @returns {Node[]}
       */
      filter: function(predicate) {
        return Array.prototype.filter.call(this, predicate);
      },
      /**
       * @private
       * @param {Node} item
       * @returns {number}
       */
      indexOf: function(item) {
        return Array.prototype.indexOf.call(this, item);
      }
    };
    function LiveNodeList(node, refresh) {
      this._node = node;
      this._refresh = refresh;
      _updateLiveList(this);
    }
    function _updateLiveList(list) {
      var inc = list._node._inc || list._node.ownerDocument._inc;
      if (list._inc !== inc) {
        var ls = list._refresh(list._node);
        __set__(list, "length", ls.length);
        if (!list.$$length || ls.length < list.$$length) {
          for (var i = ls.length; i in list; i++) {
            if (Object.prototype.hasOwnProperty.call(list, i)) {
              delete list[i];
            }
          }
        }
        copy(ls, list);
        list._inc = inc;
      }
    }
    LiveNodeList.prototype.item = function(i) {
      _updateLiveList(this);
      return this[i] || null;
    };
    _extends(LiveNodeList, NodeList);
    function NamedNodeMap() {
    }
    function _findNodeIndex(list, node) {
      var i = list.length;
      while (i--) {
        if (list[i] === node) {
          return i;
        }
      }
    }
    function _addNamedNode(el, list, newAttr, oldAttr) {
      if (oldAttr) {
        list[_findNodeIndex(list, oldAttr)] = newAttr;
      } else {
        list[list.length++] = newAttr;
      }
      if (el) {
        newAttr.ownerElement = el;
        var doc = el.ownerDocument;
        if (doc) {
          oldAttr && _onRemoveAttribute(doc, el, oldAttr);
          _onAddAttribute(doc, el, newAttr);
        }
      }
    }
    function _removeNamedNode(el, list, attr) {
      var i = _findNodeIndex(list, attr);
      if (i >= 0) {
        var lastIndex = list.length - 1;
        while (i < lastIndex) {
          list[i] = list[++i];
        }
        list.length = lastIndex;
        if (el) {
          var doc = el.ownerDocument;
          if (doc) {
            _onRemoveAttribute(doc, el, attr);
            attr.ownerElement = null;
          }
        }
      } else {
        throw new DOMException(NOT_FOUND_ERR, new Error(el.tagName + "@" + attr));
      }
    }
    NamedNodeMap.prototype = {
      length: 0,
      item: NodeList.prototype.item,
      getNamedItem: function(key) {
        var i = this.length;
        while (i--) {
          var attr = this[i];
          if (attr.nodeName == key) {
            return attr;
          }
        }
      },
      setNamedItem: function(attr) {
        var el = attr.ownerElement;
        if (el && el != this._ownerElement) {
          throw new DOMException(INUSE_ATTRIBUTE_ERR);
        }
        var oldAttr = this.getNamedItem(attr.nodeName);
        _addNamedNode(this._ownerElement, this, attr, oldAttr);
        return oldAttr;
      },
      /* returns Node */
      setNamedItemNS: function(attr) {
        var el = attr.ownerElement, oldAttr;
        if (el && el != this._ownerElement) {
          throw new DOMException(INUSE_ATTRIBUTE_ERR);
        }
        oldAttr = this.getNamedItemNS(attr.namespaceURI, attr.localName);
        _addNamedNode(this._ownerElement, this, attr, oldAttr);
        return oldAttr;
      },
      /* returns Node */
      removeNamedItem: function(key) {
        var attr = this.getNamedItem(key);
        _removeNamedNode(this._ownerElement, this, attr);
        return attr;
      },
      // raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR
      //for level2
      removeNamedItemNS: function(namespaceURI, localName) {
        var attr = this.getNamedItemNS(namespaceURI, localName);
        _removeNamedNode(this._ownerElement, this, attr);
        return attr;
      },
      getNamedItemNS: function(namespaceURI, localName) {
        var i = this.length;
        while (i--) {
          var node = this[i];
          if (node.localName == localName && node.namespaceURI == namespaceURI) {
            return node;
          }
        }
        return null;
      }
    };
    function DOMImplementation() {
    }
    DOMImplementation.prototype = {
      /**
       * The DOMImplementation.hasFeature() method returns a Boolean flag indicating if a given feature is supported.
       * The different implementations fairly diverged in what kind of features were reported.
       * The latest version of the spec settled to force this method to always return true, where the functionality was accurate and in use.
       *
       * @deprecated It is deprecated and modern browsers return true in all cases.
       *
       * @param {string} feature
       * @param {string} [version]
       * @returns {boolean} always true
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/hasFeature MDN
       * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-5CED94D7 DOM Level 1 Core
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-hasfeature DOM Living Standard
       */
      hasFeature: function(feature, version) {
        return true;
      },
      /**
       * Creates an XML Document object of the specified type with its document element.
       *
       * __It behaves slightly different from the description in the living standard__:
       * - There is no interface/class `XMLDocument`, it returns a `Document` instance.
       * - `contentType`, `encoding`, `mode`, `origin`, `url` fields are currently not declared.
       * - this implementation is not validating names or qualified names
       *   (when parsing XML strings, the SAX parser takes care of that)
       *
       * @param {string|null} namespaceURI
       * @param {string} qualifiedName
       * @param {DocumentType=null} doctype
       * @returns {Document}
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocument MDN
       * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocument DOM Level 2 Core (initial)
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument  DOM Level 2 Core
       *
       * @see https://dom.spec.whatwg.org/#validate-and-extract DOM: Validate and extract
       * @see https://www.w3.org/TR/xml/#NT-NameStartChar XML Spec: Names
       * @see https://www.w3.org/TR/xml-names/#ns-qualnames XML Namespaces: Qualified names
       */
      createDocument: function(namespaceURI, qualifiedName, doctype) {
        var doc = new Document();
        doc.implementation = this;
        doc.childNodes = new NodeList();
        doc.doctype = doctype || null;
        if (doctype) {
          doc.appendChild(doctype);
        }
        if (qualifiedName) {
          var root = doc.createElementNS(namespaceURI, qualifiedName);
          doc.appendChild(root);
        }
        return doc;
      },
      /**
       * Returns a doctype, with the given `qualifiedName`, `publicId`, and `systemId`.
       *
       * __This behavior is slightly different from the in the specs__:
       * - this implementation is not validating names or qualified names
       *   (when parsing XML strings, the SAX parser takes care of that)
       *
       * @param {string} qualifiedName
       * @param {string} [publicId]
       * @param {string} [systemId]
       * @returns {DocumentType} which can either be used with `DOMImplementation.createDocument` upon document creation
       * 				  or can be put into the document via methods like `Node.insertBefore()` or `Node.replaceChild()`
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocumentType MDN
       * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocType DOM Level 2 Core
       * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocumenttype DOM Living Standard
       *
       * @see https://dom.spec.whatwg.org/#validate-and-extract DOM: Validate and extract
       * @see https://www.w3.org/TR/xml/#NT-NameStartChar XML Spec: Names
       * @see https://www.w3.org/TR/xml-names/#ns-qualnames XML Namespaces: Qualified names
       */
      createDocumentType: function(qualifiedName, publicId, systemId) {
        var node = new DocumentType();
        node.name = qualifiedName;
        node.nodeName = qualifiedName;
        node.publicId = publicId || "";
        node.systemId = systemId || "";
        return node;
      }
    };
    function Node2() {
    }
    Node2.prototype = {
      firstChild: null,
      lastChild: null,
      previousSibling: null,
      nextSibling: null,
      attributes: null,
      parentNode: null,
      childNodes: null,
      ownerDocument: null,
      nodeValue: null,
      namespaceURI: null,
      prefix: null,
      localName: null,
      // Modified in DOM Level 2:
      insertBefore: function(newChild, refChild) {
        return _insertBefore(this, newChild, refChild);
      },
      replaceChild: function(newChild, oldChild) {
        _insertBefore(this, newChild, oldChild, assertPreReplacementValidityInDocument);
        if (oldChild) {
          this.removeChild(oldChild);
        }
      },
      removeChild: function(oldChild) {
        return _removeChild(this, oldChild);
      },
      appendChild: function(newChild) {
        return this.insertBefore(newChild, null);
      },
      hasChildNodes: function() {
        return this.firstChild != null;
      },
      cloneNode: function(deep) {
        return cloneNode(this.ownerDocument || this, this, deep);
      },
      // Modified in DOM Level 2:
      normalize: function() {
        var child = this.firstChild;
        while (child) {
          var next = child.nextSibling;
          if (next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE) {
            this.removeChild(next);
            child.appendData(next.data);
          } else {
            child.normalize();
            child = next;
          }
        }
      },
      // Introduced in DOM Level 2:
      isSupported: function(feature, version) {
        return this.ownerDocument.implementation.hasFeature(feature, version);
      },
      // Introduced in DOM Level 2:
      hasAttributes: function() {
        return this.attributes.length > 0;
      },
      /**
       * Look up the prefix associated to the given namespace URI, starting from this node.
       * **The default namespace declarations are ignored by this method.**
       * See Namespace Prefix Lookup for details on the algorithm used by this method.
       *
       * _Note: The implementation seems to be incomplete when compared to the algorithm described in the specs._
       *
       * @param {string | null} namespaceURI
       * @returns {string | null}
       * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-lookupNamespacePrefix
       * @see https://www.w3.org/TR/DOM-Level-3-Core/namespaces-algorithms.html#lookupNamespacePrefixAlgo
       * @see https://dom.spec.whatwg.org/#dom-node-lookupprefix
       * @see https://github.com/xmldom/xmldom/issues/322
       */
      lookupPrefix: function(namespaceURI) {
        var el = this;
        while (el) {
          var map = el._nsMap;
          if (map) {
            for (var n in map) {
              if (Object.prototype.hasOwnProperty.call(map, n) && map[n] === namespaceURI) {
                return n;
              }
            }
          }
          el = el.nodeType == ATTRIBUTE_NODE ? el.ownerDocument : el.parentNode;
        }
        return null;
      },
      // Introduced in DOM Level 3:
      lookupNamespaceURI: function(prefix) {
        var el = this;
        while (el) {
          var map = el._nsMap;
          if (map) {
            if (prefix in map) {
              if (Object.prototype.hasOwnProperty.call(map, prefix)) {
                return map[prefix];
              }
            }
          }
          el = el.nodeType == ATTRIBUTE_NODE ? el.ownerDocument : el.parentNode;
        }
        return null;
      },
      // Introduced in DOM Level 3:
      isDefaultNamespace: function(namespaceURI) {
        var prefix = this.lookupPrefix(namespaceURI);
        return prefix == null;
      }
    };
    function _xmlEncoder(c) {
      return c == "<" && "&lt;" || c == ">" && "&gt;" || c == "&" && "&amp;" || c == '"' && "&quot;" || "&#" + c.charCodeAt() + ";";
    }
    copy(NodeType, Node2);
    copy(NodeType, Node2.prototype);
    function _visitNode(node, callback) {
      if (callback(node)) {
        return true;
      }
      if (node = node.firstChild) {
        do {
          if (_visitNode(node, callback)) {
            return true;
          }
        } while (node = node.nextSibling);
      }
    }
    function Document() {
      this.ownerDocument = this;
    }
    function _onAddAttribute(doc, el, newAttr) {
      doc && doc._inc++;
      var ns = newAttr.namespaceURI;
      if (ns === NAMESPACE.XMLNS) {
        el._nsMap[newAttr.prefix ? newAttr.localName : ""] = newAttr.value;
      }
    }
    function _onRemoveAttribute(doc, el, newAttr, remove) {
      doc && doc._inc++;
      var ns = newAttr.namespaceURI;
      if (ns === NAMESPACE.XMLNS) {
        delete el._nsMap[newAttr.prefix ? newAttr.localName : ""];
      }
    }
    function _onUpdateChild(doc, el, newChild) {
      if (doc && doc._inc) {
        doc._inc++;
        var cs = el.childNodes;
        if (newChild) {
          cs[cs.length++] = newChild;
        } else {
          var child = el.firstChild;
          var i = 0;
          while (child) {
            cs[i++] = child;
            child = child.nextSibling;
          }
          cs.length = i;
          delete cs[cs.length];
        }
      }
    }
    function _removeChild(parentNode, child) {
      var previous = child.previousSibling;
      var next = child.nextSibling;
      if (previous) {
        previous.nextSibling = next;
      } else {
        parentNode.firstChild = next;
      }
      if (next) {
        next.previousSibling = previous;
      } else {
        parentNode.lastChild = previous;
      }
      child.parentNode = null;
      child.previousSibling = null;
      child.nextSibling = null;
      _onUpdateChild(parentNode.ownerDocument, parentNode);
      return child;
    }
    function hasValidParentNodeType(node) {
      return node && (node.nodeType === Node2.DOCUMENT_NODE || node.nodeType === Node2.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node2.ELEMENT_NODE);
    }
    function hasInsertableNodeType(node) {
      return node && (isElementNode(node) || isTextNode(node) || isDocTypeNode(node) || node.nodeType === Node2.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node2.COMMENT_NODE || node.nodeType === Node2.PROCESSING_INSTRUCTION_NODE);
    }
    function isDocTypeNode(node) {
      return node && node.nodeType === Node2.DOCUMENT_TYPE_NODE;
    }
    function isElementNode(node) {
      return node && node.nodeType === Node2.ELEMENT_NODE;
    }
    function isTextNode(node) {
      return node && node.nodeType === Node2.TEXT_NODE;
    }
    function isElementInsertionPossible(doc, child) {
      var parentChildNodes = doc.childNodes || [];
      if (find(parentChildNodes, isElementNode) || isDocTypeNode(child)) {
        return false;
      }
      var docTypeNode = find(parentChildNodes, isDocTypeNode);
      return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
    }
    function isElementReplacementPossible(doc, child) {
      var parentChildNodes = doc.childNodes || [];
      function hasElementChildThatIsNotChild(node) {
        return isElementNode(node) && node !== child;
      }
      if (find(parentChildNodes, hasElementChildThatIsNotChild)) {
        return false;
      }
      var docTypeNode = find(parentChildNodes, isDocTypeNode);
      return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
    }
    function assertPreInsertionValidity1to5(parent2, node, child) {
      if (!hasValidParentNodeType(parent2)) {
        throw new DOMException(HIERARCHY_REQUEST_ERR, "Unexpected parent node type " + parent2.nodeType);
      }
      if (child && child.parentNode !== parent2) {
        throw new DOMException(NOT_FOUND_ERR, "child not in parent");
      }
      if (
        // 4. If `node` is not a DocumentFragment, DocumentType, Element, or CharacterData node, then throw a "HierarchyRequestError" DOMException.
        !hasInsertableNodeType(node) || // 5. If either `node` is a Text node and `parent` is a document,
        // the sax parser currently adds top level text nodes, this will be fixed in 0.9.0
        // || (node.nodeType === Node.TEXT_NODE && parent.nodeType === Node.DOCUMENT_NODE)
        // or `node` is a doctype and `parent` is not a document, then throw a "HierarchyRequestError" DOMException.
        isDocTypeNode(node) && parent2.nodeType !== Node2.DOCUMENT_NODE
      ) {
        throw new DOMException(
          HIERARCHY_REQUEST_ERR,
          "Unexpected node type " + node.nodeType + " for parent node type " + parent2.nodeType
        );
      }
    }
    function assertPreInsertionValidityInDocument(parent2, node, child) {
      var parentChildNodes = parent2.childNodes || [];
      var nodeChildNodes = node.childNodes || [];
      if (node.nodeType === Node2.DOCUMENT_FRAGMENT_NODE) {
        var nodeChildElements = nodeChildNodes.filter(isElementNode);
        if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
        }
        if (nodeChildElements.length === 1 && !isElementInsertionPossible(parent2, child)) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
        }
      }
      if (isElementNode(node)) {
        if (!isElementInsertionPossible(parent2, child)) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
        }
      }
      if (isDocTypeNode(node)) {
        if (find(parentChildNodes, isDocTypeNode)) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
        }
        var parentElementChild = find(parentChildNodes, isElementNode);
        if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
        }
        if (!child && parentElementChild) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "Doctype can not be appended since element is present");
        }
      }
    }
    function assertPreReplacementValidityInDocument(parent2, node, child) {
      var parentChildNodes = parent2.childNodes || [];
      var nodeChildNodes = node.childNodes || [];
      if (node.nodeType === Node2.DOCUMENT_FRAGMENT_NODE) {
        var nodeChildElements = nodeChildNodes.filter(isElementNode);
        if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
        }
        if (nodeChildElements.length === 1 && !isElementReplacementPossible(parent2, child)) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
        }
      }
      if (isElementNode(node)) {
        if (!isElementReplacementPossible(parent2, child)) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
        }
      }
      if (isDocTypeNode(node)) {
        let hasDoctypeChildThatIsNotChild2 = function(node2) {
          return isDocTypeNode(node2) && node2 !== child;
        };
        var hasDoctypeChildThatIsNotChild = hasDoctypeChildThatIsNotChild2;
        if (find(parentChildNodes, hasDoctypeChildThatIsNotChild2)) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
        }
        var parentElementChild = find(parentChildNodes, isElementNode);
        if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
          throw new DOMException(HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
        }
      }
    }
    function _insertBefore(parent2, node, child, _inDocumentAssertion) {
      assertPreInsertionValidity1to5(parent2, node, child);
      if (parent2.nodeType === Node2.DOCUMENT_NODE) {
        (_inDocumentAssertion || assertPreInsertionValidityInDocument)(parent2, node, child);
      }
      var cp = node.parentNode;
      if (cp) {
        cp.removeChild(node);
      }
      if (node.nodeType === DOCUMENT_FRAGMENT_NODE) {
        var newFirst = node.firstChild;
        if (newFirst == null) {
          return node;
        }
        var newLast = node.lastChild;
      } else {
        newFirst = newLast = node;
      }
      var pre = child ? child.previousSibling : parent2.lastChild;
      newFirst.previousSibling = pre;
      newLast.nextSibling = child;
      if (pre) {
        pre.nextSibling = newFirst;
      } else {
        parent2.firstChild = newFirst;
      }
      if (child == null) {
        parent2.lastChild = newLast;
      } else {
        child.previousSibling = newLast;
      }
      do {
        newFirst.parentNode = parent2;
      } while (newFirst !== newLast && (newFirst = newFirst.nextSibling));
      _onUpdateChild(parent2.ownerDocument || parent2, parent2);
      if (node.nodeType == DOCUMENT_FRAGMENT_NODE) {
        node.firstChild = node.lastChild = null;
      }
      return node;
    }
    function _appendSingleChild(parentNode, newChild) {
      if (newChild.parentNode) {
        newChild.parentNode.removeChild(newChild);
      }
      newChild.parentNode = parentNode;
      newChild.previousSibling = parentNode.lastChild;
      newChild.nextSibling = null;
      if (newChild.previousSibling) {
        newChild.previousSibling.nextSibling = newChild;
      } else {
        parentNode.firstChild = newChild;
      }
      parentNode.lastChild = newChild;
      _onUpdateChild(parentNode.ownerDocument, parentNode, newChild);
      return newChild;
    }
    Document.prototype = {
      //implementation : null,
      nodeName: "#document",
      nodeType: DOCUMENT_NODE,
      /**
       * The DocumentType node of the document.
       *
       * @readonly
       * @type DocumentType
       */
      doctype: null,
      documentElement: null,
      _inc: 1,
      insertBefore: function(newChild, refChild) {
        if (newChild.nodeType == DOCUMENT_FRAGMENT_NODE) {
          var child = newChild.firstChild;
          while (child) {
            var next = child.nextSibling;
            this.insertBefore(child, refChild);
            child = next;
          }
          return newChild;
        }
        _insertBefore(this, newChild, refChild);
        newChild.ownerDocument = this;
        if (this.documentElement === null && newChild.nodeType === ELEMENT_NODE) {
          this.documentElement = newChild;
        }
        return newChild;
      },
      removeChild: function(oldChild) {
        if (this.documentElement == oldChild) {
          this.documentElement = null;
        }
        return _removeChild(this, oldChild);
      },
      replaceChild: function(newChild, oldChild) {
        _insertBefore(this, newChild, oldChild, assertPreReplacementValidityInDocument);
        newChild.ownerDocument = this;
        if (oldChild) {
          this.removeChild(oldChild);
        }
        if (isElementNode(newChild)) {
          this.documentElement = newChild;
        }
      },
      // Introduced in DOM Level 2:
      importNode: function(importedNode, deep) {
        return importNode(this, importedNode, deep);
      },
      // Introduced in DOM Level 2:
      getElementById: function(id) {
        var rtv = null;
        _visitNode(this.documentElement, function(node) {
          if (node.nodeType == ELEMENT_NODE) {
            if (node.getAttribute("id") == id) {
              rtv = node;
              return true;
            }
          }
        });
        return rtv;
      },
      /**
       * The `getElementsByClassName` method of `Document` interface returns an array-like object
       * of all child elements which have **all** of the given class name(s).
       *
       * Returns an empty list if `classeNames` is an empty string or only contains HTML white space characters.
       *
       *
       * Warning: This is a live LiveNodeList.
       * Changes in the DOM will reflect in the array as the changes occur.
       * If an element selected by this array no longer qualifies for the selector,
       * it will automatically be removed. Be aware of this for iteration purposes.
       *
       * @param {string} classNames is a string representing the class name(s) to match; multiple class names are separated by (ASCII-)whitespace
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName
       * @see https://dom.spec.whatwg.org/#concept-getelementsbyclassname
       */
      getElementsByClassName: function(classNames) {
        var classNamesSet = toOrderedSet(classNames);
        return new LiveNodeList(this, function(base) {
          var ls = [];
          if (classNamesSet.length > 0) {
            _visitNode(base.documentElement, function(node) {
              if (node !== base && node.nodeType === ELEMENT_NODE) {
                var nodeClassNames = node.getAttribute("class");
                if (nodeClassNames) {
                  var matches = classNames === nodeClassNames;
                  if (!matches) {
                    var nodeClassNamesSet = toOrderedSet(nodeClassNames);
                    matches = classNamesSet.every(arrayIncludes(nodeClassNamesSet));
                  }
                  if (matches) {
                    ls.push(node);
                  }
                }
              }
            });
          }
          return ls;
        });
      },
      //document factory method:
      createElement: function(tagName) {
        var node = new Element2();
        node.ownerDocument = this;
        node.nodeName = tagName;
        node.tagName = tagName;
        node.localName = tagName;
        node.childNodes = new NodeList();
        var attrs = node.attributes = new NamedNodeMap();
        attrs._ownerElement = node;
        return node;
      },
      createDocumentFragment: function() {
        var node = new DocumentFragment();
        node.ownerDocument = this;
        node.childNodes = new NodeList();
        return node;
      },
      createTextNode: function(data) {
        var node = new Text();
        node.ownerDocument = this;
        node.appendData(data);
        return node;
      },
      createComment: function(data) {
        var node = new Comment();
        node.ownerDocument = this;
        node.appendData(data);
        return node;
      },
      createCDATASection: function(data) {
        var node = new CDATASection();
        node.ownerDocument = this;
        node.appendData(data);
        return node;
      },
      createProcessingInstruction: function(target, data) {
        var node = new ProcessingInstruction();
        node.ownerDocument = this;
        node.tagName = node.nodeName = node.target = target;
        node.nodeValue = node.data = data;
        return node;
      },
      createAttribute: function(name) {
        var node = new Attr();
        node.ownerDocument = this;
        node.name = name;
        node.nodeName = name;
        node.localName = name;
        node.specified = true;
        return node;
      },
      createEntityReference: function(name) {
        var node = new EntityReference();
        node.ownerDocument = this;
        node.nodeName = name;
        return node;
      },
      // Introduced in DOM Level 2:
      createElementNS: function(namespaceURI, qualifiedName) {
        var node = new Element2();
        var pl = qualifiedName.split(":");
        var attrs = node.attributes = new NamedNodeMap();
        node.childNodes = new NodeList();
        node.ownerDocument = this;
        node.nodeName = qualifiedName;
        node.tagName = qualifiedName;
        node.namespaceURI = namespaceURI;
        if (pl.length == 2) {
          node.prefix = pl[0];
          node.localName = pl[1];
        } else {
          node.localName = qualifiedName;
        }
        attrs._ownerElement = node;
        return node;
      },
      // Introduced in DOM Level 2:
      createAttributeNS: function(namespaceURI, qualifiedName) {
        var node = new Attr();
        var pl = qualifiedName.split(":");
        node.ownerDocument = this;
        node.nodeName = qualifiedName;
        node.name = qualifiedName;
        node.namespaceURI = namespaceURI;
        node.specified = true;
        if (pl.length == 2) {
          node.prefix = pl[0];
          node.localName = pl[1];
        } else {
          node.localName = qualifiedName;
        }
        return node;
      }
    };
    _extends(Document, Node2);
    function Element2() {
      this._nsMap = {};
    }
    Element2.prototype = {
      nodeType: ELEMENT_NODE,
      hasAttribute: function(name) {
        return this.getAttributeNode(name) != null;
      },
      getAttribute: function(name) {
        var attr = this.getAttributeNode(name);
        return attr && attr.value || "";
      },
      getAttributeNode: function(name) {
        return this.attributes.getNamedItem(name);
      },
      setAttribute: function(name, value) {
        var attr = this.ownerDocument.createAttribute(name);
        attr.value = attr.nodeValue = "" + value;
        this.setAttributeNode(attr);
      },
      removeAttribute: function(name) {
        var attr = this.getAttributeNode(name);
        attr && this.removeAttributeNode(attr);
      },
      //four real opeartion method
      appendChild: function(newChild) {
        if (newChild.nodeType === DOCUMENT_FRAGMENT_NODE) {
          return this.insertBefore(newChild, null);
        } else {
          return _appendSingleChild(this, newChild);
        }
      },
      setAttributeNode: function(newAttr) {
        return this.attributes.setNamedItem(newAttr);
      },
      setAttributeNodeNS: function(newAttr) {
        return this.attributes.setNamedItemNS(newAttr);
      },
      removeAttributeNode: function(oldAttr) {
        return this.attributes.removeNamedItem(oldAttr.nodeName);
      },
      //get real attribute name,and remove it by removeAttributeNode
      removeAttributeNS: function(namespaceURI, localName) {
        var old = this.getAttributeNodeNS(namespaceURI, localName);
        old && this.removeAttributeNode(old);
      },
      hasAttributeNS: function(namespaceURI, localName) {
        return this.getAttributeNodeNS(namespaceURI, localName) != null;
      },
      getAttributeNS: function(namespaceURI, localName) {
        var attr = this.getAttributeNodeNS(namespaceURI, localName);
        return attr && attr.value || "";
      },
      setAttributeNS: function(namespaceURI, qualifiedName, value) {
        var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
        attr.value = attr.nodeValue = "" + value;
        this.setAttributeNode(attr);
      },
      getAttributeNodeNS: function(namespaceURI, localName) {
        return this.attributes.getNamedItemNS(namespaceURI, localName);
      },
      getElementsByTagName: function(tagName) {
        return new LiveNodeList(this, function(base) {
          var ls = [];
          _visitNode(base, function(node) {
            if (node !== base && node.nodeType == ELEMENT_NODE && (tagName === "*" || node.tagName == tagName)) {
              ls.push(node);
            }
          });
          return ls;
        });
      },
      getElementsByTagNameNS: function(namespaceURI, localName) {
        return new LiveNodeList(this, function(base) {
          var ls = [];
          _visitNode(base, function(node) {
            if (node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === "*" || node.namespaceURI === namespaceURI) && (localName === "*" || node.localName == localName)) {
              ls.push(node);
            }
          });
          return ls;
        });
      }
    };
    Document.prototype.getElementsByTagName = Element2.prototype.getElementsByTagName;
    Document.prototype.getElementsByTagNameNS = Element2.prototype.getElementsByTagNameNS;
    _extends(Element2, Node2);
    function Attr() {
    }
    Attr.prototype.nodeType = ATTRIBUTE_NODE;
    _extends(Attr, Node2);
    function CharacterData() {
    }
    CharacterData.prototype = {
      data: "",
      substringData: function(offset, count) {
        return this.data.substring(offset, offset + count);
      },
      appendData: function(text) {
        text = this.data + text;
        this.nodeValue = this.data = text;
        this.length = text.length;
      },
      insertData: function(offset, text) {
        this.replaceData(offset, 0, text);
      },
      appendChild: function(newChild) {
        throw new Error(ExceptionMessage[HIERARCHY_REQUEST_ERR]);
      },
      deleteData: function(offset, count) {
        this.replaceData(offset, count, "");
      },
      replaceData: function(offset, count, text) {
        var start = this.data.substring(0, offset);
        var end = this.data.substring(offset + count);
        text = start + text + end;
        this.nodeValue = this.data = text;
        this.length = text.length;
      }
    };
    _extends(CharacterData, Node2);
    function Text() {
    }
    Text.prototype = {
      nodeName: "#text",
      nodeType: TEXT_NODE,
      splitText: function(offset) {
        var text = this.data;
        var newText = text.substring(offset);
        text = text.substring(0, offset);
        this.data = this.nodeValue = text;
        this.length = text.length;
        var newNode = this.ownerDocument.createTextNode(newText);
        if (this.parentNode) {
          this.parentNode.insertBefore(newNode, this.nextSibling);
        }
        return newNode;
      }
    };
    _extends(Text, CharacterData);
    function Comment() {
    }
    Comment.prototype = {
      nodeName: "#comment",
      nodeType: COMMENT_NODE
    };
    _extends(Comment, CharacterData);
    function CDATASection() {
    }
    CDATASection.prototype = {
      nodeName: "#cdata-section",
      nodeType: CDATA_SECTION_NODE
    };
    _extends(CDATASection, CharacterData);
    function DocumentType() {
    }
    DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
    _extends(DocumentType, Node2);
    function Notation() {
    }
    Notation.prototype.nodeType = NOTATION_NODE;
    _extends(Notation, Node2);
    function Entity() {
    }
    Entity.prototype.nodeType = ENTITY_NODE;
    _extends(Entity, Node2);
    function EntityReference() {
    }
    EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
    _extends(EntityReference, Node2);
    function DocumentFragment() {
    }
    DocumentFragment.prototype.nodeName = "#document-fragment";
    DocumentFragment.prototype.nodeType = DOCUMENT_FRAGMENT_NODE;
    _extends(DocumentFragment, Node2);
    function ProcessingInstruction() {
    }
    ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
    _extends(ProcessingInstruction, Node2);
    function XMLSerializer() {
    }
    XMLSerializer.prototype.serializeToString = function(node, isHtml, nodeFilter) {
      return nodeSerializeToString.call(node, isHtml, nodeFilter);
    };
    Node2.prototype.toString = nodeSerializeToString;
    function nodeSerializeToString(isHtml, nodeFilter) {
      var buf = [];
      var refNode = this.nodeType == 9 && this.documentElement || this;
      var prefix = refNode.prefix;
      var uri = refNode.namespaceURI;
      if (uri && prefix == null) {
        var prefix = refNode.lookupPrefix(uri);
        if (prefix == null) {
          var visibleNamespaces = [
            { namespace: uri, prefix: null }
            //{namespace:uri,prefix:''}
          ];
        }
      }
      serializeToString(this, buf, isHtml, nodeFilter, visibleNamespaces);
      return buf.join("");
    }
    function needNamespaceDefine(node, isHTML, visibleNamespaces) {
      var prefix = node.prefix || "";
      var uri = node.namespaceURI;
      if (!uri) {
        return false;
      }
      if (prefix === "xml" && uri === NAMESPACE.XML || uri === NAMESPACE.XMLNS) {
        return false;
      }
      var i = visibleNamespaces.length;
      while (i--) {
        var ns = visibleNamespaces[i];
        if (ns.prefix === prefix) {
          return ns.namespace !== uri;
        }
      }
      return true;
    }
    function addSerializedAttribute(buf, qualifiedName, value) {
      buf.push(" ", qualifiedName, '="', value.replace(/[<&"]/g, _xmlEncoder), '"');
    }
    function serializeToString(node, buf, isHTML, nodeFilter, visibleNamespaces) {
      if (!visibleNamespaces) {
        visibleNamespaces = [];
      }
      if (nodeFilter) {
        node = nodeFilter(node);
        if (node) {
          if (typeof node == "string") {
            buf.push(node);
            return;
          }
        } else {
          return;
        }
      }
      switch (node.nodeType) {
        case ELEMENT_NODE:
          var attrs = node.attributes;
          var len = attrs.length;
          var child = node.firstChild;
          var nodeName = node.tagName;
          isHTML = NAMESPACE.isHTML(node.namespaceURI) || isHTML;
          var prefixedNodeName = nodeName;
          if (!isHTML && !node.prefix && node.namespaceURI) {
            var defaultNS;
            for (var ai = 0; ai < attrs.length; ai++) {
              if (attrs.item(ai).name === "xmlns") {
                defaultNS = attrs.item(ai).value;
                break;
              }
            }
            if (!defaultNS) {
              for (var nsi = visibleNamespaces.length - 1; nsi >= 0; nsi--) {
                var namespace = visibleNamespaces[nsi];
                if (namespace.prefix === "" && namespace.namespace === node.namespaceURI) {
                  defaultNS = namespace.namespace;
                  break;
                }
              }
            }
            if (defaultNS !== node.namespaceURI) {
              for (var nsi = visibleNamespaces.length - 1; nsi >= 0; nsi--) {
                var namespace = visibleNamespaces[nsi];
                if (namespace.namespace === node.namespaceURI) {
                  if (namespace.prefix) {
                    prefixedNodeName = namespace.prefix + ":" + nodeName;
                  }
                  break;
                }
              }
            }
          }
          buf.push("<", prefixedNodeName);
          for (var i = 0; i < len; i++) {
            var attr = attrs.item(i);
            if (attr.prefix == "xmlns") {
              visibleNamespaces.push({ prefix: attr.localName, namespace: attr.value });
            } else if (attr.nodeName == "xmlns") {
              visibleNamespaces.push({ prefix: "", namespace: attr.value });
            }
          }
          for (var i = 0; i < len; i++) {
            var attr = attrs.item(i);
            if (needNamespaceDefine(attr, isHTML, visibleNamespaces)) {
              var prefix = attr.prefix || "";
              var uri = attr.namespaceURI;
              addSerializedAttribute(buf, prefix ? "xmlns:" + prefix : "xmlns", uri);
              visibleNamespaces.push({ prefix, namespace: uri });
            }
            serializeToString(attr, buf, isHTML, nodeFilter, visibleNamespaces);
          }
          if (nodeName === prefixedNodeName && needNamespaceDefine(node, isHTML, visibleNamespaces)) {
            var prefix = node.prefix || "";
            var uri = node.namespaceURI;
            addSerializedAttribute(buf, prefix ? "xmlns:" + prefix : "xmlns", uri);
            visibleNamespaces.push({ prefix, namespace: uri });
          }
          if (child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)) {
            buf.push(">");
            if (isHTML && /^script$/i.test(nodeName)) {
              while (child) {
                if (child.data) {
                  buf.push(child.data);
                } else {
                  serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
                }
                child = child.nextSibling;
              }
            } else {
              while (child) {
                serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
                child = child.nextSibling;
              }
            }
            buf.push("</", prefixedNodeName, ">");
          } else {
            buf.push("/>");
          }
          return;
        case DOCUMENT_NODE:
        case DOCUMENT_FRAGMENT_NODE:
          var child = node.firstChild;
          while (child) {
            serializeToString(child, buf, isHTML, nodeFilter, visibleNamespaces.slice());
            child = child.nextSibling;
          }
          return;
        case ATTRIBUTE_NODE:
          return addSerializedAttribute(buf, node.name, node.value);
        case TEXT_NODE:
          return buf.push(
            node.data.replace(/[<&]/g, _xmlEncoder).replace(/]]>/g, "]]&gt;")
          );
        case CDATA_SECTION_NODE:
          return buf.push("<![CDATA[", node.data, "]]>");
        case COMMENT_NODE:
          return buf.push("<!--", node.data, "-->");
        case DOCUMENT_TYPE_NODE:
          var pubid = node.publicId;
          var sysid = node.systemId;
          buf.push("<!DOCTYPE ", node.name);
          if (pubid) {
            buf.push(" PUBLIC ", pubid);
            if (sysid && sysid != ".") {
              buf.push(" ", sysid);
            }
            buf.push(">");
          } else if (sysid && sysid != ".") {
            buf.push(" SYSTEM ", sysid, ">");
          } else {
            var sub = node.internalSubset;
            if (sub) {
              buf.push(" [", sub, "]");
            }
            buf.push(">");
          }
          return;
        case PROCESSING_INSTRUCTION_NODE:
          return buf.push("<?", node.target, " ", node.data, "?>");
        case ENTITY_REFERENCE_NODE:
          return buf.push("&", node.nodeName, ";");
        //case ENTITY_NODE:
        //case NOTATION_NODE:
        default:
          buf.push("??", node.nodeName);
      }
    }
    function importNode(doc, node, deep) {
      var node2;
      switch (node.nodeType) {
        case ELEMENT_NODE:
          node2 = node.cloneNode(false);
          node2.ownerDocument = doc;
        //var attrs = node2.attributes;
        //var len = attrs.length;
        //for(var i=0;i<len;i++){
        //node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
        //}
        case DOCUMENT_FRAGMENT_NODE:
          break;
        case ATTRIBUTE_NODE:
          deep = true;
          break;
      }
      if (!node2) {
        node2 = node.cloneNode(false);
      }
      node2.ownerDocument = doc;
      node2.parentNode = null;
      if (deep) {
        var child = node.firstChild;
        while (child) {
          node2.appendChild(importNode(doc, child, deep));
          child = child.nextSibling;
        }
      }
      return node2;
    }
    function cloneNode(doc, node, deep) {
      var node2 = new node.constructor();
      for (var n in node) {
        if (Object.prototype.hasOwnProperty.call(node, n)) {
          var v = node[n];
          if (typeof v != "object") {
            if (v != node2[n]) {
              node2[n] = v;
            }
          }
        }
      }
      if (node.childNodes) {
        node2.childNodes = new NodeList();
      }
      node2.ownerDocument = doc;
      switch (node2.nodeType) {
        case ELEMENT_NODE:
          var attrs = node.attributes;
          var attrs2 = node2.attributes = new NamedNodeMap();
          var len = attrs.length;
          attrs2._ownerElement = node2;
          for (var i = 0; i < len; i++) {
            node2.setAttributeNode(cloneNode(doc, attrs.item(i), true));
          }
          break;
          ;
        case ATTRIBUTE_NODE:
          deep = true;
      }
      if (deep) {
        var child = node.firstChild;
        while (child) {
          node2.appendChild(cloneNode(doc, child, deep));
          child = child.nextSibling;
        }
      }
      return node2;
    }
    function __set__(object, key, value) {
      object[key] = value;
    }
    try {
      if (Object.defineProperty) {
        let getTextContent2 = function(node) {
          switch (node.nodeType) {
            case ELEMENT_NODE:
            case DOCUMENT_FRAGMENT_NODE:
              var buf = [];
              node = node.firstChild;
              while (node) {
                if (node.nodeType !== 7 && node.nodeType !== 8) {
                  buf.push(getTextContent2(node));
                }
                node = node.nextSibling;
              }
              return buf.join("");
            default:
              return node.nodeValue;
          }
        };
        getTextContent = getTextContent2;
        Object.defineProperty(LiveNodeList.prototype, "length", {
          get: function() {
            _updateLiveList(this);
            return this.$$length;
          }
        });
        Object.defineProperty(Node2.prototype, "textContent", {
          get: function() {
            return getTextContent2(this);
          },
          set: function(data) {
            switch (this.nodeType) {
              case ELEMENT_NODE:
              case DOCUMENT_FRAGMENT_NODE:
                while (this.firstChild) {
                  this.removeChild(this.firstChild);
                }
                if (data || String(data)) {
                  this.appendChild(this.ownerDocument.createTextNode(data));
                }
                break;
              default:
                this.data = data;
                this.value = data;
                this.nodeValue = data;
            }
          }
        });
        __set__ = function(object, key, value) {
          object["$$" + key] = value;
        };
      }
    } catch (e) {
    }
    var getTextContent;
    exports2.DocumentType = DocumentType;
    exports2.DOMException = DOMException;
    exports2.DOMImplementation = DOMImplementation;
    exports2.Element = Element2;
    exports2.Node = Node2;
    exports2.NodeList = NodeList;
    exports2.XMLSerializer = XMLSerializer;
  }
});

// ../../node_modules/@xmldom/xmldom/lib/entities.js
var require_entities = __commonJS({
  "../../node_modules/@xmldom/xmldom/lib/entities.js"(exports2) {
    "use strict";
    var freeze = require_conventions().freeze;
    exports2.XML_ENTITIES = freeze({
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      quot: '"'
    });
    exports2.HTML_ENTITIES = freeze({
      Aacute: "\xC1",
      aacute: "\xE1",
      Abreve: "\u0102",
      abreve: "\u0103",
      ac: "\u223E",
      acd: "\u223F",
      acE: "\u223E\u0333",
      Acirc: "\xC2",
      acirc: "\xE2",
      acute: "\xB4",
      Acy: "\u0410",
      acy: "\u0430",
      AElig: "\xC6",
      aelig: "\xE6",
      af: "\u2061",
      Afr: "\u{1D504}",
      afr: "\u{1D51E}",
      Agrave: "\xC0",
      agrave: "\xE0",
      alefsym: "\u2135",
      aleph: "\u2135",
      Alpha: "\u0391",
      alpha: "\u03B1",
      Amacr: "\u0100",
      amacr: "\u0101",
      amalg: "\u2A3F",
      AMP: "&",
      amp: "&",
      And: "\u2A53",
      and: "\u2227",
      andand: "\u2A55",
      andd: "\u2A5C",
      andslope: "\u2A58",
      andv: "\u2A5A",
      ang: "\u2220",
      ange: "\u29A4",
      angle: "\u2220",
      angmsd: "\u2221",
      angmsdaa: "\u29A8",
      angmsdab: "\u29A9",
      angmsdac: "\u29AA",
      angmsdad: "\u29AB",
      angmsdae: "\u29AC",
      angmsdaf: "\u29AD",
      angmsdag: "\u29AE",
      angmsdah: "\u29AF",
      angrt: "\u221F",
      angrtvb: "\u22BE",
      angrtvbd: "\u299D",
      angsph: "\u2222",
      angst: "\xC5",
      angzarr: "\u237C",
      Aogon: "\u0104",
      aogon: "\u0105",
      Aopf: "\u{1D538}",
      aopf: "\u{1D552}",
      ap: "\u2248",
      apacir: "\u2A6F",
      apE: "\u2A70",
      ape: "\u224A",
      apid: "\u224B",
      apos: "'",
      ApplyFunction: "\u2061",
      approx: "\u2248",
      approxeq: "\u224A",
      Aring: "\xC5",
      aring: "\xE5",
      Ascr: "\u{1D49C}",
      ascr: "\u{1D4B6}",
      Assign: "\u2254",
      ast: "*",
      asymp: "\u2248",
      asympeq: "\u224D",
      Atilde: "\xC3",
      atilde: "\xE3",
      Auml: "\xC4",
      auml: "\xE4",
      awconint: "\u2233",
      awint: "\u2A11",
      backcong: "\u224C",
      backepsilon: "\u03F6",
      backprime: "\u2035",
      backsim: "\u223D",
      backsimeq: "\u22CD",
      Backslash: "\u2216",
      Barv: "\u2AE7",
      barvee: "\u22BD",
      Barwed: "\u2306",
      barwed: "\u2305",
      barwedge: "\u2305",
      bbrk: "\u23B5",
      bbrktbrk: "\u23B6",
      bcong: "\u224C",
      Bcy: "\u0411",
      bcy: "\u0431",
      bdquo: "\u201E",
      becaus: "\u2235",
      Because: "\u2235",
      because: "\u2235",
      bemptyv: "\u29B0",
      bepsi: "\u03F6",
      bernou: "\u212C",
      Bernoullis: "\u212C",
      Beta: "\u0392",
      beta: "\u03B2",
      beth: "\u2136",
      between: "\u226C",
      Bfr: "\u{1D505}",
      bfr: "\u{1D51F}",
      bigcap: "\u22C2",
      bigcirc: "\u25EF",
      bigcup: "\u22C3",
      bigodot: "\u2A00",
      bigoplus: "\u2A01",
      bigotimes: "\u2A02",
      bigsqcup: "\u2A06",
      bigstar: "\u2605",
      bigtriangledown: "\u25BD",
      bigtriangleup: "\u25B3",
      biguplus: "\u2A04",
      bigvee: "\u22C1",
      bigwedge: "\u22C0",
      bkarow: "\u290D",
      blacklozenge: "\u29EB",
      blacksquare: "\u25AA",
      blacktriangle: "\u25B4",
      blacktriangledown: "\u25BE",
      blacktriangleleft: "\u25C2",
      blacktriangleright: "\u25B8",
      blank: "\u2423",
      blk12: "\u2592",
      blk14: "\u2591",
      blk34: "\u2593",
      block: "\u2588",
      bne: "=\u20E5",
      bnequiv: "\u2261\u20E5",
      bNot: "\u2AED",
      bnot: "\u2310",
      Bopf: "\u{1D539}",
      bopf: "\u{1D553}",
      bot: "\u22A5",
      bottom: "\u22A5",
      bowtie: "\u22C8",
      boxbox: "\u29C9",
      boxDL: "\u2557",
      boxDl: "\u2556",
      boxdL: "\u2555",
      boxdl: "\u2510",
      boxDR: "\u2554",
      boxDr: "\u2553",
      boxdR: "\u2552",
      boxdr: "\u250C",
      boxH: "\u2550",
      boxh: "\u2500",
      boxHD: "\u2566",
      boxHd: "\u2564",
      boxhD: "\u2565",
      boxhd: "\u252C",
      boxHU: "\u2569",
      boxHu: "\u2567",
      boxhU: "\u2568",
      boxhu: "\u2534",
      boxminus: "\u229F",
      boxplus: "\u229E",
      boxtimes: "\u22A0",
      boxUL: "\u255D",
      boxUl: "\u255C",
      boxuL: "\u255B",
      boxul: "\u2518",
      boxUR: "\u255A",
      boxUr: "\u2559",
      boxuR: "\u2558",
      boxur: "\u2514",
      boxV: "\u2551",
      boxv: "\u2502",
      boxVH: "\u256C",
      boxVh: "\u256B",
      boxvH: "\u256A",
      boxvh: "\u253C",
      boxVL: "\u2563",
      boxVl: "\u2562",
      boxvL: "\u2561",
      boxvl: "\u2524",
      boxVR: "\u2560",
      boxVr: "\u255F",
      boxvR: "\u255E",
      boxvr: "\u251C",
      bprime: "\u2035",
      Breve: "\u02D8",
      breve: "\u02D8",
      brvbar: "\xA6",
      Bscr: "\u212C",
      bscr: "\u{1D4B7}",
      bsemi: "\u204F",
      bsim: "\u223D",
      bsime: "\u22CD",
      bsol: "\\",
      bsolb: "\u29C5",
      bsolhsub: "\u27C8",
      bull: "\u2022",
      bullet: "\u2022",
      bump: "\u224E",
      bumpE: "\u2AAE",
      bumpe: "\u224F",
      Bumpeq: "\u224E",
      bumpeq: "\u224F",
      Cacute: "\u0106",
      cacute: "\u0107",
      Cap: "\u22D2",
      cap: "\u2229",
      capand: "\u2A44",
      capbrcup: "\u2A49",
      capcap: "\u2A4B",
      capcup: "\u2A47",
      capdot: "\u2A40",
      CapitalDifferentialD: "\u2145",
      caps: "\u2229\uFE00",
      caret: "\u2041",
      caron: "\u02C7",
      Cayleys: "\u212D",
      ccaps: "\u2A4D",
      Ccaron: "\u010C",
      ccaron: "\u010D",
      Ccedil: "\xC7",
      ccedil: "\xE7",
      Ccirc: "\u0108",
      ccirc: "\u0109",
      Cconint: "\u2230",
      ccups: "\u2A4C",
      ccupssm: "\u2A50",
      Cdot: "\u010A",
      cdot: "\u010B",
      cedil: "\xB8",
      Cedilla: "\xB8",
      cemptyv: "\u29B2",
      cent: "\xA2",
      CenterDot: "\xB7",
      centerdot: "\xB7",
      Cfr: "\u212D",
      cfr: "\u{1D520}",
      CHcy: "\u0427",
      chcy: "\u0447",
      check: "\u2713",
      checkmark: "\u2713",
      Chi: "\u03A7",
      chi: "\u03C7",
      cir: "\u25CB",
      circ: "\u02C6",
      circeq: "\u2257",
      circlearrowleft: "\u21BA",
      circlearrowright: "\u21BB",
      circledast: "\u229B",
      circledcirc: "\u229A",
      circleddash: "\u229D",
      CircleDot: "\u2299",
      circledR: "\xAE",
      circledS: "\u24C8",
      CircleMinus: "\u2296",
      CirclePlus: "\u2295",
      CircleTimes: "\u2297",
      cirE: "\u29C3",
      cire: "\u2257",
      cirfnint: "\u2A10",
      cirmid: "\u2AEF",
      cirscir: "\u29C2",
      ClockwiseContourIntegral: "\u2232",
      CloseCurlyDoubleQuote: "\u201D",
      CloseCurlyQuote: "\u2019",
      clubs: "\u2663",
      clubsuit: "\u2663",
      Colon: "\u2237",
      colon: ":",
      Colone: "\u2A74",
      colone: "\u2254",
      coloneq: "\u2254",
      comma: ",",
      commat: "@",
      comp: "\u2201",
      compfn: "\u2218",
      complement: "\u2201",
      complexes: "\u2102",
      cong: "\u2245",
      congdot: "\u2A6D",
      Congruent: "\u2261",
      Conint: "\u222F",
      conint: "\u222E",
      ContourIntegral: "\u222E",
      Copf: "\u2102",
      copf: "\u{1D554}",
      coprod: "\u2210",
      Coproduct: "\u2210",
      COPY: "\xA9",
      copy: "\xA9",
      copysr: "\u2117",
      CounterClockwiseContourIntegral: "\u2233",
      crarr: "\u21B5",
      Cross: "\u2A2F",
      cross: "\u2717",
      Cscr: "\u{1D49E}",
      cscr: "\u{1D4B8}",
      csub: "\u2ACF",
      csube: "\u2AD1",
      csup: "\u2AD0",
      csupe: "\u2AD2",
      ctdot: "\u22EF",
      cudarrl: "\u2938",
      cudarrr: "\u2935",
      cuepr: "\u22DE",
      cuesc: "\u22DF",
      cularr: "\u21B6",
      cularrp: "\u293D",
      Cup: "\u22D3",
      cup: "\u222A",
      cupbrcap: "\u2A48",
      CupCap: "\u224D",
      cupcap: "\u2A46",
      cupcup: "\u2A4A",
      cupdot: "\u228D",
      cupor: "\u2A45",
      cups: "\u222A\uFE00",
      curarr: "\u21B7",
      curarrm: "\u293C",
      curlyeqprec: "\u22DE",
      curlyeqsucc: "\u22DF",
      curlyvee: "\u22CE",
      curlywedge: "\u22CF",
      curren: "\xA4",
      curvearrowleft: "\u21B6",
      curvearrowright: "\u21B7",
      cuvee: "\u22CE",
      cuwed: "\u22CF",
      cwconint: "\u2232",
      cwint: "\u2231",
      cylcty: "\u232D",
      Dagger: "\u2021",
      dagger: "\u2020",
      daleth: "\u2138",
      Darr: "\u21A1",
      dArr: "\u21D3",
      darr: "\u2193",
      dash: "\u2010",
      Dashv: "\u2AE4",
      dashv: "\u22A3",
      dbkarow: "\u290F",
      dblac: "\u02DD",
      Dcaron: "\u010E",
      dcaron: "\u010F",
      Dcy: "\u0414",
      dcy: "\u0434",
      DD: "\u2145",
      dd: "\u2146",
      ddagger: "\u2021",
      ddarr: "\u21CA",
      DDotrahd: "\u2911",
      ddotseq: "\u2A77",
      deg: "\xB0",
      Del: "\u2207",
      Delta: "\u0394",
      delta: "\u03B4",
      demptyv: "\u29B1",
      dfisht: "\u297F",
      Dfr: "\u{1D507}",
      dfr: "\u{1D521}",
      dHar: "\u2965",
      dharl: "\u21C3",
      dharr: "\u21C2",
      DiacriticalAcute: "\xB4",
      DiacriticalDot: "\u02D9",
      DiacriticalDoubleAcute: "\u02DD",
      DiacriticalGrave: "`",
      DiacriticalTilde: "\u02DC",
      diam: "\u22C4",
      Diamond: "\u22C4",
      diamond: "\u22C4",
      diamondsuit: "\u2666",
      diams: "\u2666",
      die: "\xA8",
      DifferentialD: "\u2146",
      digamma: "\u03DD",
      disin: "\u22F2",
      div: "\xF7",
      divide: "\xF7",
      divideontimes: "\u22C7",
      divonx: "\u22C7",
      DJcy: "\u0402",
      djcy: "\u0452",
      dlcorn: "\u231E",
      dlcrop: "\u230D",
      dollar: "$",
      Dopf: "\u{1D53B}",
      dopf: "\u{1D555}",
      Dot: "\xA8",
      dot: "\u02D9",
      DotDot: "\u20DC",
      doteq: "\u2250",
      doteqdot: "\u2251",
      DotEqual: "\u2250",
      dotminus: "\u2238",
      dotplus: "\u2214",
      dotsquare: "\u22A1",
      doublebarwedge: "\u2306",
      DoubleContourIntegral: "\u222F",
      DoubleDot: "\xA8",
      DoubleDownArrow: "\u21D3",
      DoubleLeftArrow: "\u21D0",
      DoubleLeftRightArrow: "\u21D4",
      DoubleLeftTee: "\u2AE4",
      DoubleLongLeftArrow: "\u27F8",
      DoubleLongLeftRightArrow: "\u27FA",
      DoubleLongRightArrow: "\u27F9",
      DoubleRightArrow: "\u21D2",
      DoubleRightTee: "\u22A8",
      DoubleUpArrow: "\u21D1",
      DoubleUpDownArrow: "\u21D5",
      DoubleVerticalBar: "\u2225",
      DownArrow: "\u2193",
      Downarrow: "\u21D3",
      downarrow: "\u2193",
      DownArrowBar: "\u2913",
      DownArrowUpArrow: "\u21F5",
      DownBreve: "\u0311",
      downdownarrows: "\u21CA",
      downharpoonleft: "\u21C3",
      downharpoonright: "\u21C2",
      DownLeftRightVector: "\u2950",
      DownLeftTeeVector: "\u295E",
      DownLeftVector: "\u21BD",
      DownLeftVectorBar: "\u2956",
      DownRightTeeVector: "\u295F",
      DownRightVector: "\u21C1",
      DownRightVectorBar: "\u2957",
      DownTee: "\u22A4",
      DownTeeArrow: "\u21A7",
      drbkarow: "\u2910",
      drcorn: "\u231F",
      drcrop: "\u230C",
      Dscr: "\u{1D49F}",
      dscr: "\u{1D4B9}",
      DScy: "\u0405",
      dscy: "\u0455",
      dsol: "\u29F6",
      Dstrok: "\u0110",
      dstrok: "\u0111",
      dtdot: "\u22F1",
      dtri: "\u25BF",
      dtrif: "\u25BE",
      duarr: "\u21F5",
      duhar: "\u296F",
      dwangle: "\u29A6",
      DZcy: "\u040F",
      dzcy: "\u045F",
      dzigrarr: "\u27FF",
      Eacute: "\xC9",
      eacute: "\xE9",
      easter: "\u2A6E",
      Ecaron: "\u011A",
      ecaron: "\u011B",
      ecir: "\u2256",
      Ecirc: "\xCA",
      ecirc: "\xEA",
      ecolon: "\u2255",
      Ecy: "\u042D",
      ecy: "\u044D",
      eDDot: "\u2A77",
      Edot: "\u0116",
      eDot: "\u2251",
      edot: "\u0117",
      ee: "\u2147",
      efDot: "\u2252",
      Efr: "\u{1D508}",
      efr: "\u{1D522}",
      eg: "\u2A9A",
      Egrave: "\xC8",
      egrave: "\xE8",
      egs: "\u2A96",
      egsdot: "\u2A98",
      el: "\u2A99",
      Element: "\u2208",
      elinters: "\u23E7",
      ell: "\u2113",
      els: "\u2A95",
      elsdot: "\u2A97",
      Emacr: "\u0112",
      emacr: "\u0113",
      empty: "\u2205",
      emptyset: "\u2205",
      EmptySmallSquare: "\u25FB",
      emptyv: "\u2205",
      EmptyVerySmallSquare: "\u25AB",
      emsp: "\u2003",
      emsp13: "\u2004",
      emsp14: "\u2005",
      ENG: "\u014A",
      eng: "\u014B",
      ensp: "\u2002",
      Eogon: "\u0118",
      eogon: "\u0119",
      Eopf: "\u{1D53C}",
      eopf: "\u{1D556}",
      epar: "\u22D5",
      eparsl: "\u29E3",
      eplus: "\u2A71",
      epsi: "\u03B5",
      Epsilon: "\u0395",
      epsilon: "\u03B5",
      epsiv: "\u03F5",
      eqcirc: "\u2256",
      eqcolon: "\u2255",
      eqsim: "\u2242",
      eqslantgtr: "\u2A96",
      eqslantless: "\u2A95",
      Equal: "\u2A75",
      equals: "=",
      EqualTilde: "\u2242",
      equest: "\u225F",
      Equilibrium: "\u21CC",
      equiv: "\u2261",
      equivDD: "\u2A78",
      eqvparsl: "\u29E5",
      erarr: "\u2971",
      erDot: "\u2253",
      Escr: "\u2130",
      escr: "\u212F",
      esdot: "\u2250",
      Esim: "\u2A73",
      esim: "\u2242",
      Eta: "\u0397",
      eta: "\u03B7",
      ETH: "\xD0",
      eth: "\xF0",
      Euml: "\xCB",
      euml: "\xEB",
      euro: "\u20AC",
      excl: "!",
      exist: "\u2203",
      Exists: "\u2203",
      expectation: "\u2130",
      ExponentialE: "\u2147",
      exponentiale: "\u2147",
      fallingdotseq: "\u2252",
      Fcy: "\u0424",
      fcy: "\u0444",
      female: "\u2640",
      ffilig: "\uFB03",
      fflig: "\uFB00",
      ffllig: "\uFB04",
      Ffr: "\u{1D509}",
      ffr: "\u{1D523}",
      filig: "\uFB01",
      FilledSmallSquare: "\u25FC",
      FilledVerySmallSquare: "\u25AA",
      fjlig: "fj",
      flat: "\u266D",
      fllig: "\uFB02",
      fltns: "\u25B1",
      fnof: "\u0192",
      Fopf: "\u{1D53D}",
      fopf: "\u{1D557}",
      ForAll: "\u2200",
      forall: "\u2200",
      fork: "\u22D4",
      forkv: "\u2AD9",
      Fouriertrf: "\u2131",
      fpartint: "\u2A0D",
      frac12: "\xBD",
      frac13: "\u2153",
      frac14: "\xBC",
      frac15: "\u2155",
      frac16: "\u2159",
      frac18: "\u215B",
      frac23: "\u2154",
      frac25: "\u2156",
      frac34: "\xBE",
      frac35: "\u2157",
      frac38: "\u215C",
      frac45: "\u2158",
      frac56: "\u215A",
      frac58: "\u215D",
      frac78: "\u215E",
      frasl: "\u2044",
      frown: "\u2322",
      Fscr: "\u2131",
      fscr: "\u{1D4BB}",
      gacute: "\u01F5",
      Gamma: "\u0393",
      gamma: "\u03B3",
      Gammad: "\u03DC",
      gammad: "\u03DD",
      gap: "\u2A86",
      Gbreve: "\u011E",
      gbreve: "\u011F",
      Gcedil: "\u0122",
      Gcirc: "\u011C",
      gcirc: "\u011D",
      Gcy: "\u0413",
      gcy: "\u0433",
      Gdot: "\u0120",
      gdot: "\u0121",
      gE: "\u2267",
      ge: "\u2265",
      gEl: "\u2A8C",
      gel: "\u22DB",
      geq: "\u2265",
      geqq: "\u2267",
      geqslant: "\u2A7E",
      ges: "\u2A7E",
      gescc: "\u2AA9",
      gesdot: "\u2A80",
      gesdoto: "\u2A82",
      gesdotol: "\u2A84",
      gesl: "\u22DB\uFE00",
      gesles: "\u2A94",
      Gfr: "\u{1D50A}",
      gfr: "\u{1D524}",
      Gg: "\u22D9",
      gg: "\u226B",
      ggg: "\u22D9",
      gimel: "\u2137",
      GJcy: "\u0403",
      gjcy: "\u0453",
      gl: "\u2277",
      gla: "\u2AA5",
      glE: "\u2A92",
      glj: "\u2AA4",
      gnap: "\u2A8A",
      gnapprox: "\u2A8A",
      gnE: "\u2269",
      gne: "\u2A88",
      gneq: "\u2A88",
      gneqq: "\u2269",
      gnsim: "\u22E7",
      Gopf: "\u{1D53E}",
      gopf: "\u{1D558}",
      grave: "`",
      GreaterEqual: "\u2265",
      GreaterEqualLess: "\u22DB",
      GreaterFullEqual: "\u2267",
      GreaterGreater: "\u2AA2",
      GreaterLess: "\u2277",
      GreaterSlantEqual: "\u2A7E",
      GreaterTilde: "\u2273",
      Gscr: "\u{1D4A2}",
      gscr: "\u210A",
      gsim: "\u2273",
      gsime: "\u2A8E",
      gsiml: "\u2A90",
      Gt: "\u226B",
      GT: ">",
      gt: ">",
      gtcc: "\u2AA7",
      gtcir: "\u2A7A",
      gtdot: "\u22D7",
      gtlPar: "\u2995",
      gtquest: "\u2A7C",
      gtrapprox: "\u2A86",
      gtrarr: "\u2978",
      gtrdot: "\u22D7",
      gtreqless: "\u22DB",
      gtreqqless: "\u2A8C",
      gtrless: "\u2277",
      gtrsim: "\u2273",
      gvertneqq: "\u2269\uFE00",
      gvnE: "\u2269\uFE00",
      Hacek: "\u02C7",
      hairsp: "\u200A",
      half: "\xBD",
      hamilt: "\u210B",
      HARDcy: "\u042A",
      hardcy: "\u044A",
      hArr: "\u21D4",
      harr: "\u2194",
      harrcir: "\u2948",
      harrw: "\u21AD",
      Hat: "^",
      hbar: "\u210F",
      Hcirc: "\u0124",
      hcirc: "\u0125",
      hearts: "\u2665",
      heartsuit: "\u2665",
      hellip: "\u2026",
      hercon: "\u22B9",
      Hfr: "\u210C",
      hfr: "\u{1D525}",
      HilbertSpace: "\u210B",
      hksearow: "\u2925",
      hkswarow: "\u2926",
      hoarr: "\u21FF",
      homtht: "\u223B",
      hookleftarrow: "\u21A9",
      hookrightarrow: "\u21AA",
      Hopf: "\u210D",
      hopf: "\u{1D559}",
      horbar: "\u2015",
      HorizontalLine: "\u2500",
      Hscr: "\u210B",
      hscr: "\u{1D4BD}",
      hslash: "\u210F",
      Hstrok: "\u0126",
      hstrok: "\u0127",
      HumpDownHump: "\u224E",
      HumpEqual: "\u224F",
      hybull: "\u2043",
      hyphen: "\u2010",
      Iacute: "\xCD",
      iacute: "\xED",
      ic: "\u2063",
      Icirc: "\xCE",
      icirc: "\xEE",
      Icy: "\u0418",
      icy: "\u0438",
      Idot: "\u0130",
      IEcy: "\u0415",
      iecy: "\u0435",
      iexcl: "\xA1",
      iff: "\u21D4",
      Ifr: "\u2111",
      ifr: "\u{1D526}",
      Igrave: "\xCC",
      igrave: "\xEC",
      ii: "\u2148",
      iiiint: "\u2A0C",
      iiint: "\u222D",
      iinfin: "\u29DC",
      iiota: "\u2129",
      IJlig: "\u0132",
      ijlig: "\u0133",
      Im: "\u2111",
      Imacr: "\u012A",
      imacr: "\u012B",
      image: "\u2111",
      ImaginaryI: "\u2148",
      imagline: "\u2110",
      imagpart: "\u2111",
      imath: "\u0131",
      imof: "\u22B7",
      imped: "\u01B5",
      Implies: "\u21D2",
      in: "\u2208",
      incare: "\u2105",
      infin: "\u221E",
      infintie: "\u29DD",
      inodot: "\u0131",
      Int: "\u222C",
      int: "\u222B",
      intcal: "\u22BA",
      integers: "\u2124",
      Integral: "\u222B",
      intercal: "\u22BA",
      Intersection: "\u22C2",
      intlarhk: "\u2A17",
      intprod: "\u2A3C",
      InvisibleComma: "\u2063",
      InvisibleTimes: "\u2062",
      IOcy: "\u0401",
      iocy: "\u0451",
      Iogon: "\u012E",
      iogon: "\u012F",
      Iopf: "\u{1D540}",
      iopf: "\u{1D55A}",
      Iota: "\u0399",
      iota: "\u03B9",
      iprod: "\u2A3C",
      iquest: "\xBF",
      Iscr: "\u2110",
      iscr: "\u{1D4BE}",
      isin: "\u2208",
      isindot: "\u22F5",
      isinE: "\u22F9",
      isins: "\u22F4",
      isinsv: "\u22F3",
      isinv: "\u2208",
      it: "\u2062",
      Itilde: "\u0128",
      itilde: "\u0129",
      Iukcy: "\u0406",
      iukcy: "\u0456",
      Iuml: "\xCF",
      iuml: "\xEF",
      Jcirc: "\u0134",
      jcirc: "\u0135",
      Jcy: "\u0419",
      jcy: "\u0439",
      Jfr: "\u{1D50D}",
      jfr: "\u{1D527}",
      jmath: "\u0237",
      Jopf: "\u{1D541}",
      jopf: "\u{1D55B}",
      Jscr: "\u{1D4A5}",
      jscr: "\u{1D4BF}",
      Jsercy: "\u0408",
      jsercy: "\u0458",
      Jukcy: "\u0404",
      jukcy: "\u0454",
      Kappa: "\u039A",
      kappa: "\u03BA",
      kappav: "\u03F0",
      Kcedil: "\u0136",
      kcedil: "\u0137",
      Kcy: "\u041A",
      kcy: "\u043A",
      Kfr: "\u{1D50E}",
      kfr: "\u{1D528}",
      kgreen: "\u0138",
      KHcy: "\u0425",
      khcy: "\u0445",
      KJcy: "\u040C",
      kjcy: "\u045C",
      Kopf: "\u{1D542}",
      kopf: "\u{1D55C}",
      Kscr: "\u{1D4A6}",
      kscr: "\u{1D4C0}",
      lAarr: "\u21DA",
      Lacute: "\u0139",
      lacute: "\u013A",
      laemptyv: "\u29B4",
      lagran: "\u2112",
      Lambda: "\u039B",
      lambda: "\u03BB",
      Lang: "\u27EA",
      lang: "\u27E8",
      langd: "\u2991",
      langle: "\u27E8",
      lap: "\u2A85",
      Laplacetrf: "\u2112",
      laquo: "\xAB",
      Larr: "\u219E",
      lArr: "\u21D0",
      larr: "\u2190",
      larrb: "\u21E4",
      larrbfs: "\u291F",
      larrfs: "\u291D",
      larrhk: "\u21A9",
      larrlp: "\u21AB",
      larrpl: "\u2939",
      larrsim: "\u2973",
      larrtl: "\u21A2",
      lat: "\u2AAB",
      lAtail: "\u291B",
      latail: "\u2919",
      late: "\u2AAD",
      lates: "\u2AAD\uFE00",
      lBarr: "\u290E",
      lbarr: "\u290C",
      lbbrk: "\u2772",
      lbrace: "{",
      lbrack: "[",
      lbrke: "\u298B",
      lbrksld: "\u298F",
      lbrkslu: "\u298D",
      Lcaron: "\u013D",
      lcaron: "\u013E",
      Lcedil: "\u013B",
      lcedil: "\u013C",
      lceil: "\u2308",
      lcub: "{",
      Lcy: "\u041B",
      lcy: "\u043B",
      ldca: "\u2936",
      ldquo: "\u201C",
      ldquor: "\u201E",
      ldrdhar: "\u2967",
      ldrushar: "\u294B",
      ldsh: "\u21B2",
      lE: "\u2266",
      le: "\u2264",
      LeftAngleBracket: "\u27E8",
      LeftArrow: "\u2190",
      Leftarrow: "\u21D0",
      leftarrow: "\u2190",
      LeftArrowBar: "\u21E4",
      LeftArrowRightArrow: "\u21C6",
      leftarrowtail: "\u21A2",
      LeftCeiling: "\u2308",
      LeftDoubleBracket: "\u27E6",
      LeftDownTeeVector: "\u2961",
      LeftDownVector: "\u21C3",
      LeftDownVectorBar: "\u2959",
      LeftFloor: "\u230A",
      leftharpoondown: "\u21BD",
      leftharpoonup: "\u21BC",
      leftleftarrows: "\u21C7",
      LeftRightArrow: "\u2194",
      Leftrightarrow: "\u21D4",
      leftrightarrow: "\u2194",
      leftrightarrows: "\u21C6",
      leftrightharpoons: "\u21CB",
      leftrightsquigarrow: "\u21AD",
      LeftRightVector: "\u294E",
      LeftTee: "\u22A3",
      LeftTeeArrow: "\u21A4",
      LeftTeeVector: "\u295A",
      leftthreetimes: "\u22CB",
      LeftTriangle: "\u22B2",
      LeftTriangleBar: "\u29CF",
      LeftTriangleEqual: "\u22B4",
      LeftUpDownVector: "\u2951",
      LeftUpTeeVector: "\u2960",
      LeftUpVector: "\u21BF",
      LeftUpVectorBar: "\u2958",
      LeftVector: "\u21BC",
      LeftVectorBar: "\u2952",
      lEg: "\u2A8B",
      leg: "\u22DA",
      leq: "\u2264",
      leqq: "\u2266",
      leqslant: "\u2A7D",
      les: "\u2A7D",
      lescc: "\u2AA8",
      lesdot: "\u2A7F",
      lesdoto: "\u2A81",
      lesdotor: "\u2A83",
      lesg: "\u22DA\uFE00",
      lesges: "\u2A93",
      lessapprox: "\u2A85",
      lessdot: "\u22D6",
      lesseqgtr: "\u22DA",
      lesseqqgtr: "\u2A8B",
      LessEqualGreater: "\u22DA",
      LessFullEqual: "\u2266",
      LessGreater: "\u2276",
      lessgtr: "\u2276",
      LessLess: "\u2AA1",
      lesssim: "\u2272",
      LessSlantEqual: "\u2A7D",
      LessTilde: "\u2272",
      lfisht: "\u297C",
      lfloor: "\u230A",
      Lfr: "\u{1D50F}",
      lfr: "\u{1D529}",
      lg: "\u2276",
      lgE: "\u2A91",
      lHar: "\u2962",
      lhard: "\u21BD",
      lharu: "\u21BC",
      lharul: "\u296A",
      lhblk: "\u2584",
      LJcy: "\u0409",
      ljcy: "\u0459",
      Ll: "\u22D8",
      ll: "\u226A",
      llarr: "\u21C7",
      llcorner: "\u231E",
      Lleftarrow: "\u21DA",
      llhard: "\u296B",
      lltri: "\u25FA",
      Lmidot: "\u013F",
      lmidot: "\u0140",
      lmoust: "\u23B0",
      lmoustache: "\u23B0",
      lnap: "\u2A89",
      lnapprox: "\u2A89",
      lnE: "\u2268",
      lne: "\u2A87",
      lneq: "\u2A87",
      lneqq: "\u2268",
      lnsim: "\u22E6",
      loang: "\u27EC",
      loarr: "\u21FD",
      lobrk: "\u27E6",
      LongLeftArrow: "\u27F5",
      Longleftarrow: "\u27F8",
      longleftarrow: "\u27F5",
      LongLeftRightArrow: "\u27F7",
      Longleftrightarrow: "\u27FA",
      longleftrightarrow: "\u27F7",
      longmapsto: "\u27FC",
      LongRightArrow: "\u27F6",
      Longrightarrow: "\u27F9",
      longrightarrow: "\u27F6",
      looparrowleft: "\u21AB",
      looparrowright: "\u21AC",
      lopar: "\u2985",
      Lopf: "\u{1D543}",
      lopf: "\u{1D55D}",
      loplus: "\u2A2D",
      lotimes: "\u2A34",
      lowast: "\u2217",
      lowbar: "_",
      LowerLeftArrow: "\u2199",
      LowerRightArrow: "\u2198",
      loz: "\u25CA",
      lozenge: "\u25CA",
      lozf: "\u29EB",
      lpar: "(",
      lparlt: "\u2993",
      lrarr: "\u21C6",
      lrcorner: "\u231F",
      lrhar: "\u21CB",
      lrhard: "\u296D",
      lrm: "\u200E",
      lrtri: "\u22BF",
      lsaquo: "\u2039",
      Lscr: "\u2112",
      lscr: "\u{1D4C1}",
      Lsh: "\u21B0",
      lsh: "\u21B0",
      lsim: "\u2272",
      lsime: "\u2A8D",
      lsimg: "\u2A8F",
      lsqb: "[",
      lsquo: "\u2018",
      lsquor: "\u201A",
      Lstrok: "\u0141",
      lstrok: "\u0142",
      Lt: "\u226A",
      LT: "<",
      lt: "<",
      ltcc: "\u2AA6",
      ltcir: "\u2A79",
      ltdot: "\u22D6",
      lthree: "\u22CB",
      ltimes: "\u22C9",
      ltlarr: "\u2976",
      ltquest: "\u2A7B",
      ltri: "\u25C3",
      ltrie: "\u22B4",
      ltrif: "\u25C2",
      ltrPar: "\u2996",
      lurdshar: "\u294A",
      luruhar: "\u2966",
      lvertneqq: "\u2268\uFE00",
      lvnE: "\u2268\uFE00",
      macr: "\xAF",
      male: "\u2642",
      malt: "\u2720",
      maltese: "\u2720",
      Map: "\u2905",
      map: "\u21A6",
      mapsto: "\u21A6",
      mapstodown: "\u21A7",
      mapstoleft: "\u21A4",
      mapstoup: "\u21A5",
      marker: "\u25AE",
      mcomma: "\u2A29",
      Mcy: "\u041C",
      mcy: "\u043C",
      mdash: "\u2014",
      mDDot: "\u223A",
      measuredangle: "\u2221",
      MediumSpace: "\u205F",
      Mellintrf: "\u2133",
      Mfr: "\u{1D510}",
      mfr: "\u{1D52A}",
      mho: "\u2127",
      micro: "\xB5",
      mid: "\u2223",
      midast: "*",
      midcir: "\u2AF0",
      middot: "\xB7",
      minus: "\u2212",
      minusb: "\u229F",
      minusd: "\u2238",
      minusdu: "\u2A2A",
      MinusPlus: "\u2213",
      mlcp: "\u2ADB",
      mldr: "\u2026",
      mnplus: "\u2213",
      models: "\u22A7",
      Mopf: "\u{1D544}",
      mopf: "\u{1D55E}",
      mp: "\u2213",
      Mscr: "\u2133",
      mscr: "\u{1D4C2}",
      mstpos: "\u223E",
      Mu: "\u039C",
      mu: "\u03BC",
      multimap: "\u22B8",
      mumap: "\u22B8",
      nabla: "\u2207",
      Nacute: "\u0143",
      nacute: "\u0144",
      nang: "\u2220\u20D2",
      nap: "\u2249",
      napE: "\u2A70\u0338",
      napid: "\u224B\u0338",
      napos: "\u0149",
      napprox: "\u2249",
      natur: "\u266E",
      natural: "\u266E",
      naturals: "\u2115",
      nbsp: "\xA0",
      nbump: "\u224E\u0338",
      nbumpe: "\u224F\u0338",
      ncap: "\u2A43",
      Ncaron: "\u0147",
      ncaron: "\u0148",
      Ncedil: "\u0145",
      ncedil: "\u0146",
      ncong: "\u2247",
      ncongdot: "\u2A6D\u0338",
      ncup: "\u2A42",
      Ncy: "\u041D",
      ncy: "\u043D",
      ndash: "\u2013",
      ne: "\u2260",
      nearhk: "\u2924",
      neArr: "\u21D7",
      nearr: "\u2197",
      nearrow: "\u2197",
      nedot: "\u2250\u0338",
      NegativeMediumSpace: "\u200B",
      NegativeThickSpace: "\u200B",
      NegativeThinSpace: "\u200B",
      NegativeVeryThinSpace: "\u200B",
      nequiv: "\u2262",
      nesear: "\u2928",
      nesim: "\u2242\u0338",
      NestedGreaterGreater: "\u226B",
      NestedLessLess: "\u226A",
      NewLine: "\n",
      nexist: "\u2204",
      nexists: "\u2204",
      Nfr: "\u{1D511}",
      nfr: "\u{1D52B}",
      ngE: "\u2267\u0338",
      nge: "\u2271",
      ngeq: "\u2271",
      ngeqq: "\u2267\u0338",
      ngeqslant: "\u2A7E\u0338",
      nges: "\u2A7E\u0338",
      nGg: "\u22D9\u0338",
      ngsim: "\u2275",
      nGt: "\u226B\u20D2",
      ngt: "\u226F",
      ngtr: "\u226F",
      nGtv: "\u226B\u0338",
      nhArr: "\u21CE",
      nharr: "\u21AE",
      nhpar: "\u2AF2",
      ni: "\u220B",
      nis: "\u22FC",
      nisd: "\u22FA",
      niv: "\u220B",
      NJcy: "\u040A",
      njcy: "\u045A",
      nlArr: "\u21CD",
      nlarr: "\u219A",
      nldr: "\u2025",
      nlE: "\u2266\u0338",
      nle: "\u2270",
      nLeftarrow: "\u21CD",
      nleftarrow: "\u219A",
      nLeftrightarrow: "\u21CE",
      nleftrightarrow: "\u21AE",
      nleq: "\u2270",
      nleqq: "\u2266\u0338",
      nleqslant: "\u2A7D\u0338",
      nles: "\u2A7D\u0338",
      nless: "\u226E",
      nLl: "\u22D8\u0338",
      nlsim: "\u2274",
      nLt: "\u226A\u20D2",
      nlt: "\u226E",
      nltri: "\u22EA",
      nltrie: "\u22EC",
      nLtv: "\u226A\u0338",
      nmid: "\u2224",
      NoBreak: "\u2060",
      NonBreakingSpace: "\xA0",
      Nopf: "\u2115",
      nopf: "\u{1D55F}",
      Not: "\u2AEC",
      not: "\xAC",
      NotCongruent: "\u2262",
      NotCupCap: "\u226D",
      NotDoubleVerticalBar: "\u2226",
      NotElement: "\u2209",
      NotEqual: "\u2260",
      NotEqualTilde: "\u2242\u0338",
      NotExists: "\u2204",
      NotGreater: "\u226F",
      NotGreaterEqual: "\u2271",
      NotGreaterFullEqual: "\u2267\u0338",
      NotGreaterGreater: "\u226B\u0338",
      NotGreaterLess: "\u2279",
      NotGreaterSlantEqual: "\u2A7E\u0338",
      NotGreaterTilde: "\u2275",
      NotHumpDownHump: "\u224E\u0338",
      NotHumpEqual: "\u224F\u0338",
      notin: "\u2209",
      notindot: "\u22F5\u0338",
      notinE: "\u22F9\u0338",
      notinva: "\u2209",
      notinvb: "\u22F7",
      notinvc: "\u22F6",
      NotLeftTriangle: "\u22EA",
      NotLeftTriangleBar: "\u29CF\u0338",
      NotLeftTriangleEqual: "\u22EC",
      NotLess: "\u226E",
      NotLessEqual: "\u2270",
      NotLessGreater: "\u2278",
      NotLessLess: "\u226A\u0338",
      NotLessSlantEqual: "\u2A7D\u0338",
      NotLessTilde: "\u2274",
      NotNestedGreaterGreater: "\u2AA2\u0338",
      NotNestedLessLess: "\u2AA1\u0338",
      notni: "\u220C",
      notniva: "\u220C",
      notnivb: "\u22FE",
      notnivc: "\u22FD",
      NotPrecedes: "\u2280",
      NotPrecedesEqual: "\u2AAF\u0338",
      NotPrecedesSlantEqual: "\u22E0",
      NotReverseElement: "\u220C",
      NotRightTriangle: "\u22EB",
      NotRightTriangleBar: "\u29D0\u0338",
      NotRightTriangleEqual: "\u22ED",
      NotSquareSubset: "\u228F\u0338",
      NotSquareSubsetEqual: "\u22E2",
      NotSquareSuperset: "\u2290\u0338",
      NotSquareSupersetEqual: "\u22E3",
      NotSubset: "\u2282\u20D2",
      NotSubsetEqual: "\u2288",
      NotSucceeds: "\u2281",
      NotSucceedsEqual: "\u2AB0\u0338",
      NotSucceedsSlantEqual: "\u22E1",
      NotSucceedsTilde: "\u227F\u0338",
      NotSuperset: "\u2283\u20D2",
      NotSupersetEqual: "\u2289",
      NotTilde: "\u2241",
      NotTildeEqual: "\u2244",
      NotTildeFullEqual: "\u2247",
      NotTildeTilde: "\u2249",
      NotVerticalBar: "\u2224",
      npar: "\u2226",
      nparallel: "\u2226",
      nparsl: "\u2AFD\u20E5",
      npart: "\u2202\u0338",
      npolint: "\u2A14",
      npr: "\u2280",
      nprcue: "\u22E0",
      npre: "\u2AAF\u0338",
      nprec: "\u2280",
      npreceq: "\u2AAF\u0338",
      nrArr: "\u21CF",
      nrarr: "\u219B",
      nrarrc: "\u2933\u0338",
      nrarrw: "\u219D\u0338",
      nRightarrow: "\u21CF",
      nrightarrow: "\u219B",
      nrtri: "\u22EB",
      nrtrie: "\u22ED",
      nsc: "\u2281",
      nsccue: "\u22E1",
      nsce: "\u2AB0\u0338",
      Nscr: "\u{1D4A9}",
      nscr: "\u{1D4C3}",
      nshortmid: "\u2224",
      nshortparallel: "\u2226",
      nsim: "\u2241",
      nsime: "\u2244",
      nsimeq: "\u2244",
      nsmid: "\u2224",
      nspar: "\u2226",
      nsqsube: "\u22E2",
      nsqsupe: "\u22E3",
      nsub: "\u2284",
      nsubE: "\u2AC5\u0338",
      nsube: "\u2288",
      nsubset: "\u2282\u20D2",
      nsubseteq: "\u2288",
      nsubseteqq: "\u2AC5\u0338",
      nsucc: "\u2281",
      nsucceq: "\u2AB0\u0338",
      nsup: "\u2285",
      nsupE: "\u2AC6\u0338",
      nsupe: "\u2289",
      nsupset: "\u2283\u20D2",
      nsupseteq: "\u2289",
      nsupseteqq: "\u2AC6\u0338",
      ntgl: "\u2279",
      Ntilde: "\xD1",
      ntilde: "\xF1",
      ntlg: "\u2278",
      ntriangleleft: "\u22EA",
      ntrianglelefteq: "\u22EC",
      ntriangleright: "\u22EB",
      ntrianglerighteq: "\u22ED",
      Nu: "\u039D",
      nu: "\u03BD",
      num: "#",
      numero: "\u2116",
      numsp: "\u2007",
      nvap: "\u224D\u20D2",
      nVDash: "\u22AF",
      nVdash: "\u22AE",
      nvDash: "\u22AD",
      nvdash: "\u22AC",
      nvge: "\u2265\u20D2",
      nvgt: ">\u20D2",
      nvHarr: "\u2904",
      nvinfin: "\u29DE",
      nvlArr: "\u2902",
      nvle: "\u2264\u20D2",
      nvlt: "<\u20D2",
      nvltrie: "\u22B4\u20D2",
      nvrArr: "\u2903",
      nvrtrie: "\u22B5\u20D2",
      nvsim: "\u223C\u20D2",
      nwarhk: "\u2923",
      nwArr: "\u21D6",
      nwarr: "\u2196",
      nwarrow: "\u2196",
      nwnear: "\u2927",
      Oacute: "\xD3",
      oacute: "\xF3",
      oast: "\u229B",
      ocir: "\u229A",
      Ocirc: "\xD4",
      ocirc: "\xF4",
      Ocy: "\u041E",
      ocy: "\u043E",
      odash: "\u229D",
      Odblac: "\u0150",
      odblac: "\u0151",
      odiv: "\u2A38",
      odot: "\u2299",
      odsold: "\u29BC",
      OElig: "\u0152",
      oelig: "\u0153",
      ofcir: "\u29BF",
      Ofr: "\u{1D512}",
      ofr: "\u{1D52C}",
      ogon: "\u02DB",
      Ograve: "\xD2",
      ograve: "\xF2",
      ogt: "\u29C1",
      ohbar: "\u29B5",
      ohm: "\u03A9",
      oint: "\u222E",
      olarr: "\u21BA",
      olcir: "\u29BE",
      olcross: "\u29BB",
      oline: "\u203E",
      olt: "\u29C0",
      Omacr: "\u014C",
      omacr: "\u014D",
      Omega: "\u03A9",
      omega: "\u03C9",
      Omicron: "\u039F",
      omicron: "\u03BF",
      omid: "\u29B6",
      ominus: "\u2296",
      Oopf: "\u{1D546}",
      oopf: "\u{1D560}",
      opar: "\u29B7",
      OpenCurlyDoubleQuote: "\u201C",
      OpenCurlyQuote: "\u2018",
      operp: "\u29B9",
      oplus: "\u2295",
      Or: "\u2A54",
      or: "\u2228",
      orarr: "\u21BB",
      ord: "\u2A5D",
      order: "\u2134",
      orderof: "\u2134",
      ordf: "\xAA",
      ordm: "\xBA",
      origof: "\u22B6",
      oror: "\u2A56",
      orslope: "\u2A57",
      orv: "\u2A5B",
      oS: "\u24C8",
      Oscr: "\u{1D4AA}",
      oscr: "\u2134",
      Oslash: "\xD8",
      oslash: "\xF8",
      osol: "\u2298",
      Otilde: "\xD5",
      otilde: "\xF5",
      Otimes: "\u2A37",
      otimes: "\u2297",
      otimesas: "\u2A36",
      Ouml: "\xD6",
      ouml: "\xF6",
      ovbar: "\u233D",
      OverBar: "\u203E",
      OverBrace: "\u23DE",
      OverBracket: "\u23B4",
      OverParenthesis: "\u23DC",
      par: "\u2225",
      para: "\xB6",
      parallel: "\u2225",
      parsim: "\u2AF3",
      parsl: "\u2AFD",
      part: "\u2202",
      PartialD: "\u2202",
      Pcy: "\u041F",
      pcy: "\u043F",
      percnt: "%",
      period: ".",
      permil: "\u2030",
      perp: "\u22A5",
      pertenk: "\u2031",
      Pfr: "\u{1D513}",
      pfr: "\u{1D52D}",
      Phi: "\u03A6",
      phi: "\u03C6",
      phiv: "\u03D5",
      phmmat: "\u2133",
      phone: "\u260E",
      Pi: "\u03A0",
      pi: "\u03C0",
      pitchfork: "\u22D4",
      piv: "\u03D6",
      planck: "\u210F",
      planckh: "\u210E",
      plankv: "\u210F",
      plus: "+",
      plusacir: "\u2A23",
      plusb: "\u229E",
      pluscir: "\u2A22",
      plusdo: "\u2214",
      plusdu: "\u2A25",
      pluse: "\u2A72",
      PlusMinus: "\xB1",
      plusmn: "\xB1",
      plussim: "\u2A26",
      plustwo: "\u2A27",
      pm: "\xB1",
      Poincareplane: "\u210C",
      pointint: "\u2A15",
      Popf: "\u2119",
      popf: "\u{1D561}",
      pound: "\xA3",
      Pr: "\u2ABB",
      pr: "\u227A",
      prap: "\u2AB7",
      prcue: "\u227C",
      prE: "\u2AB3",
      pre: "\u2AAF",
      prec: "\u227A",
      precapprox: "\u2AB7",
      preccurlyeq: "\u227C",
      Precedes: "\u227A",
      PrecedesEqual: "\u2AAF",
      PrecedesSlantEqual: "\u227C",
      PrecedesTilde: "\u227E",
      preceq: "\u2AAF",
      precnapprox: "\u2AB9",
      precneqq: "\u2AB5",
      precnsim: "\u22E8",
      precsim: "\u227E",
      Prime: "\u2033",
      prime: "\u2032",
      primes: "\u2119",
      prnap: "\u2AB9",
      prnE: "\u2AB5",
      prnsim: "\u22E8",
      prod: "\u220F",
      Product: "\u220F",
      profalar: "\u232E",
      profline: "\u2312",
      profsurf: "\u2313",
      prop: "\u221D",
      Proportion: "\u2237",
      Proportional: "\u221D",
      propto: "\u221D",
      prsim: "\u227E",
      prurel: "\u22B0",
      Pscr: "\u{1D4AB}",
      pscr: "\u{1D4C5}",
      Psi: "\u03A8",
      psi: "\u03C8",
      puncsp: "\u2008",
      Qfr: "\u{1D514}",
      qfr: "\u{1D52E}",
      qint: "\u2A0C",
      Qopf: "\u211A",
      qopf: "\u{1D562}",
      qprime: "\u2057",
      Qscr: "\u{1D4AC}",
      qscr: "\u{1D4C6}",
      quaternions: "\u210D",
      quatint: "\u2A16",
      quest: "?",
      questeq: "\u225F",
      QUOT: '"',
      quot: '"',
      rAarr: "\u21DB",
      race: "\u223D\u0331",
      Racute: "\u0154",
      racute: "\u0155",
      radic: "\u221A",
      raemptyv: "\u29B3",
      Rang: "\u27EB",
      rang: "\u27E9",
      rangd: "\u2992",
      range: "\u29A5",
      rangle: "\u27E9",
      raquo: "\xBB",
      Rarr: "\u21A0",
      rArr: "\u21D2",
      rarr: "\u2192",
      rarrap: "\u2975",
      rarrb: "\u21E5",
      rarrbfs: "\u2920",
      rarrc: "\u2933",
      rarrfs: "\u291E",
      rarrhk: "\u21AA",
      rarrlp: "\u21AC",
      rarrpl: "\u2945",
      rarrsim: "\u2974",
      Rarrtl: "\u2916",
      rarrtl: "\u21A3",
      rarrw: "\u219D",
      rAtail: "\u291C",
      ratail: "\u291A",
      ratio: "\u2236",
      rationals: "\u211A",
      RBarr: "\u2910",
      rBarr: "\u290F",
      rbarr: "\u290D",
      rbbrk: "\u2773",
      rbrace: "}",
      rbrack: "]",
      rbrke: "\u298C",
      rbrksld: "\u298E",
      rbrkslu: "\u2990",
      Rcaron: "\u0158",
      rcaron: "\u0159",
      Rcedil: "\u0156",
      rcedil: "\u0157",
      rceil: "\u2309",
      rcub: "}",
      Rcy: "\u0420",
      rcy: "\u0440",
      rdca: "\u2937",
      rdldhar: "\u2969",
      rdquo: "\u201D",
      rdquor: "\u201D",
      rdsh: "\u21B3",
      Re: "\u211C",
      real: "\u211C",
      realine: "\u211B",
      realpart: "\u211C",
      reals: "\u211D",
      rect: "\u25AD",
      REG: "\xAE",
      reg: "\xAE",
      ReverseElement: "\u220B",
      ReverseEquilibrium: "\u21CB",
      ReverseUpEquilibrium: "\u296F",
      rfisht: "\u297D",
      rfloor: "\u230B",
      Rfr: "\u211C",
      rfr: "\u{1D52F}",
      rHar: "\u2964",
      rhard: "\u21C1",
      rharu: "\u21C0",
      rharul: "\u296C",
      Rho: "\u03A1",
      rho: "\u03C1",
      rhov: "\u03F1",
      RightAngleBracket: "\u27E9",
      RightArrow: "\u2192",
      Rightarrow: "\u21D2",
      rightarrow: "\u2192",
      RightArrowBar: "\u21E5",
      RightArrowLeftArrow: "\u21C4",
      rightarrowtail: "\u21A3",
      RightCeiling: "\u2309",
      RightDoubleBracket: "\u27E7",
      RightDownTeeVector: "\u295D",
      RightDownVector: "\u21C2",
      RightDownVectorBar: "\u2955",
      RightFloor: "\u230B",
      rightharpoondown: "\u21C1",
      rightharpoonup: "\u21C0",
      rightleftarrows: "\u21C4",
      rightleftharpoons: "\u21CC",
      rightrightarrows: "\u21C9",
      rightsquigarrow: "\u219D",
      RightTee: "\u22A2",
      RightTeeArrow: "\u21A6",
      RightTeeVector: "\u295B",
      rightthreetimes: "\u22CC",
      RightTriangle: "\u22B3",
      RightTriangleBar: "\u29D0",
      RightTriangleEqual: "\u22B5",
      RightUpDownVector: "\u294F",
      RightUpTeeVector: "\u295C",
      RightUpVector: "\u21BE",
      RightUpVectorBar: "\u2954",
      RightVector: "\u21C0",
      RightVectorBar: "\u2953",
      ring: "\u02DA",
      risingdotseq: "\u2253",
      rlarr: "\u21C4",
      rlhar: "\u21CC",
      rlm: "\u200F",
      rmoust: "\u23B1",
      rmoustache: "\u23B1",
      rnmid: "\u2AEE",
      roang: "\u27ED",
      roarr: "\u21FE",
      robrk: "\u27E7",
      ropar: "\u2986",
      Ropf: "\u211D",
      ropf: "\u{1D563}",
      roplus: "\u2A2E",
      rotimes: "\u2A35",
      RoundImplies: "\u2970",
      rpar: ")",
      rpargt: "\u2994",
      rppolint: "\u2A12",
      rrarr: "\u21C9",
      Rrightarrow: "\u21DB",
      rsaquo: "\u203A",
      Rscr: "\u211B",
      rscr: "\u{1D4C7}",
      Rsh: "\u21B1",
      rsh: "\u21B1",
      rsqb: "]",
      rsquo: "\u2019",
      rsquor: "\u2019",
      rthree: "\u22CC",
      rtimes: "\u22CA",
      rtri: "\u25B9",
      rtrie: "\u22B5",
      rtrif: "\u25B8",
      rtriltri: "\u29CE",
      RuleDelayed: "\u29F4",
      ruluhar: "\u2968",
      rx: "\u211E",
      Sacute: "\u015A",
      sacute: "\u015B",
      sbquo: "\u201A",
      Sc: "\u2ABC",
      sc: "\u227B",
      scap: "\u2AB8",
      Scaron: "\u0160",
      scaron: "\u0161",
      sccue: "\u227D",
      scE: "\u2AB4",
      sce: "\u2AB0",
      Scedil: "\u015E",
      scedil: "\u015F",
      Scirc: "\u015C",
      scirc: "\u015D",
      scnap: "\u2ABA",
      scnE: "\u2AB6",
      scnsim: "\u22E9",
      scpolint: "\u2A13",
      scsim: "\u227F",
      Scy: "\u0421",
      scy: "\u0441",
      sdot: "\u22C5",
      sdotb: "\u22A1",
      sdote: "\u2A66",
      searhk: "\u2925",
      seArr: "\u21D8",
      searr: "\u2198",
      searrow: "\u2198",
      sect: "\xA7",
      semi: ";",
      seswar: "\u2929",
      setminus: "\u2216",
      setmn: "\u2216",
      sext: "\u2736",
      Sfr: "\u{1D516}",
      sfr: "\u{1D530}",
      sfrown: "\u2322",
      sharp: "\u266F",
      SHCHcy: "\u0429",
      shchcy: "\u0449",
      SHcy: "\u0428",
      shcy: "\u0448",
      ShortDownArrow: "\u2193",
      ShortLeftArrow: "\u2190",
      shortmid: "\u2223",
      shortparallel: "\u2225",
      ShortRightArrow: "\u2192",
      ShortUpArrow: "\u2191",
      shy: "\xAD",
      Sigma: "\u03A3",
      sigma: "\u03C3",
      sigmaf: "\u03C2",
      sigmav: "\u03C2",
      sim: "\u223C",
      simdot: "\u2A6A",
      sime: "\u2243",
      simeq: "\u2243",
      simg: "\u2A9E",
      simgE: "\u2AA0",
      siml: "\u2A9D",
      simlE: "\u2A9F",
      simne: "\u2246",
      simplus: "\u2A24",
      simrarr: "\u2972",
      slarr: "\u2190",
      SmallCircle: "\u2218",
      smallsetminus: "\u2216",
      smashp: "\u2A33",
      smeparsl: "\u29E4",
      smid: "\u2223",
      smile: "\u2323",
      smt: "\u2AAA",
      smte: "\u2AAC",
      smtes: "\u2AAC\uFE00",
      SOFTcy: "\u042C",
      softcy: "\u044C",
      sol: "/",
      solb: "\u29C4",
      solbar: "\u233F",
      Sopf: "\u{1D54A}",
      sopf: "\u{1D564}",
      spades: "\u2660",
      spadesuit: "\u2660",
      spar: "\u2225",
      sqcap: "\u2293",
      sqcaps: "\u2293\uFE00",
      sqcup: "\u2294",
      sqcups: "\u2294\uFE00",
      Sqrt: "\u221A",
      sqsub: "\u228F",
      sqsube: "\u2291",
      sqsubset: "\u228F",
      sqsubseteq: "\u2291",
      sqsup: "\u2290",
      sqsupe: "\u2292",
      sqsupset: "\u2290",
      sqsupseteq: "\u2292",
      squ: "\u25A1",
      Square: "\u25A1",
      square: "\u25A1",
      SquareIntersection: "\u2293",
      SquareSubset: "\u228F",
      SquareSubsetEqual: "\u2291",
      SquareSuperset: "\u2290",
      SquareSupersetEqual: "\u2292",
      SquareUnion: "\u2294",
      squarf: "\u25AA",
      squf: "\u25AA",
      srarr: "\u2192",
      Sscr: "\u{1D4AE}",
      sscr: "\u{1D4C8}",
      ssetmn: "\u2216",
      ssmile: "\u2323",
      sstarf: "\u22C6",
      Star: "\u22C6",
      star: "\u2606",
      starf: "\u2605",
      straightepsilon: "\u03F5",
      straightphi: "\u03D5",
      strns: "\xAF",
      Sub: "\u22D0",
      sub: "\u2282",
      subdot: "\u2ABD",
      subE: "\u2AC5",
      sube: "\u2286",
      subedot: "\u2AC3",
      submult: "\u2AC1",
      subnE: "\u2ACB",
      subne: "\u228A",
      subplus: "\u2ABF",
      subrarr: "\u2979",
      Subset: "\u22D0",
      subset: "\u2282",
      subseteq: "\u2286",
      subseteqq: "\u2AC5",
      SubsetEqual: "\u2286",
      subsetneq: "\u228A",
      subsetneqq: "\u2ACB",
      subsim: "\u2AC7",
      subsub: "\u2AD5",
      subsup: "\u2AD3",
      succ: "\u227B",
      succapprox: "\u2AB8",
      succcurlyeq: "\u227D",
      Succeeds: "\u227B",
      SucceedsEqual: "\u2AB0",
      SucceedsSlantEqual: "\u227D",
      SucceedsTilde: "\u227F",
      succeq: "\u2AB0",
      succnapprox: "\u2ABA",
      succneqq: "\u2AB6",
      succnsim: "\u22E9",
      succsim: "\u227F",
      SuchThat: "\u220B",
      Sum: "\u2211",
      sum: "\u2211",
      sung: "\u266A",
      Sup: "\u22D1",
      sup: "\u2283",
      sup1: "\xB9",
      sup2: "\xB2",
      sup3: "\xB3",
      supdot: "\u2ABE",
      supdsub: "\u2AD8",
      supE: "\u2AC6",
      supe: "\u2287",
      supedot: "\u2AC4",
      Superset: "\u2283",
      SupersetEqual: "\u2287",
      suphsol: "\u27C9",
      suphsub: "\u2AD7",
      suplarr: "\u297B",
      supmult: "\u2AC2",
      supnE: "\u2ACC",
      supne: "\u228B",
      supplus: "\u2AC0",
      Supset: "\u22D1",
      supset: "\u2283",
      supseteq: "\u2287",
      supseteqq: "\u2AC6",
      supsetneq: "\u228B",
      supsetneqq: "\u2ACC",
      supsim: "\u2AC8",
      supsub: "\u2AD4",
      supsup: "\u2AD6",
      swarhk: "\u2926",
      swArr: "\u21D9",
      swarr: "\u2199",
      swarrow: "\u2199",
      swnwar: "\u292A",
      szlig: "\xDF",
      Tab: "	",
      target: "\u2316",
      Tau: "\u03A4",
      tau: "\u03C4",
      tbrk: "\u23B4",
      Tcaron: "\u0164",
      tcaron: "\u0165",
      Tcedil: "\u0162",
      tcedil: "\u0163",
      Tcy: "\u0422",
      tcy: "\u0442",
      tdot: "\u20DB",
      telrec: "\u2315",
      Tfr: "\u{1D517}",
      tfr: "\u{1D531}",
      there4: "\u2234",
      Therefore: "\u2234",
      therefore: "\u2234",
      Theta: "\u0398",
      theta: "\u03B8",
      thetasym: "\u03D1",
      thetav: "\u03D1",
      thickapprox: "\u2248",
      thicksim: "\u223C",
      ThickSpace: "\u205F\u200A",
      thinsp: "\u2009",
      ThinSpace: "\u2009",
      thkap: "\u2248",
      thksim: "\u223C",
      THORN: "\xDE",
      thorn: "\xFE",
      Tilde: "\u223C",
      tilde: "\u02DC",
      TildeEqual: "\u2243",
      TildeFullEqual: "\u2245",
      TildeTilde: "\u2248",
      times: "\xD7",
      timesb: "\u22A0",
      timesbar: "\u2A31",
      timesd: "\u2A30",
      tint: "\u222D",
      toea: "\u2928",
      top: "\u22A4",
      topbot: "\u2336",
      topcir: "\u2AF1",
      Topf: "\u{1D54B}",
      topf: "\u{1D565}",
      topfork: "\u2ADA",
      tosa: "\u2929",
      tprime: "\u2034",
      TRADE: "\u2122",
      trade: "\u2122",
      triangle: "\u25B5",
      triangledown: "\u25BF",
      triangleleft: "\u25C3",
      trianglelefteq: "\u22B4",
      triangleq: "\u225C",
      triangleright: "\u25B9",
      trianglerighteq: "\u22B5",
      tridot: "\u25EC",
      trie: "\u225C",
      triminus: "\u2A3A",
      TripleDot: "\u20DB",
      triplus: "\u2A39",
      trisb: "\u29CD",
      tritime: "\u2A3B",
      trpezium: "\u23E2",
      Tscr: "\u{1D4AF}",
      tscr: "\u{1D4C9}",
      TScy: "\u0426",
      tscy: "\u0446",
      TSHcy: "\u040B",
      tshcy: "\u045B",
      Tstrok: "\u0166",
      tstrok: "\u0167",
      twixt: "\u226C",
      twoheadleftarrow: "\u219E",
      twoheadrightarrow: "\u21A0",
      Uacute: "\xDA",
      uacute: "\xFA",
      Uarr: "\u219F",
      uArr: "\u21D1",
      uarr: "\u2191",
      Uarrocir: "\u2949",
      Ubrcy: "\u040E",
      ubrcy: "\u045E",
      Ubreve: "\u016C",
      ubreve: "\u016D",
      Ucirc: "\xDB",
      ucirc: "\xFB",
      Ucy: "\u0423",
      ucy: "\u0443",
      udarr: "\u21C5",
      Udblac: "\u0170",
      udblac: "\u0171",
      udhar: "\u296E",
      ufisht: "\u297E",
      Ufr: "\u{1D518}",
      ufr: "\u{1D532}",
      Ugrave: "\xD9",
      ugrave: "\xF9",
      uHar: "\u2963",
      uharl: "\u21BF",
      uharr: "\u21BE",
      uhblk: "\u2580",
      ulcorn: "\u231C",
      ulcorner: "\u231C",
      ulcrop: "\u230F",
      ultri: "\u25F8",
      Umacr: "\u016A",
      umacr: "\u016B",
      uml: "\xA8",
      UnderBar: "_",
      UnderBrace: "\u23DF",
      UnderBracket: "\u23B5",
      UnderParenthesis: "\u23DD",
      Union: "\u22C3",
      UnionPlus: "\u228E",
      Uogon: "\u0172",
      uogon: "\u0173",
      Uopf: "\u{1D54C}",
      uopf: "\u{1D566}",
      UpArrow: "\u2191",
      Uparrow: "\u21D1",
      uparrow: "\u2191",
      UpArrowBar: "\u2912",
      UpArrowDownArrow: "\u21C5",
      UpDownArrow: "\u2195",
      Updownarrow: "\u21D5",
      updownarrow: "\u2195",
      UpEquilibrium: "\u296E",
      upharpoonleft: "\u21BF",
      upharpoonright: "\u21BE",
      uplus: "\u228E",
      UpperLeftArrow: "\u2196",
      UpperRightArrow: "\u2197",
      Upsi: "\u03D2",
      upsi: "\u03C5",
      upsih: "\u03D2",
      Upsilon: "\u03A5",
      upsilon: "\u03C5",
      UpTee: "\u22A5",
      UpTeeArrow: "\u21A5",
      upuparrows: "\u21C8",
      urcorn: "\u231D",
      urcorner: "\u231D",
      urcrop: "\u230E",
      Uring: "\u016E",
      uring: "\u016F",
      urtri: "\u25F9",
      Uscr: "\u{1D4B0}",
      uscr: "\u{1D4CA}",
      utdot: "\u22F0",
      Utilde: "\u0168",
      utilde: "\u0169",
      utri: "\u25B5",
      utrif: "\u25B4",
      uuarr: "\u21C8",
      Uuml: "\xDC",
      uuml: "\xFC",
      uwangle: "\u29A7",
      vangrt: "\u299C",
      varepsilon: "\u03F5",
      varkappa: "\u03F0",
      varnothing: "\u2205",
      varphi: "\u03D5",
      varpi: "\u03D6",
      varpropto: "\u221D",
      vArr: "\u21D5",
      varr: "\u2195",
      varrho: "\u03F1",
      varsigma: "\u03C2",
      varsubsetneq: "\u228A\uFE00",
      varsubsetneqq: "\u2ACB\uFE00",
      varsupsetneq: "\u228B\uFE00",
      varsupsetneqq: "\u2ACC\uFE00",
      vartheta: "\u03D1",
      vartriangleleft: "\u22B2",
      vartriangleright: "\u22B3",
      Vbar: "\u2AEB",
      vBar: "\u2AE8",
      vBarv: "\u2AE9",
      Vcy: "\u0412",
      vcy: "\u0432",
      VDash: "\u22AB",
      Vdash: "\u22A9",
      vDash: "\u22A8",
      vdash: "\u22A2",
      Vdashl: "\u2AE6",
      Vee: "\u22C1",
      vee: "\u2228",
      veebar: "\u22BB",
      veeeq: "\u225A",
      vellip: "\u22EE",
      Verbar: "\u2016",
      verbar: "|",
      Vert: "\u2016",
      vert: "|",
      VerticalBar: "\u2223",
      VerticalLine: "|",
      VerticalSeparator: "\u2758",
      VerticalTilde: "\u2240",
      VeryThinSpace: "\u200A",
      Vfr: "\u{1D519}",
      vfr: "\u{1D533}",
      vltri: "\u22B2",
      vnsub: "\u2282\u20D2",
      vnsup: "\u2283\u20D2",
      Vopf: "\u{1D54D}",
      vopf: "\u{1D567}",
      vprop: "\u221D",
      vrtri: "\u22B3",
      Vscr: "\u{1D4B1}",
      vscr: "\u{1D4CB}",
      vsubnE: "\u2ACB\uFE00",
      vsubne: "\u228A\uFE00",
      vsupnE: "\u2ACC\uFE00",
      vsupne: "\u228B\uFE00",
      Vvdash: "\u22AA",
      vzigzag: "\u299A",
      Wcirc: "\u0174",
      wcirc: "\u0175",
      wedbar: "\u2A5F",
      Wedge: "\u22C0",
      wedge: "\u2227",
      wedgeq: "\u2259",
      weierp: "\u2118",
      Wfr: "\u{1D51A}",
      wfr: "\u{1D534}",
      Wopf: "\u{1D54E}",
      wopf: "\u{1D568}",
      wp: "\u2118",
      wr: "\u2240",
      wreath: "\u2240",
      Wscr: "\u{1D4B2}",
      wscr: "\u{1D4CC}",
      xcap: "\u22C2",
      xcirc: "\u25EF",
      xcup: "\u22C3",
      xdtri: "\u25BD",
      Xfr: "\u{1D51B}",
      xfr: "\u{1D535}",
      xhArr: "\u27FA",
      xharr: "\u27F7",
      Xi: "\u039E",
      xi: "\u03BE",
      xlArr: "\u27F8",
      xlarr: "\u27F5",
      xmap: "\u27FC",
      xnis: "\u22FB",
      xodot: "\u2A00",
      Xopf: "\u{1D54F}",
      xopf: "\u{1D569}",
      xoplus: "\u2A01",
      xotime: "\u2A02",
      xrArr: "\u27F9",
      xrarr: "\u27F6",
      Xscr: "\u{1D4B3}",
      xscr: "\u{1D4CD}",
      xsqcup: "\u2A06",
      xuplus: "\u2A04",
      xutri: "\u25B3",
      xvee: "\u22C1",
      xwedge: "\u22C0",
      Yacute: "\xDD",
      yacute: "\xFD",
      YAcy: "\u042F",
      yacy: "\u044F",
      Ycirc: "\u0176",
      ycirc: "\u0177",
      Ycy: "\u042B",
      ycy: "\u044B",
      yen: "\xA5",
      Yfr: "\u{1D51C}",
      yfr: "\u{1D536}",
      YIcy: "\u0407",
      yicy: "\u0457",
      Yopf: "\u{1D550}",
      yopf: "\u{1D56A}",
      Yscr: "\u{1D4B4}",
      yscr: "\u{1D4CE}",
      YUcy: "\u042E",
      yucy: "\u044E",
      Yuml: "\u0178",
      yuml: "\xFF",
      Zacute: "\u0179",
      zacute: "\u017A",
      Zcaron: "\u017D",
      zcaron: "\u017E",
      Zcy: "\u0417",
      zcy: "\u0437",
      Zdot: "\u017B",
      zdot: "\u017C",
      zeetrf: "\u2128",
      ZeroWidthSpace: "\u200B",
      Zeta: "\u0396",
      zeta: "\u03B6",
      Zfr: "\u2128",
      zfr: "\u{1D537}",
      ZHcy: "\u0416",
      zhcy: "\u0436",
      zigrarr: "\u21DD",
      Zopf: "\u2124",
      zopf: "\u{1D56B}",
      Zscr: "\u{1D4B5}",
      zscr: "\u{1D4CF}",
      zwj: "\u200D",
      zwnj: "\u200C"
    });
    exports2.entityMap = exports2.HTML_ENTITIES;
  }
});

// ../../node_modules/@xmldom/xmldom/lib/sax.js
var require_sax = __commonJS({
  "../../node_modules/@xmldom/xmldom/lib/sax.js"(exports2) {
    var NAMESPACE = require_conventions().NAMESPACE;
    var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
    var nameChar = new RegExp("[\\-\\.0-9" + nameStartChar.source.slice(1, -1) + "\\u00B7\\u0300-\\u036F\\u203F-\\u2040]");
    var tagNamePattern = new RegExp("^" + nameStartChar.source + nameChar.source + "*(?::" + nameStartChar.source + nameChar.source + "*)?$");
    var S_TAG = 0;
    var S_ATTR = 1;
    var S_ATTR_SPACE = 2;
    var S_EQ = 3;
    var S_ATTR_NOQUOT_VALUE = 4;
    var S_ATTR_END = 5;
    var S_TAG_SPACE = 6;
    var S_TAG_CLOSE = 7;
    function ParseError(message, locator) {
      this.message = message;
      this.locator = locator;
      if (Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
    }
    ParseError.prototype = new Error();
    ParseError.prototype.name = ParseError.name;
    function XMLReader() {
    }
    XMLReader.prototype = {
      parse: function(source, defaultNSMap, entityMap) {
        var domBuilder = this.domBuilder;
        domBuilder.startDocument();
        _copy(defaultNSMap, defaultNSMap = {});
        parse(
          source,
          defaultNSMap,
          entityMap,
          domBuilder,
          this.errorHandler
        );
        domBuilder.endDocument();
      }
    };
    function parse(source, defaultNSMapCopy, entityMap, domBuilder, errorHandler) {
      function fixedFromCharCode(code) {
        if (code > 65535) {
          code -= 65536;
          var surrogate1 = 55296 + (code >> 10), surrogate2 = 56320 + (code & 1023);
          return String.fromCharCode(surrogate1, surrogate2);
        } else {
          return String.fromCharCode(code);
        }
      }
      function entityReplacer(a2) {
        var k = a2.slice(1, -1);
        if (k in entityMap) {
          return entityMap[k];
        } else if (k.charAt(0) === "#") {
          return fixedFromCharCode(parseInt(k.substr(1).replace("x", "0x")));
        } else {
          errorHandler.error("entity not found:" + a2);
          return a2;
        }
      }
      function appendText(end2) {
        if (end2 > start) {
          var xt = source.substring(start, end2).replace(/&#?\w+;/g, entityReplacer);
          locator && position(start);
          domBuilder.characters(xt, 0, end2 - start);
          start = end2;
        }
      }
      function position(p, m) {
        while (p >= lineEnd && (m = linePattern.exec(source))) {
          lineStart = m.index;
          lineEnd = lineStart + m[0].length;
          locator.lineNumber++;
        }
        locator.columnNumber = p - lineStart + 1;
      }
      var lineStart = 0;
      var lineEnd = 0;
      var linePattern = /.*(?:\r\n?|\n)|.*$/g;
      var locator = domBuilder.locator;
      var parseStack = [{ currentNSMap: defaultNSMapCopy }];
      var closeMap = {};
      var start = 0;
      while (true) {
        try {
          var tagStart = source.indexOf("<", start);
          if (tagStart < 0) {
            if (!source.substr(start).match(/^\s*$/)) {
              var doc = domBuilder.doc;
              var text = doc.createTextNode(source.substr(start));
              doc.appendChild(text);
              domBuilder.currentElement = text;
            }
            return;
          }
          if (tagStart > start) {
            appendText(tagStart);
          }
          switch (source.charAt(tagStart + 1)) {
            case "/":
              var end = source.indexOf(">", tagStart + 3);
              var tagName = source.substring(tagStart + 2, end).replace(/[ \t\n\r]+$/g, "");
              var config = parseStack.pop();
              if (end < 0) {
                tagName = source.substring(tagStart + 2).replace(/[\s<].*/, "");
                errorHandler.error("end tag name: " + tagName + " is not complete:" + config.tagName);
                end = tagStart + 1 + tagName.length;
              } else if (tagName.match(/\s</)) {
                tagName = tagName.replace(/[\s<].*/, "");
                errorHandler.error("end tag name: " + tagName + " maybe not complete");
                end = tagStart + 1 + tagName.length;
              }
              var localNSMap = config.localNSMap;
              var endMatch = config.tagName == tagName;
              var endIgnoreCaseMach = endMatch || config.tagName && config.tagName.toLowerCase() == tagName.toLowerCase();
              if (endIgnoreCaseMach) {
                domBuilder.endElement(config.uri, config.localName, tagName);
                if (localNSMap) {
                  for (var prefix in localNSMap) {
                    if (Object.prototype.hasOwnProperty.call(localNSMap, prefix)) {
                      domBuilder.endPrefixMapping(prefix);
                    }
                  }
                }
                if (!endMatch) {
                  errorHandler.fatalError("end tag name: " + tagName + " is not match the current start tagName:" + config.tagName);
                }
              } else {
                parseStack.push(config);
              }
              end++;
              break;
            // end elment
            case "?":
              locator && position(tagStart);
              end = parseInstruction(source, tagStart, domBuilder);
              break;
            case "!":
              locator && position(tagStart);
              end = parseDCC(source, tagStart, domBuilder, errorHandler);
              break;
            default:
              locator && position(tagStart);
              var el = new ElementAttributes();
              var currentNSMap = parseStack[parseStack.length - 1].currentNSMap;
              var end = parseElementStartPart(source, tagStart, el, currentNSMap, entityReplacer, errorHandler);
              var len = el.length;
              if (!el.closed && fixSelfClosed(source, end, el.tagName, closeMap)) {
                el.closed = true;
                if (!entityMap.nbsp) {
                  errorHandler.warning("unclosed xml attribute");
                }
              }
              if (locator && len) {
                var locator2 = copyLocator(locator, {});
                for (var i = 0; i < len; i++) {
                  var a = el[i];
                  position(a.offset);
                  a.locator = copyLocator(locator, {});
                }
                domBuilder.locator = locator2;
                if (appendElement(el, domBuilder, currentNSMap)) {
                  parseStack.push(el);
                }
                domBuilder.locator = locator;
              } else {
                if (appendElement(el, domBuilder, currentNSMap)) {
                  parseStack.push(el);
                }
              }
              if (NAMESPACE.isHTML(el.uri) && !el.closed) {
                end = parseHtmlSpecialContent(source, end, el.tagName, entityReplacer, domBuilder);
              } else {
                end++;
              }
          }
        } catch (e) {
          if (e instanceof ParseError) {
            throw e;
          }
          errorHandler.error("element parse error: " + e);
          end = -1;
        }
        if (end > start) {
          start = end;
        } else {
          appendText(Math.max(tagStart, start) + 1);
        }
      }
    }
    function copyLocator(f, t) {
      t.lineNumber = f.lineNumber;
      t.columnNumber = f.columnNumber;
      return t;
    }
    function parseElementStartPart(source, start, el, currentNSMap, entityReplacer, errorHandler) {
      function addAttribute(qname, value2, startIndex) {
        if (el.attributeNames.hasOwnProperty(qname)) {
          errorHandler.fatalError("Attribute " + qname + " redefined");
        }
        el.addValue(qname, value2, startIndex);
      }
      var attrName;
      var value;
      var p = ++start;
      var s = S_TAG;
      while (true) {
        var c = source.charAt(p);
        switch (c) {
          case "=":
            if (s === S_ATTR) {
              attrName = source.slice(start, p);
              s = S_EQ;
            } else if (s === S_ATTR_SPACE) {
              s = S_EQ;
            } else {
              throw new Error("attribute equal must after attrName");
            }
            break;
          case "'":
          case '"':
            if (s === S_EQ || s === S_ATTR) {
              if (s === S_ATTR) {
                errorHandler.warning('attribute value must after "="');
                attrName = source.slice(start, p);
              }
              start = p + 1;
              p = source.indexOf(c, start);
              if (p > 0) {
                value = source.slice(start, p).replace(/&#?\w+;/g, entityReplacer);
                addAttribute(attrName, value, start - 1);
                s = S_ATTR_END;
              } else {
                throw new Error("attribute value no end '" + c + "' match");
              }
            } else if (s == S_ATTR_NOQUOT_VALUE) {
              value = source.slice(start, p).replace(/&#?\w+;/g, entityReplacer);
              addAttribute(attrName, value, start);
              errorHandler.warning('attribute "' + attrName + '" missed start quot(' + c + ")!!");
              start = p + 1;
              s = S_ATTR_END;
            } else {
              throw new Error('attribute value must after "="');
            }
            break;
          case "/":
            switch (s) {
              case S_TAG:
                el.setTagName(source.slice(start, p));
              case S_ATTR_END:
              case S_TAG_SPACE:
              case S_TAG_CLOSE:
                s = S_TAG_CLOSE;
                el.closed = true;
              case S_ATTR_NOQUOT_VALUE:
              case S_ATTR:
                break;
              case S_ATTR_SPACE:
                el.closed = true;
                break;
              //case S_EQ:
              default:
                throw new Error("attribute invalid close char('/')");
            }
            break;
          case "":
            errorHandler.error("unexpected end of input");
            if (s == S_TAG) {
              el.setTagName(source.slice(start, p));
            }
            return p;
          case ">":
            switch (s) {
              case S_TAG:
                el.setTagName(source.slice(start, p));
              case S_ATTR_END:
              case S_TAG_SPACE:
              case S_TAG_CLOSE:
                break;
              //normal
              case S_ATTR_NOQUOT_VALUE:
              //Compatible state
              case S_ATTR:
                value = source.slice(start, p);
                if (value.slice(-1) === "/") {
                  el.closed = true;
                  value = value.slice(0, -1);
                }
              case S_ATTR_SPACE:
                if (s === S_ATTR_SPACE) {
                  value = attrName;
                }
                if (s == S_ATTR_NOQUOT_VALUE) {
                  errorHandler.warning('attribute "' + value + '" missed quot(")!');
                  addAttribute(attrName, value.replace(/&#?\w+;/g, entityReplacer), start);
                } else {
                  if (!NAMESPACE.isHTML(currentNSMap[""]) || !value.match(/^(?:disabled|checked|selected)$/i)) {
                    errorHandler.warning('attribute "' + value + '" missed value!! "' + value + '" instead!!');
                  }
                  addAttribute(value, value, start);
                }
                break;
              case S_EQ:
                throw new Error("attribute value missed!!");
            }
            return p;
          /*xml space '\x20' | #x9 | #xD | #xA; */
          case "\x80":
            c = " ";
          default:
            if (c <= " ") {
              switch (s) {
                case S_TAG:
                  el.setTagName(source.slice(start, p));
                  s = S_TAG_SPACE;
                  break;
                case S_ATTR:
                  attrName = source.slice(start, p);
                  s = S_ATTR_SPACE;
                  break;
                case S_ATTR_NOQUOT_VALUE:
                  var value = source.slice(start, p).replace(/&#?\w+;/g, entityReplacer);
                  errorHandler.warning('attribute "' + value + '" missed quot(")!!');
                  addAttribute(attrName, value, start);
                case S_ATTR_END:
                  s = S_TAG_SPACE;
                  break;
              }
            } else {
              switch (s) {
                //case S_TAG:void();break;
                //case S_ATTR:void();break;
                //case S_ATTR_NOQUOT_VALUE:void();break;
                case S_ATTR_SPACE:
                  var tagName = el.tagName;
                  if (!NAMESPACE.isHTML(currentNSMap[""]) || !attrName.match(/^(?:disabled|checked|selected)$/i)) {
                    errorHandler.warning('attribute "' + attrName + '" missed value!! "' + attrName + '" instead2!!');
                  }
                  addAttribute(attrName, attrName, start);
                  start = p;
                  s = S_ATTR;
                  break;
                case S_ATTR_END:
                  errorHandler.warning('attribute space is required"' + attrName + '"!!');
                case S_TAG_SPACE:
                  s = S_ATTR;
                  start = p;
                  break;
                case S_EQ:
                  s = S_ATTR_NOQUOT_VALUE;
                  start = p;
                  break;
                case S_TAG_CLOSE:
                  throw new Error("elements closed character '/' and '>' must be connected to");
              }
            }
        }
        p++;
      }
    }
    function appendElement(el, domBuilder, currentNSMap) {
      var tagName = el.tagName;
      var localNSMap = null;
      var i = el.length;
      while (i--) {
        var a = el[i];
        var qName = a.qName;
        var value = a.value;
        var nsp = qName.indexOf(":");
        if (nsp > 0) {
          var prefix = a.prefix = qName.slice(0, nsp);
          var localName = qName.slice(nsp + 1);
          var nsPrefix = prefix === "xmlns" && localName;
        } else {
          localName = qName;
          prefix = null;
          nsPrefix = qName === "xmlns" && "";
        }
        a.localName = localName;
        if (nsPrefix !== false) {
          if (localNSMap == null) {
            localNSMap = {};
            _copy(currentNSMap, currentNSMap = {});
          }
          currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
          a.uri = NAMESPACE.XMLNS;
          domBuilder.startPrefixMapping(nsPrefix, value);
        }
      }
      var i = el.length;
      while (i--) {
        a = el[i];
        var prefix = a.prefix;
        if (prefix) {
          if (prefix === "xml") {
            a.uri = NAMESPACE.XML;
          }
          if (prefix !== "xmlns") {
            a.uri = currentNSMap[prefix || ""];
          }
        }
      }
      var nsp = tagName.indexOf(":");
      if (nsp > 0) {
        prefix = el.prefix = tagName.slice(0, nsp);
        localName = el.localName = tagName.slice(nsp + 1);
      } else {
        prefix = null;
        localName = el.localName = tagName;
      }
      var ns = el.uri = currentNSMap[prefix || ""];
      domBuilder.startElement(ns, localName, tagName, el);
      if (el.closed) {
        domBuilder.endElement(ns, localName, tagName);
        if (localNSMap) {
          for (prefix in localNSMap) {
            if (Object.prototype.hasOwnProperty.call(localNSMap, prefix)) {
              domBuilder.endPrefixMapping(prefix);
            }
          }
        }
      } else {
        el.currentNSMap = currentNSMap;
        el.localNSMap = localNSMap;
        return true;
      }
    }
    function parseHtmlSpecialContent(source, elStartEnd, tagName, entityReplacer, domBuilder) {
      if (/^(?:script|textarea)$/i.test(tagName)) {
        var elEndStart = source.indexOf("</" + tagName + ">", elStartEnd);
        var text = source.substring(elStartEnd + 1, elEndStart);
        if (/[&<]/.test(text)) {
          if (/^script$/i.test(tagName)) {
            domBuilder.characters(text, 0, text.length);
            return elEndStart;
          }
          text = text.replace(/&#?\w+;/g, entityReplacer);
          domBuilder.characters(text, 0, text.length);
          return elEndStart;
        }
      }
      return elStartEnd + 1;
    }
    function fixSelfClosed(source, elStartEnd, tagName, closeMap) {
      var pos = closeMap[tagName];
      if (pos == null) {
        pos = source.lastIndexOf("</" + tagName + ">");
        if (pos < elStartEnd) {
          pos = source.lastIndexOf("</" + tagName);
        }
        closeMap[tagName] = pos;
      }
      return pos < elStartEnd;
    }
    function _copy(source, target) {
      for (var n in source) {
        if (Object.prototype.hasOwnProperty.call(source, n)) {
          target[n] = source[n];
        }
      }
    }
    function parseDCC(source, start, domBuilder, errorHandler) {
      var next = source.charAt(start + 2);
      switch (next) {
        case "-":
          if (source.charAt(start + 3) === "-") {
            var end = source.indexOf("-->", start + 4);
            if (end > start) {
              domBuilder.comment(source, start + 4, end - start - 4);
              return end + 3;
            } else {
              errorHandler.error("Unclosed comment");
              return -1;
            }
          } else {
            return -1;
          }
        default:
          if (source.substr(start + 3, 6) == "CDATA[") {
            var end = source.indexOf("]]>", start + 9);
            domBuilder.startCDATA();
            domBuilder.characters(source, start + 9, end - start - 9);
            domBuilder.endCDATA();
            return end + 3;
          }
          var matchs = split(source, start);
          var len = matchs.length;
          if (len > 1 && /!doctype/i.test(matchs[0][0])) {
            var name = matchs[1][0];
            var pubid = false;
            var sysid = false;
            if (len > 3) {
              if (/^public$/i.test(matchs[2][0])) {
                pubid = matchs[3][0];
                sysid = len > 4 && matchs[4][0];
              } else if (/^system$/i.test(matchs[2][0])) {
                sysid = matchs[3][0];
              }
            }
            var lastMatch = matchs[len - 1];
            domBuilder.startDTD(name, pubid, sysid);
            domBuilder.endDTD();
            return lastMatch.index + lastMatch[0].length;
          }
      }
      return -1;
    }
    function parseInstruction(source, start, domBuilder) {
      var end = source.indexOf("?>", start);
      if (end) {
        var match = source.substring(start, end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
        if (match) {
          var len = match[0].length;
          domBuilder.processingInstruction(match[1], match[2]);
          return end + 2;
        } else {
          return -1;
        }
      }
      return -1;
    }
    function ElementAttributes() {
      this.attributeNames = {};
    }
    ElementAttributes.prototype = {
      setTagName: function(tagName) {
        if (!tagNamePattern.test(tagName)) {
          throw new Error("invalid tagName:" + tagName);
        }
        this.tagName = tagName;
      },
      addValue: function(qName, value, offset) {
        if (!tagNamePattern.test(qName)) {
          throw new Error("invalid attribute:" + qName);
        }
        this.attributeNames[qName] = this.length;
        this[this.length++] = { qName, value, offset };
      },
      length: 0,
      getLocalName: function(i) {
        return this[i].localName;
      },
      getLocator: function(i) {
        return this[i].locator;
      },
      getQName: function(i) {
        return this[i].qName;
      },
      getURI: function(i) {
        return this[i].uri;
      },
      getValue: function(i) {
        return this[i].value;
      }
      //	,getIndex:function(uri, localName)){
      //		if(localName){
      //
      //		}else{
      //			var qName = uri
      //		}
      //	},
      //	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
      //	getType:function(uri,localName){}
      //	getType:function(i){},
    };
    function split(source, start) {
      var match;
      var buf = [];
      var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
      reg.lastIndex = start;
      reg.exec(source);
      while (match = reg.exec(source)) {
        buf.push(match);
        if (match[1]) return buf;
      }
    }
    exports2.XMLReader = XMLReader;
    exports2.ParseError = ParseError;
  }
});

// ../../node_modules/@xmldom/xmldom/lib/dom-parser.js
var require_dom_parser = __commonJS({
  "../../node_modules/@xmldom/xmldom/lib/dom-parser.js"(exports2) {
    var conventions = require_conventions();
    var dom = require_dom();
    var entities = require_entities();
    var sax = require_sax();
    var DOMImplementation = dom.DOMImplementation;
    var NAMESPACE = conventions.NAMESPACE;
    var ParseError = sax.ParseError;
    var XMLReader = sax.XMLReader;
    function DOMParser2(options) {
      this.options = options || { locator: {} };
    }
    DOMParser2.prototype.parseFromString = function(source, mimeType) {
      var options = this.options;
      var sax2 = new XMLReader();
      var domBuilder = options.domBuilder || new DOMHandler();
      var errorHandler = options.errorHandler;
      var locator = options.locator;
      var defaultNSMap = options.xmlns || {};
      var isHTML = /\/x?html?$/.test(mimeType);
      var entityMap = isHTML ? entities.HTML_ENTITIES : entities.XML_ENTITIES;
      if (locator) {
        domBuilder.setDocumentLocator(locator);
      }
      sax2.errorHandler = buildErrorHandler(errorHandler, domBuilder, locator);
      sax2.domBuilder = options.domBuilder || domBuilder;
      if (isHTML) {
        defaultNSMap[""] = NAMESPACE.HTML;
      }
      defaultNSMap.xml = defaultNSMap.xml || NAMESPACE.XML;
      if (source && typeof source === "string") {
        sax2.parse(source, defaultNSMap, entityMap);
      } else {
        sax2.errorHandler.error("invalid doc source");
      }
      return domBuilder.doc;
    };
    function buildErrorHandler(errorImpl, domBuilder, locator) {
      if (!errorImpl) {
        if (domBuilder instanceof DOMHandler) {
          return domBuilder;
        }
        errorImpl = domBuilder;
      }
      var errorHandler = {};
      var isCallback = errorImpl instanceof Function;
      locator = locator || {};
      function build(key) {
        var fn = errorImpl[key];
        if (!fn && isCallback) {
          fn = errorImpl.length == 2 ? function(msg) {
            errorImpl(key, msg);
          } : errorImpl;
        }
        errorHandler[key] = fn && function(msg) {
          fn("[xmldom " + key + "]	" + msg + _locator(locator));
        } || function() {
        };
      }
      build("warning");
      build("error");
      build("fatalError");
      return errorHandler;
    }
    function DOMHandler() {
      this.cdata = false;
    }
    function position(locator, node) {
      node.lineNumber = locator.lineNumber;
      node.columnNumber = locator.columnNumber;
    }
    DOMHandler.prototype = {
      startDocument: function() {
        this.doc = new DOMImplementation().createDocument(null, null, null);
        if (this.locator) {
          this.doc.documentURI = this.locator.systemId;
        }
      },
      startElement: function(namespaceURI, localName, qName, attrs) {
        var doc = this.doc;
        var el = doc.createElementNS(namespaceURI, qName || localName);
        var len = attrs.length;
        appendElement(this, el);
        this.currentElement = el;
        this.locator && position(this.locator, el);
        for (var i = 0; i < len; i++) {
          var namespaceURI = attrs.getURI(i);
          var value = attrs.getValue(i);
          var qName = attrs.getQName(i);
          var attr = doc.createAttributeNS(namespaceURI, qName);
          this.locator && position(attrs.getLocator(i), attr);
          attr.value = attr.nodeValue = value;
          el.setAttributeNode(attr);
        }
      },
      endElement: function(namespaceURI, localName, qName) {
        var current = this.currentElement;
        var tagName = current.tagName;
        this.currentElement = current.parentNode;
      },
      startPrefixMapping: function(prefix, uri) {
      },
      endPrefixMapping: function(prefix) {
      },
      processingInstruction: function(target, data) {
        var ins = this.doc.createProcessingInstruction(target, data);
        this.locator && position(this.locator, ins);
        appendElement(this, ins);
      },
      ignorableWhitespace: function(ch, start, length) {
      },
      characters: function(chars, start, length) {
        chars = _toString.apply(this, arguments);
        if (chars) {
          if (this.cdata) {
            var charNode = this.doc.createCDATASection(chars);
          } else {
            var charNode = this.doc.createTextNode(chars);
          }
          if (this.currentElement) {
            this.currentElement.appendChild(charNode);
          } else if (/^\s*$/.test(chars)) {
            this.doc.appendChild(charNode);
          }
          this.locator && position(this.locator, charNode);
        }
      },
      skippedEntity: function(name) {
      },
      endDocument: function() {
        this.doc.normalize();
      },
      setDocumentLocator: function(locator) {
        if (this.locator = locator) {
          locator.lineNumber = 0;
        }
      },
      //LexicalHandler
      comment: function(chars, start, length) {
        chars = _toString.apply(this, arguments);
        var comm = this.doc.createComment(chars);
        this.locator && position(this.locator, comm);
        appendElement(this, comm);
      },
      startCDATA: function() {
        this.cdata = true;
      },
      endCDATA: function() {
        this.cdata = false;
      },
      startDTD: function(name, publicId, systemId) {
        var impl = this.doc.implementation;
        if (impl && impl.createDocumentType) {
          var dt = impl.createDocumentType(name, publicId, systemId);
          this.locator && position(this.locator, dt);
          appendElement(this, dt);
          this.doc.doctype = dt;
        }
      },
      /**
       * @see org.xml.sax.ErrorHandler
       * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
       */
      warning: function(error) {
        console.warn("[xmldom warning]	" + error, _locator(this.locator));
      },
      error: function(error) {
        console.error("[xmldom error]	" + error, _locator(this.locator));
      },
      fatalError: function(error) {
        throw new ParseError(error, this.locator);
      }
    };
    function _locator(l) {
      if (l) {
        return "\n@" + (l.systemId || "") + "#[line:" + l.lineNumber + ",col:" + l.columnNumber + "]";
      }
    }
    function _toString(chars, start, length) {
      if (typeof chars == "string") {
        return chars.substr(start, length);
      } else {
        if (chars.length >= start + length || start) {
          return new java.lang.String(chars, start, length) + "";
        }
        return chars;
      }
    }
    "endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g, function(key) {
      DOMHandler.prototype[key] = function() {
        return null;
      };
    });
    function appendElement(hander, node) {
      if (!hander.currentElement) {
        hander.doc.appendChild(node);
      } else {
        hander.currentElement.appendChild(node);
      }
    }
    exports2.__DOMHandler = DOMHandler;
    exports2.DOMParser = DOMParser2;
    exports2.DOMImplementation = dom.DOMImplementation;
    exports2.XMLSerializer = dom.XMLSerializer;
  }
});

// ../../node_modules/@xmldom/xmldom/lib/index.js
var require_lib = __commonJS({
  "../../node_modules/@xmldom/xmldom/lib/index.js"(exports2) {
    var dom = require_dom();
    exports2.DOMImplementation = dom.DOMImplementation;
    exports2.XMLSerializer = dom.XMLSerializer;
    exports2.DOMParser = require_dom_parser().DOMParser;
  }
});

// ../../node_modules/epubjs/lib/utils/core.js
var require_core = __commonJS({
  "../../node_modules/epubjs/lib/utils/core.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.RangeObject = void 0;
    exports2.blob2base64 = blob2base64;
    exports2.borders = borders;
    exports2.bounds = bounds;
    exports2.createBase64Url = createBase64Url;
    exports2.createBlob = createBlob;
    exports2.createBlobUrl = createBlobUrl;
    exports2.defaults = defaults;
    exports2.defer = defer;
    exports2.documentHeight = documentHeight;
    exports2.extend = extend;
    exports2.filterChildren = filterChildren;
    exports2.findChildren = findChildren;
    exports2.getParentByTagName = getParentByTagName;
    exports2.indexOfElementNode = indexOfElementNode;
    exports2.indexOfNode = indexOfNode;
    exports2.indexOfSorted = indexOfSorted;
    exports2.indexOfTextNode = indexOfTextNode;
    exports2.insert = insert;
    exports2.isElement = isElement;
    exports2.isFloat = isFloat;
    exports2.isNumber = isNumber;
    exports2.isXml = isXml;
    exports2.locationOf = locationOf;
    exports2.nodeBounds = nodeBounds;
    exports2.parents = parents;
    exports2.parse = parse;
    exports2.prefixed = prefixed;
    exports2.qs = qs;
    exports2.qsa = qsa;
    exports2.qsp = qsp;
    exports2.querySelectorByType = querySelectorByType;
    exports2.requestAnimationFrame = void 0;
    exports2.revokeBlobUrl = revokeBlobUrl;
    exports2.sprint = sprint;
    exports2.treeWalker = treeWalker;
    exports2.type = type;
    exports2.uuid = uuid;
    exports2.walk = walk;
    exports2.windowBounds = windowBounds;
    var _xmldom = require_lib();
    var requestAnimationFrame2 = typeof window != "undefined" ? window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame : false;
    exports2.requestAnimationFrame = requestAnimationFrame2;
    var ELEMENT_NODE = 1;
    var TEXT_NODE = 3;
    var _URL = typeof URL != "undefined" ? URL : typeof window != "undefined" ? window.URL || window.webkitURL || window.mozURL : void 0;
    function uuid() {
      var d = (/* @__PURE__ */ new Date()).getTime();
      var uuid2 = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == "x" ? r : r & 7 | 8).toString(16);
      });
      return uuid2;
    }
    function documentHeight() {
      return Math.max(document.documentElement.clientHeight, document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);
    }
    function isElement(obj) {
      return !!(obj && obj.nodeType == 1);
    }
    function isNumber(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }
    function isFloat(n) {
      let f = parseFloat(n);
      if (isNumber(n) === false) {
        return false;
      }
      if (typeof n === "string" && n.indexOf(".") > -1) {
        return true;
      }
      return Math.floor(f) !== f;
    }
    function prefixed(unprefixed) {
      var vendors = ["Webkit", "webkit", "Moz", "O", "ms"];
      var prefixes = ["-webkit-", "-webkit-", "-moz-", "-o-", "-ms-"];
      var lower = unprefixed.toLowerCase();
      var length = vendors.length;
      if (typeof document === "undefined" || typeof document.body.style[lower] != "undefined") {
        return unprefixed;
      }
      for (var i = 0; i < length; i++) {
        if (typeof document.body.style[prefixes[i] + lower] != "undefined") {
          return prefixes[i] + lower;
        }
      }
      return unprefixed;
    }
    function defaults(obj) {
      for (var i = 1, length = arguments.length; i < length; i++) {
        var source = arguments[i];
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
      return obj;
    }
    function extend(target) {
      var sources = [].slice.call(arguments, 1);
      sources.forEach(function(source) {
        if (!source) return;
        Object.getOwnPropertyNames(source).forEach(function(propName) {
          Object.defineProperty(target, propName, Object.getOwnPropertyDescriptor(source, propName));
        });
      });
      return target;
    }
    function insert(item, array, compareFunction) {
      var location = locationOf(item, array, compareFunction);
      array.splice(location, 0, item);
      return location;
    }
    function locationOf(item, array, compareFunction, _start, _end) {
      var start = _start || 0;
      var end = _end || array.length;
      var pivot = parseInt(start + (end - start) / 2);
      var compared;
      if (!compareFunction) {
        compareFunction = function(a, b) {
          if (a > b) return 1;
          if (a < b) return -1;
          if (a == b) return 0;
        };
      }
      if (end - start <= 0) {
        return pivot;
      }
      compared = compareFunction(array[pivot], item);
      if (end - start === 1) {
        return compared >= 0 ? pivot : pivot + 1;
      }
      if (compared === 0) {
        return pivot;
      }
      if (compared === -1) {
        return locationOf(item, array, compareFunction, pivot, end);
      } else {
        return locationOf(item, array, compareFunction, start, pivot);
      }
    }
    function indexOfSorted(item, array, compareFunction, _start, _end) {
      var start = _start || 0;
      var end = _end || array.length;
      var pivot = parseInt(start + (end - start) / 2);
      var compared;
      if (!compareFunction) {
        compareFunction = function(a, b) {
          if (a > b) return 1;
          if (a < b) return -1;
          if (a == b) return 0;
        };
      }
      if (end - start <= 0) {
        return -1;
      }
      compared = compareFunction(array[pivot], item);
      if (end - start === 1) {
        return compared === 0 ? pivot : -1;
      }
      if (compared === 0) {
        return pivot;
      }
      if (compared === -1) {
        return indexOfSorted(item, array, compareFunction, pivot, end);
      } else {
        return indexOfSorted(item, array, compareFunction, start, pivot);
      }
    }
    function bounds(el) {
      var style = window.getComputedStyle(el);
      var widthProps = ["width", "paddingRight", "paddingLeft", "marginRight", "marginLeft", "borderRightWidth", "borderLeftWidth"];
      var heightProps = ["height", "paddingTop", "paddingBottom", "marginTop", "marginBottom", "borderTopWidth", "borderBottomWidth"];
      var width = 0;
      var height = 0;
      widthProps.forEach(function(prop) {
        width += parseFloat(style[prop]) || 0;
      });
      heightProps.forEach(function(prop) {
        height += parseFloat(style[prop]) || 0;
      });
      return {
        height,
        width
      };
    }
    function borders(el) {
      var style = window.getComputedStyle(el);
      var widthProps = ["paddingRight", "paddingLeft", "marginRight", "marginLeft", "borderRightWidth", "borderLeftWidth"];
      var heightProps = ["paddingTop", "paddingBottom", "marginTop", "marginBottom", "borderTopWidth", "borderBottomWidth"];
      var width = 0;
      var height = 0;
      widthProps.forEach(function(prop) {
        width += parseFloat(style[prop]) || 0;
      });
      heightProps.forEach(function(prop) {
        height += parseFloat(style[prop]) || 0;
      });
      return {
        height,
        width
      };
    }
    function nodeBounds(node) {
      let elPos;
      let doc = node.ownerDocument;
      if (node.nodeType == Node.TEXT_NODE) {
        let elRange = doc.createRange();
        elRange.selectNodeContents(node);
        elPos = elRange.getBoundingClientRect();
      } else {
        elPos = node.getBoundingClientRect();
      }
      return elPos;
    }
    function windowBounds() {
      var width = window.innerWidth;
      var height = window.innerHeight;
      return {
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        width,
        height
      };
    }
    function indexOfNode(node, typeId) {
      var parent2 = node.parentNode;
      var children = parent2.childNodes;
      var sib;
      var index = -1;
      for (var i = 0; i < children.length; i++) {
        sib = children[i];
        if (sib.nodeType === typeId) {
          index++;
        }
        if (sib == node) break;
      }
      return index;
    }
    function indexOfTextNode(textNode) {
      return indexOfNode(textNode, TEXT_NODE);
    }
    function indexOfElementNode(elementNode) {
      return indexOfNode(elementNode, ELEMENT_NODE);
    }
    function isXml(ext) {
      return ["xml", "opf", "ncx"].indexOf(ext) > -1;
    }
    function createBlob(content, mime) {
      return new Blob([content], {
        type: mime
      });
    }
    function createBlobUrl(content, mime) {
      var tempUrl;
      var blob = createBlob(content, mime);
      tempUrl = _URL.createObjectURL(blob);
      return tempUrl;
    }
    function revokeBlobUrl(url) {
      return _URL.revokeObjectURL(url);
    }
    function createBase64Url(content, mime) {
      var data;
      var datauri;
      if (typeof content !== "string") {
        return;
      }
      data = btoa(content);
      datauri = "data:" + mime + ";base64," + data;
      return datauri;
    }
    function type(obj) {
      return Object.prototype.toString.call(obj).slice(8, -1);
    }
    function parse(markup, mime, forceXMLDom) {
      var doc;
      var Parser;
      if (typeof DOMParser === "undefined" || forceXMLDom) {
        Parser = _xmldom.DOMParser;
      } else {
        Parser = DOMParser;
      }
      if (markup.charCodeAt(0) === 65279) {
        markup = markup.slice(1);
      }
      doc = new Parser().parseFromString(markup, mime);
      return doc;
    }
    function qs(el, sel) {
      var elements;
      if (!el) {
        throw new Error("No Element Provided");
      }
      if (typeof el.querySelector != "undefined") {
        return el.querySelector(sel);
      } else {
        elements = el.getElementsByTagName(sel);
        if (elements.length) {
          return elements[0];
        }
      }
    }
    function qsa(el, sel) {
      if (typeof el.querySelector != "undefined") {
        return el.querySelectorAll(sel);
      } else {
        return el.getElementsByTagName(sel);
      }
    }
    function qsp(el, sel, props) {
      var q, filtered;
      if (typeof el.querySelector != "undefined") {
        sel += "[";
        for (var prop in props) {
          sel += prop + "~='" + props[prop] + "'";
        }
        sel += "]";
        return el.querySelector(sel);
      } else {
        q = el.getElementsByTagName(sel);
        filtered = Array.prototype.slice.call(q, 0).filter(function(el2) {
          for (var prop2 in props) {
            if (el2.getAttribute(prop2) === props[prop2]) {
              return true;
            }
          }
          return false;
        });
        if (filtered) {
          return filtered[0];
        }
      }
    }
    function sprint(root, func) {
      var doc = root.ownerDocument || root;
      if (typeof doc.createTreeWalker !== "undefined") {
        treeWalker(root, func, NodeFilter.SHOW_TEXT);
      } else {
        walk(root, function(node) {
          if (node && node.nodeType === 3) {
            func(node);
          }
        }, true);
      }
    }
    function treeWalker(root, func, filter) {
      var treeWalker2 = document.createTreeWalker(root, filter, null, false);
      let node;
      while (node = treeWalker2.nextNode()) {
        func(node);
      }
    }
    function walk(node, callback) {
      if (callback(node)) {
        return true;
      }
      node = node.firstChild;
      if (node) {
        do {
          let walked = walk(node, callback);
          if (walked) {
            return true;
          }
          node = node.nextSibling;
        } while (node);
      }
    }
    function blob2base64(blob) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function() {
          resolve(reader.result);
        };
      });
    }
    function defer() {
      this.resolve = null;
      this.reject = null;
      this.id = uuid();
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
      Object.freeze(this);
    }
    function querySelectorByType(html, element, type2) {
      var query;
      if (typeof html.querySelector != "undefined") {
        query = html.querySelector(`${element}[*|type="${type2}"]`);
      }
      if (!query || query.length === 0) {
        query = qsa(html, element);
        for (var i = 0; i < query.length; i++) {
          if (query[i].getAttributeNS("http://www.idpf.org/2007/ops", "type") === type2 || query[i].getAttribute("epub:type") === type2) {
            return query[i];
          }
        }
      } else {
        return query;
      }
    }
    function findChildren(el) {
      var result = [];
      var childNodes = el.childNodes;
      for (var i = 0; i < childNodes.length; i++) {
        let node = childNodes[i];
        if (node.nodeType === 1) {
          result.push(node);
        }
      }
      return result;
    }
    function parents(node) {
      var nodes = [node];
      for (; node; node = node.parentNode) {
        nodes.unshift(node);
      }
      return nodes;
    }
    function filterChildren(el, nodeName, single) {
      var result = [];
      var childNodes = el.childNodes;
      for (var i = 0; i < childNodes.length; i++) {
        let node = childNodes[i];
        if (node.nodeType === 1 && node.nodeName.toLowerCase() === nodeName) {
          if (single) {
            return node;
          } else {
            result.push(node);
          }
        }
      }
      if (!single) {
        return result;
      }
    }
    function getParentByTagName(node, tagname) {
      let parent2;
      if (node === null || tagname === "") return;
      parent2 = node.parentNode;
      while (parent2.nodeType === 1) {
        if (parent2.tagName.toLowerCase() === tagname) {
          return parent2;
        }
        parent2 = parent2.parentNode;
      }
    }
    var RangeObject = class {
      constructor() {
        this.collapsed = false;
        this.commonAncestorContainer = void 0;
        this.endContainer = void 0;
        this.endOffset = void 0;
        this.startContainer = void 0;
        this.startOffset = void 0;
      }
      setStart(startNode, startOffset) {
        this.startContainer = startNode;
        this.startOffset = startOffset;
        if (!this.endContainer) {
          this.collapse(true);
        } else {
          this.commonAncestorContainer = this._commonAncestorContainer();
        }
        this._checkCollapsed();
      }
      setEnd(endNode, endOffset) {
        this.endContainer = endNode;
        this.endOffset = endOffset;
        if (!this.startContainer) {
          this.collapse(false);
        } else {
          this.collapsed = false;
          this.commonAncestorContainer = this._commonAncestorContainer();
        }
        this._checkCollapsed();
      }
      collapse(toStart) {
        this.collapsed = true;
        if (toStart) {
          this.endContainer = this.startContainer;
          this.endOffset = this.startOffset;
          this.commonAncestorContainer = this.startContainer.parentNode;
        } else {
          this.startContainer = this.endContainer;
          this.startOffset = this.endOffset;
          this.commonAncestorContainer = this.endOffset.parentNode;
        }
      }
      selectNode(referenceNode) {
        let parent2 = referenceNode.parentNode;
        let index = Array.prototype.indexOf.call(parent2.childNodes, referenceNode);
        this.setStart(parent2, index);
        this.setEnd(parent2, index + 1);
      }
      selectNodeContents(referenceNode) {
        let end = referenceNode.childNodes[referenceNode.childNodes - 1];
        let endIndex = referenceNode.nodeType === 3 ? referenceNode.textContent.length : parent.childNodes.length;
        this.setStart(referenceNode, 0);
        this.setEnd(referenceNode, endIndex);
      }
      _commonAncestorContainer(startContainer, endContainer) {
        var startParents = parents(startContainer || this.startContainer);
        var endParents = parents(endContainer || this.endContainer);
        if (startParents[0] != endParents[0]) return void 0;
        for (var i = 0; i < startParents.length; i++) {
          if (startParents[i] != endParents[i]) {
            return startParents[i - 1];
          }
        }
      }
      _checkCollapsed() {
        if (this.startContainer === this.endContainer && this.startOffset === this.endOffset) {
          this.collapsed = true;
        } else {
          this.collapsed = false;
        }
      }
      toString() {
      }
    };
    exports2.RangeObject = RangeObject;
  }
});

// ../../node_modules/path-webpack/path.js
var require_path = __commonJS({
  "../../node_modules/path-webpack/path.js"(exports2, module2) {
    "use strict";
    if (!process) {
      process = {
        "cwd": function() {
          return "/";
        }
      };
    }
    var process;
    function assertPath(path) {
      if (typeof path !== "string") {
        throw new TypeError("Path must be a string. Received " + path);
      }
    }
    function normalizeStringPosix(path, allowAboveRoot) {
      var res = "";
      var lastSlash = -1;
      var dots = 0;
      var code;
      for (var i = 0; i <= path.length; ++i) {
        if (i < path.length)
          code = path.charCodeAt(i);
        else if (code === 47)
          break;
        else
          code = 47;
        if (code === 47) {
          if (lastSlash === i - 1 || dots === 1) {
          } else if (lastSlash !== i - 1 && dots === 2) {
            if (res.length < 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
              if (res.length > 2) {
                var start = res.length - 1;
                var j = start;
                for (; j >= 0; --j) {
                  if (res.charCodeAt(j) === 47)
                    break;
                }
                if (j !== start) {
                  if (j === -1)
                    res = "";
                  else
                    res = res.slice(0, j);
                  lastSlash = i;
                  dots = 0;
                  continue;
                }
              } else if (res.length === 2 || res.length === 1) {
                res = "";
                lastSlash = i;
                dots = 0;
                continue;
              }
            }
            if (allowAboveRoot) {
              if (res.length > 0)
                res += "/..";
              else
                res = "..";
            }
          } else {
            if (res.length > 0)
              res += "/" + path.slice(lastSlash + 1, i);
            else
              res = path.slice(lastSlash + 1, i);
          }
          lastSlash = i;
          dots = 0;
        } else if (code === 46 && dots !== -1) {
          ++dots;
        } else {
          dots = -1;
        }
      }
      return res;
    }
    function _format(sep, pathObject) {
      var dir = pathObject.dir || pathObject.root;
      var base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
      if (!dir) {
        return base;
      }
      if (dir === pathObject.root) {
        return dir + base;
      }
      return dir + sep + base;
    }
    var posix = {
      // path.resolve([from ...], to)
      resolve: function resolve() {
        var resolvedPath = "";
        var resolvedAbsolute = false;
        var cwd;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path;
          if (i >= 0)
            path = arguments[i];
          else {
            if (cwd === void 0)
              cwd = process.cwd();
            path = cwd;
          }
          assertPath(path);
          if (path.length === 0) {
            continue;
          }
          resolvedPath = path + "/" + resolvedPath;
          resolvedAbsolute = path.charCodeAt(0) === 47;
        }
        resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
        if (resolvedAbsolute) {
          if (resolvedPath.length > 0)
            return "/" + resolvedPath;
          else
            return "/";
        } else if (resolvedPath.length > 0) {
          return resolvedPath;
        } else {
          return ".";
        }
      },
      normalize: function normalize(path) {
        assertPath(path);
        if (path.length === 0)
          return ".";
        var isAbsolute = path.charCodeAt(0) === 47;
        var trailingSeparator = path.charCodeAt(path.length - 1) === 47;
        path = normalizeStringPosix(path, !isAbsolute);
        if (path.length === 0 && !isAbsolute)
          path = ".";
        if (path.length > 0 && trailingSeparator)
          path += "/";
        if (isAbsolute)
          return "/" + path;
        return path;
      },
      isAbsolute: function isAbsolute(path) {
        assertPath(path);
        return path.length > 0 && path.charCodeAt(0) === 47;
      },
      join: function join() {
        if (arguments.length === 0)
          return ".";
        var joined;
        for (var i = 0; i < arguments.length; ++i) {
          var arg = arguments[i];
          assertPath(arg);
          if (arg.length > 0) {
            if (joined === void 0)
              joined = arg;
            else
              joined += "/" + arg;
          }
        }
        if (joined === void 0)
          return ".";
        return posix.normalize(joined);
      },
      relative: function relative(from, to) {
        assertPath(from);
        assertPath(to);
        if (from === to)
          return "";
        from = posix.resolve(from);
        to = posix.resolve(to);
        if (from === to)
          return "";
        var fromStart = 1;
        for (; fromStart < from.length; ++fromStart) {
          if (from.charCodeAt(fromStart) !== 47)
            break;
        }
        var fromEnd = from.length;
        var fromLen = fromEnd - fromStart;
        var toStart = 1;
        for (; toStart < to.length; ++toStart) {
          if (to.charCodeAt(toStart) !== 47)
            break;
        }
        var toEnd = to.length;
        var toLen = toEnd - toStart;
        var length = fromLen < toLen ? fromLen : toLen;
        var lastCommonSep = -1;
        var i = 0;
        for (; i <= length; ++i) {
          if (i === length) {
            if (toLen > length) {
              if (to.charCodeAt(toStart + i) === 47) {
                return to.slice(toStart + i + 1);
              } else if (i === 0) {
                return to.slice(toStart + i);
              }
            } else if (fromLen > length) {
              if (from.charCodeAt(fromStart + i) === 47) {
                lastCommonSep = i;
              } else if (i === 0) {
                lastCommonSep = 0;
              }
            }
            break;
          }
          var fromCode = from.charCodeAt(fromStart + i);
          var toCode = to.charCodeAt(toStart + i);
          if (fromCode !== toCode)
            break;
          else if (fromCode === 47)
            lastCommonSep = i;
        }
        var out = "";
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
          if (i === fromEnd || from.charCodeAt(i) === 47) {
            if (out.length === 0)
              out += "..";
            else
              out += "/..";
          }
        }
        if (out.length > 0)
          return out + to.slice(toStart + lastCommonSep);
        else {
          toStart += lastCommonSep;
          if (to.charCodeAt(toStart) === 47)
            ++toStart;
          return to.slice(toStart);
        }
      },
      _makeLong: function _makeLong(path) {
        return path;
      },
      dirname: function dirname(path) {
        assertPath(path);
        if (path.length === 0)
          return ".";
        var code = path.charCodeAt(0);
        var hasRoot = code === 47;
        var end = -1;
        var matchedSlash = true;
        for (var i = path.length - 1; i >= 1; --i) {
          code = path.charCodeAt(i);
          if (code === 47) {
            if (!matchedSlash) {
              end = i;
              break;
            }
          } else {
            matchedSlash = false;
          }
        }
        if (end === -1)
          return hasRoot ? "/" : ".";
        if (hasRoot && end === 1)
          return "//";
        return path.slice(0, end);
      },
      basename: function basename(path, ext) {
        if (ext !== void 0 && typeof ext !== "string")
          throw new TypeError('"ext" argument must be a string');
        assertPath(path);
        var start = 0;
        var end = -1;
        var matchedSlash = true;
        var i;
        if (ext !== void 0 && ext.length > 0 && ext.length <= path.length) {
          if (ext.length === path.length && ext === path)
            return "";
          var extIdx = ext.length - 1;
          var firstNonSlashEnd = -1;
          for (i = path.length - 1; i >= 0; --i) {
            var code = path.charCodeAt(i);
            if (code === 47) {
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else {
              if (firstNonSlashEnd === -1) {
                matchedSlash = false;
                firstNonSlashEnd = i + 1;
              }
              if (extIdx >= 0) {
                if (code === ext.charCodeAt(extIdx)) {
                  if (--extIdx === -1) {
                    end = i;
                  }
                } else {
                  extIdx = -1;
                  end = firstNonSlashEnd;
                }
              }
            }
          }
          if (start === end)
            end = firstNonSlashEnd;
          else if (end === -1)
            end = path.length;
          return path.slice(start, end);
        } else {
          for (i = path.length - 1; i >= 0; --i) {
            if (path.charCodeAt(i) === 47) {
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else if (end === -1) {
              matchedSlash = false;
              end = i + 1;
            }
          }
          if (end === -1)
            return "";
          return path.slice(start, end);
        }
      },
      extname: function extname(path) {
        assertPath(path);
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var preDotState = 0;
        for (var i = path.length - 1; i >= 0; --i) {
          var code = path.charCodeAt(i);
          if (code === 47) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === 46) {
            if (startDot === -1)
              startDot = i;
            else if (preDotState !== 1)
              preDotState = 1;
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          return "";
        }
        return path.slice(startDot, end);
      },
      format: function format(pathObject) {
        if (pathObject === null || typeof pathObject !== "object") {
          throw new TypeError(
            'Parameter "pathObject" must be an object, not ' + typeof pathObject
          );
        }
        return _format("/", pathObject);
      },
      parse: function parse(path) {
        assertPath(path);
        var ret = { root: "", dir: "", base: "", ext: "", name: "" };
        if (path.length === 0)
          return ret;
        var code = path.charCodeAt(0);
        var isAbsolute = code === 47;
        var start;
        if (isAbsolute) {
          ret.root = "/";
          start = 1;
        } else {
          start = 0;
        }
        var startDot = -1;
        var startPart = 0;
        var end = -1;
        var matchedSlash = true;
        var i = path.length - 1;
        var preDotState = 0;
        for (; i >= start; --i) {
          code = path.charCodeAt(i);
          if (code === 47) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === 46) {
            if (startDot === -1)
              startDot = i;
            else if (preDotState !== 1)
              preDotState = 1;
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          if (end !== -1) {
            if (startPart === 0 && isAbsolute)
              ret.base = ret.name = path.slice(1, end);
            else
              ret.base = ret.name = path.slice(startPart, end);
          }
        } else {
          if (startPart === 0 && isAbsolute) {
            ret.name = path.slice(1, startDot);
            ret.base = path.slice(1, end);
          } else {
            ret.name = path.slice(startPart, startDot);
            ret.base = path.slice(startPart, end);
          }
          ret.ext = path.slice(startDot, end);
        }
        if (startPart > 0)
          ret.dir = path.slice(0, startPart - 1);
        else if (isAbsolute)
          ret.dir = "/";
        return ret;
      },
      sep: "/",
      delimiter: ":",
      posix: null
    };
    module2.exports = posix;
  }
});

// ../../node_modules/epubjs/lib/utils/path.js
var require_path2 = __commonJS({
  "../../node_modules/epubjs/lib/utils/path.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _pathWebpack = _interopRequireDefault(require_path());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var Path = class {
      constructor(pathString) {
        var protocol;
        var parsed;
        protocol = pathString.indexOf("://");
        if (protocol > -1) {
          pathString = new URL(pathString).pathname;
        }
        parsed = this.parse(pathString);
        this.path = pathString;
        if (this.isDirectory(pathString)) {
          this.directory = pathString;
        } else {
          this.directory = parsed.dir + "/";
        }
        this.filename = parsed.base;
        this.extension = parsed.ext.slice(1);
      }
      /**
       * Parse the path: https://nodejs.org/api/path.html#path_path_parse_path
       * @param	{string} what
       * @returns {object}
       */
      parse(what) {
        return _pathWebpack.default.parse(what);
      }
      /**
       * @param	{string} what
       * @returns {boolean}
       */
      isAbsolute(what) {
        return _pathWebpack.default.isAbsolute(what || this.path);
      }
      /**
       * Check if path ends with a directory
       * @param	{string} what
       * @returns {boolean}
       */
      isDirectory(what) {
        return what.charAt(what.length - 1) === "/";
      }
      /**
       * Resolve a path against the directory of the Path
       *
       * https://nodejs.org/api/path.html#path_path_resolve_paths
       * @param	{string} what
       * @returns {string} resolved
       */
      resolve(what) {
        return _pathWebpack.default.resolve(this.directory, what);
      }
      /**
       * Resolve a path relative to the directory of the Path
       *
       * https://nodejs.org/api/path.html#path_path_relative_from_to
       * @param	{string} what
       * @returns {string} relative
       */
      relative(what) {
        var isAbsolute = what && what.indexOf("://") > -1;
        if (isAbsolute) {
          return what;
        }
        return _pathWebpack.default.relative(this.directory, what);
      }
      splitPath(filename) {
        return this.splitPathRe.exec(filename).slice(1);
      }
      /**
       * Return the path string
       * @returns {string} path
       */
      toString() {
        return this.path;
      }
    };
    var _default = Path;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/utils/url.js
var require_url = __commonJS({
  "../../node_modules/epubjs/lib/utils/url.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _path = _interopRequireDefault(require_path2());
    var _pathWebpack = _interopRequireDefault(require_path());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var Url = class {
      constructor(urlString, baseString) {
        var absolute = urlString.indexOf("://") > -1;
        var pathname = urlString;
        var basePath;
        this.Url = void 0;
        this.href = urlString;
        this.protocol = "";
        this.origin = "";
        this.hash = "";
        this.hash = "";
        this.search = "";
        this.base = baseString;
        if (!absolute && baseString !== false && typeof baseString !== "string" && window && window.location) {
          this.base = window.location.href;
        }
        if (absolute || this.base) {
          try {
            if (this.base) {
              this.Url = new URL(urlString, this.base);
            } else {
              this.Url = new URL(urlString);
            }
            this.href = this.Url.href;
            this.protocol = this.Url.protocol;
            this.origin = this.Url.origin;
            this.hash = this.Url.hash;
            this.search = this.Url.search;
            pathname = this.Url.pathname + (this.Url.search ? this.Url.search : "");
          } catch (e) {
            this.Url = void 0;
            if (this.base) {
              basePath = new _path.default(this.base);
              pathname = basePath.resolve(pathname);
            }
          }
        }
        this.Path = new _path.default(pathname);
        this.directory = this.Path.directory;
        this.filename = this.Path.filename;
        this.extension = this.Path.extension;
      }
      /**
       * @returns {Path}
       */
      path() {
        return this.Path;
      }
      /**
       * Resolves a relative path to a absolute url
       * @param {string} what
       * @returns {string} url
       */
      resolve(what) {
        var isAbsolute = what.indexOf("://") > -1;
        var fullpath;
        if (isAbsolute) {
          return what;
        }
        fullpath = _pathWebpack.default.resolve(this.directory, what);
        return this.origin + fullpath;
      }
      /**
       * Resolve a path relative to the url
       * @param {string} what
       * @returns {string} path
       */
      relative(what) {
        return _pathWebpack.default.relative(what, this.directory);
      }
      /**
       * @returns {string}
       */
      toString() {
        return this.href;
      }
    };
    var _default = Url;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/utils/replacements.js
var require_replacements = __commonJS({
  "../../node_modules/epubjs/lib/utils/replacements.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.replaceBase = replaceBase;
    exports2.replaceCanonical = replaceCanonical;
    exports2.replaceLinks = replaceLinks;
    exports2.replaceMeta = replaceMeta;
    exports2.substitute = substitute;
    var _core = require_core();
    var _url = _interopRequireDefault(require_url());
    var _path = _interopRequireDefault(require_path2());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function replaceBase(doc, section) {
      var base;
      var head;
      var url = section.url;
      var absolute = url.indexOf("://") > -1;
      if (!doc) {
        return;
      }
      head = (0, _core.qs)(doc, "head");
      base = (0, _core.qs)(head, "base");
      if (!base) {
        base = doc.createElement("base");
        head.insertBefore(base, head.firstChild);
      }
      if (!absolute && window && window.location) {
        url = window.location.origin + url;
      }
      base.setAttribute("href", url);
    }
    function replaceCanonical(doc, section) {
      var head;
      var link;
      var url = section.canonical;
      if (!doc) {
        return;
      }
      head = (0, _core.qs)(doc, "head");
      link = (0, _core.qs)(head, "link[rel='canonical']");
      if (link) {
        link.setAttribute("href", url);
      } else {
        link = doc.createElement("link");
        link.setAttribute("rel", "canonical");
        link.setAttribute("href", url);
        head.appendChild(link);
      }
    }
    function replaceMeta(doc, section) {
      var head;
      var meta;
      var id = section.idref;
      if (!doc) {
        return;
      }
      head = (0, _core.qs)(doc, "head");
      meta = (0, _core.qs)(head, "link[property='dc.identifier']");
      if (meta) {
        meta.setAttribute("content", id);
      } else {
        meta = doc.createElement("meta");
        meta.setAttribute("name", "dc.identifier");
        meta.setAttribute("content", id);
        head.appendChild(meta);
      }
    }
    function replaceLinks(contents, fn) {
      var links = contents.querySelectorAll("a[href]");
      if (!links.length) {
        return;
      }
      var base = (0, _core.qs)(contents.ownerDocument, "base");
      var location = base ? base.getAttribute("href") : void 0;
      var replaceLink = function(link) {
        var href = link.getAttribute("href");
        if (href.indexOf("mailto:") === 0) {
          return;
        }
        var absolute = href.indexOf("://") > -1;
        if (absolute) {
          link.setAttribute("target", "_blank");
        } else {
          var linkUrl;
          try {
            linkUrl = new _url.default(href, location);
          } catch (error) {
          }
          link.onclick = function() {
            if (linkUrl && linkUrl.hash) {
              fn(linkUrl.Path.path + linkUrl.hash);
            } else if (linkUrl) {
              fn(linkUrl.Path.path);
            } else {
              fn(href);
            }
            return false;
          };
        }
      }.bind(this);
      for (var i = 0; i < links.length; i++) {
        replaceLink(links[i]);
      }
    }
    function substitute(content, urls, replacements) {
      urls.forEach(function(url, i) {
        if (url && replacements[i]) {
          url = url.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
          content = content.replace(new RegExp(url, "g"), replacements[i]);
        }
      });
      return content;
    }
  }
});

// ../../node_modules/type/value/is.js
var require_is = __commonJS({
  "../../node_modules/type/value/is.js"(exports2, module2) {
    "use strict";
    var _undefined = void 0;
    module2.exports = function(value) {
      return value !== _undefined && value !== null;
    };
  }
});

// ../../node_modules/type/object/is.js
var require_is2 = __commonJS({
  "../../node_modules/type/object/is.js"(exports2, module2) {
    "use strict";
    var isValue = require_is();
    var possibleTypes = {
      "object": true,
      "function": true,
      "undefined": true
      /* document.all */
    };
    module2.exports = function(value) {
      if (!isValue(value)) return false;
      return hasOwnProperty.call(possibleTypes, typeof value);
    };
  }
});

// ../../node_modules/type/prototype/is.js
var require_is3 = __commonJS({
  "../../node_modules/type/prototype/is.js"(exports2, module2) {
    "use strict";
    var isObject = require_is2();
    module2.exports = function(value) {
      if (!isObject(value)) return false;
      try {
        if (!value.constructor) return false;
        return value.constructor.prototype === value;
      } catch (error) {
        return false;
      }
    };
  }
});

// ../../node_modules/type/function/is.js
var require_is4 = __commonJS({
  "../../node_modules/type/function/is.js"(exports2, module2) {
    "use strict";
    var isPrototype = require_is3();
    module2.exports = function(value) {
      if (typeof value !== "function") return false;
      if (!hasOwnProperty.call(value, "length")) return false;
      try {
        if (typeof value.length !== "number") return false;
        if (typeof value.call !== "function") return false;
        if (typeof value.apply !== "function") return false;
      } catch (error) {
        return false;
      }
      return !isPrototype(value);
    };
  }
});

// ../../node_modules/type/plain-function/is.js
var require_is5 = __commonJS({
  "../../node_modules/type/plain-function/is.js"(exports2, module2) {
    "use strict";
    var isFunction = require_is4();
    var classRe = /^\s*class[\s{/}]/;
    var functionToString = Function.prototype.toString;
    module2.exports = function(value) {
      if (!isFunction(value)) return false;
      if (classRe.test(functionToString.call(value))) return false;
      return true;
    };
  }
});

// ../../node_modules/es5-ext/object/assign/is-implemented.js
var require_is_implemented = __commonJS({
  "../../node_modules/es5-ext/object/assign/is-implemented.js"(exports2, module2) {
    "use strict";
    module2.exports = function() {
      var assign = Object.assign, obj;
      if (typeof assign !== "function") return false;
      obj = { foo: "raz" };
      assign(obj, { bar: "dwa" }, { trzy: "trzy" });
      return obj.foo + obj.bar + obj.trzy === "razdwatrzy";
    };
  }
});

// ../../node_modules/es5-ext/object/keys/is-implemented.js
var require_is_implemented2 = __commonJS({
  "../../node_modules/es5-ext/object/keys/is-implemented.js"(exports2, module2) {
    "use strict";
    module2.exports = function() {
      try {
        Object.keys("primitive");
        return true;
      } catch (e) {
        return false;
      }
    };
  }
});

// ../../node_modules/es5-ext/function/noop.js
var require_noop = __commonJS({
  "../../node_modules/es5-ext/function/noop.js"(exports2, module2) {
    "use strict";
    module2.exports = function() {
    };
  }
});

// ../../node_modules/es5-ext/object/is-value.js
var require_is_value = __commonJS({
  "../../node_modules/es5-ext/object/is-value.js"(exports2, module2) {
    "use strict";
    var _undefined = require_noop()();
    module2.exports = function(val) {
      return val !== _undefined && val !== null;
    };
  }
});

// ../../node_modules/es5-ext/object/keys/shim.js
var require_shim = __commonJS({
  "../../node_modules/es5-ext/object/keys/shim.js"(exports2, module2) {
    "use strict";
    var isValue = require_is_value();
    var keys = Object.keys;
    module2.exports = function(object) {
      return keys(isValue(object) ? Object(object) : object);
    };
  }
});

// ../../node_modules/es5-ext/object/keys/index.js
var require_keys = __commonJS({
  "../../node_modules/es5-ext/object/keys/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_is_implemented2()() ? Object.keys : require_shim();
  }
});

// ../../node_modules/es5-ext/object/valid-value.js
var require_valid_value = __commonJS({
  "../../node_modules/es5-ext/object/valid-value.js"(exports2, module2) {
    "use strict";
    var isValue = require_is_value();
    module2.exports = function(value) {
      if (!isValue(value)) throw new TypeError("Cannot use null or undefined");
      return value;
    };
  }
});

// ../../node_modules/es5-ext/object/assign/shim.js
var require_shim2 = __commonJS({
  "../../node_modules/es5-ext/object/assign/shim.js"(exports2, module2) {
    "use strict";
    var keys = require_keys();
    var value = require_valid_value();
    var max = Math.max;
    module2.exports = function(dest, src) {
      var error, i, length = max(arguments.length, 2), assign;
      dest = Object(value(dest));
      assign = function(key) {
        try {
          dest[key] = src[key];
        } catch (e) {
          if (!error) error = e;
        }
      };
      for (i = 1; i < length; ++i) {
        src = arguments[i];
        keys(src).forEach(assign);
      }
      if (error !== void 0) throw error;
      return dest;
    };
  }
});

// ../../node_modules/es5-ext/object/assign/index.js
var require_assign = __commonJS({
  "../../node_modules/es5-ext/object/assign/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_is_implemented()() ? Object.assign : require_shim2();
  }
});

// ../../node_modules/es5-ext/object/normalize-options.js
var require_normalize_options = __commonJS({
  "../../node_modules/es5-ext/object/normalize-options.js"(exports2, module2) {
    "use strict";
    var isValue = require_is_value();
    var forEach = Array.prototype.forEach;
    var create = Object.create;
    var process = function(src, obj) {
      var key;
      for (key in src) obj[key] = src[key];
    };
    module2.exports = function(opts1) {
      var result = create(null);
      forEach.call(arguments, function(options) {
        if (!isValue(options)) return;
        process(Object(options), result);
      });
      return result;
    };
  }
});

// ../../node_modules/es5-ext/string/#/contains/is-implemented.js
var require_is_implemented3 = __commonJS({
  "../../node_modules/es5-ext/string/#/contains/is-implemented.js"(exports2, module2) {
    "use strict";
    var str = "razdwatrzy";
    module2.exports = function() {
      if (typeof str.contains !== "function") return false;
      return str.contains("dwa") === true && str.contains("foo") === false;
    };
  }
});

// ../../node_modules/es5-ext/string/#/contains/shim.js
var require_shim3 = __commonJS({
  "../../node_modules/es5-ext/string/#/contains/shim.js"(exports2, module2) {
    "use strict";
    var indexOf = String.prototype.indexOf;
    module2.exports = function(searchString) {
      return indexOf.call(this, searchString, arguments[1]) > -1;
    };
  }
});

// ../../node_modules/es5-ext/string/#/contains/index.js
var require_contains = __commonJS({
  "../../node_modules/es5-ext/string/#/contains/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_is_implemented3()() ? String.prototype.contains : require_shim3();
  }
});

// ../../node_modules/d/index.js
var require_d = __commonJS({
  "../../node_modules/d/index.js"(exports2, module2) {
    "use strict";
    var isValue = require_is();
    var isPlainFunction = require_is5();
    var assign = require_assign();
    var normalizeOpts = require_normalize_options();
    var contains = require_contains();
    var d = module2.exports = function(dscr, value) {
      var c, e, w, options, desc;
      if (arguments.length < 2 || typeof dscr !== "string") {
        options = value;
        value = dscr;
        dscr = null;
      } else {
        options = arguments[2];
      }
      if (isValue(dscr)) {
        c = contains.call(dscr, "c");
        e = contains.call(dscr, "e");
        w = contains.call(dscr, "w");
      } else {
        c = w = true;
        e = false;
      }
      desc = { value, configurable: c, enumerable: e, writable: w };
      return !options ? desc : assign(normalizeOpts(options), desc);
    };
    d.gs = function(dscr, get, set) {
      var c, e, options, desc;
      if (typeof dscr !== "string") {
        options = set;
        set = get;
        get = dscr;
        dscr = null;
      } else {
        options = arguments[3];
      }
      if (!isValue(get)) {
        get = void 0;
      } else if (!isPlainFunction(get)) {
        options = get;
        get = set = void 0;
      } else if (!isValue(set)) {
        set = void 0;
      } else if (!isPlainFunction(set)) {
        options = set;
        set = void 0;
      }
      if (isValue(dscr)) {
        c = contains.call(dscr, "c");
        e = contains.call(dscr, "e");
      } else {
        c = true;
        e = false;
      }
      desc = { get, set, configurable: c, enumerable: e };
      return !options ? desc : assign(normalizeOpts(options), desc);
    };
  }
});

// ../../node_modules/es5-ext/object/valid-callable.js
var require_valid_callable = __commonJS({
  "../../node_modules/es5-ext/object/valid-callable.js"(exports2, module2) {
    "use strict";
    module2.exports = function(fn) {
      if (typeof fn !== "function") throw new TypeError(fn + " is not a function");
      return fn;
    };
  }
});

// ../../node_modules/event-emitter/index.js
var require_event_emitter = __commonJS({
  "../../node_modules/event-emitter/index.js"(exports2, module2) {
    "use strict";
    var d = require_d();
    var callable = require_valid_callable();
    var apply = Function.prototype.apply;
    var call = Function.prototype.call;
    var create = Object.create;
    var defineProperty = Object.defineProperty;
    var defineProperties = Object.defineProperties;
    var hasOwnProperty2 = Object.prototype.hasOwnProperty;
    var descriptor = { configurable: true, enumerable: false, writable: true };
    var on;
    var once;
    var off;
    var emit;
    var methods;
    var descriptors;
    var base;
    on = function(type, listener) {
      var data;
      callable(listener);
      if (!hasOwnProperty2.call(this, "__ee__")) {
        data = descriptor.value = create(null);
        defineProperty(this, "__ee__", descriptor);
        descriptor.value = null;
      } else {
        data = this.__ee__;
      }
      if (!data[type]) data[type] = listener;
      else if (typeof data[type] === "object") data[type].push(listener);
      else data[type] = [data[type], listener];
      return this;
    };
    once = function(type, listener) {
      var once2, self2;
      callable(listener);
      self2 = this;
      on.call(this, type, once2 = function() {
        off.call(self2, type, once2);
        apply.call(listener, this, arguments);
      });
      once2.__eeOnceListener__ = listener;
      return this;
    };
    off = function(type, listener) {
      var data, listeners, candidate, i;
      callable(listener);
      if (!hasOwnProperty2.call(this, "__ee__")) return this;
      data = this.__ee__;
      if (!data[type]) return this;
      listeners = data[type];
      if (typeof listeners === "object") {
        for (i = 0; candidate = listeners[i]; ++i) {
          if (candidate === listener || candidate.__eeOnceListener__ === listener) {
            if (listeners.length === 2) data[type] = listeners[i ? 0 : 1];
            else listeners.splice(i, 1);
          }
        }
      } else {
        if (listeners === listener || listeners.__eeOnceListener__ === listener) {
          delete data[type];
        }
      }
      return this;
    };
    emit = function(type) {
      var i, l, listener, listeners, args;
      if (!hasOwnProperty2.call(this, "__ee__")) return;
      listeners = this.__ee__[type];
      if (!listeners) return;
      if (typeof listeners === "object") {
        l = arguments.length;
        args = new Array(l - 1);
        for (i = 1; i < l; ++i) args[i - 1] = arguments[i];
        listeners = listeners.slice();
        for (i = 0; listener = listeners[i]; ++i) {
          apply.call(listener, this, args);
        }
      } else {
        switch (arguments.length) {
          case 1:
            call.call(listeners, this);
            break;
          case 2:
            call.call(listeners, this, arguments[1]);
            break;
          case 3:
            call.call(listeners, this, arguments[1], arguments[2]);
            break;
          default:
            l = arguments.length;
            args = new Array(l - 1);
            for (i = 1; i < l; ++i) {
              args[i - 1] = arguments[i];
            }
            apply.call(listeners, this, args);
        }
      }
    };
    methods = {
      on,
      once,
      off,
      emit
    };
    descriptors = {
      on: d(on),
      once: d(once),
      off: d(off),
      emit: d(emit)
    };
    base = defineProperties({}, descriptors);
    module2.exports = exports2 = function(o) {
      return o == null ? create(base) : defineProperties(Object(o), descriptors);
    };
    exports2.methods = methods;
  }
});

// ../../node_modules/epubjs/lib/utils/hook.js
var require_hook = __commonJS({
  "../../node_modules/epubjs/lib/utils/hook.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var Hook = class {
      constructor(context) {
        this.context = context || this;
        this.hooks = [];
      }
      /**
       * Adds a function to be run before a hook completes
       * @example this.content.register(function(){...});
       */
      register() {
        for (var i = 0; i < arguments.length; ++i) {
          if (typeof arguments[i] === "function") {
            this.hooks.push(arguments[i]);
          } else {
            for (var j = 0; j < arguments[i].length; ++j) {
              this.hooks.push(arguments[i][j]);
            }
          }
        }
      }
      /**
       * Removes a function
       * @example this.content.deregister(function(){...});
       */
      deregister(func) {
        let hook;
        for (let i = 0; i < this.hooks.length; i++) {
          hook = this.hooks[i];
          if (hook === func) {
            this.hooks.splice(i, 1);
            break;
          }
        }
      }
      /**
       * Triggers a hook to run all functions
       * @example this.content.trigger(args).then(function(){...});
       */
      trigger() {
        var args = arguments;
        var context = this.context;
        var promises = [];
        this.hooks.forEach(function(task) {
          try {
            var executing = task.apply(context, args);
          } catch (err) {
            console.log(err);
          }
          if (executing && typeof executing["then"] === "function") {
            promises.push(executing);
          }
        });
        return Promise.all(promises);
      }
      // Adds a function to be run before a hook completes
      list() {
        return this.hooks;
      }
      clear() {
        return this.hooks = [];
      }
    };
    var _default = Hook;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/epubcfi.js
var require_epubcfi = __commonJS({
  "../../node_modules/epubjs/lib/epubcfi.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _core = require_core();
    var ELEMENT_NODE = 1;
    var TEXT_NODE = 3;
    var DOCUMENT_NODE = 9;
    var EpubCFI = class _EpubCFI {
      constructor(cfiFrom, base, ignoreClass) {
        var type;
        this.str = "";
        this.base = {};
        this.spinePos = 0;
        this.range = false;
        this.path = {};
        this.start = null;
        this.end = null;
        if (!(this instanceof _EpubCFI)) {
          return new _EpubCFI(cfiFrom, base, ignoreClass);
        }
        if (typeof base === "string") {
          this.base = this.parseComponent(base);
        } else if (typeof base === "object" && base.steps) {
          this.base = base;
        }
        type = this.checkType(cfiFrom);
        if (type === "string") {
          this.str = cfiFrom;
          return (0, _core.extend)(this, this.parse(cfiFrom));
        } else if (type === "range") {
          return (0, _core.extend)(this, this.fromRange(cfiFrom, this.base, ignoreClass));
        } else if (type === "node") {
          return (0, _core.extend)(this, this.fromNode(cfiFrom, this.base, ignoreClass));
        } else if (type === "EpubCFI" && cfiFrom.path) {
          return cfiFrom;
        } else if (!cfiFrom) {
          return this;
        } else {
          throw new TypeError("not a valid argument for EpubCFI");
        }
      }
      /**
       * Check the type of constructor input
       * @private
       */
      checkType(cfi) {
        if (this.isCfiString(cfi)) {
          return "string";
        } else if (cfi && typeof cfi === "object" && ((0, _core.type)(cfi) === "Range" || typeof cfi.startContainer != "undefined")) {
          return "range";
        } else if (cfi && typeof cfi === "object" && typeof cfi.nodeType != "undefined") {
          return "node";
        } else if (cfi && typeof cfi === "object" && cfi instanceof _EpubCFI) {
          return "EpubCFI";
        } else {
          return false;
        }
      }
      /**
       * Parse a cfi string to a CFI object representation
       * @param {string} cfiStr
       * @returns {object} cfi
       */
      parse(cfiStr) {
        var cfi = {
          spinePos: -1,
          range: false,
          base: {},
          path: {},
          start: null,
          end: null
        };
        var baseComponent, pathComponent, range;
        if (typeof cfiStr !== "string") {
          return {
            spinePos: -1
          };
        }
        if (cfiStr.indexOf("epubcfi(") === 0 && cfiStr[cfiStr.length - 1] === ")") {
          cfiStr = cfiStr.slice(8, cfiStr.length - 1);
        }
        baseComponent = this.getChapterComponent(cfiStr);
        if (!baseComponent) {
          return {
            spinePos: -1
          };
        }
        cfi.base = this.parseComponent(baseComponent);
        pathComponent = this.getPathComponent(cfiStr);
        cfi.path = this.parseComponent(pathComponent);
        range = this.getRange(cfiStr);
        if (range) {
          cfi.range = true;
          cfi.start = this.parseComponent(range[0]);
          cfi.end = this.parseComponent(range[1]);
        }
        cfi.spinePos = cfi.base.steps[1].index;
        return cfi;
      }
      parseComponent(componentStr) {
        var component = {
          steps: [],
          terminal: {
            offset: null,
            assertion: null
          }
        };
        var parts = componentStr.split(":");
        var steps = parts[0].split("/");
        var terminal;
        if (parts.length > 1) {
          terminal = parts[1];
          component.terminal = this.parseTerminal(terminal);
        }
        if (steps[0] === "") {
          steps.shift();
        }
        component.steps = steps.map(function(step) {
          return this.parseStep(step);
        }.bind(this));
        return component;
      }
      parseStep(stepStr) {
        var type, num, index, has_brackets, id;
        has_brackets = stepStr.match(/\[(.*)\]/);
        if (has_brackets && has_brackets[1]) {
          id = has_brackets[1];
        }
        num = parseInt(stepStr);
        if (isNaN(num)) {
          return;
        }
        if (num % 2 === 0) {
          type = "element";
          index = num / 2 - 1;
        } else {
          type = "text";
          index = (num - 1) / 2;
        }
        return {
          "type": type,
          "index": index,
          "id": id || null
        };
      }
      parseTerminal(termialStr) {
        var characterOffset, textLocationAssertion;
        var assertion = termialStr.match(/\[(.*)\]/);
        if (assertion && assertion[1]) {
          characterOffset = parseInt(termialStr.split("[")[0]);
          textLocationAssertion = assertion[1];
        } else {
          characterOffset = parseInt(termialStr);
        }
        if (!(0, _core.isNumber)(characterOffset)) {
          characterOffset = null;
        }
        return {
          "offset": characterOffset,
          "assertion": textLocationAssertion
        };
      }
      getChapterComponent(cfiStr) {
        var indirection = cfiStr.split("!");
        return indirection[0];
      }
      getPathComponent(cfiStr) {
        var indirection = cfiStr.split("!");
        if (indirection[1]) {
          let ranges = indirection[1].split(",");
          return ranges[0];
        }
      }
      getRange(cfiStr) {
        var ranges = cfiStr.split(",");
        if (ranges.length === 3) {
          return [ranges[1], ranges[2]];
        }
        return false;
      }
      getCharecterOffsetComponent(cfiStr) {
        var splitStr = cfiStr.split(":");
        return splitStr[1] || "";
      }
      joinSteps(steps) {
        if (!steps) {
          return "";
        }
        return steps.map(function(part) {
          var segment = "";
          if (part.type === "element") {
            segment += (part.index + 1) * 2;
          }
          if (part.type === "text") {
            segment += 1 + 2 * part.index;
          }
          if (part.id) {
            segment += "[" + part.id + "]";
          }
          return segment;
        }).join("/");
      }
      segmentString(segment) {
        var segmentString = "/";
        segmentString += this.joinSteps(segment.steps);
        if (segment.terminal && segment.terminal.offset != null) {
          segmentString += ":" + segment.terminal.offset;
        }
        if (segment.terminal && segment.terminal.assertion != null) {
          segmentString += "[" + segment.terminal.assertion + "]";
        }
        return segmentString;
      }
      /**
       * Convert CFI to a epubcfi(...) string
       * @returns {string} epubcfi
       */
      toString() {
        var cfiString = "epubcfi(";
        cfiString += this.segmentString(this.base);
        cfiString += "!";
        cfiString += this.segmentString(this.path);
        if (this.range && this.start) {
          cfiString += ",";
          cfiString += this.segmentString(this.start);
        }
        if (this.range && this.end) {
          cfiString += ",";
          cfiString += this.segmentString(this.end);
        }
        cfiString += ")";
        return cfiString;
      }
      /**
       * Compare which of two CFIs is earlier in the text
       * @returns {number} First is earlier = -1, Second is earlier = 1, They are equal = 0
       */
      compare(cfiOne, cfiTwo) {
        var stepsA, stepsB;
        var terminalA, terminalB;
        var rangeAStartSteps, rangeAEndSteps;
        var rangeBEndSteps, rangeBEndSteps;
        var rangeAStartTerminal, rangeAEndTerminal;
        var rangeBStartTerminal, rangeBEndTerminal;
        if (typeof cfiOne === "string") {
          cfiOne = new _EpubCFI(cfiOne);
        }
        if (typeof cfiTwo === "string") {
          cfiTwo = new _EpubCFI(cfiTwo);
        }
        if (cfiOne.spinePos > cfiTwo.spinePos) {
          return 1;
        }
        if (cfiOne.spinePos < cfiTwo.spinePos) {
          return -1;
        }
        if (cfiOne.range) {
          stepsA = cfiOne.path.steps.concat(cfiOne.start.steps);
          terminalA = cfiOne.start.terminal;
        } else {
          stepsA = cfiOne.path.steps;
          terminalA = cfiOne.path.terminal;
        }
        if (cfiTwo.range) {
          stepsB = cfiTwo.path.steps.concat(cfiTwo.start.steps);
          terminalB = cfiTwo.start.terminal;
        } else {
          stepsB = cfiTwo.path.steps;
          terminalB = cfiTwo.path.terminal;
        }
        for (var i = 0; i < stepsA.length; i++) {
          if (!stepsA[i]) {
            return -1;
          }
          if (!stepsB[i]) {
            return 1;
          }
          if (stepsA[i].index > stepsB[i].index) {
            return 1;
          }
          if (stepsA[i].index < stepsB[i].index) {
            return -1;
          }
        }
        if (stepsA.length < stepsB.length) {
          return -1;
        }
        if (terminalA.offset > terminalB.offset) {
          return 1;
        }
        if (terminalA.offset < terminalB.offset) {
          return -1;
        }
        return 0;
      }
      step(node) {
        var nodeType = node.nodeType === TEXT_NODE ? "text" : "element";
        return {
          "id": node.id,
          "tagName": node.tagName,
          "type": nodeType,
          "index": this.position(node)
        };
      }
      filteredStep(node, ignoreClass) {
        var filteredNode = this.filter(node, ignoreClass);
        var nodeType;
        if (!filteredNode) {
          return;
        }
        nodeType = filteredNode.nodeType === TEXT_NODE ? "text" : "element";
        return {
          "id": filteredNode.id,
          "tagName": filteredNode.tagName,
          "type": nodeType,
          "index": this.filteredPosition(filteredNode, ignoreClass)
        };
      }
      pathTo(node, offset, ignoreClass) {
        var segment = {
          steps: [],
          terminal: {
            offset: null,
            assertion: null
          }
        };
        var currentNode = node;
        var step;
        while (currentNode && currentNode.parentNode && currentNode.parentNode.nodeType != DOCUMENT_NODE) {
          if (ignoreClass) {
            step = this.filteredStep(currentNode, ignoreClass);
          } else {
            step = this.step(currentNode);
          }
          if (step) {
            segment.steps.unshift(step);
          }
          currentNode = currentNode.parentNode;
        }
        if (offset != null && offset >= 0) {
          segment.terminal.offset = offset;
          if (segment.steps[segment.steps.length - 1].type != "text") {
            segment.steps.push({
              "type": "text",
              "index": 0
            });
          }
        }
        return segment;
      }
      equalStep(stepA, stepB) {
        if (!stepA || !stepB) {
          return false;
        }
        if (stepA.index === stepB.index && stepA.id === stepB.id && stepA.type === stepB.type) {
          return true;
        }
        return false;
      }
      /**
       * Create a CFI object from a Range
       * @param {Range} range
       * @param {string | object} base
       * @param {string} [ignoreClass]
       * @returns {object} cfi
       */
      fromRange(range, base, ignoreClass) {
        var cfi = {
          range: false,
          base: {},
          path: {},
          start: null,
          end: null
        };
        var start = range.startContainer;
        var end = range.endContainer;
        var startOffset = range.startOffset;
        var endOffset = range.endOffset;
        var needsIgnoring = false;
        if (ignoreClass) {
          needsIgnoring = start.ownerDocument.querySelector("." + ignoreClass) != null;
        }
        if (typeof base === "string") {
          cfi.base = this.parseComponent(base);
          cfi.spinePos = cfi.base.steps[1].index;
        } else if (typeof base === "object") {
          cfi.base = base;
        }
        if (range.collapsed) {
          if (needsIgnoring) {
            startOffset = this.patchOffset(start, startOffset, ignoreClass);
          }
          cfi.path = this.pathTo(start, startOffset, ignoreClass);
        } else {
          cfi.range = true;
          if (needsIgnoring) {
            startOffset = this.patchOffset(start, startOffset, ignoreClass);
          }
          cfi.start = this.pathTo(start, startOffset, ignoreClass);
          if (needsIgnoring) {
            endOffset = this.patchOffset(end, endOffset, ignoreClass);
          }
          cfi.end = this.pathTo(end, endOffset, ignoreClass);
          cfi.path = {
            steps: [],
            terminal: null
          };
          var len = cfi.start.steps.length;
          var i;
          for (i = 0; i < len; i++) {
            if (this.equalStep(cfi.start.steps[i], cfi.end.steps[i])) {
              if (i === len - 1) {
                if (cfi.start.terminal === cfi.end.terminal) {
                  cfi.path.steps.push(cfi.start.steps[i]);
                  cfi.range = false;
                }
              } else {
                cfi.path.steps.push(cfi.start.steps[i]);
              }
            } else {
              break;
            }
          }
          cfi.start.steps = cfi.start.steps.slice(cfi.path.steps.length);
          cfi.end.steps = cfi.end.steps.slice(cfi.path.steps.length);
        }
        return cfi;
      }
      /**
       * Create a CFI object from a Node
       * @param {Node} anchor
       * @param {string | object} base
       * @param {string} [ignoreClass]
       * @returns {object} cfi
       */
      fromNode(anchor, base, ignoreClass) {
        var cfi = {
          range: false,
          base: {},
          path: {},
          start: null,
          end: null
        };
        if (typeof base === "string") {
          cfi.base = this.parseComponent(base);
          cfi.spinePos = cfi.base.steps[1].index;
        } else if (typeof base === "object") {
          cfi.base = base;
        }
        cfi.path = this.pathTo(anchor, null, ignoreClass);
        return cfi;
      }
      filter(anchor, ignoreClass) {
        var needsIgnoring;
        var sibling;
        var parent2, previousSibling, nextSibling;
        var isText = false;
        if (anchor.nodeType === TEXT_NODE) {
          isText = true;
          parent2 = anchor.parentNode;
          needsIgnoring = anchor.parentNode.classList.contains(ignoreClass);
        } else {
          isText = false;
          needsIgnoring = anchor.classList.contains(ignoreClass);
        }
        if (needsIgnoring && isText) {
          previousSibling = parent2.previousSibling;
          nextSibling = parent2.nextSibling;
          if (previousSibling && previousSibling.nodeType === TEXT_NODE) {
            sibling = previousSibling;
          } else if (nextSibling && nextSibling.nodeType === TEXT_NODE) {
            sibling = nextSibling;
          }
          if (sibling) {
            return sibling;
          } else {
            return anchor;
          }
        } else if (needsIgnoring && !isText) {
          return false;
        } else {
          return anchor;
        }
      }
      patchOffset(anchor, offset, ignoreClass) {
        if (anchor.nodeType != TEXT_NODE) {
          throw new Error("Anchor must be a text node");
        }
        var curr = anchor;
        var totalOffset = offset;
        if (anchor.parentNode.classList.contains(ignoreClass)) {
          curr = anchor.parentNode;
        }
        while (curr.previousSibling) {
          if (curr.previousSibling.nodeType === ELEMENT_NODE) {
            if (curr.previousSibling.classList.contains(ignoreClass)) {
              totalOffset += curr.previousSibling.textContent.length;
            } else {
              break;
            }
          } else {
            totalOffset += curr.previousSibling.textContent.length;
          }
          curr = curr.previousSibling;
        }
        return totalOffset;
      }
      normalizedMap(children, nodeType, ignoreClass) {
        var output = {};
        var prevIndex = -1;
        var i, len = children.length;
        var currNodeType;
        var prevNodeType;
        for (i = 0; i < len; i++) {
          currNodeType = children[i].nodeType;
          if (currNodeType === ELEMENT_NODE && children[i].classList.contains(ignoreClass)) {
            currNodeType = TEXT_NODE;
          }
          if (i > 0 && currNodeType === TEXT_NODE && prevNodeType === TEXT_NODE) {
            output[i] = prevIndex;
          } else if (nodeType === currNodeType) {
            prevIndex = prevIndex + 1;
            output[i] = prevIndex;
          }
          prevNodeType = currNodeType;
        }
        return output;
      }
      position(anchor) {
        var children, index;
        if (anchor.nodeType === ELEMENT_NODE) {
          children = anchor.parentNode.children;
          if (!children) {
            children = (0, _core.findChildren)(anchor.parentNode);
          }
          index = Array.prototype.indexOf.call(children, anchor);
        } else {
          children = this.textNodes(anchor.parentNode);
          index = children.indexOf(anchor);
        }
        return index;
      }
      filteredPosition(anchor, ignoreClass) {
        var children, index, map;
        if (anchor.nodeType === ELEMENT_NODE) {
          children = anchor.parentNode.children;
          map = this.normalizedMap(children, ELEMENT_NODE, ignoreClass);
        } else {
          children = anchor.parentNode.childNodes;
          if (anchor.parentNode.classList.contains(ignoreClass)) {
            anchor = anchor.parentNode;
            children = anchor.parentNode.childNodes;
          }
          map = this.normalizedMap(children, TEXT_NODE, ignoreClass);
        }
        index = Array.prototype.indexOf.call(children, anchor);
        return map[index];
      }
      stepsToXpath(steps) {
        var xpath = [".", "*"];
        steps.forEach(function(step) {
          var position = step.index + 1;
          if (step.id) {
            xpath.push("*[position()=" + position + " and @id='" + step.id + "']");
          } else if (step.type === "text") {
            xpath.push("text()[" + position + "]");
          } else {
            xpath.push("*[" + position + "]");
          }
        });
        return xpath.join("/");
      }
      /*
      	To get the last step if needed:
      	// Get the terminal step
      lastStep = steps[steps.length-1];
      // Get the query string
      query = this.stepsToQuery(steps);
      // Find the containing element
      startContainerParent = doc.querySelector(query);
      // Find the text node within that element
      if(startContainerParent && lastStep.type == "text") {
      	container = startContainerParent.childNodes[lastStep.index];
      }
      */
      stepsToQuerySelector(steps) {
        var query = ["html"];
        steps.forEach(function(step) {
          var position = step.index + 1;
          if (step.id) {
            query.push("#" + step.id);
          } else if (step.type === "text") {
          } else {
            query.push("*:nth-child(" + position + ")");
          }
        });
        return query.join(">");
      }
      textNodes(container, ignoreClass) {
        return Array.prototype.slice.call(container.childNodes).filter(function(node) {
          if (node.nodeType === TEXT_NODE) {
            return true;
          } else if (ignoreClass && node.classList.contains(ignoreClass)) {
            return true;
          }
          return false;
        });
      }
      walkToNode(steps, _doc, ignoreClass) {
        var doc = _doc || document;
        var container = doc.documentElement;
        var children;
        var step;
        var len = steps.length;
        var i;
        for (i = 0; i < len; i++) {
          step = steps[i];
          if (step.type === "element") {
            if (step.id) {
              container = doc.getElementById(step.id);
            } else {
              children = container.children || (0, _core.findChildren)(container);
              container = children[step.index];
            }
          } else if (step.type === "text") {
            container = this.textNodes(container, ignoreClass)[step.index];
          }
          if (!container) {
            break;
          }
        }
        return container;
      }
      findNode(steps, _doc, ignoreClass) {
        var doc = _doc || document;
        var container;
        var xpath;
        if (!ignoreClass && typeof doc.evaluate != "undefined") {
          xpath = this.stepsToXpath(steps);
          container = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } else if (ignoreClass) {
          container = this.walkToNode(steps, doc, ignoreClass);
        } else {
          container = this.walkToNode(steps, doc);
        }
        return container;
      }
      fixMiss(steps, offset, _doc, ignoreClass) {
        var container = this.findNode(steps.slice(0, -1), _doc, ignoreClass);
        var children = container.childNodes;
        var map = this.normalizedMap(children, TEXT_NODE, ignoreClass);
        var child;
        var len;
        var lastStepIndex = steps[steps.length - 1].index;
        for (let childIndex in map) {
          if (!map.hasOwnProperty(childIndex)) return;
          if (map[childIndex] === lastStepIndex) {
            child = children[childIndex];
            len = child.textContent.length;
            if (offset > len) {
              offset = offset - len;
            } else {
              if (child.nodeType === ELEMENT_NODE) {
                container = child.childNodes[0];
              } else {
                container = child;
              }
              break;
            }
          }
        }
        return {
          container,
          offset
        };
      }
      /**
       * Creates a DOM range representing a CFI
       * @param {document} _doc document referenced in the base
       * @param {string} [ignoreClass]
       * @return {Range}
       */
      toRange(_doc, ignoreClass) {
        var doc = _doc || document;
        var range;
        var start, end, startContainer, endContainer;
        var cfi = this;
        var startSteps, endSteps;
        var needsIgnoring = ignoreClass ? doc.querySelector("." + ignoreClass) != null : false;
        var missed;
        if (typeof doc.createRange !== "undefined") {
          range = doc.createRange();
        } else {
          range = new _core.RangeObject();
        }
        if (cfi.range) {
          start = cfi.start;
          startSteps = cfi.path.steps.concat(start.steps);
          startContainer = this.findNode(startSteps, doc, needsIgnoring ? ignoreClass : null);
          end = cfi.end;
          endSteps = cfi.path.steps.concat(end.steps);
          endContainer = this.findNode(endSteps, doc, needsIgnoring ? ignoreClass : null);
        } else {
          start = cfi.path;
          startSteps = cfi.path.steps;
          startContainer = this.findNode(cfi.path.steps, doc, needsIgnoring ? ignoreClass : null);
        }
        if (startContainer) {
          try {
            if (start.terminal.offset != null) {
              range.setStart(startContainer, start.terminal.offset);
            } else {
              range.setStart(startContainer, 0);
            }
          } catch (e) {
            missed = this.fixMiss(startSteps, start.terminal.offset, doc, needsIgnoring ? ignoreClass : null);
            range.setStart(missed.container, missed.offset);
          }
        } else {
          console.log("No startContainer found for", this.toString());
          return null;
        }
        if (endContainer) {
          try {
            if (end.terminal.offset != null) {
              range.setEnd(endContainer, end.terminal.offset);
            } else {
              range.setEnd(endContainer, 0);
            }
          } catch (e) {
            missed = this.fixMiss(endSteps, cfi.end.terminal.offset, doc, needsIgnoring ? ignoreClass : null);
            range.setEnd(missed.container, missed.offset);
          }
        }
        return range;
      }
      /**
       * Check if a string is wrapped with "epubcfi()"
       * @param {string} str
       * @returns {boolean}
       */
      isCfiString(str) {
        if (typeof str === "string" && str.indexOf("epubcfi(") === 0 && str[str.length - 1] === ")") {
          return true;
        }
        return false;
      }
      generateChapterComponent(_spineNodeIndex, _pos, id) {
        var pos = parseInt(_pos), spineNodeIndex = (_spineNodeIndex + 1) * 2, cfi = "/" + spineNodeIndex + "/";
        cfi += (pos + 1) * 2;
        if (id) {
          cfi += "[" + id + "]";
        }
        return cfi;
      }
      /**
       * Collapse a CFI Range to a single CFI Position
       * @param {boolean} [toStart=false]
       */
      collapse(toStart) {
        if (!this.range) {
          return;
        }
        this.range = false;
        if (toStart) {
          this.path.steps = this.path.steps.concat(this.start.steps);
          this.path.terminal = this.start.terminal;
        } else {
          this.path.steps = this.path.steps.concat(this.end.steps);
          this.path.terminal = this.end.terminal;
        }
      }
    };
    var _default = EpubCFI;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/utils/queue.js
var require_queue = __commonJS({
  "../../node_modules/epubjs/lib/utils/queue.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = exports2.Task = void 0;
    var _core = require_core();
    var Queue = class {
      constructor(context) {
        this._q = [];
        this.context = context;
        this.tick = _core.requestAnimationFrame;
        this.running = false;
        this.paused = false;
      }
      /**
       * Add an item to the queue
       * @return {Promise}
       */
      enqueue() {
        var deferred, promise;
        var queued;
        var task = [].shift.call(arguments);
        var args = arguments;
        if (!task) {
          throw new Error("No Task Provided");
        }
        if (typeof task === "function") {
          deferred = new _core.defer();
          promise = deferred.promise;
          queued = {
            "task": task,
            "args": args,
            //"context"  : context,
            "deferred": deferred,
            "promise": promise
          };
        } else {
          queued = {
            "promise": task
          };
        }
        this._q.push(queued);
        if (this.paused == false && !this.running) {
          this.run();
        }
        return queued.promise;
      }
      /**
       * Run one item
       * @return {Promise}
       */
      dequeue() {
        var inwait, task, result;
        if (this._q.length && !this.paused) {
          inwait = this._q.shift();
          task = inwait.task;
          if (task) {
            result = task.apply(this.context, inwait.args);
            if (result && typeof result["then"] === "function") {
              return result.then(function() {
                inwait.deferred.resolve.apply(this.context, arguments);
              }.bind(this), function() {
                inwait.deferred.reject.apply(this.context, arguments);
              }.bind(this));
            } else {
              inwait.deferred.resolve.apply(this.context, result);
              return inwait.promise;
            }
          } else if (inwait.promise) {
            return inwait.promise;
          }
        } else {
          inwait = new _core.defer();
          inwait.deferred.resolve();
          return inwait.promise;
        }
      }
      // Run All Immediately
      dump() {
        while (this._q.length) {
          this.dequeue();
        }
      }
      /**
       * Run all tasks sequentially, at convince
       * @return {Promise}
       */
      run() {
        if (!this.running) {
          this.running = true;
          this.defered = new _core.defer();
        }
        this.tick.call(window, () => {
          if (this._q.length) {
            this.dequeue().then(function() {
              this.run();
            }.bind(this));
          } else {
            this.defered.resolve();
            this.running = void 0;
          }
        });
        if (this.paused == true) {
          this.paused = false;
        }
        return this.defered.promise;
      }
      /**
       * Flush all, as quickly as possible
       * @return {Promise}
       */
      flush() {
        if (this.running) {
          return this.running;
        }
        if (this._q.length) {
          this.running = this.dequeue().then(function() {
            this.running = void 0;
            return this.flush();
          }.bind(this));
          return this.running;
        }
      }
      /**
       * Clear all items in wait
       */
      clear() {
        this._q = [];
      }
      /**
       * Get the number of tasks in the queue
       * @return {number} tasks
       */
      length() {
        return this._q.length;
      }
      /**
       * Pause a running queue
       */
      pause() {
        this.paused = true;
      }
      /**
       * End the queue
       */
      stop() {
        this._q = [];
        this.running = false;
        this.paused = true;
      }
    };
    var Task = class {
      constructor(task, args, context) {
        return function() {
          var toApply = arguments || [];
          return new Promise((resolve, reject) => {
            var callback = function(value, err) {
              if (!value && err) {
                reject(err);
              } else {
                resolve(value);
              }
            };
            toApply.push(callback);
            task.apply(context || this, toApply);
          });
        };
      }
    };
    exports2.Task = Task;
    var _default = Queue;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/utils/constants.js
var require_constants = __commonJS({
  "../../node_modules/epubjs/lib/utils/constants.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.EVENTS = exports2.EPUBJS_VERSION = exports2.DOM_EVENTS = void 0;
    var EPUBJS_VERSION = "0.3";
    exports2.EPUBJS_VERSION = EPUBJS_VERSION;
    var DOM_EVENTS = ["keydown", "keyup", "keypressed", "mouseup", "mousedown", "mousemove", "click", "touchend", "touchstart", "touchmove"];
    exports2.DOM_EVENTS = DOM_EVENTS;
    var EVENTS = {
      BOOK: {
        OPEN_FAILED: "openFailed"
      },
      CONTENTS: {
        EXPAND: "expand",
        RESIZE: "resize",
        SELECTED: "selected",
        SELECTED_RANGE: "selectedRange",
        LINK_CLICKED: "linkClicked"
      },
      LOCATIONS: {
        CHANGED: "changed"
      },
      MANAGERS: {
        RESIZE: "resize",
        RESIZED: "resized",
        ORIENTATION_CHANGE: "orientationchange",
        ADDED: "added",
        SCROLL: "scroll",
        SCROLLED: "scrolled",
        REMOVED: "removed"
      },
      VIEWS: {
        AXIS: "axis",
        WRITING_MODE: "writingMode",
        LOAD_ERROR: "loaderror",
        RENDERED: "rendered",
        RESIZED: "resized",
        DISPLAYED: "displayed",
        SHOWN: "shown",
        HIDDEN: "hidden",
        MARK_CLICKED: "markClicked"
      },
      RENDITION: {
        STARTED: "started",
        ATTACHED: "attached",
        DISPLAYED: "displayed",
        DISPLAY_ERROR: "displayerror",
        RENDERED: "rendered",
        REMOVED: "removed",
        RESIZED: "resized",
        ORIENTATION_CHANGE: "orientationchange",
        LOCATION_CHANGED: "locationChanged",
        RELOCATED: "relocated",
        MARK_CLICKED: "markClicked",
        SELECTED: "selected",
        LAYOUT: "layout"
      },
      LAYOUT: {
        UPDATED: "updated"
      },
      ANNOTATION: {
        ATTACH: "attach",
        DETACH: "detach"
      }
    };
    exports2.EVENTS = EVENTS;
  }
});

// ../../node_modules/epubjs/lib/layout.js
var require_layout = __commonJS({
  "../../node_modules/epubjs/lib/layout.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _core = require_core();
    var _constants = require_constants();
    var _eventEmitter = _interopRequireDefault(require_event_emitter());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var Layout = class {
      constructor(settings) {
        this.settings = settings;
        this.name = settings.layout || "reflowable";
        this._spread = settings.spread === "none" ? false : true;
        this._minSpreadWidth = settings.minSpreadWidth || 800;
        this._evenSpreads = settings.evenSpreads || false;
        if (settings.flow === "scrolled" || settings.flow === "scrolled-continuous" || settings.flow === "scrolled-doc") {
          this._flow = "scrolled";
        } else {
          this._flow = "paginated";
        }
        this.width = 0;
        this.height = 0;
        this.spreadWidth = 0;
        this.delta = 0;
        this.columnWidth = 0;
        this.gap = 0;
        this.divisor = 1;
        this.props = {
          name: this.name,
          spread: this._spread,
          flow: this._flow,
          width: 0,
          height: 0,
          spreadWidth: 0,
          delta: 0,
          columnWidth: 0,
          gap: 0,
          divisor: 1
        };
      }
      /**
       * Switch the flow between paginated and scrolled
       * @param  {string} flow paginated | scrolled
       * @return {string} simplified flow
       */
      flow(flow) {
        if (typeof flow != "undefined") {
          if (flow === "scrolled" || flow === "scrolled-continuous" || flow === "scrolled-doc") {
            this._flow = "scrolled";
          } else {
            this._flow = "paginated";
          }
          this.update({
            flow: this._flow
          });
        }
        return this._flow;
      }
      /**
       * Switch between using spreads or not, and set the
       * width at which they switch to single.
       * @param  {string} spread "none" | "always" | "auto"
       * @param  {number} min integer in pixels
       * @return {boolean} spread true | false
       */
      spread(spread, min) {
        if (spread) {
          this._spread = spread === "none" ? false : true;
          this.update({
            spread: this._spread
          });
        }
        if (min >= 0) {
          this._minSpreadWidth = min;
        }
        return this._spread;
      }
      /**
       * Calculate the dimensions of the pagination
       * @param  {number} _width  width of the rendering
       * @param  {number} _height height of the rendering
       * @param  {number} _gap    width of the gap between columns
       */
      calculate(_width, _height, _gap) {
        var divisor = 1;
        var gap = _gap || 0;
        var width = _width;
        var height = _height;
        var section = Math.floor(width / 12);
        var columnWidth;
        var spreadWidth;
        var pageWidth;
        var delta;
        if (this._spread && width >= this._minSpreadWidth) {
          divisor = 2;
        } else {
          divisor = 1;
        }
        if (this.name === "reflowable" && this._flow === "paginated" && !(_gap >= 0)) {
          gap = section % 2 === 0 ? section : section - 1;
        }
        if (this.name === "pre-paginated") {
          gap = 0;
        }
        if (divisor > 1) {
          columnWidth = width / divisor - gap;
          pageWidth = columnWidth + gap;
        } else {
          columnWidth = width;
          pageWidth = width;
        }
        if (this.name === "pre-paginated" && divisor > 1) {
          width = columnWidth;
        }
        spreadWidth = columnWidth * divisor + gap;
        delta = width;
        this.width = width;
        this.height = height;
        this.spreadWidth = spreadWidth;
        this.pageWidth = pageWidth;
        this.delta = delta;
        this.columnWidth = columnWidth;
        this.gap = gap;
        this.divisor = divisor;
        this.update({
          width,
          height,
          spreadWidth,
          pageWidth,
          delta,
          columnWidth,
          gap,
          divisor
        });
      }
      /**
       * Apply Css to a Document
       * @param  {Contents} contents
       * @return {Promise}
       */
      format(contents, section, axis) {
        var formating;
        if (this.name === "pre-paginated") {
          formating = contents.fit(this.columnWidth, this.height, section);
        } else if (this._flow === "paginated") {
          formating = contents.columns(this.width, this.height, this.columnWidth, this.gap, this.settings.direction);
        } else if (axis && axis === "horizontal") {
          formating = contents.size(null, this.height);
        } else {
          formating = contents.size(this.width, null);
        }
        return formating;
      }
      /**
       * Count number of pages
       * @param  {number} totalLength
       * @param  {number} pageLength
       * @return {{spreads: Number, pages: Number}}
       */
      count(totalLength, pageLength) {
        let spreads, pages;
        if (this.name === "pre-paginated") {
          spreads = 1;
          pages = 1;
        } else if (this._flow === "paginated") {
          pageLength = pageLength || this.delta;
          spreads = Math.ceil(totalLength / pageLength);
          pages = spreads * this.divisor;
        } else {
          pageLength = pageLength || this.height;
          spreads = Math.ceil(totalLength / pageLength);
          pages = spreads;
        }
        return {
          spreads,
          pages
        };
      }
      /**
       * Update props that have changed
       * @private
       * @param  {object} props
       */
      update(props) {
        Object.keys(props).forEach((propName) => {
          if (this.props[propName] === props[propName]) {
            delete props[propName];
          }
        });
        if (Object.keys(props).length > 0) {
          let newProps = (0, _core.extend)(this.props, props);
          this.emit(_constants.EVENTS.LAYOUT.UPDATED, newProps, props);
        }
      }
    };
    (0, _eventEmitter.default)(Layout.prototype);
    var _default = Layout;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/themes.js
var require_themes = __commonJS({
  "../../node_modules/epubjs/lib/themes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _url = _interopRequireDefault(require_url());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var Themes = class {
      constructor(rendition) {
        this.rendition = rendition;
        this._themes = {
          "default": {
            "rules": {},
            "url": "",
            "serialized": ""
          }
        };
        this._overrides = {};
        this._current = "default";
        this._injected = [];
        this.rendition.hooks.content.register(this.inject.bind(this));
        this.rendition.hooks.content.register(this.overrides.bind(this));
      }
      /**
       * Add themes to be used by a rendition
       * @param {object | Array<object> | string}
       * @example themes.register("light", "http://example.com/light.css")
       * @example themes.register("light", { "body": { "color": "purple"}})
       * @example themes.register({ "light" : {...}, "dark" : {...}})
       */
      register() {
        if (arguments.length === 0) {
          return;
        }
        if (arguments.length === 1 && typeof arguments[0] === "object") {
          return this.registerThemes(arguments[0]);
        }
        if (arguments.length === 1 && typeof arguments[0] === "string") {
          return this.default(arguments[0]);
        }
        if (arguments.length === 2 && typeof arguments[1] === "string") {
          return this.registerUrl(arguments[0], arguments[1]);
        }
        if (arguments.length === 2 && typeof arguments[1] === "object") {
          return this.registerRules(arguments[0], arguments[1]);
        }
      }
      /**
       * Add a default theme to be used by a rendition
       * @param {object | string} theme
       * @example themes.register("http://example.com/default.css")
       * @example themes.register({ "body": { "color": "purple"}})
       */
      default(theme) {
        if (!theme) {
          return;
        }
        if (typeof theme === "string") {
          return this.registerUrl("default", theme);
        }
        if (typeof theme === "object") {
          return this.registerRules("default", theme);
        }
      }
      /**
       * Register themes object
       * @param {object} themes
       */
      registerThemes(themes) {
        for (var theme in themes) {
          if (themes.hasOwnProperty(theme)) {
            if (typeof themes[theme] === "string") {
              this.registerUrl(theme, themes[theme]);
            } else {
              this.registerRules(theme, themes[theme]);
            }
          }
        }
      }
      /**
       * Register a theme by passing its css as string
       * @param {string} name 
       * @param {string} css 
       */
      registerCss(name, css) {
        this._themes[name] = {
          "serialized": css
        };
        if (this._injected[name] || name == "default") {
          this.update(name);
        }
      }
      /**
       * Register a url
       * @param {string} name
       * @param {string} input
       */
      registerUrl(name, input) {
        var url = new _url.default(input);
        this._themes[name] = {
          "url": url.toString()
        };
        if (this._injected[name] || name == "default") {
          this.update(name);
        }
      }
      /**
       * Register rule
       * @param {string} name
       * @param {object} rules
       */
      registerRules(name, rules) {
        this._themes[name] = {
          "rules": rules
        };
        if (this._injected[name] || name == "default") {
          this.update(name);
        }
      }
      /**
       * Select a theme
       * @param {string} name
       */
      select(name) {
        var prev = this._current;
        var contents;
        this._current = name;
        this.update(name);
        contents = this.rendition.getContents();
        contents.forEach((content) => {
          content.removeClass(prev);
          content.addClass(name);
        });
      }
      /**
       * Update a theme
       * @param {string} name
       */
      update(name) {
        var contents = this.rendition.getContents();
        contents.forEach((content) => {
          this.add(name, content);
        });
      }
      /**
       * Inject all themes into contents
       * @param {Contents} contents
       */
      inject(contents) {
        var links = [];
        var themes = this._themes;
        var theme;
        for (var name in themes) {
          if (themes.hasOwnProperty(name) && (name === this._current || name === "default")) {
            theme = themes[name];
            if (theme.rules && Object.keys(theme.rules).length > 0 || theme.url && links.indexOf(theme.url) === -1) {
              this.add(name, contents);
            }
            this._injected.push(name);
          }
        }
        if (this._current != "default") {
          contents.addClass(this._current);
        }
      }
      /**
       * Add Theme to contents
       * @param {string} name
       * @param {Contents} contents
       */
      add(name, contents) {
        var theme = this._themes[name];
        if (!theme || !contents) {
          return;
        }
        if (theme.url) {
          contents.addStylesheet(theme.url);
        } else if (theme.serialized) {
          contents.addStylesheetCss(theme.serialized, name);
          theme.injected = true;
        } else if (theme.rules) {
          contents.addStylesheetRules(theme.rules, name);
          theme.injected = true;
        }
      }
      /**
       * Add override
       * @param {string} name
       * @param {string} value
       * @param {boolean} priority
       */
      override(name, value, priority) {
        var contents = this.rendition.getContents();
        this._overrides[name] = {
          value,
          priority: priority === true
        };
        contents.forEach((content) => {
          content.css(name, this._overrides[name].value, this._overrides[name].priority);
        });
      }
      removeOverride(name) {
        var contents = this.rendition.getContents();
        delete this._overrides[name];
        contents.forEach((content) => {
          content.css(name);
        });
      }
      /**
       * Add all overrides
       * @param {Content} content
       */
      overrides(contents) {
        var overrides = this._overrides;
        for (var rule in overrides) {
          if (overrides.hasOwnProperty(rule)) {
            contents.css(rule, overrides[rule].value, overrides[rule].priority);
          }
        }
      }
      /**
       * Adjust the font size of a rendition
       * @param {number} size
       */
      fontSize(size) {
        this.override("font-size", size);
      }
      /**
       * Adjust the font-family of a rendition
       * @param {string} f
       */
      font(f) {
        this.override("font-family", f, true);
      }
      destroy() {
        this.rendition = void 0;
        this._themes = void 0;
        this._overrides = void 0;
        this._current = void 0;
        this._injected = void 0;
      }
    };
    var _default = Themes;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/mapping.js
var require_mapping = __commonJS({
  "../../node_modules/epubjs/lib/mapping.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _epubcfi = _interopRequireDefault(require_epubcfi());
    var _core = require_core();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var Mapping = class {
      constructor(layout, direction, axis, dev = false) {
        this.layout = layout;
        this.horizontal = axis === "horizontal" ? true : false;
        this.direction = direction || "ltr";
        this._dev = dev;
      }
      /**
       * Find CFI pairs for entire section at once
       */
      section(view) {
        var ranges = this.findRanges(view);
        var map = this.rangeListToCfiList(view.section.cfiBase, ranges);
        return map;
      }
      /**
       * Find CFI pairs for a page
       * @param {Contents} contents Contents from view
       * @param {string} cfiBase string of the base for a cfi
       * @param {number} start position to start at
       * @param {number} end position to end at
       */
      page(contents, cfiBase, start, end) {
        var root = contents && contents.document ? contents.document.body : false;
        var result;
        if (!root) {
          return;
        }
        result = this.rangePairToCfiPair(cfiBase, {
          start: this.findStart(root, start, end),
          end: this.findEnd(root, start, end)
        });
        if (this._dev === true) {
          let doc = contents.document;
          let startRange = new _epubcfi.default(result.start).toRange(doc);
          let endRange = new _epubcfi.default(result.end).toRange(doc);
          let selection = doc.defaultView.getSelection();
          let r = doc.createRange();
          selection.removeAllRanges();
          r.setStart(startRange.startContainer, startRange.startOffset);
          r.setEnd(endRange.endContainer, endRange.endOffset);
          selection.addRange(r);
        }
        return result;
      }
      /**
       * Walk a node, preforming a function on each node it finds
       * @private
       * @param {Node} root Node to walkToNode
       * @param {function} func walk function
       * @return {*} returns the result of the walk function
       */
      walk(root, func) {
        if (root && root.nodeType === Node.TEXT_NODE) {
          return;
        }
        var filter = {
          acceptNode: function(node2) {
            if (node2.data.trim().length > 0) {
              return NodeFilter.FILTER_ACCEPT;
            } else {
              return NodeFilter.FILTER_REJECT;
            }
          }
        };
        var safeFilter = filter.acceptNode;
        safeFilter.acceptNode = filter.acceptNode;
        var treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, safeFilter, false);
        var node;
        var result;
        while (node = treeWalker.nextNode()) {
          result = func(node);
          if (result) break;
        }
        return result;
      }
      findRanges(view) {
        var columns = [];
        var scrollWidth = view.contents.scrollWidth();
        var spreads = Math.ceil(scrollWidth / this.layout.spreadWidth);
        var count = spreads * this.layout.divisor;
        var columnWidth = this.layout.columnWidth;
        var gap = this.layout.gap;
        var start, end;
        for (var i = 0; i < count.pages; i++) {
          start = (columnWidth + gap) * i;
          end = columnWidth * (i + 1) + gap * i;
          columns.push({
            start: this.findStart(view.document.body, start, end),
            end: this.findEnd(view.document.body, start, end)
          });
        }
        return columns;
      }
      /**
       * Find Start Range
       * @private
       * @param {Node} root root node
       * @param {number} start position to start at
       * @param {number} end position to end at
       * @return {Range}
       */
      findStart(root, start, end) {
        var stack = [root];
        var $el;
        var found;
        var $prev = root;
        while (stack.length) {
          $el = stack.shift();
          found = this.walk($el, (node) => {
            var left, right, top, bottom;
            var elPos;
            var elRange;
            elPos = (0, _core.nodeBounds)(node);
            if (this.horizontal && this.direction === "ltr") {
              left = this.horizontal ? elPos.left : elPos.top;
              right = this.horizontal ? elPos.right : elPos.bottom;
              if (left >= start && left <= end) {
                return node;
              } else if (right > start) {
                return node;
              } else {
                $prev = node;
                stack.push(node);
              }
            } else if (this.horizontal && this.direction === "rtl") {
              left = elPos.left;
              right = elPos.right;
              if (right <= end && right >= start) {
                return node;
              } else if (left < end) {
                return node;
              } else {
                $prev = node;
                stack.push(node);
              }
            } else {
              top = elPos.top;
              bottom = elPos.bottom;
              if (top >= start && top <= end) {
                return node;
              } else if (bottom > start) {
                return node;
              } else {
                $prev = node;
                stack.push(node);
              }
            }
          });
          if (found) {
            return this.findTextStartRange(found, start, end);
          }
        }
        return this.findTextStartRange($prev, start, end);
      }
      /**
       * Find End Range
       * @private
       * @param {Node} root root node
       * @param {number} start position to start at
       * @param {number} end position to end at
       * @return {Range}
       */
      findEnd(root, start, end) {
        var stack = [root];
        var $el;
        var $prev = root;
        var found;
        while (stack.length) {
          $el = stack.shift();
          found = this.walk($el, (node) => {
            var left, right, top, bottom;
            var elPos;
            var elRange;
            elPos = (0, _core.nodeBounds)(node);
            if (this.horizontal && this.direction === "ltr") {
              left = Math.round(elPos.left);
              right = Math.round(elPos.right);
              if (left > end && $prev) {
                return $prev;
              } else if (right > end) {
                return node;
              } else {
                $prev = node;
                stack.push(node);
              }
            } else if (this.horizontal && this.direction === "rtl") {
              left = Math.round(this.horizontal ? elPos.left : elPos.top);
              right = Math.round(this.horizontal ? elPos.right : elPos.bottom);
              if (right < start && $prev) {
                return $prev;
              } else if (left < start) {
                return node;
              } else {
                $prev = node;
                stack.push(node);
              }
            } else {
              top = Math.round(elPos.top);
              bottom = Math.round(elPos.bottom);
              if (top > end && $prev) {
                return $prev;
              } else if (bottom > end) {
                return node;
              } else {
                $prev = node;
                stack.push(node);
              }
            }
          });
          if (found) {
            return this.findTextEndRange(found, start, end);
          }
        }
        return this.findTextEndRange($prev, start, end);
      }
      /**
       * Find Text Start Range
       * @private
       * @param {Node} root root node
       * @param {number} start position to start at
       * @param {number} end position to end at
       * @return {Range}
       */
      findTextStartRange(node, start, end) {
        var ranges = this.splitTextNodeIntoRanges(node);
        var range;
        var pos;
        var left, top, right;
        for (var i = 0; i < ranges.length; i++) {
          range = ranges[i];
          pos = range.getBoundingClientRect();
          if (this.horizontal && this.direction === "ltr") {
            left = pos.left;
            if (left >= start) {
              return range;
            }
          } else if (this.horizontal && this.direction === "rtl") {
            right = pos.right;
            if (right <= end) {
              return range;
            }
          } else {
            top = pos.top;
            if (top >= start) {
              return range;
            }
          }
        }
        return ranges[0];
      }
      /**
       * Find Text End Range
       * @private
       * @param {Node} root root node
       * @param {number} start position to start at
       * @param {number} end position to end at
       * @return {Range}
       */
      findTextEndRange(node, start, end) {
        var ranges = this.splitTextNodeIntoRanges(node);
        var prev;
        var range;
        var pos;
        var left, right, top, bottom;
        for (var i = 0; i < ranges.length; i++) {
          range = ranges[i];
          pos = range.getBoundingClientRect();
          if (this.horizontal && this.direction === "ltr") {
            left = pos.left;
            right = pos.right;
            if (left > end && prev) {
              return prev;
            } else if (right > end) {
              return range;
            }
          } else if (this.horizontal && this.direction === "rtl") {
            left = pos.left;
            right = pos.right;
            if (right < start && prev) {
              return prev;
            } else if (left < start) {
              return range;
            }
          } else {
            top = pos.top;
            bottom = pos.bottom;
            if (top > end && prev) {
              return prev;
            } else if (bottom > end) {
              return range;
            }
          }
          prev = range;
        }
        return ranges[ranges.length - 1];
      }
      /**
       * Split up a text node into ranges for each word
       * @private
       * @param {Node} root root node
       * @param {string} [_splitter] what to split on
       * @return {Range[]}
       */
      splitTextNodeIntoRanges(node, _splitter) {
        var ranges = [];
        var textContent = node.textContent || "";
        var text = textContent.trim();
        var range;
        var doc = node.ownerDocument;
        var splitter = _splitter || " ";
        var pos = text.indexOf(splitter);
        if (pos === -1 || node.nodeType != Node.TEXT_NODE) {
          range = doc.createRange();
          range.selectNodeContents(node);
          return [range];
        }
        range = doc.createRange();
        range.setStart(node, 0);
        range.setEnd(node, pos);
        ranges.push(range);
        range = false;
        while (pos != -1) {
          pos = text.indexOf(splitter, pos + 1);
          if (pos > 0) {
            if (range) {
              range.setEnd(node, pos);
              ranges.push(range);
            }
            range = doc.createRange();
            range.setStart(node, pos + 1);
          }
        }
        if (range) {
          range.setEnd(node, text.length);
          ranges.push(range);
        }
        return ranges;
      }
      /**
       * Turn a pair of ranges into a pair of CFIs
       * @private
       * @param {string} cfiBase base string for an EpubCFI
       * @param {object} rangePair { start: Range, end: Range }
       * @return {object} { start: "epubcfi(...)", end: "epubcfi(...)" }
       */
      rangePairToCfiPair(cfiBase, rangePair) {
        var startRange = rangePair.start;
        var endRange = rangePair.end;
        startRange.collapse(true);
        endRange.collapse(false);
        let startCfi = new _epubcfi.default(startRange, cfiBase).toString();
        let endCfi = new _epubcfi.default(endRange, cfiBase).toString();
        return {
          start: startCfi,
          end: endCfi
        };
      }
      rangeListToCfiList(cfiBase, columns) {
        var map = [];
        var cifPair;
        for (var i = 0; i < columns.length; i++) {
          cifPair = this.rangePairToCfiPair(cfiBase, columns[i]);
          map.push(cifPair);
        }
        return map;
      }
      /**
       * Set the axis for mapping
       * @param {string} axis horizontal | vertical
       * @return {boolean} is it horizontal?
       */
      axis(axis) {
        if (axis) {
          this.horizontal = axis === "horizontal" ? true : false;
        }
        return this.horizontal;
      }
    };
    var _default = Mapping;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/contents.js
var require_contents = __commonJS({
  "../../node_modules/epubjs/lib/contents.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _eventEmitter = _interopRequireDefault(require_event_emitter());
    var _core = require_core();
    var _epubcfi = _interopRequireDefault(require_epubcfi());
    var _mapping = _interopRequireDefault(require_mapping());
    var _replacements = require_replacements();
    var _constants = require_constants();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var hasNavigator = typeof navigator !== "undefined";
    var isChrome = hasNavigator && /Chrome/.test(navigator.userAgent);
    var isWebkit = hasNavigator && !isChrome && /AppleWebKit/.test(navigator.userAgent);
    var ELEMENT_NODE = 1;
    var Contents = class {
      constructor(doc, content, cfiBase, sectionIndex) {
        this.epubcfi = new _epubcfi.default();
        this.document = doc;
        this.documentElement = this.document.documentElement;
        this.content = content || this.document.body;
        this.window = this.document.defaultView;
        this._size = {
          width: 0,
          height: 0
        };
        this.sectionIndex = sectionIndex || 0;
        this.cfiBase = cfiBase || "";
        this.epubReadingSystem("epub.js", _constants.EPUBJS_VERSION);
        this.called = 0;
        this.active = true;
        this.listeners();
      }
      /**
      	* Get DOM events that are listened for and passed along
      	*/
      static get listenedEvents() {
        return _constants.DOM_EVENTS;
      }
      /**
      	* Get or Set width
      	* @param {number} [w]
      	* @returns {number} width
      	*/
      width(w) {
        var frame = this.content;
        if (w && (0, _core.isNumber)(w)) {
          w = w + "px";
        }
        if (w) {
          frame.style.width = w;
        }
        return parseInt(this.window.getComputedStyle(frame)["width"]);
      }
      /**
      	* Get or Set height
      	* @param {number} [h]
      	* @returns {number} height
      	*/
      height(h) {
        var frame = this.content;
        if (h && (0, _core.isNumber)(h)) {
          h = h + "px";
        }
        if (h) {
          frame.style.height = h;
        }
        return parseInt(this.window.getComputedStyle(frame)["height"]);
      }
      /**
      	* Get or Set width of the contents
      	* @param {number} [w]
      	* @returns {number} width
      	*/
      contentWidth(w) {
        var content = this.content || this.document.body;
        if (w && (0, _core.isNumber)(w)) {
          w = w + "px";
        }
        if (w) {
          content.style.width = w;
        }
        return parseInt(this.window.getComputedStyle(content)["width"]);
      }
      /**
      	* Get or Set height of the contents
      	* @param {number} [h]
      	* @returns {number} height
      	*/
      contentHeight(h) {
        var content = this.content || this.document.body;
        if (h && (0, _core.isNumber)(h)) {
          h = h + "px";
        }
        if (h) {
          content.style.height = h;
        }
        return parseInt(this.window.getComputedStyle(content)["height"]);
      }
      /**
      	* Get the width of the text using Range
      	* @returns {number} width
      	*/
      textWidth() {
        let rect;
        let width;
        let range = this.document.createRange();
        let content = this.content || this.document.body;
        let border = (0, _core.borders)(content);
        range.selectNodeContents(content);
        rect = range.getBoundingClientRect();
        width = rect.width;
        if (border && border.width) {
          width += border.width;
        }
        return Math.round(width);
      }
      /**
      	* Get the height of the text using Range
      	* @returns {number} height
      	*/
      textHeight() {
        let rect;
        let height;
        let range = this.document.createRange();
        let content = this.content || this.document.body;
        range.selectNodeContents(content);
        rect = range.getBoundingClientRect();
        height = rect.bottom;
        return Math.round(height);
      }
      /**
      	* Get documentElement scrollWidth
      	* @returns {number} width
      	*/
      scrollWidth() {
        var width = this.documentElement.scrollWidth;
        return width;
      }
      /**
      	* Get documentElement scrollHeight
      	* @returns {number} height
      	*/
      scrollHeight() {
        var height = this.documentElement.scrollHeight;
        return height;
      }
      /**
      	* Set overflow css style of the contents
      	* @param {string} [overflow]
      	*/
      overflow(overflow) {
        if (overflow) {
          this.documentElement.style.overflow = overflow;
        }
        return this.window.getComputedStyle(this.documentElement)["overflow"];
      }
      /**
      	* Set overflowX css style of the documentElement
      	* @param {string} [overflow]
      	*/
      overflowX(overflow) {
        if (overflow) {
          this.documentElement.style.overflowX = overflow;
        }
        return this.window.getComputedStyle(this.documentElement)["overflowX"];
      }
      /**
      	* Set overflowY css style of the documentElement
      	* @param {string} [overflow]
      	*/
      overflowY(overflow) {
        if (overflow) {
          this.documentElement.style.overflowY = overflow;
        }
        return this.window.getComputedStyle(this.documentElement)["overflowY"];
      }
      /**
      	* Set Css styles on the contents element (typically Body)
      	* @param {string} property
      	* @param {string} value
      	* @param {boolean} [priority] set as "important"
      	*/
      css(property, value, priority) {
        var content = this.content || this.document.body;
        if (value) {
          content.style.setProperty(property, value, priority ? "important" : "");
        } else {
          content.style.removeProperty(property);
        }
        return this.window.getComputedStyle(content)[property];
      }
      /**
      	* Get or Set the viewport element
      	* @param {object} [options]
      	* @param {string} [options.width]
      	* @param {string} [options.height]
      	* @param {string} [options.scale]
      	* @param {string} [options.minimum]
      	* @param {string} [options.maximum]
      	* @param {string} [options.scalable]
      	*/
      viewport(options) {
        var _width, _height, _scale, _minimum, _maximum, _scalable;
        var $viewport = this.document.querySelector("meta[name='viewport']");
        var parsed = {
          "width": void 0,
          "height": void 0,
          "scale": void 0,
          "minimum": void 0,
          "maximum": void 0,
          "scalable": void 0
        };
        var newContent = [];
        var settings = {};
        if ($viewport && $viewport.hasAttribute("content")) {
          let content = $viewport.getAttribute("content");
          let _width2 = content.match(/width\s*=\s*([^,]*)/);
          let _height2 = content.match(/height\s*=\s*([^,]*)/);
          let _scale2 = content.match(/initial-scale\s*=\s*([^,]*)/);
          let _minimum2 = content.match(/minimum-scale\s*=\s*([^,]*)/);
          let _maximum2 = content.match(/maximum-scale\s*=\s*([^,]*)/);
          let _scalable2 = content.match(/user-scalable\s*=\s*([^,]*)/);
          if (_width2 && _width2.length && typeof _width2[1] !== "undefined") {
            parsed.width = _width2[1];
          }
          if (_height2 && _height2.length && typeof _height2[1] !== "undefined") {
            parsed.height = _height2[1];
          }
          if (_scale2 && _scale2.length && typeof _scale2[1] !== "undefined") {
            parsed.scale = _scale2[1];
          }
          if (_minimum2 && _minimum2.length && typeof _minimum2[1] !== "undefined") {
            parsed.minimum = _minimum2[1];
          }
          if (_maximum2 && _maximum2.length && typeof _maximum2[1] !== "undefined") {
            parsed.maximum = _maximum2[1];
          }
          if (_scalable2 && _scalable2.length && typeof _scalable2[1] !== "undefined") {
            parsed.scalable = _scalable2[1];
          }
        }
        settings = (0, _core.defaults)(options || {}, parsed);
        if (options) {
          if (settings.width) {
            newContent.push("width=" + settings.width);
          }
          if (settings.height) {
            newContent.push("height=" + settings.height);
          }
          if (settings.scale) {
            newContent.push("initial-scale=" + settings.scale);
          }
          if (settings.scalable === "no") {
            newContent.push("minimum-scale=" + settings.scale);
            newContent.push("maximum-scale=" + settings.scale);
            newContent.push("user-scalable=" + settings.scalable);
          } else {
            if (settings.scalable) {
              newContent.push("user-scalable=" + settings.scalable);
            }
            if (settings.minimum) {
              newContent.push("minimum-scale=" + settings.minimum);
            }
            if (settings.maximum) {
              newContent.push("minimum-scale=" + settings.maximum);
            }
          }
          if (!$viewport) {
            $viewport = this.document.createElement("meta");
            $viewport.setAttribute("name", "viewport");
            this.document.querySelector("head").appendChild($viewport);
          }
          $viewport.setAttribute("content", newContent.join(", "));
          this.window.scrollTo(0, 0);
        }
        return settings;
      }
      /**
       * Event emitter for when the contents has expanded
       * @private
       */
      expand() {
        this.emit(_constants.EVENTS.CONTENTS.EXPAND);
      }
      /**
       * Add DOM listeners
       * @private
       */
      listeners() {
        this.imageLoadListeners();
        this.mediaQueryListeners();
        this.addEventListeners();
        this.addSelectionListeners();
        if (typeof ResizeObserver === "undefined") {
          this.resizeListeners();
          this.visibilityListeners();
        } else {
          this.resizeObservers();
        }
        this.linksHandler();
      }
      /**
       * Remove DOM listeners
       * @private
       */
      removeListeners() {
        this.removeEventListeners();
        this.removeSelectionListeners();
        if (this.observer) {
          this.observer.disconnect();
        }
        clearTimeout(this.expanding);
      }
      /**
       * Check if size of contents has changed and
       * emit 'resize' event if it has.
       * @private
       */
      resizeCheck() {
        let width = this.textWidth();
        let height = this.textHeight();
        if (width != this._size.width || height != this._size.height) {
          this._size = {
            width,
            height
          };
          this.onResize && this.onResize(this._size);
          this.emit(_constants.EVENTS.CONTENTS.RESIZE, this._size);
        }
      }
      /**
       * Poll for resize detection
       * @private
       */
      resizeListeners() {
        var width, height;
        clearTimeout(this.expanding);
        requestAnimationFrame(this.resizeCheck.bind(this));
        this.expanding = setTimeout(this.resizeListeners.bind(this), 350);
      }
      /**
       * Listen for visibility of tab to change
       * @private
       */
      visibilityListeners() {
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible" && this.active === false) {
            this.active = true;
            this.resizeListeners();
          } else {
            this.active = false;
            clearTimeout(this.expanding);
          }
        });
      }
      /**
       * Use css transitions to detect resize
       * @private
       */
      transitionListeners() {
        let body = this.content;
        body.style["transitionProperty"] = "font, font-size, font-size-adjust, font-stretch, font-variation-settings, font-weight, width, height";
        body.style["transitionDuration"] = "0.001ms";
        body.style["transitionTimingFunction"] = "linear";
        body.style["transitionDelay"] = "0";
        this._resizeCheck = this.resizeCheck.bind(this);
        this.document.addEventListener("transitionend", this._resizeCheck);
      }
      /**
       * Listen for media query changes and emit 'expand' event
       * Adapted from: https://github.com/tylergaw/media-query-events/blob/master/js/mq-events.js
       * @private
       */
      mediaQueryListeners() {
        var sheets = this.document.styleSheets;
        var mediaChangeHandler = function(m) {
          if (m.matches && !this._expanding) {
            setTimeout(this.expand.bind(this), 1);
          }
        }.bind(this);
        for (var i = 0; i < sheets.length; i += 1) {
          var rules;
          try {
            rules = sheets[i].cssRules;
          } catch (e) {
            return;
          }
          if (!rules) return;
          for (var j = 0; j < rules.length; j += 1) {
            if (rules[j].media) {
              var mql = this.window.matchMedia(rules[j].media.mediaText);
              mql.addListener(mediaChangeHandler);
            }
          }
        }
      }
      /**
       * Use ResizeObserver to listen for changes in the DOM and check for resize
       * @private
       */
      resizeObservers() {
        this.observer = new ResizeObserver((e) => {
          requestAnimationFrame(this.resizeCheck.bind(this));
        });
        this.observer.observe(this.document.documentElement);
      }
      /**
       * Use MutationObserver to listen for changes in the DOM and check for resize
       * @private
       */
      mutationObservers() {
        this.observer = new MutationObserver((mutations) => {
          this.resizeCheck();
        });
        let config = {
          attributes: true,
          childList: true,
          characterData: true,
          subtree: true
        };
        this.observer.observe(this.document, config);
      }
      /**
       * Test if images are loaded or add listener for when they load
       * @private
       */
      imageLoadListeners() {
        var images = this.document.querySelectorAll("img");
        var img;
        for (var i = 0; i < images.length; i++) {
          img = images[i];
          if (typeof img.naturalWidth !== "undefined" && img.naturalWidth === 0) {
            img.onload = this.expand.bind(this);
          }
        }
      }
      /**
       * Listen for font load and check for resize when loaded
       * @private
       */
      fontLoadListeners() {
        if (!this.document || !this.document.fonts) {
          return;
        }
        this.document.fonts.ready.then(function() {
          this.resizeCheck();
        }.bind(this));
      }
      /**
       * Get the documentElement
       * @returns {element} documentElement
       */
      root() {
        if (!this.document) return null;
        return this.document.documentElement;
      }
      /**
       * Get the location offset of a EpubCFI or an #id
       * @param {string | EpubCFI} target
       * @param {string} [ignoreClass] for the cfi
       * @returns { {left: Number, top: Number }
       */
      locationOf(target, ignoreClass) {
        var position;
        var targetPos = {
          "left": 0,
          "top": 0
        };
        if (!this.document) return targetPos;
        if (this.epubcfi.isCfiString(target)) {
          let range = new _epubcfi.default(target).toRange(this.document, ignoreClass);
          if (range) {
            try {
              if (!range.endContainer || range.startContainer == range.endContainer && range.startOffset == range.endOffset) {
                let pos = range.startContainer.textContent.indexOf(" ", range.startOffset);
                if (pos == -1) {
                  pos = range.startContainer.textContent.length;
                }
                range.setEnd(range.startContainer, pos);
              }
            } catch (e) {
              console.error("setting end offset to start container length failed", e);
            }
            if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
              position = range.startContainer.getBoundingClientRect();
              targetPos.left = position.left;
              targetPos.top = position.top;
            } else {
              if (isWebkit) {
                let container = range.startContainer;
                let newRange = new Range();
                try {
                  if (container.nodeType === ELEMENT_NODE) {
                    position = container.getBoundingClientRect();
                  } else if (range.startOffset + 2 < container.length) {
                    newRange.setStart(container, range.startOffset);
                    newRange.setEnd(container, range.startOffset + 2);
                    position = newRange.getBoundingClientRect();
                  } else if (range.startOffset - 2 > 0) {
                    newRange.setStart(container, range.startOffset - 2);
                    newRange.setEnd(container, range.startOffset);
                    position = newRange.getBoundingClientRect();
                  } else {
                    position = container.parentNode.getBoundingClientRect();
                  }
                } catch (e) {
                  console.error(e, e.stack);
                }
              } else {
                position = range.getBoundingClientRect();
              }
            }
          }
        } else if (typeof target === "string" && target.indexOf("#") > -1) {
          let id = target.substring(target.indexOf("#") + 1);
          let el = this.document.getElementById(id);
          if (el) {
            if (isWebkit) {
              let newRange = new Range();
              newRange.selectNode(el);
              position = newRange.getBoundingClientRect();
            } else {
              position = el.getBoundingClientRect();
            }
          }
        }
        if (position) {
          targetPos.left = position.left;
          targetPos.top = position.top;
        }
        return targetPos;
      }
      /**
       * Append a stylesheet link to the document head
       * @param {string} src url
       */
      addStylesheet(src) {
        return new Promise(function(resolve, reject) {
          var $stylesheet;
          var ready = false;
          if (!this.document) {
            resolve(false);
            return;
          }
          $stylesheet = this.document.querySelector("link[href='" + src + "']");
          if ($stylesheet) {
            resolve(true);
            return;
          }
          $stylesheet = this.document.createElement("link");
          $stylesheet.type = "text/css";
          $stylesheet.rel = "stylesheet";
          $stylesheet.href = src;
          $stylesheet.onload = $stylesheet.onreadystatechange = function() {
            if (!ready && (!this.readyState || this.readyState == "complete")) {
              ready = true;
              setTimeout(() => {
                resolve(true);
              }, 1);
            }
          };
          this.document.head.appendChild($stylesheet);
        }.bind(this));
      }
      _getStylesheetNode(key) {
        var styleEl;
        key = "epubjs-inserted-css-" + (key || "");
        if (!this.document) return false;
        styleEl = this.document.getElementById(key);
        if (!styleEl) {
          styleEl = this.document.createElement("style");
          styleEl.id = key;
          this.document.head.appendChild(styleEl);
        }
        return styleEl;
      }
      /**
       * Append stylesheet css
       * @param {string} serializedCss
       * @param {string} key If the key is the same, the CSS will be replaced instead of inserted
       */
      addStylesheetCss(serializedCss, key) {
        if (!this.document || !serializedCss) return false;
        var styleEl;
        styleEl = this._getStylesheetNode(key);
        styleEl.innerHTML = serializedCss;
        return true;
      }
      /**
       * Append stylesheet rules to a generate stylesheet
       * Array: https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/insertRule
       * Object: https://github.com/desirable-objects/json-to-css
       * @param {array | object} rules
       * @param {string} key If the key is the same, the CSS will be replaced instead of inserted
       */
      addStylesheetRules(rules, key) {
        var styleSheet;
        if (!this.document || !rules || rules.length === 0) return;
        styleSheet = this._getStylesheetNode(key).sheet;
        if (Object.prototype.toString.call(rules) === "[object Array]") {
          for (var i = 0, rl = rules.length; i < rl; i++) {
            var j = 1, rule = rules[i], selector = rules[i][0], propStr = "";
            if (Object.prototype.toString.call(rule[1][0]) === "[object Array]") {
              rule = rule[1];
              j = 0;
            }
            for (var pl = rule.length; j < pl; j++) {
              var prop = rule[j];
              propStr += prop[0] + ":" + prop[1] + (prop[2] ? " !important" : "") + ";\n";
            }
            styleSheet.insertRule(selector + "{" + propStr + "}", styleSheet.cssRules.length);
          }
        } else {
          const selectors = Object.keys(rules);
          selectors.forEach((selector2) => {
            const definition = rules[selector2];
            if (Array.isArray(definition)) {
              definition.forEach((item) => {
                const _rules = Object.keys(item);
                const result = _rules.map((rule2) => {
                  return `${rule2}:${item[rule2]}`;
                }).join(";");
                styleSheet.insertRule(`${selector2}{${result}}`, styleSheet.cssRules.length);
              });
            } else {
              const _rules = Object.keys(definition);
              const result = _rules.map((rule2) => {
                return `${rule2}:${definition[rule2]}`;
              }).join(";");
              styleSheet.insertRule(`${selector2}{${result}}`, styleSheet.cssRules.length);
            }
          });
        }
      }
      /**
       * Append a script tag to the document head
       * @param {string} src url
       * @returns {Promise} loaded
       */
      addScript(src) {
        return new Promise(function(resolve, reject) {
          var $script;
          var ready = false;
          if (!this.document) {
            resolve(false);
            return;
          }
          $script = this.document.createElement("script");
          $script.type = "text/javascript";
          $script.async = true;
          $script.src = src;
          $script.onload = $script.onreadystatechange = function() {
            if (!ready && (!this.readyState || this.readyState == "complete")) {
              ready = true;
              setTimeout(function() {
                resolve(true);
              }, 1);
            }
          };
          this.document.head.appendChild($script);
        }.bind(this));
      }
      /**
       * Add a class to the contents container
       * @param {string} className
       */
      addClass(className) {
        var content;
        if (!this.document) return;
        content = this.content || this.document.body;
        if (content) {
          content.classList.add(className);
        }
      }
      /**
       * Remove a class from the contents container
       * @param {string} removeClass
       */
      removeClass(className) {
        var content;
        if (!this.document) return;
        content = this.content || this.document.body;
        if (content) {
          content.classList.remove(className);
        }
      }
      /**
       * Add DOM event listeners
       * @private
       */
      addEventListeners() {
        if (!this.document) {
          return;
        }
        this._triggerEvent = this.triggerEvent.bind(this);
        _constants.DOM_EVENTS.forEach(function(eventName) {
          this.document.addEventListener(eventName, this._triggerEvent, {
            passive: true
          });
        }, this);
      }
      /**
       * Remove DOM event listeners
       * @private
       */
      removeEventListeners() {
        if (!this.document) {
          return;
        }
        _constants.DOM_EVENTS.forEach(function(eventName) {
          this.document.removeEventListener(eventName, this._triggerEvent, {
            passive: true
          });
        }, this);
        this._triggerEvent = void 0;
      }
      /**
       * Emit passed browser events
       * @private
       */
      triggerEvent(e) {
        this.emit(e.type, e);
      }
      /**
       * Add listener for text selection
       * @private
       */
      addSelectionListeners() {
        if (!this.document) {
          return;
        }
        this._onSelectionChange = this.onSelectionChange.bind(this);
        this.document.addEventListener("selectionchange", this._onSelectionChange, {
          passive: true
        });
      }
      /**
       * Remove listener for text selection
       * @private
       */
      removeSelectionListeners() {
        if (!this.document) {
          return;
        }
        this.document.removeEventListener("selectionchange", this._onSelectionChange, {
          passive: true
        });
        this._onSelectionChange = void 0;
      }
      /**
       * Handle getting text on selection
       * @private
       */
      onSelectionChange(e) {
        if (this.selectionEndTimeout) {
          clearTimeout(this.selectionEndTimeout);
        }
        this.selectionEndTimeout = setTimeout(function() {
          var selection = this.window.getSelection();
          this.triggerSelectedEvent(selection);
        }.bind(this), 250);
      }
      /**
       * Emit event on text selection
       * @private
       */
      triggerSelectedEvent(selection) {
        var range, cfirange;
        if (selection && selection.rangeCount > 0) {
          range = selection.getRangeAt(0);
          if (!range.collapsed) {
            cfirange = new _epubcfi.default(range, this.cfiBase).toString();
            this.emit(_constants.EVENTS.CONTENTS.SELECTED, cfirange);
            this.emit(_constants.EVENTS.CONTENTS.SELECTED_RANGE, range);
          }
        }
      }
      /**
       * Get a Dom Range from EpubCFI
       * @param {EpubCFI} _cfi
       * @param {string} [ignoreClass]
       * @returns {Range} range
       */
      range(_cfi, ignoreClass) {
        var cfi = new _epubcfi.default(_cfi);
        return cfi.toRange(this.document, ignoreClass);
      }
      /**
       * Get an EpubCFI from a Dom Range
       * @param {Range} range
       * @param {string} [ignoreClass]
       * @returns {EpubCFI} cfi
       */
      cfiFromRange(range, ignoreClass) {
        return new _epubcfi.default(range, this.cfiBase, ignoreClass).toString();
      }
      /**
       * Get an EpubCFI from a Dom node
       * @param {node} node
       * @param {string} [ignoreClass]
       * @returns {EpubCFI} cfi
       */
      cfiFromNode(node, ignoreClass) {
        return new _epubcfi.default(node, this.cfiBase, ignoreClass).toString();
      }
      // TODO: find where this is used - remove?
      map(layout) {
        var map = new _mapping.default(layout);
        return map.section();
      }
      /**
       * Size the contents to a given width and height
       * @param {number} [width]
       * @param {number} [height]
       */
      size(width, height) {
        var viewport = {
          scale: 1,
          scalable: "no"
        };
        this.layoutStyle("scrolling");
        if (width >= 0) {
          this.width(width);
          viewport.width = width;
          this.css("padding", "0 " + width / 12 + "px");
        }
        if (height >= 0) {
          this.height(height);
          viewport.height = height;
        }
        this.css("margin", "0");
        this.css("box-sizing", "border-box");
        this.viewport(viewport);
      }
      /**
       * Apply columns to the contents for pagination
       * @param {number} width
       * @param {number} height
       * @param {number} columnWidth
       * @param {number} gap
       */
      columns(width, height, columnWidth, gap, dir) {
        let COLUMN_AXIS = (0, _core.prefixed)("column-axis");
        let COLUMN_GAP = (0, _core.prefixed)("column-gap");
        let COLUMN_WIDTH = (0, _core.prefixed)("column-width");
        let COLUMN_FILL = (0, _core.prefixed)("column-fill");
        let writingMode = this.writingMode();
        let axis = writingMode.indexOf("vertical") === 0 ? "vertical" : "horizontal";
        this.layoutStyle("paginated");
        if (dir === "rtl" && axis === "horizontal") {
          this.direction(dir);
        }
        this.width(width);
        this.height(height);
        this.viewport({
          width,
          height,
          scale: 1,
          scalable: "no"
        });
        this.css("overflow-y", "hidden");
        this.css("margin", "0", true);
        if (axis === "vertical") {
          this.css("padding-top", gap / 2 + "px", true);
          this.css("padding-bottom", gap / 2 + "px", true);
          this.css("padding-left", "20px");
          this.css("padding-right", "20px");
          this.css(COLUMN_AXIS, "vertical");
        } else {
          this.css("padding-top", "20px");
          this.css("padding-bottom", "20px");
          this.css("padding-left", gap / 2 + "px", true);
          this.css("padding-right", gap / 2 + "px", true);
          this.css(COLUMN_AXIS, "horizontal");
        }
        this.css("box-sizing", "border-box");
        this.css("max-width", "inherit");
        this.css(COLUMN_FILL, "auto");
        this.css(COLUMN_GAP, gap + "px");
        this.css(COLUMN_WIDTH, columnWidth + "px");
        this.css("-webkit-line-box-contain", "block glyphs replaced");
      }
      /**
       * Scale contents from center
       * @param {number} scale
       * @param {number} offsetX
       * @param {number} offsetY
       */
      scaler(scale, offsetX, offsetY) {
        var scaleStr = "scale(" + scale + ")";
        var translateStr = "";
        this.css("transform-origin", "top left");
        if (offsetX >= 0 || offsetY >= 0) {
          translateStr = " translate(" + (offsetX || 0) + "px, " + (offsetY || 0) + "px )";
        }
        this.css("transform", scaleStr + translateStr);
      }
      /**
       * Fit contents into a fixed width and height
       * @param {number} width
       * @param {number} height
       */
      fit(width, height, section) {
        var viewport = this.viewport();
        var viewportWidth = parseInt(viewport.width);
        var viewportHeight = parseInt(viewport.height);
        var widthScale = width / viewportWidth;
        var heightScale = height / viewportHeight;
        var scale = widthScale < heightScale ? widthScale : heightScale;
        this.layoutStyle("paginated");
        this.width(viewportWidth);
        this.height(viewportHeight);
        this.overflow("hidden");
        this.scaler(scale, 0, 0);
        this.css("background-size", viewportWidth * scale + "px " + viewportHeight * scale + "px");
        this.css("background-color", "transparent");
        if (section && section.properties.includes("page-spread-left")) {
          var marginLeft = width - viewportWidth * scale;
          this.css("margin-left", marginLeft + "px");
        }
      }
      /**
       * Set the direction of the text
       * @param {string} [dir="ltr"] "rtl" | "ltr"
       */
      direction(dir) {
        if (this.documentElement) {
          this.documentElement.style["direction"] = dir;
        }
      }
      mapPage(cfiBase, layout, start, end, dev) {
        var mapping = new _mapping.default(layout, dev);
        return mapping.page(this, cfiBase, start, end);
      }
      /**
       * Emit event when link in content is clicked
       * @private
       */
      linksHandler() {
        (0, _replacements.replaceLinks)(this.content, (href) => {
          this.emit(_constants.EVENTS.CONTENTS.LINK_CLICKED, href);
        });
      }
      /**
       * Set the writingMode of the text
       * @param {string} [mode="horizontal-tb"] "horizontal-tb" | "vertical-rl" | "vertical-lr"
       */
      writingMode(mode) {
        let WRITING_MODE = (0, _core.prefixed)("writing-mode");
        if (mode && this.documentElement) {
          this.documentElement.style[WRITING_MODE] = mode;
        }
        return this.window.getComputedStyle(this.documentElement)[WRITING_MODE] || "";
      }
      /**
       * Set the layoutStyle of the content
       * @param {string} [style="paginated"] "scrolling" | "paginated"
       * @private
       */
      layoutStyle(style) {
        if (style) {
          this._layoutStyle = style;
          navigator.epubReadingSystem.layoutStyle = this._layoutStyle;
        }
        return this._layoutStyle || "paginated";
      }
      /**
       * Add the epubReadingSystem object to the navigator
       * @param {string} name
       * @param {string} version
       * @private
       */
      epubReadingSystem(name, version) {
        navigator.epubReadingSystem = {
          name,
          version,
          layoutStyle: this.layoutStyle(),
          hasFeature: function(feature) {
            switch (feature) {
              case "dom-manipulation":
                return true;
              case "layout-changes":
                return true;
              case "touch-events":
                return true;
              case "mouse-events":
                return true;
              case "keyboard-events":
                return true;
              case "spine-scripting":
                return false;
              default:
                return false;
            }
          }
        };
        return navigator.epubReadingSystem;
      }
      destroy() {
        this.removeListeners();
      }
    };
    (0, _eventEmitter.default)(Contents.prototype);
    var _default = Contents;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/annotations.js
var require_annotations = __commonJS({
  "../../node_modules/epubjs/lib/annotations.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _eventEmitter = _interopRequireDefault(require_event_emitter());
    var _epubcfi = _interopRequireDefault(require_epubcfi());
    var _constants = require_constants();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var Annotations = class {
      constructor(rendition) {
        this.rendition = rendition;
        this.highlights = [];
        this.underlines = [];
        this.marks = [];
        this._annotations = {};
        this._annotationsBySectionIndex = {};
        this.rendition.hooks.render.register(this.inject.bind(this));
        this.rendition.hooks.unloaded.register(this.clear.bind(this));
      }
      /**
       * Add an annotation to store
       * @param {string} type Type of annotation to add: "highlight", "underline", "mark"
       * @param {EpubCFI} cfiRange EpubCFI range to attach annotation to
       * @param {object} data Data to assign to annotation
       * @param {function} [cb] Callback after annotation is added
       * @param {string} className CSS class to assign to annotation
       * @param {object} styles CSS styles to assign to annotation
       * @returns {Annotation} annotation
       */
      add(type, cfiRange, data, cb, className, styles) {
        let hash = encodeURI(cfiRange + type);
        let cfi = new _epubcfi.default(cfiRange);
        let sectionIndex = cfi.spinePos;
        let annotation = new Annotation({
          type,
          cfiRange,
          data,
          sectionIndex,
          cb,
          className,
          styles
        });
        this._annotations[hash] = annotation;
        if (sectionIndex in this._annotationsBySectionIndex) {
          this._annotationsBySectionIndex[sectionIndex].push(hash);
        } else {
          this._annotationsBySectionIndex[sectionIndex] = [hash];
        }
        let views = this.rendition.views();
        views.forEach((view) => {
          if (annotation.sectionIndex === view.index) {
            annotation.attach(view);
          }
        });
        return annotation;
      }
      /**
       * Remove an annotation from store
       * @param {EpubCFI} cfiRange EpubCFI range the annotation is attached to
       * @param {string} type Type of annotation to add: "highlight", "underline", "mark"
       */
      remove(cfiRange, type) {
        let hash = encodeURI(cfiRange + type);
        if (hash in this._annotations) {
          let annotation = this._annotations[hash];
          if (type && annotation.type !== type) {
            return;
          }
          let views = this.rendition.views();
          views.forEach((view) => {
            this._removeFromAnnotationBySectionIndex(annotation.sectionIndex, hash);
            if (annotation.sectionIndex === view.index) {
              annotation.detach(view);
            }
          });
          delete this._annotations[hash];
        }
      }
      /**
       * Remove an annotations by Section Index
       * @private
       */
      _removeFromAnnotationBySectionIndex(sectionIndex, hash) {
        this._annotationsBySectionIndex[sectionIndex] = this._annotationsAt(sectionIndex).filter((h) => h !== hash);
      }
      /**
       * Get annotations by Section Index
       * @private
       */
      _annotationsAt(index) {
        return this._annotationsBySectionIndex[index];
      }
      /**
       * Add a highlight to the store
       * @param {EpubCFI} cfiRange EpubCFI range to attach annotation to
       * @param {object} data Data to assign to annotation
       * @param {function} cb Callback after annotation is clicked
       * @param {string} className CSS class to assign to annotation
       * @param {object} styles CSS styles to assign to annotation
       */
      highlight(cfiRange, data, cb, className, styles) {
        return this.add("highlight", cfiRange, data, cb, className, styles);
      }
      /**
       * Add a underline to the store
       * @param {EpubCFI} cfiRange EpubCFI range to attach annotation to
       * @param {object} data Data to assign to annotation
       * @param {function} cb Callback after annotation is clicked
       * @param {string} className CSS class to assign to annotation
       * @param {object} styles CSS styles to assign to annotation
       */
      underline(cfiRange, data, cb, className, styles) {
        return this.add("underline", cfiRange, data, cb, className, styles);
      }
      /**
       * Add a mark to the store
       * @param {EpubCFI} cfiRange EpubCFI range to attach annotation to
       * @param {object} data Data to assign to annotation
       * @param {function} cb Callback after annotation is clicked
       */
      mark(cfiRange, data, cb) {
        return this.add("mark", cfiRange, data, cb);
      }
      /**
       * iterate over annotations in the store
       */
      each() {
        return this._annotations.forEach.apply(this._annotations, arguments);
      }
      /**
       * Hook for injecting annotation into a view
       * @param {View} view
       * @private
       */
      inject(view) {
        let sectionIndex = view.index;
        if (sectionIndex in this._annotationsBySectionIndex) {
          let annotations = this._annotationsBySectionIndex[sectionIndex];
          annotations.forEach((hash) => {
            let annotation = this._annotations[hash];
            annotation.attach(view);
          });
        }
      }
      /**
       * Hook for removing annotation from a view
       * @param {View} view
       * @private
       */
      clear(view) {
        let sectionIndex = view.index;
        if (sectionIndex in this._annotationsBySectionIndex) {
          let annotations = this._annotationsBySectionIndex[sectionIndex];
          annotations.forEach((hash) => {
            let annotation = this._annotations[hash];
            annotation.detach(view);
          });
        }
      }
      /**
       * [Not Implemented] Show annotations
       * @TODO: needs implementation in View
       */
      show() {
      }
      /**
       * [Not Implemented] Hide annotations
       * @TODO: needs implementation in View
       */
      hide() {
      }
    };
    var Annotation = class {
      constructor({
        type,
        cfiRange,
        data,
        sectionIndex,
        cb,
        className,
        styles
      }) {
        this.type = type;
        this.cfiRange = cfiRange;
        this.data = data;
        this.sectionIndex = sectionIndex;
        this.mark = void 0;
        this.cb = cb;
        this.className = className;
        this.styles = styles;
      }
      /**
       * Update stored data
       * @param {object} data
       */
      update(data) {
        this.data = data;
      }
      /**
       * Add to a view
       * @param {View} view
       */
      attach(view) {
        let {
          cfiRange,
          data,
          type,
          mark,
          cb,
          className,
          styles
        } = this;
        let result;
        if (type === "highlight") {
          result = view.highlight(cfiRange, data, cb, className, styles);
        } else if (type === "underline") {
          result = view.underline(cfiRange, data, cb, className, styles);
        } else if (type === "mark") {
          result = view.mark(cfiRange, data, cb);
        }
        this.mark = result;
        this.emit(_constants.EVENTS.ANNOTATION.ATTACH, result);
        return result;
      }
      /**
       * Remove from a view
       * @param {View} view
       */
      detach(view) {
        let {
          cfiRange,
          type
        } = this;
        let result;
        if (view) {
          if (type === "highlight") {
            result = view.unhighlight(cfiRange);
          } else if (type === "underline") {
            result = view.ununderline(cfiRange);
          } else if (type === "mark") {
            result = view.unmark(cfiRange);
          }
        }
        this.mark = void 0;
        this.emit(_constants.EVENTS.ANNOTATION.DETACH, result);
        return result;
      }
      /**
       * [Not Implemented] Get text of an annotation
       * @TODO: needs implementation in contents
       */
      text() {
      }
    };
    (0, _eventEmitter.default)(Annotation.prototype);
    var _default = Annotations;
    exports2.default = _default;
  }
});

// ../../node_modules/marks-pane/lib/svg.js
var require_svg = __commonJS({
  "../../node_modules/marks-pane/lib/svg.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.createElement = createElement;
    function createElement(name) {
      return document.createElementNS("http://www.w3.org/2000/svg", name);
    }
    exports2.default = {
      createElement
    };
  }
});

// ../../node_modules/marks-pane/lib/events.js
var require_events = __commonJS({
  "../../node_modules/marks-pane/lib/events.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.proxyMouse = proxyMouse;
    exports2.clone = clone;
    exports2.default = {
      proxyMouse
    };
    function proxyMouse(target, tracked) {
      function dispatch(e) {
        for (var i = tracked.length - 1; i >= 0; i--) {
          var t = tracked[i];
          var x = e.clientX;
          var y = e.clientY;
          if (e.touches && e.touches.length) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
          }
          if (!contains(t, target, x, y)) {
            continue;
          }
          t.dispatchEvent(clone(e));
          break;
        }
      }
      if (target.nodeName === "iframe" || target.nodeName === "IFRAME") {
        try {
          this.target = target.contentDocument;
        } catch (err) {
          this.target = target;
        }
      } else {
        this.target = target;
      }
      var _arr = ["mouseup", "mousedown", "click", "touchstart"];
      for (var _i = 0; _i < _arr.length; _i++) {
        var ev = _arr[_i];
        this.target.addEventListener(ev, function(e) {
          return dispatch(e);
        }, false);
      }
    }
    function clone(e) {
      var opts = Object.assign({}, e, { bubbles: false });
      try {
        return new MouseEvent(e.type, opts);
      } catch (err) {
        var copy = document.createEvent("MouseEvents");
        copy.initMouseEvent(e.type, false, opts.cancelable, opts.view, opts.detail, opts.screenX, opts.screenY, opts.clientX, opts.clientY, opts.ctrlKey, opts.altKey, opts.shiftKey, opts.metaKey, opts.button, opts.relatedTarget);
        return copy;
      }
    }
    function contains(item, target, x, y) {
      var offset = target.getBoundingClientRect();
      function rectContains(r, x2, y2) {
        var top = r.top - offset.top;
        var left = r.left - offset.left;
        var bottom = top + r.height;
        var right = left + r.width;
        return top <= y2 && left <= x2 && bottom > y2 && right > x2;
      }
      var rect = item.getBoundingClientRect();
      if (!rectContains(rect, x, y)) {
        return false;
      }
      var rects = item.getClientRects();
      for (var i = 0, len = rects.length; i < len; i++) {
        if (rectContains(rects[i], x, y)) {
          return true;
        }
      }
      return false;
    }
  }
});

// ../../node_modules/marks-pane/lib/marks.js
var require_marks = __commonJS({
  "../../node_modules/marks-pane/lib/marks.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.Underline = exports2.Highlight = exports2.Mark = exports2.Pane = void 0;
    var _get = function get(object, property, receiver) {
      if (object === null) object = Function.prototype;
      var desc = Object.getOwnPropertyDescriptor(object, property);
      if (desc === void 0) {
        var parent2 = Object.getPrototypeOf(object);
        if (parent2 === null) {
          return void 0;
        } else {
          return get(parent2, property, receiver);
        }
      } else if ("value" in desc) {
        return desc.value;
      } else {
        var getter = desc.get;
        if (getter === void 0) {
          return void 0;
        }
        return getter.call(receiver);
      }
    };
    var _createClass = /* @__PURE__ */ (function() {
      function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, descriptor.key, descriptor);
        }
      }
      return function(Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor;
      };
    })();
    var _svg = require_svg();
    var _svg2 = _interopRequireDefault(_svg);
    var _events = require_events();
    var _events2 = _interopRequireDefault(_events);
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function _possibleConstructorReturn(self2, call) {
      if (!self2) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return call && (typeof call === "object" || typeof call === "function") ? call : self2;
    }
    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
      }
      subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });
      if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    var Pane = exports2.Pane = (function() {
      function Pane2(target) {
        var container = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : document.body;
        _classCallCheck(this, Pane2);
        this.target = target;
        this.element = _svg2.default.createElement("svg");
        this.marks = [];
        this.element.style.position = "absolute";
        this.element.setAttribute("pointer-events", "none");
        _events2.default.proxyMouse(this.target, this.marks);
        this.container = container;
        this.container.appendChild(this.element);
        this.render();
      }
      _createClass(Pane2, [{
        key: "addMark",
        value: function addMark(mark) {
          var g = _svg2.default.createElement("g");
          this.element.appendChild(g);
          mark.bind(g, this.container);
          this.marks.push(mark);
          mark.render();
          return mark;
        }
      }, {
        key: "removeMark",
        value: function removeMark(mark) {
          var idx = this.marks.indexOf(mark);
          if (idx === -1) {
            return;
          }
          var el = mark.unbind();
          this.element.removeChild(el);
          this.marks.splice(idx, 1);
        }
      }, {
        key: "render",
        value: function render() {
          setCoords(this.element, coords(this.target, this.container));
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = void 0;
          try {
            for (var _iterator = this.marks[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var m = _step.value;
              m.render();
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }
      }]);
      return Pane2;
    })();
    var Mark = exports2.Mark = (function() {
      function Mark2() {
        _classCallCheck(this, Mark2);
        this.element = null;
      }
      _createClass(Mark2, [{
        key: "bind",
        value: function bind(element, container) {
          this.element = element;
          this.container = container;
        }
      }, {
        key: "unbind",
        value: function unbind() {
          var el = this.element;
          this.element = null;
          return el;
        }
      }, {
        key: "render",
        value: function render() {
        }
      }, {
        key: "dispatchEvent",
        value: function dispatchEvent(e) {
          if (!this.element) return;
          this.element.dispatchEvent(e);
        }
      }, {
        key: "getBoundingClientRect",
        value: function getBoundingClientRect() {
          return this.element.getBoundingClientRect();
        }
      }, {
        key: "getClientRects",
        value: function getClientRects() {
          var rects = [];
          var el = this.element.firstChild;
          while (el) {
            rects.push(el.getBoundingClientRect());
            el = el.nextSibling;
          }
          return rects;
        }
      }, {
        key: "filteredRanges",
        value: function filteredRanges() {
          var rects = Array.from(this.range.getClientRects());
          return rects.filter(function(box) {
            for (var i = 0; i < rects.length; i++) {
              if (rects[i] === box) {
                return true;
              }
              var contained = contains(rects[i], box);
              if (contained) {
                return false;
              }
            }
            return true;
          });
        }
      }]);
      return Mark2;
    })();
    var Highlight = exports2.Highlight = (function(_Mark) {
      _inherits(Highlight2, _Mark);
      function Highlight2(range, className, data, attributes) {
        _classCallCheck(this, Highlight2);
        var _this = _possibleConstructorReturn(this, (Highlight2.__proto__ || Object.getPrototypeOf(Highlight2)).call(this));
        _this.range = range;
        _this.className = className;
        _this.data = data || {};
        _this.attributes = attributes || {};
        return _this;
      }
      _createClass(Highlight2, [{
        key: "bind",
        value: function bind(element, container) {
          _get(Highlight2.prototype.__proto__ || Object.getPrototypeOf(Highlight2.prototype), "bind", this).call(this, element, container);
          for (var attr in this.data) {
            if (this.data.hasOwnProperty(attr)) {
              this.element.dataset[attr] = this.data[attr];
            }
          }
          for (var attr in this.attributes) {
            if (this.attributes.hasOwnProperty(attr)) {
              this.element.setAttribute(attr, this.attributes[attr]);
            }
          }
          if (this.className) {
            this.element.classList.add(this.className);
          }
        }
      }, {
        key: "render",
        value: function render() {
          while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
          }
          var docFrag = this.element.ownerDocument.createDocumentFragment();
          var filtered = this.filteredRanges();
          var offset = this.element.getBoundingClientRect();
          var container = this.container.getBoundingClientRect();
          for (var i = 0, len = filtered.length; i < len; i++) {
            var r = filtered[i];
            var el = _svg2.default.createElement("rect");
            el.setAttribute("x", r.left - offset.left + container.left);
            el.setAttribute("y", r.top - offset.top + container.top);
            el.setAttribute("height", r.height);
            el.setAttribute("width", r.width);
            docFrag.appendChild(el);
          }
          this.element.appendChild(docFrag);
        }
      }]);
      return Highlight2;
    })(Mark);
    var Underline = exports2.Underline = (function(_Highlight) {
      _inherits(Underline2, _Highlight);
      function Underline2(range, className, data, attributes) {
        _classCallCheck(this, Underline2);
        return _possibleConstructorReturn(this, (Underline2.__proto__ || Object.getPrototypeOf(Underline2)).call(this, range, className, data, attributes));
      }
      _createClass(Underline2, [{
        key: "render",
        value: function render() {
          while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
          }
          var docFrag = this.element.ownerDocument.createDocumentFragment();
          var filtered = this.filteredRanges();
          var offset = this.element.getBoundingClientRect();
          var container = this.container.getBoundingClientRect();
          for (var i = 0, len = filtered.length; i < len; i++) {
            var r = filtered[i];
            var rect = _svg2.default.createElement("rect");
            rect.setAttribute("x", r.left - offset.left + container.left);
            rect.setAttribute("y", r.top - offset.top + container.top);
            rect.setAttribute("height", r.height);
            rect.setAttribute("width", r.width);
            rect.setAttribute("fill", "none");
            var line = _svg2.default.createElement("line");
            line.setAttribute("x1", r.left - offset.left + container.left);
            line.setAttribute("x2", r.left - offset.left + container.left + r.width);
            line.setAttribute("y1", r.top - offset.top + container.top + r.height - 1);
            line.setAttribute("y2", r.top - offset.top + container.top + r.height - 1);
            line.setAttribute("stroke-width", 1);
            line.setAttribute("stroke", "black");
            line.setAttribute("stroke-linecap", "square");
            docFrag.appendChild(rect);
            docFrag.appendChild(line);
          }
          this.element.appendChild(docFrag);
        }
      }]);
      return Underline2;
    })(Highlight);
    function coords(el, container) {
      var offset = container.getBoundingClientRect();
      var rect = el.getBoundingClientRect();
      return {
        top: rect.top - offset.top,
        left: rect.left - offset.left,
        height: el.scrollHeight,
        width: el.scrollWidth
      };
    }
    function setCoords(el, coords2) {
      el.style.setProperty("top", coords2.top + "px", "important");
      el.style.setProperty("left", coords2.left + "px", "important");
      el.style.setProperty("height", coords2.height + "px", "important");
      el.style.setProperty("width", coords2.width + "px", "important");
    }
    function contains(rect1, rect2) {
      return rect2.right <= rect1.right && rect2.left >= rect1.left && rect2.top >= rect1.top && rect2.bottom <= rect1.bottom;
    }
  }
});

// ../../node_modules/epubjs/lib/managers/views/iframe.js
var require_iframe = __commonJS({
  "../../node_modules/epubjs/lib/managers/views/iframe.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _eventEmitter = _interopRequireDefault(require_event_emitter());
    var _core = require_core();
    var _epubcfi = _interopRequireDefault(require_epubcfi());
    var _contents = _interopRequireDefault(require_contents());
    var _constants = require_constants();
    var _marksPane = require_marks();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var IframeView = class {
      constructor(section, options) {
        this.settings = (0, _core.extend)({
          ignoreClass: "",
          axis: void 0,
          //options.layout && options.layout.props.flow === "scrolled" ? "vertical" : "horizontal",
          direction: void 0,
          width: 0,
          height: 0,
          layout: void 0,
          globalLayoutProperties: {},
          method: void 0,
          forceRight: false,
          allowScriptedContent: false,
          allowPopups: false
        }, options || {});
        this.id = "epubjs-view-" + (0, _core.uuid)();
        this.section = section;
        this.index = section.index;
        this.element = this.container(this.settings.axis);
        this.added = false;
        this.displayed = false;
        this.rendered = false;
        this.fixedWidth = 0;
        this.fixedHeight = 0;
        this.epubcfi = new _epubcfi.default();
        this.layout = this.settings.layout;
        this.pane = void 0;
        this.highlights = {};
        this.underlines = {};
        this.marks = {};
      }
      container(axis) {
        var element = document.createElement("div");
        element.classList.add("epub-view");
        element.style.height = "0px";
        element.style.width = "0px";
        element.style.overflow = "hidden";
        element.style.position = "relative";
        element.style.display = "block";
        if (axis && axis == "horizontal") {
          element.style.flex = "none";
        } else {
          element.style.flex = "initial";
        }
        return element;
      }
      create() {
        if (this.iframe) {
          return this.iframe;
        }
        if (!this.element) {
          this.element = this.createContainer();
        }
        this.iframe = document.createElement("iframe");
        this.iframe.id = this.id;
        this.iframe.scrolling = "no";
        this.iframe.style.overflow = "hidden";
        this.iframe.seamless = "seamless";
        this.iframe.style.border = "none";
        this.iframe.sandbox = "allow-same-origin";
        if (this.settings.allowScriptedContent) {
          this.iframe.sandbox += " allow-scripts";
        }
        if (this.settings.allowPopups) {
          this.iframe.sandbox += " allow-popups";
        }
        this.iframe.setAttribute("enable-annotation", "true");
        this.resizing = true;
        this.element.style.visibility = "hidden";
        this.iframe.style.visibility = "hidden";
        this.iframe.style.width = "0";
        this.iframe.style.height = "0";
        this._width = 0;
        this._height = 0;
        this.element.setAttribute("ref", this.index);
        this.added = true;
        this.elementBounds = (0, _core.bounds)(this.element);
        if ("srcdoc" in this.iframe) {
          this.supportsSrcdoc = true;
        } else {
          this.supportsSrcdoc = false;
        }
        if (!this.settings.method) {
          this.settings.method = this.supportsSrcdoc ? "srcdoc" : "write";
        }
        return this.iframe;
      }
      render(request, show) {
        this.create();
        this.size();
        if (!this.sectionRender) {
          this.sectionRender = this.section.render(request);
        }
        return this.sectionRender.then(function(contents) {
          return this.load(contents);
        }.bind(this)).then(function() {
          let writingMode = this.contents.writingMode();
          let axis;
          if (this.settings.flow === "scrolled") {
            axis = writingMode.indexOf("vertical") === 0 ? "horizontal" : "vertical";
          } else {
            axis = writingMode.indexOf("vertical") === 0 ? "vertical" : "horizontal";
          }
          if (writingMode.indexOf("vertical") === 0 && this.settings.flow === "paginated") {
            this.layout.delta = this.layout.height;
          }
          this.setAxis(axis);
          this.emit(_constants.EVENTS.VIEWS.AXIS, axis);
          this.setWritingMode(writingMode);
          this.emit(_constants.EVENTS.VIEWS.WRITING_MODE, writingMode);
          this.layout.format(this.contents, this.section, this.axis);
          this.addListeners();
          return new Promise((resolve, reject) => {
            this.expand();
            if (this.settings.forceRight) {
              this.element.style.marginLeft = this.width() + "px";
            }
            resolve();
          });
        }.bind(this), function(e) {
          this.emit(_constants.EVENTS.VIEWS.LOAD_ERROR, e);
          return new Promise((resolve, reject) => {
            reject(e);
          });
        }.bind(this)).then(function() {
          this.emit(_constants.EVENTS.VIEWS.RENDERED, this.section);
        }.bind(this));
      }
      reset() {
        if (this.iframe) {
          this.iframe.style.width = "0";
          this.iframe.style.height = "0";
          this._width = 0;
          this._height = 0;
          this._textWidth = void 0;
          this._contentWidth = void 0;
          this._textHeight = void 0;
          this._contentHeight = void 0;
        }
        this._needsReframe = true;
      }
      // Determine locks base on settings
      size(_width, _height) {
        var width = _width || this.settings.width;
        var height = _height || this.settings.height;
        if (this.layout.name === "pre-paginated") {
          this.lock("both", width, height);
        } else if (this.settings.axis === "horizontal") {
          this.lock("height", width, height);
        } else {
          this.lock("width", width, height);
        }
        this.settings.width = width;
        this.settings.height = height;
      }
      // Lock an axis to element dimensions, taking borders into account
      lock(what, width, height) {
        var elBorders = (0, _core.borders)(this.element);
        var iframeBorders;
        if (this.iframe) {
          iframeBorders = (0, _core.borders)(this.iframe);
        } else {
          iframeBorders = {
            width: 0,
            height: 0
          };
        }
        if (what == "width" && (0, _core.isNumber)(width)) {
          this.lockedWidth = width - elBorders.width - iframeBorders.width;
        }
        if (what == "height" && (0, _core.isNumber)(height)) {
          this.lockedHeight = height - elBorders.height - iframeBorders.height;
        }
        if (what === "both" && (0, _core.isNumber)(width) && (0, _core.isNumber)(height)) {
          this.lockedWidth = width - elBorders.width - iframeBorders.width;
          this.lockedHeight = height - elBorders.height - iframeBorders.height;
        }
        if (this.displayed && this.iframe) {
          this.expand();
        }
      }
      // Resize a single axis based on content dimensions
      expand(force) {
        var width = this.lockedWidth;
        var height = this.lockedHeight;
        var columns;
        var textWidth, textHeight;
        if (!this.iframe || this._expanding) return;
        this._expanding = true;
        if (this.layout.name === "pre-paginated") {
          width = this.layout.columnWidth;
          height = this.layout.height;
        } else if (this.settings.axis === "horizontal") {
          width = this.contents.textWidth();
          if (width % this.layout.pageWidth > 0) {
            width = Math.ceil(width / this.layout.pageWidth) * this.layout.pageWidth;
          }
          if (this.settings.forceEvenPages) {
            columns = width / this.layout.pageWidth;
            if (this.layout.divisor > 1 && this.layout.name === "reflowable" && columns % 2 > 0) {
              width += this.layout.pageWidth;
            }
          }
        } else if (this.settings.axis === "vertical") {
          height = this.contents.textHeight();
          if (this.settings.flow === "paginated" && height % this.layout.height > 0) {
            height = Math.ceil(height / this.layout.height) * this.layout.height;
          }
        }
        if (this._needsReframe || width != this._width || height != this._height) {
          this.reframe(width, height);
        }
        this._expanding = false;
      }
      reframe(width, height) {
        var size;
        if ((0, _core.isNumber)(width)) {
          this.element.style.width = width + "px";
          this.iframe.style.width = width + "px";
          this._width = width;
        }
        if ((0, _core.isNumber)(height)) {
          this.element.style.height = height + "px";
          this.iframe.style.height = height + "px";
          this._height = height;
        }
        let widthDelta = this.prevBounds ? width - this.prevBounds.width : width;
        let heightDelta = this.prevBounds ? height - this.prevBounds.height : height;
        size = {
          width,
          height,
          widthDelta,
          heightDelta
        };
        this.pane && this.pane.render();
        requestAnimationFrame(() => {
          let mark;
          for (let m in this.marks) {
            if (this.marks.hasOwnProperty(m)) {
              mark = this.marks[m];
              this.placeMark(mark.element, mark.range);
            }
          }
        });
        this.onResize(this, size);
        this.emit(_constants.EVENTS.VIEWS.RESIZED, size);
        this.prevBounds = size;
        this.elementBounds = (0, _core.bounds)(this.element);
      }
      load(contents) {
        var loading = new _core.defer();
        var loaded = loading.promise;
        if (!this.iframe) {
          loading.reject(new Error("No Iframe Available"));
          return loaded;
        }
        this.iframe.onload = function(event) {
          this.onLoad(event, loading);
        }.bind(this);
        if (this.settings.method === "blobUrl") {
          this.blobUrl = (0, _core.createBlobUrl)(contents, "application/xhtml+xml");
          this.iframe.src = this.blobUrl;
          this.element.appendChild(this.iframe);
        } else if (this.settings.method === "srcdoc") {
          this.iframe.srcdoc = contents;
          this.element.appendChild(this.iframe);
        } else {
          this.element.appendChild(this.iframe);
          this.document = this.iframe.contentDocument;
          if (!this.document) {
            loading.reject(new Error("No Document Available"));
            return loaded;
          }
          this.iframe.contentDocument.open();
          if (window.MSApp && MSApp.execUnsafeLocalFunction) {
            var outerThis = this;
            MSApp.execUnsafeLocalFunction(function() {
              outerThis.iframe.contentDocument.write(contents);
            });
          } else {
            this.iframe.contentDocument.write(contents);
          }
          this.iframe.contentDocument.close();
        }
        return loaded;
      }
      onLoad(event, promise) {
        this.window = this.iframe.contentWindow;
        this.document = this.iframe.contentDocument;
        this.contents = new _contents.default(this.document, this.document.body, this.section.cfiBase, this.section.index);
        this.rendering = false;
        var link = this.document.querySelector("link[rel='canonical']");
        if (link) {
          link.setAttribute("href", this.section.canonical);
        } else {
          link = this.document.createElement("link");
          link.setAttribute("rel", "canonical");
          link.setAttribute("href", this.section.canonical);
          this.document.querySelector("head").appendChild(link);
        }
        this.contents.on(_constants.EVENTS.CONTENTS.EXPAND, () => {
          if (this.displayed && this.iframe) {
            this.expand();
            if (this.contents) {
              this.layout.format(this.contents);
            }
          }
        });
        this.contents.on(_constants.EVENTS.CONTENTS.RESIZE, (e) => {
          if (this.displayed && this.iframe) {
            this.expand();
            if (this.contents) {
              this.layout.format(this.contents);
            }
          }
        });
        promise.resolve(this.contents);
      }
      setLayout(layout) {
        this.layout = layout;
        if (this.contents) {
          this.layout.format(this.contents);
          this.expand();
        }
      }
      setAxis(axis) {
        this.settings.axis = axis;
        if (axis == "horizontal") {
          this.element.style.flex = "none";
        } else {
          this.element.style.flex = "initial";
        }
        this.size();
      }
      setWritingMode(mode) {
        this.writingMode = mode;
      }
      addListeners() {
      }
      removeListeners(layoutFunc) {
      }
      display(request) {
        var displayed = new _core.defer();
        if (!this.displayed) {
          this.render(request).then(function() {
            this.emit(_constants.EVENTS.VIEWS.DISPLAYED, this);
            this.onDisplayed(this);
            this.displayed = true;
            displayed.resolve(this);
          }.bind(this), function(err) {
            displayed.reject(err, this);
          });
        } else {
          displayed.resolve(this);
        }
        return displayed.promise;
      }
      show() {
        this.element.style.visibility = "visible";
        if (this.iframe) {
          this.iframe.style.visibility = "visible";
          this.iframe.style.transform = "translateZ(0)";
          this.iframe.offsetWidth;
          this.iframe.style.transform = null;
        }
        this.emit(_constants.EVENTS.VIEWS.SHOWN, this);
      }
      hide() {
        this.element.style.visibility = "hidden";
        this.iframe.style.visibility = "hidden";
        this.stopExpanding = true;
        this.emit(_constants.EVENTS.VIEWS.HIDDEN, this);
      }
      offset() {
        return {
          top: this.element.offsetTop,
          left: this.element.offsetLeft
        };
      }
      width() {
        return this._width;
      }
      height() {
        return this._height;
      }
      position() {
        return this.element.getBoundingClientRect();
      }
      locationOf(target) {
        var parentPos = this.iframe.getBoundingClientRect();
        var targetPos = this.contents.locationOf(target, this.settings.ignoreClass);
        return {
          "left": targetPos.left,
          "top": targetPos.top
        };
      }
      onDisplayed(view) {
      }
      onResize(view, e) {
      }
      bounds(force) {
        if (force || !this.elementBounds) {
          this.elementBounds = (0, _core.bounds)(this.element);
        }
        return this.elementBounds;
      }
      highlight(cfiRange, data = {}, cb, className = "epubjs-hl", styles = {}) {
        if (!this.contents) {
          return;
        }
        const attributes = Object.assign({
          "fill": "yellow",
          "fill-opacity": "0.3",
          "mix-blend-mode": "multiply"
        }, styles);
        let range = this.contents.range(cfiRange);
        let emitter = () => {
          this.emit(_constants.EVENTS.VIEWS.MARK_CLICKED, cfiRange, data);
        };
        data["epubcfi"] = cfiRange;
        if (!this.pane) {
          this.pane = new _marksPane.Pane(this.iframe, this.element);
        }
        let m = new _marksPane.Highlight(range, className, data, attributes);
        let h = this.pane.addMark(m);
        this.highlights[cfiRange] = {
          "mark": h,
          "element": h.element,
          "listeners": [emitter, cb]
        };
        h.element.setAttribute("ref", className);
        h.element.addEventListener("click", emitter);
        h.element.addEventListener("touchstart", emitter);
        if (cb) {
          h.element.addEventListener("click", cb);
          h.element.addEventListener("touchstart", cb);
        }
        return h;
      }
      underline(cfiRange, data = {}, cb, className = "epubjs-ul", styles = {}) {
        if (!this.contents) {
          return;
        }
        const attributes = Object.assign({
          "stroke": "black",
          "stroke-opacity": "0.3",
          "mix-blend-mode": "multiply"
        }, styles);
        let range = this.contents.range(cfiRange);
        let emitter = () => {
          this.emit(_constants.EVENTS.VIEWS.MARK_CLICKED, cfiRange, data);
        };
        data["epubcfi"] = cfiRange;
        if (!this.pane) {
          this.pane = new _marksPane.Pane(this.iframe, this.element);
        }
        let m = new _marksPane.Underline(range, className, data, attributes);
        let h = this.pane.addMark(m);
        this.underlines[cfiRange] = {
          "mark": h,
          "element": h.element,
          "listeners": [emitter, cb]
        };
        h.element.setAttribute("ref", className);
        h.element.addEventListener("click", emitter);
        h.element.addEventListener("touchstart", emitter);
        if (cb) {
          h.element.addEventListener("click", cb);
          h.element.addEventListener("touchstart", cb);
        }
        return h;
      }
      mark(cfiRange, data = {}, cb) {
        if (!this.contents) {
          return;
        }
        if (cfiRange in this.marks) {
          let item = this.marks[cfiRange];
          return item;
        }
        let range = this.contents.range(cfiRange);
        if (!range) {
          return;
        }
        let container = range.commonAncestorContainer;
        let parent2 = container.nodeType === 1 ? container : container.parentNode;
        let emitter = (e) => {
          this.emit(_constants.EVENTS.VIEWS.MARK_CLICKED, cfiRange, data);
        };
        if (range.collapsed && container.nodeType === 1) {
          range = new Range();
          range.selectNodeContents(container);
        } else if (range.collapsed) {
          range = new Range();
          range.selectNodeContents(parent2);
        }
        let mark = this.document.createElement("a");
        mark.setAttribute("ref", "epubjs-mk");
        mark.style.position = "absolute";
        mark.dataset["epubcfi"] = cfiRange;
        if (data) {
          Object.keys(data).forEach((key) => {
            mark.dataset[key] = data[key];
          });
        }
        if (cb) {
          mark.addEventListener("click", cb);
          mark.addEventListener("touchstart", cb);
        }
        mark.addEventListener("click", emitter);
        mark.addEventListener("touchstart", emitter);
        this.placeMark(mark, range);
        this.element.appendChild(mark);
        this.marks[cfiRange] = {
          "element": mark,
          "range": range,
          "listeners": [emitter, cb]
        };
        return parent2;
      }
      placeMark(element, range) {
        let top, right, left;
        if (this.layout.name === "pre-paginated" || this.settings.axis !== "horizontal") {
          let pos = range.getBoundingClientRect();
          top = pos.top;
          right = pos.right;
        } else {
          let rects = range.getClientRects();
          let rect;
          for (var i = 0; i != rects.length; i++) {
            rect = rects[i];
            if (!left || rect.left < left) {
              left = rect.left;
              right = Math.ceil(left / this.layout.props.pageWidth) * this.layout.props.pageWidth - this.layout.gap / 2;
              top = rect.top;
            }
          }
        }
        element.style.top = `${top}px`;
        element.style.left = `${right}px`;
      }
      unhighlight(cfiRange) {
        let item;
        if (cfiRange in this.highlights) {
          item = this.highlights[cfiRange];
          this.pane.removeMark(item.mark);
          item.listeners.forEach((l) => {
            if (l) {
              item.element.removeEventListener("click", l);
              item.element.removeEventListener("touchstart", l);
            }
            ;
          });
          delete this.highlights[cfiRange];
        }
      }
      ununderline(cfiRange) {
        let item;
        if (cfiRange in this.underlines) {
          item = this.underlines[cfiRange];
          this.pane.removeMark(item.mark);
          item.listeners.forEach((l) => {
            if (l) {
              item.element.removeEventListener("click", l);
              item.element.removeEventListener("touchstart", l);
            }
            ;
          });
          delete this.underlines[cfiRange];
        }
      }
      unmark(cfiRange) {
        let item;
        if (cfiRange in this.marks) {
          item = this.marks[cfiRange];
          this.element.removeChild(item.element);
          item.listeners.forEach((l) => {
            if (l) {
              item.element.removeEventListener("click", l);
              item.element.removeEventListener("touchstart", l);
            }
            ;
          });
          delete this.marks[cfiRange];
        }
      }
      destroy() {
        for (let cfiRange in this.highlights) {
          this.unhighlight(cfiRange);
        }
        for (let cfiRange in this.underlines) {
          this.ununderline(cfiRange);
        }
        for (let cfiRange in this.marks) {
          this.unmark(cfiRange);
        }
        if (this.blobUrl) {
          (0, _core.revokeBlobUrl)(this.blobUrl);
        }
        if (this.displayed) {
          this.displayed = false;
          this.removeListeners();
          this.contents.destroy();
          this.stopExpanding = true;
          this.element.removeChild(this.iframe);
          if (this.pane) {
            this.pane.element.remove();
            this.pane = void 0;
          }
          this.iframe = void 0;
          this.contents = void 0;
          this._textWidth = null;
          this._textHeight = null;
          this._width = null;
          this._height = null;
        }
      }
    };
    (0, _eventEmitter.default)(IframeView.prototype);
    var _default = IframeView;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/utils/scrolltype.js
var require_scrolltype = __commonJS({
  "../../node_modules/epubjs/lib/utils/scrolltype.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.createDefiner = createDefiner;
    exports2.default = scrollType;
    function scrollType() {
      var type = "reverse";
      var definer = createDefiner();
      document.body.appendChild(definer);
      if (definer.scrollLeft > 0) {
        type = "default";
      } else {
        if (typeof Element !== "undefined" && Element.prototype.scrollIntoView) {
          definer.children[0].children[1].scrollIntoView();
          if (definer.scrollLeft < 0) {
            type = "negative";
          }
        } else {
          definer.scrollLeft = 1;
          if (definer.scrollLeft === 0) {
            type = "negative";
          }
        }
      }
      document.body.removeChild(definer);
      return type;
    }
    function createDefiner() {
      var definer = document.createElement("div");
      definer.dir = "rtl";
      definer.style.position = "fixed";
      definer.style.width = "1px";
      definer.style.height = "1px";
      definer.style.top = "0px";
      definer.style.left = "0px";
      definer.style.overflow = "hidden";
      var innerDiv = document.createElement("div");
      innerDiv.style.width = "2px";
      var spanA = document.createElement("span");
      spanA.style.width = "1px";
      spanA.style.display = "inline-block";
      var spanB = document.createElement("span");
      spanB.style.width = "1px";
      spanB.style.display = "inline-block";
      innerDiv.appendChild(spanA);
      innerDiv.appendChild(spanB);
      definer.appendChild(innerDiv);
      return definer;
    }
  }
});

// ../../node_modules/lodash/isObject.js
var require_isObject = __commonJS({
  "../../node_modules/lodash/isObject.js"(exports2, module2) {
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == "object" || type == "function");
    }
    module2.exports = isObject;
  }
});

// ../../node_modules/lodash/_freeGlobal.js
var require_freeGlobal = __commonJS({
  "../../node_modules/lodash/_freeGlobal.js"(exports2, module2) {
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    module2.exports = freeGlobal;
  }
});

// ../../node_modules/lodash/_root.js
var require_root = __commonJS({
  "../../node_modules/lodash/_root.js"(exports2, module2) {
    var freeGlobal = require_freeGlobal();
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    module2.exports = root;
  }
});

// ../../node_modules/lodash/now.js
var require_now = __commonJS({
  "../../node_modules/lodash/now.js"(exports2, module2) {
    var root = require_root();
    var now = function() {
      return root.Date.now();
    };
    module2.exports = now;
  }
});

// ../../node_modules/lodash/_trimmedEndIndex.js
var require_trimmedEndIndex = __commonJS({
  "../../node_modules/lodash/_trimmedEndIndex.js"(exports2, module2) {
    var reWhitespace = /\s/;
    function trimmedEndIndex(string) {
      var index = string.length;
      while (index-- && reWhitespace.test(string.charAt(index))) {
      }
      return index;
    }
    module2.exports = trimmedEndIndex;
  }
});

// ../../node_modules/lodash/_baseTrim.js
var require_baseTrim = __commonJS({
  "../../node_modules/lodash/_baseTrim.js"(exports2, module2) {
    var trimmedEndIndex = require_trimmedEndIndex();
    var reTrimStart = /^\s+/;
    function baseTrim(string) {
      return string ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, "") : string;
    }
    module2.exports = baseTrim;
  }
});

// ../../node_modules/lodash/_Symbol.js
var require_Symbol = __commonJS({
  "../../node_modules/lodash/_Symbol.js"(exports2, module2) {
    var root = require_root();
    var Symbol2 = root.Symbol;
    module2.exports = Symbol2;
  }
});

// ../../node_modules/lodash/_getRawTag.js
var require_getRawTag = __commonJS({
  "../../node_modules/lodash/_getRawTag.js"(exports2, module2) {
    var Symbol2 = require_Symbol();
    var objectProto = Object.prototype;
    var hasOwnProperty2 = objectProto.hasOwnProperty;
    var nativeObjectToString = objectProto.toString;
    var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    function getRawTag(value) {
      var isOwn = hasOwnProperty2.call(value, symToStringTag), tag = value[symToStringTag];
      try {
        value[symToStringTag] = void 0;
        var unmasked = true;
      } catch (e) {
      }
      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }
    module2.exports = getRawTag;
  }
});

// ../../node_modules/lodash/_objectToString.js
var require_objectToString = __commonJS({
  "../../node_modules/lodash/_objectToString.js"(exports2, module2) {
    var objectProto = Object.prototype;
    var nativeObjectToString = objectProto.toString;
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }
    module2.exports = objectToString;
  }
});

// ../../node_modules/lodash/_baseGetTag.js
var require_baseGetTag = __commonJS({
  "../../node_modules/lodash/_baseGetTag.js"(exports2, module2) {
    var Symbol2 = require_Symbol();
    var getRawTag = require_getRawTag();
    var objectToString = require_objectToString();
    var nullTag = "[object Null]";
    var undefinedTag = "[object Undefined]";
    var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    function baseGetTag(value) {
      if (value == null) {
        return value === void 0 ? undefinedTag : nullTag;
      }
      return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
    }
    module2.exports = baseGetTag;
  }
});

// ../../node_modules/lodash/isObjectLike.js
var require_isObjectLike = __commonJS({
  "../../node_modules/lodash/isObjectLike.js"(exports2, module2) {
    function isObjectLike(value) {
      return value != null && typeof value == "object";
    }
    module2.exports = isObjectLike;
  }
});

// ../../node_modules/lodash/isSymbol.js
var require_isSymbol = __commonJS({
  "../../node_modules/lodash/isSymbol.js"(exports2, module2) {
    var baseGetTag = require_baseGetTag();
    var isObjectLike = require_isObjectLike();
    var symbolTag = "[object Symbol]";
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
    }
    module2.exports = isSymbol;
  }
});

// ../../node_modules/lodash/toNumber.js
var require_toNumber = __commonJS({
  "../../node_modules/lodash/toNumber.js"(exports2, module2) {
    var baseTrim = require_baseTrim();
    var isObject = require_isObject();
    var isSymbol = require_isSymbol();
    var NAN = 0 / 0;
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
    var reIsBinary = /^0b[01]+$/i;
    var reIsOctal = /^0o[0-7]+$/i;
    var freeParseInt = parseInt;
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
      value = baseTrim(value);
      var isBinary = reIsBinary.test(value);
      return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
    }
    module2.exports = toNumber;
  }
});

// ../../node_modules/lodash/debounce.js
var require_debounce = __commonJS({
  "../../node_modules/lodash/debounce.js"(exports2, module2) {
    var isObject = require_isObject();
    var now = require_now();
    var toNumber = require_toNumber();
    var FUNC_ERROR_TEXT = "Expected a function";
    var nativeMax = Math.max;
    var nativeMin = Math.min;
    function debounce(func, wait, options) {
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
        var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
        return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
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
            clearTimeout(timerId);
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
    module2.exports = debounce;
  }
});

// ../../node_modules/lodash/throttle.js
var require_throttle = __commonJS({
  "../../node_modules/lodash/throttle.js"(exports2, module2) {
    var debounce = require_debounce();
    var isObject = require_isObject();
    var FUNC_ERROR_TEXT = "Expected a function";
    function throttle(func, wait, options) {
      var leading = true, trailing = true;
      if (typeof func != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      if (isObject(options)) {
        leading = "leading" in options ? !!options.leading : leading;
        trailing = "trailing" in options ? !!options.trailing : trailing;
      }
      return debounce(func, wait, {
        "leading": leading,
        "maxWait": wait,
        "trailing": trailing
      });
    }
    module2.exports = throttle;
  }
});

// ../../node_modules/epubjs/lib/managers/helpers/stage.js
var require_stage = __commonJS({
  "../../node_modules/epubjs/lib/managers/helpers/stage.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _core = require_core();
    var _throttle = _interopRequireDefault(require_throttle());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var Stage = class {
      constructor(_options) {
        this.settings = _options || {};
        this.id = "epubjs-container-" + (0, _core.uuid)();
        this.container = this.create(this.settings);
        if (this.settings.hidden) {
          this.wrapper = this.wrap(this.container);
        }
      }
      /*
      * Creates an element to render to.
      * Resizes to passed width and height or to the elements size
      */
      create(options) {
        let height = options.height;
        let width = options.width;
        let overflow = options.overflow || false;
        let axis = options.axis || "vertical";
        let direction = options.direction;
        (0, _core.extend)(this.settings, options);
        if (options.height && (0, _core.isNumber)(options.height)) {
          height = options.height + "px";
        }
        if (options.width && (0, _core.isNumber)(options.width)) {
          width = options.width + "px";
        }
        let container = document.createElement("div");
        container.id = this.id;
        container.classList.add("epub-container");
        container.style.wordSpacing = "0";
        container.style.lineHeight = "0";
        container.style.verticalAlign = "top";
        container.style.position = "relative";
        if (axis === "horizontal") {
          container.style.display = "flex";
          container.style.flexDirection = "row";
          container.style.flexWrap = "nowrap";
        }
        if (width) {
          container.style.width = width;
        }
        if (height) {
          container.style.height = height;
        }
        if (overflow) {
          if (overflow === "scroll" && axis === "vertical") {
            container.style["overflow-y"] = overflow;
            container.style["overflow-x"] = "hidden";
          } else if (overflow === "scroll" && axis === "horizontal") {
            container.style["overflow-y"] = "hidden";
            container.style["overflow-x"] = overflow;
          } else {
            container.style["overflow"] = overflow;
          }
        }
        if (direction) {
          container.dir = direction;
          container.style["direction"] = direction;
        }
        if (direction && this.settings.fullsize) {
          document.body.style["direction"] = direction;
        }
        return container;
      }
      wrap(container) {
        var wrapper = document.createElement("div");
        wrapper.style.visibility = "hidden";
        wrapper.style.overflow = "hidden";
        wrapper.style.width = "0";
        wrapper.style.height = "0";
        wrapper.appendChild(container);
        return wrapper;
      }
      getElement(_element) {
        var element;
        if ((0, _core.isElement)(_element)) {
          element = _element;
        } else if (typeof _element === "string") {
          element = document.getElementById(_element);
        }
        if (!element) {
          throw new Error("Not an Element");
        }
        return element;
      }
      attachTo(what) {
        var element = this.getElement(what);
        var base;
        if (!element) {
          return;
        }
        if (this.settings.hidden) {
          base = this.wrapper;
        } else {
          base = this.container;
        }
        element.appendChild(base);
        this.element = element;
        return element;
      }
      getContainer() {
        return this.container;
      }
      onResize(func) {
        if (!(0, _core.isNumber)(this.settings.width) || !(0, _core.isNumber)(this.settings.height)) {
          this.resizeFunc = (0, _throttle.default)(func, 50);
          window.addEventListener("resize", this.resizeFunc, false);
        }
      }
      onOrientationChange(func) {
        this.orientationChangeFunc = func;
        window.addEventListener("orientationchange", this.orientationChangeFunc, false);
      }
      size(width, height) {
        var bounds;
        let _width = width || this.settings.width;
        let _height = height || this.settings.height;
        if (width === null) {
          bounds = this.element.getBoundingClientRect();
          if (bounds.width) {
            width = Math.floor(bounds.width);
            this.container.style.width = width + "px";
          }
        } else {
          if ((0, _core.isNumber)(width)) {
            this.container.style.width = width + "px";
          } else {
            this.container.style.width = width;
          }
        }
        if (height === null) {
          bounds = bounds || this.element.getBoundingClientRect();
          if (bounds.height) {
            height = bounds.height;
            this.container.style.height = height + "px";
          }
        } else {
          if ((0, _core.isNumber)(height)) {
            this.container.style.height = height + "px";
          } else {
            this.container.style.height = height;
          }
        }
        if (!(0, _core.isNumber)(width)) {
          width = this.container.clientWidth;
        }
        if (!(0, _core.isNumber)(height)) {
          height = this.container.clientHeight;
        }
        this.containerStyles = window.getComputedStyle(this.container);
        this.containerPadding = {
          left: parseFloat(this.containerStyles["padding-left"]) || 0,
          right: parseFloat(this.containerStyles["padding-right"]) || 0,
          top: parseFloat(this.containerStyles["padding-top"]) || 0,
          bottom: parseFloat(this.containerStyles["padding-bottom"]) || 0
        };
        let _windowBounds = (0, _core.windowBounds)();
        let bodyStyles = window.getComputedStyle(document.body);
        let bodyPadding = {
          left: parseFloat(bodyStyles["padding-left"]) || 0,
          right: parseFloat(bodyStyles["padding-right"]) || 0,
          top: parseFloat(bodyStyles["padding-top"]) || 0,
          bottom: parseFloat(bodyStyles["padding-bottom"]) || 0
        };
        if (!_width) {
          width = _windowBounds.width - bodyPadding.left - bodyPadding.right;
        }
        if (this.settings.fullsize && !_height || !_height) {
          height = _windowBounds.height - bodyPadding.top - bodyPadding.bottom;
        }
        return {
          width: width - this.containerPadding.left - this.containerPadding.right,
          height: height - this.containerPadding.top - this.containerPadding.bottom
        };
      }
      bounds() {
        let box;
        if (this.container.style.overflow !== "visible") {
          box = this.container && this.container.getBoundingClientRect();
        }
        if (!box || !box.width || !box.height) {
          return (0, _core.windowBounds)();
        } else {
          return box;
        }
      }
      getSheet() {
        var style = document.createElement("style");
        style.appendChild(document.createTextNode(""));
        document.head.appendChild(style);
        return style.sheet;
      }
      addStyleRules(selector, rulesArray) {
        var scope = "#" + this.id + " ";
        var rules = "";
        if (!this.sheet) {
          this.sheet = this.getSheet();
        }
        rulesArray.forEach(function(set) {
          for (var prop in set) {
            if (set.hasOwnProperty(prop)) {
              rules += prop + ":" + set[prop] + ";";
            }
          }
        });
        this.sheet.insertRule(scope + selector + " {" + rules + "}", 0);
      }
      axis(axis) {
        if (axis === "horizontal") {
          this.container.style.display = "flex";
          this.container.style.flexDirection = "row";
          this.container.style.flexWrap = "nowrap";
        } else {
          this.container.style.display = "block";
        }
        this.settings.axis = axis;
      }
      // orientation(orientation) {
      // 	if (orientation === "landscape") {
      //
      // 	} else {
      //
      // 	}
      //
      // 	this.orientation = orientation;
      // }
      direction(dir) {
        if (this.container) {
          this.container.dir = dir;
          this.container.style["direction"] = dir;
        }
        if (this.settings.fullsize) {
          document.body.style["direction"] = dir;
        }
        this.settings.dir = dir;
      }
      overflow(overflow) {
        if (this.container) {
          if (overflow === "scroll" && this.settings.axis === "vertical") {
            this.container.style["overflow-y"] = overflow;
            this.container.style["overflow-x"] = "hidden";
          } else if (overflow === "scroll" && this.settings.axis === "horizontal") {
            this.container.style["overflow-y"] = "hidden";
            this.container.style["overflow-x"] = overflow;
          } else {
            this.container.style["overflow"] = overflow;
          }
        }
        this.settings.overflow = overflow;
      }
      destroy() {
        var base;
        if (this.element) {
          if (this.settings.hidden) {
            base = this.wrapper;
          } else {
            base = this.container;
          }
          if (this.element.contains(this.container)) {
            this.element.removeChild(this.container);
          }
          window.removeEventListener("resize", this.resizeFunc);
          window.removeEventListener("orientationChange", this.orientationChangeFunc);
        }
      }
    };
    var _default = Stage;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/managers/helpers/views.js
var require_views = __commonJS({
  "../../node_modules/epubjs/lib/managers/helpers/views.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var Views = class {
      constructor(container) {
        this.container = container;
        this._views = [];
        this.length = 0;
        this.hidden = false;
      }
      all() {
        return this._views;
      }
      first() {
        return this._views[0];
      }
      last() {
        return this._views[this._views.length - 1];
      }
      indexOf(view) {
        return this._views.indexOf(view);
      }
      slice() {
        return this._views.slice.apply(this._views, arguments);
      }
      get(i) {
        return this._views[i];
      }
      append(view) {
        this._views.push(view);
        if (this.container) {
          this.container.appendChild(view.element);
        }
        this.length++;
        return view;
      }
      prepend(view) {
        this._views.unshift(view);
        if (this.container) {
          this.container.insertBefore(view.element, this.container.firstChild);
        }
        this.length++;
        return view;
      }
      insert(view, index) {
        this._views.splice(index, 0, view);
        if (this.container) {
          if (index < this.container.children.length) {
            this.container.insertBefore(view.element, this.container.children[index]);
          } else {
            this.container.appendChild(view.element);
          }
        }
        this.length++;
        return view;
      }
      remove(view) {
        var index = this._views.indexOf(view);
        if (index > -1) {
          this._views.splice(index, 1);
        }
        this.destroy(view);
        this.length--;
      }
      destroy(view) {
        if (view.displayed) {
          view.destroy();
        }
        if (this.container) {
          this.container.removeChild(view.element);
        }
        view = null;
      }
      // Iterators
      forEach() {
        return this._views.forEach.apply(this._views, arguments);
      }
      clear() {
        var view;
        var len = this.length;
        if (!this.length) return;
        for (var i = 0; i < len; i++) {
          view = this._views[i];
          this.destroy(view);
        }
        this._views = [];
        this.length = 0;
      }
      find(section) {
        var view;
        var len = this.length;
        for (var i = 0; i < len; i++) {
          view = this._views[i];
          if (view.displayed && view.section.index == section.index) {
            return view;
          }
        }
      }
      displayed() {
        var displayed = [];
        var view;
        var len = this.length;
        for (var i = 0; i < len; i++) {
          view = this._views[i];
          if (view.displayed) {
            displayed.push(view);
          }
        }
        return displayed;
      }
      show() {
        var view;
        var len = this.length;
        for (var i = 0; i < len; i++) {
          view = this._views[i];
          if (view.displayed) {
            view.show();
          }
        }
        this.hidden = false;
      }
      hide() {
        var view;
        var len = this.length;
        for (var i = 0; i < len; i++) {
          view = this._views[i];
          if (view.displayed) {
            view.hide();
          }
        }
        this.hidden = true;
      }
    };
    var _default = Views;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/managers/default/index.js
var require_default = __commonJS({
  "../../node_modules/epubjs/lib/managers/default/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _eventEmitter = _interopRequireDefault(require_event_emitter());
    var _core = require_core();
    var _scrolltype = _interopRequireDefault(require_scrolltype());
    var _mapping = _interopRequireDefault(require_mapping());
    var _queue = _interopRequireDefault(require_queue());
    var _stage = _interopRequireDefault(require_stage());
    var _views = _interopRequireDefault(require_views());
    var _constants = require_constants();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var DefaultViewManager = class {
      constructor(options) {
        this.name = "default";
        this.optsSettings = options.settings;
        this.View = options.view;
        this.request = options.request;
        this.renditionQueue = options.queue;
        this.q = new _queue.default(this);
        this.settings = (0, _core.extend)(this.settings || {}, {
          infinite: true,
          hidden: false,
          width: void 0,
          height: void 0,
          axis: void 0,
          writingMode: void 0,
          flow: "scrolled",
          ignoreClass: "",
          fullsize: void 0,
          allowScriptedContent: false,
          allowPopups: false
        });
        (0, _core.extend)(this.settings, options.settings || {});
        this.viewSettings = {
          ignoreClass: this.settings.ignoreClass,
          axis: this.settings.axis,
          flow: this.settings.flow,
          layout: this.layout,
          method: this.settings.method,
          // srcdoc, blobUrl, write
          width: 0,
          height: 0,
          forceEvenPages: true,
          allowScriptedContent: this.settings.allowScriptedContent,
          allowPopups: this.settings.allowPopups
        };
        this.rendered = false;
      }
      render(element, size) {
        let tag = element.tagName;
        if (typeof this.settings.fullsize === "undefined" && tag && (tag.toLowerCase() == "body" || tag.toLowerCase() == "html")) {
          this.settings.fullsize = true;
        }
        if (this.settings.fullsize) {
          this.settings.overflow = "visible";
          this.overflow = this.settings.overflow;
        }
        this.settings.size = size;
        this.settings.rtlScrollType = (0, _scrolltype.default)();
        this.stage = new _stage.default({
          width: size.width,
          height: size.height,
          overflow: this.overflow,
          hidden: this.settings.hidden,
          axis: this.settings.axis,
          fullsize: this.settings.fullsize,
          direction: this.settings.direction
        });
        this.stage.attachTo(element);
        this.container = this.stage.getContainer();
        this.views = new _views.default(this.container);
        this._bounds = this.bounds();
        this._stageSize = this.stage.size();
        this.viewSettings.width = this._stageSize.width;
        this.viewSettings.height = this._stageSize.height;
        this.stage.onResize(this.onResized.bind(this));
        this.stage.onOrientationChange(this.onOrientationChange.bind(this));
        this.addEventListeners();
        if (this.layout) {
          this.updateLayout();
        }
        this.rendered = true;
      }
      addEventListeners() {
        var scroller;
        window.addEventListener("unload", function(e) {
          this.destroy();
        }.bind(this));
        if (!this.settings.fullsize) {
          scroller = this.container;
        } else {
          scroller = window;
        }
        this._onScroll = this.onScroll.bind(this);
        scroller.addEventListener("scroll", this._onScroll);
      }
      removeEventListeners() {
        var scroller;
        if (!this.settings.fullsize) {
          scroller = this.container;
        } else {
          scroller = window;
        }
        scroller.removeEventListener("scroll", this._onScroll);
        this._onScroll = void 0;
      }
      destroy() {
        clearTimeout(this.orientationTimeout);
        clearTimeout(this.resizeTimeout);
        clearTimeout(this.afterScrolled);
        this.clear();
        this.removeEventListeners();
        this.stage.destroy();
        this.rendered = false;
      }
      onOrientationChange(e) {
        let {
          orientation
        } = window;
        if (this.optsSettings.resizeOnOrientationChange) {
          this.resize();
        }
        clearTimeout(this.orientationTimeout);
        this.orientationTimeout = setTimeout(function() {
          this.orientationTimeout = void 0;
          if (this.optsSettings.resizeOnOrientationChange) {
            this.resize();
          }
          this.emit(_constants.EVENTS.MANAGERS.ORIENTATION_CHANGE, orientation);
        }.bind(this), 500);
      }
      onResized(e) {
        this.resize();
      }
      resize(width, height, epubcfi) {
        let stageSize = this.stage.size(width, height);
        this.winBounds = (0, _core.windowBounds)();
        if (this.orientationTimeout && this.winBounds.width === this.winBounds.height) {
          this._stageSize = void 0;
          return;
        }
        if (this._stageSize && this._stageSize.width === stageSize.width && this._stageSize.height === stageSize.height) {
          return;
        }
        this._stageSize = stageSize;
        this._bounds = this.bounds();
        this.clear();
        this.viewSettings.width = this._stageSize.width;
        this.viewSettings.height = this._stageSize.height;
        this.updateLayout();
        this.emit(_constants.EVENTS.MANAGERS.RESIZED, {
          width: this._stageSize.width,
          height: this._stageSize.height
        }, epubcfi);
      }
      createView(section, forceRight) {
        return new this.View(section, (0, _core.extend)(this.viewSettings, {
          forceRight
        }));
      }
      handleNextPrePaginated(forceRight, section, action) {
        let next;
        if (this.layout.name === "pre-paginated" && this.layout.divisor > 1) {
          if (forceRight || section.index === 0) {
            return;
          }
          next = section.next();
          if (next && !next.properties.includes("page-spread-left")) {
            return action.call(this, next);
          }
        }
      }
      display(section, target) {
        var displaying = new _core.defer();
        var displayed = displaying.promise;
        if (target === section.href || (0, _core.isNumber)(target)) {
          target = void 0;
        }
        var visible = this.views.find(section);
        if (visible && section && this.layout.name !== "pre-paginated") {
          let offset = visible.offset();
          if (this.settings.direction === "ltr") {
            this.scrollTo(offset.left, offset.top, true);
          } else {
            let width = visible.width();
            this.scrollTo(offset.left + width, offset.top, true);
          }
          if (target) {
            let offset2 = visible.locationOf(target);
            let width = visible.width();
            this.moveTo(offset2, width);
          }
          displaying.resolve();
          return displayed;
        }
        this.clear();
        let forceRight = false;
        if (this.layout.name === "pre-paginated" && this.layout.divisor === 2 && section.properties.includes("page-spread-right")) {
          forceRight = true;
        }
        this.add(section, forceRight).then(function(view) {
          if (target) {
            let offset = view.locationOf(target);
            let width = view.width();
            this.moveTo(offset, width);
          }
        }.bind(this), (err) => {
          displaying.reject(err);
        }).then(function() {
          return this.handleNextPrePaginated(forceRight, section, this.add);
        }.bind(this)).then(function() {
          this.views.show();
          displaying.resolve();
        }.bind(this));
        return displayed;
      }
      afterDisplayed(view) {
        this.emit(_constants.EVENTS.MANAGERS.ADDED, view);
      }
      afterResized(view) {
        this.emit(_constants.EVENTS.MANAGERS.RESIZE, view.section);
      }
      moveTo(offset, width) {
        var distX = 0, distY = 0;
        if (!this.isPaginated) {
          distY = offset.top;
        } else {
          distX = Math.floor(offset.left / this.layout.delta) * this.layout.delta;
          if (distX + this.layout.delta > this.container.scrollWidth) {
            distX = this.container.scrollWidth - this.layout.delta;
          }
          distY = Math.floor(offset.top / this.layout.delta) * this.layout.delta;
          if (distY + this.layout.delta > this.container.scrollHeight) {
            distY = this.container.scrollHeight - this.layout.delta;
          }
        }
        if (this.settings.direction === "rtl") {
          distX = distX + this.layout.delta;
          distX = distX - width;
        }
        this.scrollTo(distX, distY, true);
      }
      add(section, forceRight) {
        var view = this.createView(section, forceRight);
        this.views.append(view);
        view.onDisplayed = this.afterDisplayed.bind(this);
        view.onResize = this.afterResized.bind(this);
        view.on(_constants.EVENTS.VIEWS.AXIS, (axis) => {
          this.updateAxis(axis);
        });
        view.on(_constants.EVENTS.VIEWS.WRITING_MODE, (mode) => {
          this.updateWritingMode(mode);
        });
        return view.display(this.request);
      }
      append(section, forceRight) {
        var view = this.createView(section, forceRight);
        this.views.append(view);
        view.onDisplayed = this.afterDisplayed.bind(this);
        view.onResize = this.afterResized.bind(this);
        view.on(_constants.EVENTS.VIEWS.AXIS, (axis) => {
          this.updateAxis(axis);
        });
        view.on(_constants.EVENTS.VIEWS.WRITING_MODE, (mode) => {
          this.updateWritingMode(mode);
        });
        return view.display(this.request);
      }
      prepend(section, forceRight) {
        var view = this.createView(section, forceRight);
        view.on(_constants.EVENTS.VIEWS.RESIZED, (bounds) => {
          this.counter(bounds);
        });
        this.views.prepend(view);
        view.onDisplayed = this.afterDisplayed.bind(this);
        view.onResize = this.afterResized.bind(this);
        view.on(_constants.EVENTS.VIEWS.AXIS, (axis) => {
          this.updateAxis(axis);
        });
        view.on(_constants.EVENTS.VIEWS.WRITING_MODE, (mode) => {
          this.updateWritingMode(mode);
        });
        return view.display(this.request);
      }
      counter(bounds) {
        if (this.settings.axis === "vertical") {
          this.scrollBy(0, bounds.heightDelta, true);
        } else {
          this.scrollBy(bounds.widthDelta, 0, true);
        }
      }
      // resizeView(view) {
      //
      // 	if(this.settings.globalLayoutProperties.layout === "pre-paginated") {
      // 		view.lock("both", this.bounds.width, this.bounds.height);
      // 	} else {
      // 		view.lock("width", this.bounds.width, this.bounds.height);
      // 	}
      //
      // };
      next() {
        var next;
        var left;
        let dir = this.settings.direction;
        if (!this.views.length) return;
        if (this.isPaginated && this.settings.axis === "horizontal" && (!dir || dir === "ltr")) {
          this.scrollLeft = this.container.scrollLeft;
          left = this.container.scrollLeft + this.container.offsetWidth + this.layout.delta;
          if (left <= this.container.scrollWidth) {
            this.scrollBy(this.layout.delta, 0, true);
          } else {
            next = this.views.last().section.next();
          }
        } else if (this.isPaginated && this.settings.axis === "horizontal" && dir === "rtl") {
          this.scrollLeft = this.container.scrollLeft;
          if (this.settings.rtlScrollType === "default") {
            left = this.container.scrollLeft;
            if (left > 0) {
              this.scrollBy(this.layout.delta, 0, true);
            } else {
              next = this.views.last().section.next();
            }
          } else {
            left = this.container.scrollLeft + this.layout.delta * -1;
            if (left > this.container.scrollWidth * -1) {
              this.scrollBy(this.layout.delta, 0, true);
            } else {
              next = this.views.last().section.next();
            }
          }
        } else if (this.isPaginated && this.settings.axis === "vertical") {
          this.scrollTop = this.container.scrollTop;
          let top = this.container.scrollTop + this.container.offsetHeight;
          if (top < this.container.scrollHeight) {
            this.scrollBy(0, this.layout.height, true);
          } else {
            next = this.views.last().section.next();
          }
        } else {
          next = this.views.last().section.next();
        }
        if (next) {
          this.clear();
          this.updateLayout();
          let forceRight = false;
          if (this.layout.name === "pre-paginated" && this.layout.divisor === 2 && next.properties.includes("page-spread-right")) {
            forceRight = true;
          }
          return this.append(next, forceRight).then(function() {
            return this.handleNextPrePaginated(forceRight, next, this.append);
          }.bind(this), (err) => {
            return err;
          }).then(function() {
            if (!this.isPaginated && this.settings.axis === "horizontal" && this.settings.direction === "rtl" && this.settings.rtlScrollType === "default") {
              this.scrollTo(this.container.scrollWidth, 0, true);
            }
            this.views.show();
          }.bind(this));
        }
      }
      prev() {
        var prev;
        var left;
        let dir = this.settings.direction;
        if (!this.views.length) return;
        if (this.isPaginated && this.settings.axis === "horizontal" && (!dir || dir === "ltr")) {
          this.scrollLeft = this.container.scrollLeft;
          left = this.container.scrollLeft;
          if (left > 0) {
            this.scrollBy(-this.layout.delta, 0, true);
          } else {
            prev = this.views.first().section.prev();
          }
        } else if (this.isPaginated && this.settings.axis === "horizontal" && dir === "rtl") {
          this.scrollLeft = this.container.scrollLeft;
          if (this.settings.rtlScrollType === "default") {
            left = this.container.scrollLeft + this.container.offsetWidth;
            if (left < this.container.scrollWidth) {
              this.scrollBy(-this.layout.delta, 0, true);
            } else {
              prev = this.views.first().section.prev();
            }
          } else {
            left = this.container.scrollLeft;
            if (left < 0) {
              this.scrollBy(-this.layout.delta, 0, true);
            } else {
              prev = this.views.first().section.prev();
            }
          }
        } else if (this.isPaginated && this.settings.axis === "vertical") {
          this.scrollTop = this.container.scrollTop;
          let top = this.container.scrollTop;
          if (top > 0) {
            this.scrollBy(0, -this.layout.height, true);
          } else {
            prev = this.views.first().section.prev();
          }
        } else {
          prev = this.views.first().section.prev();
        }
        if (prev) {
          this.clear();
          this.updateLayout();
          let forceRight = false;
          if (this.layout.name === "pre-paginated" && this.layout.divisor === 2 && typeof prev.prev() !== "object") {
            forceRight = true;
          }
          return this.prepend(prev, forceRight).then(function() {
            var left2;
            if (this.layout.name === "pre-paginated" && this.layout.divisor > 1) {
              left2 = prev.prev();
              if (left2) {
                return this.prepend(left2);
              }
            }
          }.bind(this), (err) => {
            return err;
          }).then(function() {
            if (this.isPaginated && this.settings.axis === "horizontal") {
              if (this.settings.direction === "rtl") {
                if (this.settings.rtlScrollType === "default") {
                  this.scrollTo(0, 0, true);
                } else {
                  this.scrollTo(this.container.scrollWidth * -1 + this.layout.delta, 0, true);
                }
              } else {
                this.scrollTo(this.container.scrollWidth - this.layout.delta, 0, true);
              }
            }
            this.views.show();
          }.bind(this));
        }
      }
      current() {
        var visible = this.visible();
        if (visible.length) {
          return visible[visible.length - 1];
        }
        return null;
      }
      clear() {
        if (this.views) {
          this.views.hide();
          this.scrollTo(0, 0, true);
          this.views.clear();
        }
      }
      currentLocation() {
        this.updateLayout();
        if (this.isPaginated && this.settings.axis === "horizontal") {
          this.location = this.paginatedLocation();
        } else {
          this.location = this.scrolledLocation();
        }
        return this.location;
      }
      scrolledLocation() {
        let visible = this.visible();
        let container = this.container.getBoundingClientRect();
        let pageHeight = container.height < window.innerHeight ? container.height : window.innerHeight;
        let pageWidth = container.width < window.innerWidth ? container.width : window.innerWidth;
        let vertical = this.settings.axis === "vertical";
        let rtl = this.settings.direction === "rtl";
        let offset = 0;
        let used = 0;
        if (this.settings.fullsize) {
          offset = vertical ? window.scrollY : window.scrollX;
        }
        let sections = visible.map((view) => {
          let {
            index,
            href
          } = view.section;
          let position = view.position();
          let width = view.width();
          let height = view.height();
          let startPos;
          let endPos;
          let stopPos;
          let totalPages;
          if (vertical) {
            startPos = offset + container.top - position.top + used;
            endPos = startPos + pageHeight - used;
            totalPages = this.layout.count(height, pageHeight).pages;
            stopPos = pageHeight;
          } else {
            startPos = offset + container.left - position.left + used;
            endPos = startPos + pageWidth - used;
            totalPages = this.layout.count(width, pageWidth).pages;
            stopPos = pageWidth;
          }
          let currPage = Math.ceil(startPos / stopPos);
          let pages = [];
          let endPage = Math.ceil(endPos / stopPos);
          if (this.settings.direction === "rtl" && !vertical) {
            let tempStartPage = currPage;
            currPage = totalPages - endPage;
            endPage = totalPages - tempStartPage;
          }
          pages = [];
          for (var i = currPage; i <= endPage; i++) {
            let pg = i + 1;
            pages.push(pg);
          }
          let mapping = this.mapping.page(view.contents, view.section.cfiBase, startPos, endPos);
          return {
            index,
            href,
            pages,
            totalPages,
            mapping
          };
        });
        return sections;
      }
      paginatedLocation() {
        let visible = this.visible();
        let container = this.container.getBoundingClientRect();
        let left = 0;
        let used = 0;
        if (this.settings.fullsize) {
          left = window.scrollX;
        }
        let sections = visible.map((view) => {
          let {
            index,
            href
          } = view.section;
          let offset;
          let position = view.position();
          let width = view.width();
          let start;
          let end;
          let pageWidth;
          if (this.settings.direction === "rtl") {
            offset = container.right - left;
            pageWidth = Math.min(Math.abs(offset - position.left), this.layout.width) - used;
            end = position.width - (position.right - offset) - used;
            start = end - pageWidth;
          } else {
            offset = container.left + left;
            pageWidth = Math.min(position.right - offset, this.layout.width) - used;
            start = offset - position.left + used;
            end = start + pageWidth;
          }
          used += pageWidth;
          let mapping = this.mapping.page(view.contents, view.section.cfiBase, start, end);
          let totalPages = this.layout.count(width).pages;
          let startPage = Math.floor(start / this.layout.pageWidth);
          let pages = [];
          let endPage = Math.floor(end / this.layout.pageWidth);
          if (startPage < 0) {
            startPage = 0;
            endPage = endPage + 1;
          }
          if (this.settings.direction === "rtl") {
            let tempStartPage = startPage;
            startPage = totalPages - endPage;
            endPage = totalPages - tempStartPage;
          }
          for (var i = startPage + 1; i <= endPage; i++) {
            let pg = i;
            pages.push(pg);
          }
          return {
            index,
            href,
            pages,
            totalPages,
            mapping
          };
        });
        return sections;
      }
      isVisible(view, offsetPrev, offsetNext, _container) {
        var position = view.position();
        var container = _container || this.bounds();
        if (this.settings.axis === "horizontal" && position.right > container.left - offsetPrev && position.left < container.right + offsetNext) {
          return true;
        } else if (this.settings.axis === "vertical" && position.bottom > container.top - offsetPrev && position.top < container.bottom + offsetNext) {
          return true;
        }
        return false;
      }
      visible() {
        var container = this.bounds();
        var views = this.views.displayed();
        var viewsLength = views.length;
        var visible = [];
        var isVisible;
        var view;
        for (var i = 0; i < viewsLength; i++) {
          view = views[i];
          isVisible = this.isVisible(view, 0, 0, container);
          if (isVisible === true) {
            visible.push(view);
          }
        }
        return visible;
      }
      scrollBy(x, y, silent) {
        let dir = this.settings.direction === "rtl" ? -1 : 1;
        if (silent) {
          this.ignore = true;
        }
        if (!this.settings.fullsize) {
          if (x) this.container.scrollLeft += x * dir;
          if (y) this.container.scrollTop += y;
        } else {
          window.scrollBy(x * dir, y * dir);
        }
        this.scrolled = true;
      }
      scrollTo(x, y, silent) {
        if (silent) {
          this.ignore = true;
        }
        if (!this.settings.fullsize) {
          this.container.scrollLeft = x;
          this.container.scrollTop = y;
        } else {
          window.scrollTo(x, y);
        }
        this.scrolled = true;
      }
      onScroll() {
        let scrollTop;
        let scrollLeft;
        if (!this.settings.fullsize) {
          scrollTop = this.container.scrollTop;
          scrollLeft = this.container.scrollLeft;
        } else {
          scrollTop = window.scrollY;
          scrollLeft = window.scrollX;
        }
        this.scrollTop = scrollTop;
        this.scrollLeft = scrollLeft;
        if (!this.ignore) {
          this.emit(_constants.EVENTS.MANAGERS.SCROLL, {
            top: scrollTop,
            left: scrollLeft
          });
          clearTimeout(this.afterScrolled);
          this.afterScrolled = setTimeout(function() {
            this.emit(_constants.EVENTS.MANAGERS.SCROLLED, {
              top: this.scrollTop,
              left: this.scrollLeft
            });
          }.bind(this), 20);
        } else {
          this.ignore = false;
        }
      }
      bounds() {
        var bounds;
        bounds = this.stage.bounds();
        return bounds;
      }
      applyLayout(layout) {
        this.layout = layout;
        this.updateLayout();
        if (this.views && this.views.length > 0 && this.layout.name === "pre-paginated") {
          this.display(this.views.first().section);
        }
      }
      updateLayout() {
        if (!this.stage) {
          return;
        }
        this._stageSize = this.stage.size();
        if (!this.isPaginated) {
          this.layout.calculate(this._stageSize.width, this._stageSize.height);
        } else {
          this.layout.calculate(this._stageSize.width, this._stageSize.height, this.settings.gap);
          this.settings.offset = this.layout.delta / this.layout.divisor;
        }
        this.viewSettings.width = this.layout.width;
        this.viewSettings.height = this.layout.height;
        this.setLayout(this.layout);
      }
      setLayout(layout) {
        this.viewSettings.layout = layout;
        this.mapping = new _mapping.default(layout.props, this.settings.direction, this.settings.axis);
        if (this.views) {
          this.views.forEach(function(view) {
            if (view) {
              view.setLayout(layout);
            }
          });
        }
      }
      updateWritingMode(mode) {
        this.writingMode = mode;
      }
      updateAxis(axis, forceUpdate) {
        if (!forceUpdate && axis === this.settings.axis) {
          return;
        }
        this.settings.axis = axis;
        this.stage && this.stage.axis(axis);
        this.viewSettings.axis = axis;
        if (this.mapping) {
          this.mapping = new _mapping.default(this.layout.props, this.settings.direction, this.settings.axis);
        }
        if (this.layout) {
          if (axis === "vertical") {
            this.layout.spread("none");
          } else {
            this.layout.spread(this.layout.settings.spread);
          }
        }
      }
      updateFlow(flow, defaultScrolledOverflow = "auto") {
        let isPaginated = flow === "paginated" || flow === "auto";
        this.isPaginated = isPaginated;
        if (flow === "scrolled-doc" || flow === "scrolled-continuous" || flow === "scrolled") {
          this.updateAxis("vertical");
        } else {
          this.updateAxis("horizontal");
        }
        this.viewSettings.flow = flow;
        if (!this.settings.overflow) {
          this.overflow = isPaginated ? "hidden" : defaultScrolledOverflow;
        } else {
          this.overflow = this.settings.overflow;
        }
        this.stage && this.stage.overflow(this.overflow);
        this.updateLayout();
      }
      getContents() {
        var contents = [];
        if (!this.views) {
          return contents;
        }
        this.views.forEach(function(view) {
          const viewContents = view && view.contents;
          if (viewContents) {
            contents.push(viewContents);
          }
        });
        return contents;
      }
      direction(dir = "ltr") {
        this.settings.direction = dir;
        this.stage && this.stage.direction(dir);
        this.viewSettings.direction = dir;
        this.updateLayout();
      }
      isRendered() {
        return this.rendered;
      }
    };
    (0, _eventEmitter.default)(DefaultViewManager.prototype);
    var _default = DefaultViewManager;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/managers/helpers/snap.js
var require_snap = __commonJS({
  "../../node_modules/epubjs/lib/managers/helpers/snap.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _core = require_core();
    var _constants = require_constants();
    var _eventEmitter = _interopRequireDefault(require_event_emitter());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var PI_D2 = Math.PI / 2;
    var EASING_EQUATIONS = {
      easeOutSine: function(pos) {
        return Math.sin(pos * PI_D2);
      },
      easeInOutSine: function(pos) {
        return -0.5 * (Math.cos(Math.PI * pos) - 1);
      },
      easeInOutQuint: function(pos) {
        if ((pos /= 0.5) < 1) {
          return 0.5 * Math.pow(pos, 5);
        }
        return 0.5 * (Math.pow(pos - 2, 5) + 2);
      },
      easeInCubic: function(pos) {
        return Math.pow(pos, 3);
      }
    };
    var Snap = class {
      constructor(manager, options) {
        this.settings = (0, _core.extend)({
          duration: 80,
          minVelocity: 0.2,
          minDistance: 10,
          easing: EASING_EQUATIONS["easeInCubic"]
        }, options || {});
        this.supportsTouch = this.supportsTouch();
        if (this.supportsTouch) {
          this.setup(manager);
        }
      }
      setup(manager) {
        this.manager = manager;
        this.layout = this.manager.layout;
        this.fullsize = this.manager.settings.fullsize;
        if (this.fullsize) {
          this.element = this.manager.stage.element;
          this.scroller = window;
          this.disableScroll();
        } else {
          this.element = this.manager.stage.container;
          this.scroller = this.element;
          this.element.style["WebkitOverflowScrolling"] = "touch";
        }
        this.manager.settings.offset = this.layout.width;
        this.manager.settings.afterScrolledTimeout = this.settings.duration * 2;
        this.isVertical = this.manager.settings.axis === "vertical";
        if (!this.manager.isPaginated || this.isVertical) {
          return;
        }
        this.touchCanceler = false;
        this.resizeCanceler = false;
        this.snapping = false;
        this.scrollLeft;
        this.scrollTop;
        this.startTouchX = void 0;
        this.startTouchY = void 0;
        this.startTime = void 0;
        this.endTouchX = void 0;
        this.endTouchY = void 0;
        this.endTime = void 0;
        this.addListeners();
      }
      supportsTouch() {
        if ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch) {
          return true;
        }
        return false;
      }
      disableScroll() {
        this.element.style.overflow = "hidden";
      }
      enableScroll() {
        this.element.style.overflow = "";
      }
      addListeners() {
        this._onResize = this.onResize.bind(this);
        window.addEventListener("resize", this._onResize);
        this._onScroll = this.onScroll.bind(this);
        this.scroller.addEventListener("scroll", this._onScroll);
        this._onTouchStart = this.onTouchStart.bind(this);
        this.scroller.addEventListener("touchstart", this._onTouchStart, {
          passive: true
        });
        this.on("touchstart", this._onTouchStart);
        this._onTouchMove = this.onTouchMove.bind(this);
        this.scroller.addEventListener("touchmove", this._onTouchMove, {
          passive: true
        });
        this.on("touchmove", this._onTouchMove);
        this._onTouchEnd = this.onTouchEnd.bind(this);
        this.scroller.addEventListener("touchend", this._onTouchEnd, {
          passive: true
        });
        this.on("touchend", this._onTouchEnd);
        this._afterDisplayed = this.afterDisplayed.bind(this);
        this.manager.on(_constants.EVENTS.MANAGERS.ADDED, this._afterDisplayed);
      }
      removeListeners() {
        window.removeEventListener("resize", this._onResize);
        this._onResize = void 0;
        this.scroller.removeEventListener("scroll", this._onScroll);
        this._onScroll = void 0;
        this.scroller.removeEventListener("touchstart", this._onTouchStart, {
          passive: true
        });
        this.off("touchstart", this._onTouchStart);
        this._onTouchStart = void 0;
        this.scroller.removeEventListener("touchmove", this._onTouchMove, {
          passive: true
        });
        this.off("touchmove", this._onTouchMove);
        this._onTouchMove = void 0;
        this.scroller.removeEventListener("touchend", this._onTouchEnd, {
          passive: true
        });
        this.off("touchend", this._onTouchEnd);
        this._onTouchEnd = void 0;
        this.manager.off(_constants.EVENTS.MANAGERS.ADDED, this._afterDisplayed);
        this._afterDisplayed = void 0;
      }
      afterDisplayed(view) {
        let contents = view.contents;
        ["touchstart", "touchmove", "touchend"].forEach((e) => {
          contents.on(e, (ev) => this.triggerViewEvent(ev, contents));
        });
      }
      triggerViewEvent(e, contents) {
        this.emit(e.type, e, contents);
      }
      onScroll(e) {
        this.scrollLeft = this.fullsize ? window.scrollX : this.scroller.scrollLeft;
        this.scrollTop = this.fullsize ? window.scrollY : this.scroller.scrollTop;
      }
      onResize(e) {
        this.resizeCanceler = true;
      }
      onTouchStart(e) {
        let {
          screenX,
          screenY
        } = e.touches[0];
        if (this.fullsize) {
          this.enableScroll();
        }
        this.touchCanceler = true;
        if (!this.startTouchX) {
          this.startTouchX = screenX;
          this.startTouchY = screenY;
          this.startTime = this.now();
        }
        this.endTouchX = screenX;
        this.endTouchY = screenY;
        this.endTime = this.now();
      }
      onTouchMove(e) {
        let {
          screenX,
          screenY
        } = e.touches[0];
        let deltaY = Math.abs(screenY - this.endTouchY);
        this.touchCanceler = true;
        if (!this.fullsize && deltaY < 10) {
          this.element.scrollLeft -= screenX - this.endTouchX;
        }
        this.endTouchX = screenX;
        this.endTouchY = screenY;
        this.endTime = this.now();
      }
      onTouchEnd(e) {
        if (this.fullsize) {
          this.disableScroll();
        }
        this.touchCanceler = false;
        let swipped = this.wasSwiped();
        if (swipped !== 0) {
          this.snap(swipped);
        } else {
          this.snap();
        }
        this.startTouchX = void 0;
        this.startTouchY = void 0;
        this.startTime = void 0;
        this.endTouchX = void 0;
        this.endTouchY = void 0;
        this.endTime = void 0;
      }
      wasSwiped() {
        let snapWidth = this.layout.pageWidth * this.layout.divisor;
        let distance = this.endTouchX - this.startTouchX;
        let absolute = Math.abs(distance);
        let time = this.endTime - this.startTime;
        let velocity = distance / time;
        let minVelocity = this.settings.minVelocity;
        if (absolute <= this.settings.minDistance || absolute >= snapWidth) {
          return 0;
        }
        if (velocity > minVelocity) {
          return -1;
        } else if (velocity < -minVelocity) {
          return 1;
        }
      }
      needsSnap() {
        let left = this.scrollLeft;
        let snapWidth = this.layout.pageWidth * this.layout.divisor;
        return left % snapWidth !== 0;
      }
      snap(howMany = 0) {
        let left = this.scrollLeft;
        let snapWidth = this.layout.pageWidth * this.layout.divisor;
        let snapTo = Math.round(left / snapWidth) * snapWidth;
        if (howMany) {
          snapTo += howMany * snapWidth;
        }
        return this.smoothScrollTo(snapTo);
      }
      smoothScrollTo(destination) {
        const deferred = new _core.defer();
        const start = this.scrollLeft;
        const startTime = this.now();
        const duration = this.settings.duration;
        const easing = this.settings.easing;
        this.snapping = true;
        function tick() {
          const now = this.now();
          const time = Math.min(1, (now - startTime) / duration);
          const timeFunction = easing(time);
          if (this.touchCanceler || this.resizeCanceler) {
            this.resizeCanceler = false;
            this.snapping = false;
            deferred.resolve();
            return;
          }
          if (time < 1) {
            window.requestAnimationFrame(tick.bind(this));
            this.scrollTo(start + (destination - start) * time, 0);
          } else {
            this.scrollTo(destination, 0);
            this.snapping = false;
            deferred.resolve();
          }
        }
        tick.call(this);
        return deferred.promise;
      }
      scrollTo(left = 0, top = 0) {
        if (this.fullsize) {
          window.scroll(left, top);
        } else {
          this.scroller.scrollLeft = left;
          this.scroller.scrollTop = top;
        }
      }
      now() {
        return "now" in window.performance ? performance.now() : (/* @__PURE__ */ new Date()).getTime();
      }
      destroy() {
        if (!this.scroller) {
          return;
        }
        if (this.fullsize) {
          this.enableScroll();
        }
        this.removeListeners();
        this.scroller = void 0;
      }
    };
    (0, _eventEmitter.default)(Snap.prototype);
    var _default = Snap;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/managers/continuous/index.js
var require_continuous = __commonJS({
  "../../node_modules/epubjs/lib/managers/continuous/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _core = require_core();
    var _default2 = _interopRequireDefault(require_default());
    var _snap = _interopRequireDefault(require_snap());
    var _constants = require_constants();
    var _debounce = _interopRequireDefault(require_debounce());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var ContinuousViewManager = class extends _default2.default {
      constructor(options) {
        super(options);
        this.name = "continuous";
        this.settings = (0, _core.extend)(this.settings || {}, {
          infinite: true,
          overflow: void 0,
          axis: void 0,
          writingMode: void 0,
          flow: "scrolled",
          offset: 500,
          offsetDelta: 250,
          width: void 0,
          height: void 0,
          snap: false,
          afterScrolledTimeout: 10,
          allowScriptedContent: false,
          allowPopups: false
        });
        (0, _core.extend)(this.settings, options.settings || {});
        if (options.settings.gap != "undefined" && options.settings.gap === 0) {
          this.settings.gap = options.settings.gap;
        }
        this.viewSettings = {
          ignoreClass: this.settings.ignoreClass,
          axis: this.settings.axis,
          flow: this.settings.flow,
          layout: this.layout,
          width: 0,
          height: 0,
          forceEvenPages: false,
          allowScriptedContent: this.settings.allowScriptedContent,
          allowPopups: this.settings.allowPopups
        };
        this.scrollTop = 0;
        this.scrollLeft = 0;
      }
      display(section, target) {
        return _default2.default.prototype.display.call(this, section, target).then(function() {
          return this.fill();
        }.bind(this));
      }
      fill(_full) {
        var full = _full || new _core.defer();
        this.q.enqueue(() => {
          return this.check();
        }).then((result) => {
          if (result) {
            this.fill(full);
          } else {
            full.resolve();
          }
        });
        return full.promise;
      }
      moveTo(offset) {
        var distX = 0, distY = 0;
        var offsetX = 0, offsetY = 0;
        if (!this.isPaginated) {
          distY = offset.top;
          offsetY = offset.top + this.settings.offsetDelta;
        } else {
          distX = Math.floor(offset.left / this.layout.delta) * this.layout.delta;
          offsetX = distX + this.settings.offsetDelta;
        }
        if (distX > 0 || distY > 0) {
          this.scrollBy(distX, distY, true);
        }
      }
      afterResized(view) {
        this.emit(_constants.EVENTS.MANAGERS.RESIZE, view.section);
      }
      // Remove Previous Listeners if present
      removeShownListeners(view) {
        view.onDisplayed = function() {
        };
      }
      add(section) {
        var view = this.createView(section);
        this.views.append(view);
        view.on(_constants.EVENTS.VIEWS.RESIZED, (bounds) => {
          view.expanded = true;
        });
        view.on(_constants.EVENTS.VIEWS.AXIS, (axis) => {
          this.updateAxis(axis);
        });
        view.on(_constants.EVENTS.VIEWS.WRITING_MODE, (mode) => {
          this.updateWritingMode(mode);
        });
        view.onDisplayed = this.afterDisplayed.bind(this);
        view.onResize = this.afterResized.bind(this);
        return view.display(this.request);
      }
      append(section) {
        var view = this.createView(section);
        view.on(_constants.EVENTS.VIEWS.RESIZED, (bounds) => {
          view.expanded = true;
        });
        view.on(_constants.EVENTS.VIEWS.AXIS, (axis) => {
          this.updateAxis(axis);
        });
        view.on(_constants.EVENTS.VIEWS.WRITING_MODE, (mode) => {
          this.updateWritingMode(mode);
        });
        this.views.append(view);
        view.onDisplayed = this.afterDisplayed.bind(this);
        return view;
      }
      prepend(section) {
        var view = this.createView(section);
        view.on(_constants.EVENTS.VIEWS.RESIZED, (bounds) => {
          this.counter(bounds);
          view.expanded = true;
        });
        view.on(_constants.EVENTS.VIEWS.AXIS, (axis) => {
          this.updateAxis(axis);
        });
        view.on(_constants.EVENTS.VIEWS.WRITING_MODE, (mode) => {
          this.updateWritingMode(mode);
        });
        this.views.prepend(view);
        view.onDisplayed = this.afterDisplayed.bind(this);
        return view;
      }
      counter(bounds) {
        if (this.settings.axis === "vertical") {
          this.scrollBy(0, bounds.heightDelta, true);
        } else {
          this.scrollBy(bounds.widthDelta, 0, true);
        }
      }
      update(_offset) {
        var container = this.bounds();
        var views = this.views.all();
        var viewsLength = views.length;
        var visible = [];
        var offset = typeof _offset != "undefined" ? _offset : this.settings.offset || 0;
        var isVisible;
        var view;
        var updating = new _core.defer();
        var promises = [];
        for (var i = 0; i < viewsLength; i++) {
          view = views[i];
          isVisible = this.isVisible(view, offset, offset, container);
          if (isVisible === true) {
            if (!view.displayed) {
              let displayed = view.display(this.request).then(function(view2) {
                view2.show();
              }, (err) => {
                view.hide();
              });
              promises.push(displayed);
            } else {
              view.show();
            }
            visible.push(view);
          } else {
            this.q.enqueue(view.destroy.bind(view));
            clearTimeout(this.trimTimeout);
            this.trimTimeout = setTimeout(function() {
              this.q.enqueue(this.trim.bind(this));
            }.bind(this), 250);
          }
        }
        if (promises.length) {
          return Promise.all(promises).catch((err) => {
            updating.reject(err);
          });
        } else {
          updating.resolve();
          return updating.promise;
        }
      }
      check(_offsetLeft, _offsetTop) {
        var checking = new _core.defer();
        var newViews = [];
        var horizontal = this.settings.axis === "horizontal";
        var delta = this.settings.offset || 0;
        if (_offsetLeft && horizontal) {
          delta = _offsetLeft;
        }
        if (_offsetTop && !horizontal) {
          delta = _offsetTop;
        }
        var bounds = this._bounds;
        let offset = horizontal ? this.scrollLeft : this.scrollTop;
        let visibleLength = horizontal ? Math.floor(bounds.width) : bounds.height;
        let contentLength = horizontal ? this.container.scrollWidth : this.container.scrollHeight;
        let writingMode = this.writingMode && this.writingMode.indexOf("vertical") === 0 ? "vertical" : "horizontal";
        let rtlScrollType = this.settings.rtlScrollType;
        let rtl = this.settings.direction === "rtl";
        if (!this.settings.fullsize) {
          if (rtl && rtlScrollType === "default" && writingMode === "horizontal") {
            offset = contentLength - visibleLength - offset;
          }
          if (rtl && rtlScrollType === "negative" && writingMode === "horizontal") {
            offset = offset * -1;
          }
        } else {
          if (horizontal && rtl && rtlScrollType === "negative" || !horizontal && rtl && rtlScrollType === "default") {
            offset = offset * -1;
          }
        }
        let prepend = () => {
          let first = this.views.first();
          let prev = first && first.section.prev();
          if (prev) {
            newViews.push(this.prepend(prev));
          }
        };
        let append = () => {
          let last = this.views.last();
          let next = last && last.section.next();
          if (next) {
            newViews.push(this.append(next));
          }
        };
        let end = offset + visibleLength + delta;
        let start = offset - delta;
        if (end >= contentLength) {
          append();
        }
        if (start < 0) {
          prepend();
        }
        let promises = newViews.map((view) => {
          return view.display(this.request);
        });
        if (newViews.length) {
          return Promise.all(promises).then(() => {
            return this.check();
          }).then(() => {
            return this.update(delta);
          }, (err) => {
            return err;
          });
        } else {
          this.q.enqueue(function() {
            this.update();
          }.bind(this));
          checking.resolve(false);
          return checking.promise;
        }
      }
      trim() {
        var task = new _core.defer();
        var displayed = this.views.displayed();
        var first = displayed[0];
        var last = displayed[displayed.length - 1];
        var firstIndex = this.views.indexOf(first);
        var lastIndex = this.views.indexOf(last);
        var above = this.views.slice(0, firstIndex);
        var below = this.views.slice(lastIndex + 1);
        for (var i = 0; i < above.length - 1; i++) {
          this.erase(above[i], above);
        }
        for (var j = 1; j < below.length; j++) {
          this.erase(below[j]);
        }
        task.resolve();
        return task.promise;
      }
      erase(view, above) {
        var prevTop;
        var prevLeft;
        if (!this.settings.fullsize) {
          prevTop = this.container.scrollTop;
          prevLeft = this.container.scrollLeft;
        } else {
          prevTop = window.scrollY;
          prevLeft = window.scrollX;
        }
        var bounds = view.bounds();
        this.views.remove(view);
        if (above) {
          if (this.settings.axis === "vertical") {
            this.scrollTo(0, prevTop - bounds.height, true);
          } else {
            if (this.settings.direction === "rtl") {
              if (!this.settings.fullsize) {
                this.scrollTo(prevLeft, 0, true);
              } else {
                this.scrollTo(prevLeft + Math.floor(bounds.width), 0, true);
              }
            } else {
              this.scrollTo(prevLeft - Math.floor(bounds.width), 0, true);
            }
          }
        }
      }
      addEventListeners(stage) {
        window.addEventListener("unload", function(e) {
          this.ignore = true;
          this.destroy();
        }.bind(this));
        this.addScrollListeners();
        if (this.isPaginated && this.settings.snap) {
          this.snapper = new _snap.default(this, this.settings.snap && typeof this.settings.snap === "object" && this.settings.snap);
        }
      }
      addScrollListeners() {
        var scroller;
        this.tick = _core.requestAnimationFrame;
        let dir = this.settings.direction === "rtl" && this.settings.rtlScrollType === "default" ? -1 : 1;
        this.scrollDeltaVert = 0;
        this.scrollDeltaHorz = 0;
        if (!this.settings.fullsize) {
          scroller = this.container;
          this.scrollTop = this.container.scrollTop;
          this.scrollLeft = this.container.scrollLeft;
        } else {
          scroller = window;
          this.scrollTop = window.scrollY * dir;
          this.scrollLeft = window.scrollX * dir;
        }
        this._onScroll = this.onScroll.bind(this);
        scroller.addEventListener("scroll", this._onScroll);
        this._scrolled = (0, _debounce.default)(this.scrolled.bind(this), 30);
        this.didScroll = false;
      }
      removeEventListeners() {
        var scroller;
        if (!this.settings.fullsize) {
          scroller = this.container;
        } else {
          scroller = window;
        }
        scroller.removeEventListener("scroll", this._onScroll);
        this._onScroll = void 0;
      }
      onScroll() {
        let scrollTop;
        let scrollLeft;
        let dir = this.settings.direction === "rtl" && this.settings.rtlScrollType === "default" ? -1 : 1;
        if (!this.settings.fullsize) {
          scrollTop = this.container.scrollTop;
          scrollLeft = this.container.scrollLeft;
        } else {
          scrollTop = window.scrollY * dir;
          scrollLeft = window.scrollX * dir;
        }
        this.scrollTop = scrollTop;
        this.scrollLeft = scrollLeft;
        if (!this.ignore) {
          this._scrolled();
        } else {
          this.ignore = false;
        }
        this.scrollDeltaVert += Math.abs(scrollTop - this.prevScrollTop);
        this.scrollDeltaHorz += Math.abs(scrollLeft - this.prevScrollLeft);
        this.prevScrollTop = scrollTop;
        this.prevScrollLeft = scrollLeft;
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(function() {
          this.scrollDeltaVert = 0;
          this.scrollDeltaHorz = 0;
        }.bind(this), 150);
        clearTimeout(this.afterScrolled);
        this.didScroll = false;
      }
      scrolled() {
        this.q.enqueue(function() {
          return this.check();
        }.bind(this));
        this.emit(_constants.EVENTS.MANAGERS.SCROLL, {
          top: this.scrollTop,
          left: this.scrollLeft
        });
        clearTimeout(this.afterScrolled);
        this.afterScrolled = setTimeout(function() {
          if (this.snapper && this.snapper.supportsTouch && this.snapper.needsSnap()) {
            return;
          }
          this.emit(_constants.EVENTS.MANAGERS.SCROLLED, {
            top: this.scrollTop,
            left: this.scrollLeft
          });
        }.bind(this), this.settings.afterScrolledTimeout);
      }
      next() {
        let delta = this.layout.props.name === "pre-paginated" && this.layout.props.spread ? this.layout.props.delta * 2 : this.layout.props.delta;
        if (!this.views.length) return;
        if (this.isPaginated && this.settings.axis === "horizontal") {
          this.scrollBy(delta, 0, true);
        } else {
          this.scrollBy(0, this.layout.height, true);
        }
        this.q.enqueue(function() {
          return this.check();
        }.bind(this));
      }
      prev() {
        let delta = this.layout.props.name === "pre-paginated" && this.layout.props.spread ? this.layout.props.delta * 2 : this.layout.props.delta;
        if (!this.views.length) return;
        if (this.isPaginated && this.settings.axis === "horizontal") {
          this.scrollBy(-delta, 0, true);
        } else {
          this.scrollBy(0, -this.layout.height, true);
        }
        this.q.enqueue(function() {
          return this.check();
        }.bind(this));
      }
      updateFlow(flow) {
        if (this.rendered && this.snapper) {
          this.snapper.destroy();
          this.snapper = void 0;
        }
        super.updateFlow(flow, "scroll");
        if (this.rendered && this.isPaginated && this.settings.snap) {
          this.snapper = new _snap.default(this, this.settings.snap && typeof this.settings.snap === "object" && this.settings.snap);
        }
      }
      destroy() {
        super.destroy();
        if (this.snapper) {
          this.snapper.destroy();
        }
      }
    };
    var _default = ContinuousViewManager;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/rendition.js
var require_rendition = __commonJS({
  "../../node_modules/epubjs/lib/rendition.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _eventEmitter = _interopRequireDefault(require_event_emitter());
    var _core = require_core();
    var _hook = _interopRequireDefault(require_hook());
    var _epubcfi = _interopRequireDefault(require_epubcfi());
    var _queue = _interopRequireDefault(require_queue());
    var _layout = _interopRequireDefault(require_layout());
    var _themes = _interopRequireDefault(require_themes());
    var _contents = _interopRequireDefault(require_contents());
    var _annotations = _interopRequireDefault(require_annotations());
    var _constants = require_constants();
    var _iframe = _interopRequireDefault(require_iframe());
    var _index = _interopRequireDefault(require_default());
    var _index2 = _interopRequireDefault(require_continuous());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var Rendition = class {
      constructor(book, options) {
        this.settings = (0, _core.extend)(this.settings || {}, {
          width: null,
          height: null,
          ignoreClass: "",
          manager: "default",
          view: "iframe",
          flow: null,
          layout: null,
          spread: null,
          minSpreadWidth: 800,
          stylesheet: null,
          resizeOnOrientationChange: true,
          script: null,
          snap: false,
          defaultDirection: "ltr",
          allowScriptedContent: false,
          allowPopups: false
        });
        (0, _core.extend)(this.settings, options);
        if (typeof this.settings.manager === "object") {
          this.manager = this.settings.manager;
        }
        this.book = book;
        this.hooks = {};
        this.hooks.display = new _hook.default(this);
        this.hooks.serialize = new _hook.default(this);
        this.hooks.content = new _hook.default(this);
        this.hooks.unloaded = new _hook.default(this);
        this.hooks.layout = new _hook.default(this);
        this.hooks.render = new _hook.default(this);
        this.hooks.show = new _hook.default(this);
        this.hooks.content.register(this.handleLinks.bind(this));
        this.hooks.content.register(this.passEvents.bind(this));
        this.hooks.content.register(this.adjustImages.bind(this));
        this.book.spine.hooks.content.register(this.injectIdentifier.bind(this));
        if (this.settings.stylesheet) {
          this.book.spine.hooks.content.register(this.injectStylesheet.bind(this));
        }
        if (this.settings.script) {
          this.book.spine.hooks.content.register(this.injectScript.bind(this));
        }
        this.themes = new _themes.default(this);
        this.annotations = new _annotations.default(this);
        this.epubcfi = new _epubcfi.default();
        this.q = new _queue.default(this);
        this.location = void 0;
        this.q.enqueue(this.book.opened);
        this.starting = new _core.defer();
        this.started = this.starting.promise;
        this.q.enqueue(this.start);
      }
      /**
       * Set the manager function
       * @param {function} manager
       */
      setManager(manager) {
        this.manager = manager;
      }
      /**
       * Require the manager from passed string, or as a class function
       * @param  {string|object} manager [description]
       * @return {method}
       */
      requireManager(manager) {
        var viewManager;
        if (typeof manager === "string" && manager === "default") {
          viewManager = _index.default;
        } else if (typeof manager === "string" && manager === "continuous") {
          viewManager = _index2.default;
        } else {
          viewManager = manager;
        }
        return viewManager;
      }
      /**
       * Require the view from passed string, or as a class function
       * @param  {string|object} view
       * @return {view}
       */
      requireView(view) {
        var View;
        if (typeof view == "string" && view === "iframe") {
          View = _iframe.default;
        } else {
          View = view;
        }
        return View;
      }
      /**
       * Start the rendering
       * @return {Promise} rendering has started
       */
      start() {
        if (!this.settings.layout && (this.book.package.metadata.layout === "pre-paginated" || this.book.displayOptions.fixedLayout === "true")) {
          this.settings.layout = "pre-paginated";
        }
        switch (this.book.package.metadata.spread) {
          case "none":
            this.settings.spread = "none";
            break;
          case "both":
            this.settings.spread = true;
            break;
        }
        if (!this.manager) {
          this.ViewManager = this.requireManager(this.settings.manager);
          this.View = this.requireView(this.settings.view);
          this.manager = new this.ViewManager({
            view: this.View,
            queue: this.q,
            request: this.book.load.bind(this.book),
            settings: this.settings
          });
        }
        this.direction(this.book.package.metadata.direction || this.settings.defaultDirection);
        this.settings.globalLayoutProperties = this.determineLayoutProperties(this.book.package.metadata);
        this.flow(this.settings.globalLayoutProperties.flow);
        this.layout(this.settings.globalLayoutProperties);
        this.manager.on(_constants.EVENTS.MANAGERS.ADDED, this.afterDisplayed.bind(this));
        this.manager.on(_constants.EVENTS.MANAGERS.REMOVED, this.afterRemoved.bind(this));
        this.manager.on(_constants.EVENTS.MANAGERS.RESIZED, this.onResized.bind(this));
        this.manager.on(_constants.EVENTS.MANAGERS.ORIENTATION_CHANGE, this.onOrientationChange.bind(this));
        this.manager.on(_constants.EVENTS.MANAGERS.SCROLLED, this.reportLocation.bind(this));
        this.emit(_constants.EVENTS.RENDITION.STARTED);
        this.starting.resolve();
      }
      /**
       * Call to attach the container to an element in the dom
       * Container must be attached before rendering can begin
       * @param  {element} element to attach to
       * @return {Promise}
       */
      attachTo(element) {
        return this.q.enqueue(function() {
          this.manager.render(element, {
            "width": this.settings.width,
            "height": this.settings.height
          });
          this.emit(_constants.EVENTS.RENDITION.ATTACHED);
        }.bind(this));
      }
      /**
       * Display a point in the book
       * The request will be added to the rendering Queue,
       * so it will wait until book is opened, rendering started
       * and all other rendering tasks have finished to be called.
       * @param  {string} target Url or EpubCFI
       * @return {Promise}
       */
      display(target) {
        if (this.displaying) {
          this.displaying.resolve();
        }
        return this.q.enqueue(this._display, target);
      }
      /**
       * Tells the manager what to display immediately
       * @private
       * @param  {string} target Url or EpubCFI
       * @return {Promise}
       */
      _display(target) {
        if (!this.book) {
          return;
        }
        var isCfiString = this.epubcfi.isCfiString(target);
        var displaying = new _core.defer();
        var displayed = displaying.promise;
        var section;
        var moveTo;
        this.displaying = displaying;
        if (this.book.locations.length() && (0, _core.isFloat)(target)) {
          target = this.book.locations.cfiFromPercentage(parseFloat(target));
        }
        section = this.book.spine.get(target);
        if (!section) {
          displaying.reject(new Error("No Section Found"));
          return displayed;
        }
        this.manager.display(section, target).then(() => {
          displaying.resolve(section);
          this.displaying = void 0;
          this.emit(_constants.EVENTS.RENDITION.DISPLAYED, section);
          this.reportLocation();
        }, (err) => {
          this.emit(_constants.EVENTS.RENDITION.DISPLAY_ERROR, err);
        });
        return displayed;
      }
      /*
      render(view, show) {
      		// view.onLayout = this.layout.format.bind(this.layout);
      	view.create();
      		// Fit to size of the container, apply padding
      	this.manager.resizeView(view);
      		// Render Chain
      	return view.section.render(this.book.request)
      		.then(function(contents){
      			return view.load(contents);
      		}.bind(this))
      		.then(function(doc){
      			return this.hooks.content.trigger(view, this);
      		}.bind(this))
      		.then(function(){
      			this.layout.format(view.contents);
      			return this.hooks.layout.trigger(view, this);
      		}.bind(this))
      		.then(function(){
      			return view.display();
      		}.bind(this))
      		.then(function(){
      			return this.hooks.render.trigger(view, this);
      		}.bind(this))
      		.then(function(){
      			if(show !== false) {
      				this.q.enqueue(function(view){
      					view.show();
      				}, view);
      			}
      			// this.map = new Map(view, this.layout);
      			this.hooks.show.trigger(view, this);
      			this.trigger("rendered", view.section);
      			}.bind(this))
      		.catch(function(e){
      			this.trigger("loaderror", e);
      		}.bind(this));
      	}
      */
      /**
       * Report what section has been displayed
       * @private
       * @param  {*} view
       */
      afterDisplayed(view) {
        view.on(_constants.EVENTS.VIEWS.MARK_CLICKED, (cfiRange, data) => this.triggerMarkEvent(cfiRange, data, view.contents));
        this.hooks.render.trigger(view, this).then(() => {
          if (view.contents) {
            this.hooks.content.trigger(view.contents, this).then(() => {
              this.emit(_constants.EVENTS.RENDITION.RENDERED, view.section, view);
            });
          } else {
            this.emit(_constants.EVENTS.RENDITION.RENDERED, view.section, view);
          }
        });
      }
      /**
       * Report what has been removed
       * @private
       * @param  {*} view
       */
      afterRemoved(view) {
        this.hooks.unloaded.trigger(view, this).then(() => {
          this.emit(_constants.EVENTS.RENDITION.REMOVED, view.section, view);
        });
      }
      /**
       * Report resize events and display the last seen location
       * @private
       */
      onResized(size, epubcfi) {
        this.emit(_constants.EVENTS.RENDITION.RESIZED, {
          width: size.width,
          height: size.height
        }, epubcfi);
        if (this.location && this.location.start) {
          this.display(epubcfi || this.location.start.cfi);
        }
      }
      /**
       * Report orientation events and display the last seen location
       * @private
       */
      onOrientationChange(orientation) {
        this.emit(_constants.EVENTS.RENDITION.ORIENTATION_CHANGE, orientation);
      }
      /**
       * Move the Rendition to a specific offset
       * Usually you would be better off calling display()
       * @param {object} offset
       */
      moveTo(offset) {
        this.manager.moveTo(offset);
      }
      /**
       * Trigger a resize of the views
       * @param {number} [width]
       * @param {number} [height]
       * @param {string} [epubcfi] (optional)
       */
      resize(width, height, epubcfi) {
        if (width) {
          this.settings.width = width;
        }
        if (height) {
          this.settings.height = height;
        }
        this.manager.resize(width, height, epubcfi);
      }
      /**
       * Clear all rendered views
       */
      clear() {
        this.manager.clear();
      }
      /**
       * Go to the next "page" in the rendition
       * @return {Promise}
       */
      next() {
        return this.q.enqueue(this.manager.next.bind(this.manager)).then(this.reportLocation.bind(this));
      }
      /**
       * Go to the previous "page" in the rendition
       * @return {Promise}
       */
      prev() {
        return this.q.enqueue(this.manager.prev.bind(this.manager)).then(this.reportLocation.bind(this));
      }
      //-- http://www.idpf.org/epub/301/spec/epub-publications.html#meta-properties-rendering
      /**
       * Determine the Layout properties from metadata and settings
       * @private
       * @param  {object} metadata
       * @return {object} properties
       */
      determineLayoutProperties(metadata) {
        var properties;
        var layout = this.settings.layout || metadata.layout || "reflowable";
        var spread = this.settings.spread || metadata.spread || "auto";
        var orientation = this.settings.orientation || metadata.orientation || "auto";
        var flow = this.settings.flow || metadata.flow || "auto";
        var viewport = metadata.viewport || "";
        var minSpreadWidth = this.settings.minSpreadWidth || metadata.minSpreadWidth || 800;
        var direction = this.settings.direction || metadata.direction || "ltr";
        if ((this.settings.width === 0 || this.settings.width > 0) && (this.settings.height === 0 || this.settings.height > 0)) {
        }
        properties = {
          layout,
          spread,
          orientation,
          flow,
          viewport,
          minSpreadWidth,
          direction
        };
        return properties;
      }
      /**
       * Adjust the flow of the rendition to paginated or scrolled
       * (scrolled-continuous vs scrolled-doc are handled by different view managers)
       * @param  {string} flow
       */
      flow(flow) {
        var _flow = flow;
        if (flow === "scrolled" || flow === "scrolled-doc" || flow === "scrolled-continuous") {
          _flow = "scrolled";
        }
        if (flow === "auto" || flow === "paginated") {
          _flow = "paginated";
        }
        this.settings.flow = flow;
        if (this._layout) {
          this._layout.flow(_flow);
        }
        if (this.manager && this._layout) {
          this.manager.applyLayout(this._layout);
        }
        if (this.manager) {
          this.manager.updateFlow(_flow);
        }
        if (this.manager && this.manager.isRendered() && this.location) {
          this.manager.clear();
          this.display(this.location.start.cfi);
        }
      }
      /**
       * Adjust the layout of the rendition to reflowable or pre-paginated
       * @param  {object} settings
       */
      layout(settings) {
        if (settings) {
          this._layout = new _layout.default(settings);
          this._layout.spread(settings.spread, this.settings.minSpreadWidth);
          this._layout.on(_constants.EVENTS.LAYOUT.UPDATED, (props, changed) => {
            this.emit(_constants.EVENTS.RENDITION.LAYOUT, props, changed);
          });
        }
        if (this.manager && this._layout) {
          this.manager.applyLayout(this._layout);
        }
        return this._layout;
      }
      /**
       * Adjust if the rendition uses spreads
       * @param  {string} spread none | auto (TODO: implement landscape, portrait, both)
       * @param  {int} [min] min width to use spreads at
       */
      spread(spread, min) {
        this.settings.spread = spread;
        if (min) {
          this.settings.minSpreadWidth = min;
        }
        if (this._layout) {
          this._layout.spread(spread, min);
        }
        if (this.manager && this.manager.isRendered()) {
          this.manager.updateLayout();
        }
      }
      /**
       * Adjust the direction of the rendition
       * @param  {string} dir
       */
      direction(dir) {
        this.settings.direction = dir || "ltr";
        if (this.manager) {
          this.manager.direction(this.settings.direction);
        }
        if (this.manager && this.manager.isRendered() && this.location) {
          this.manager.clear();
          this.display(this.location.start.cfi);
        }
      }
      /**
       * Report the current location
       * @fires relocated
       * @fires locationChanged
       */
      reportLocation() {
        return this.q.enqueue(function reportedLocation() {
          requestAnimationFrame(function reportedLocationAfterRAF() {
            var location = this.manager.currentLocation();
            if (location && location.then && typeof location.then === "function") {
              location.then(function(result) {
                let located = this.located(result);
                if (!located || !located.start || !located.end) {
                  return;
                }
                this.location = located;
                this.emit(_constants.EVENTS.RENDITION.LOCATION_CHANGED, {
                  index: this.location.start.index,
                  href: this.location.start.href,
                  start: this.location.start.cfi,
                  end: this.location.end.cfi,
                  percentage: this.location.start.percentage
                });
                this.emit(_constants.EVENTS.RENDITION.RELOCATED, this.location);
              }.bind(this));
            } else if (location) {
              let located = this.located(location);
              if (!located || !located.start || !located.end) {
                return;
              }
              this.location = located;
              this.emit(_constants.EVENTS.RENDITION.LOCATION_CHANGED, {
                index: this.location.start.index,
                href: this.location.start.href,
                start: this.location.start.cfi,
                end: this.location.end.cfi,
                percentage: this.location.start.percentage
              });
              this.emit(_constants.EVENTS.RENDITION.RELOCATED, this.location);
            }
          }.bind(this));
        }.bind(this));
      }
      /**
       * Get the Current Location object
       * @return {displayedLocation | promise} location (may be a promise)
       */
      currentLocation() {
        var location = this.manager.currentLocation();
        if (location && location.then && typeof location.then === "function") {
          location.then(function(result) {
            let located = this.located(result);
            return located;
          }.bind(this));
        } else if (location) {
          let located = this.located(location);
          return located;
        }
      }
      /**
       * Creates a Rendition#locationRange from location
       * passed by the Manager
       * @returns {displayedLocation}
       * @private
       */
      located(location) {
        if (!location.length) {
          return {};
        }
        let start = location[0];
        let end = location[location.length - 1];
        let located = {
          start: {
            index: start.index,
            href: start.href,
            cfi: start.mapping.start,
            displayed: {
              page: start.pages[0] || 1,
              total: start.totalPages
            }
          },
          end: {
            index: end.index,
            href: end.href,
            cfi: end.mapping.end,
            displayed: {
              page: end.pages[end.pages.length - 1] || 1,
              total: end.totalPages
            }
          }
        };
        let locationStart = this.book.locations.locationFromCfi(start.mapping.start);
        let locationEnd = this.book.locations.locationFromCfi(end.mapping.end);
        if (locationStart != null) {
          located.start.location = locationStart;
          located.start.percentage = this.book.locations.percentageFromLocation(locationStart);
        }
        if (locationEnd != null) {
          located.end.location = locationEnd;
          located.end.percentage = this.book.locations.percentageFromLocation(locationEnd);
        }
        let pageStart = this.book.pageList.pageFromCfi(start.mapping.start);
        let pageEnd = this.book.pageList.pageFromCfi(end.mapping.end);
        if (pageStart != -1) {
          located.start.page = pageStart;
        }
        if (pageEnd != -1) {
          located.end.page = pageEnd;
        }
        if (end.index === this.book.spine.last().index && located.end.displayed.page >= located.end.displayed.total) {
          located.atEnd = true;
        }
        if (start.index === this.book.spine.first().index && located.start.displayed.page === 1) {
          located.atStart = true;
        }
        return located;
      }
      /**
       * Remove and Clean Up the Rendition
       */
      destroy() {
        this.manager && this.manager.destroy();
        this.book = void 0;
      }
      /**
       * Pass the events from a view's Contents
       * @private
       * @param  {Contents} view contents
       */
      passEvents(contents) {
        _constants.DOM_EVENTS.forEach((e) => {
          contents.on(e, (ev) => this.triggerViewEvent(ev, contents));
        });
        contents.on(_constants.EVENTS.CONTENTS.SELECTED, (e) => this.triggerSelectedEvent(e, contents));
      }
      /**
       * Emit events passed by a view
       * @private
       * @param  {event} e
       */
      triggerViewEvent(e, contents) {
        this.emit(e.type, e, contents);
      }
      /**
       * Emit a selection event's CFI Range passed from a a view
       * @private
       * @param  {string} cfirange
       */
      triggerSelectedEvent(cfirange, contents) {
        this.emit(_constants.EVENTS.RENDITION.SELECTED, cfirange, contents);
      }
      /**
       * Emit a markClicked event with the cfiRange and data from a mark
       * @private
       * @param  {EpubCFI} cfirange
       */
      triggerMarkEvent(cfiRange, data, contents) {
        this.emit(_constants.EVENTS.RENDITION.MARK_CLICKED, cfiRange, data, contents);
      }
      /**
       * Get a Range from a Visible CFI
       * @param  {string} cfi EpubCfi String
       * @param  {string} ignoreClass
       * @return {range}
       */
      getRange(cfi, ignoreClass) {
        var _cfi = new _epubcfi.default(cfi);
        var found = this.manager.visible().filter(function(view) {
          if (_cfi.spinePos === view.index) return true;
        });
        if (found.length) {
          return found[0].contents.range(_cfi, ignoreClass);
        }
      }
      /**
       * Hook to adjust images to fit in columns
       * @param  {Contents} contents
       * @private
       */
      adjustImages(contents) {
        if (this._layout.name === "pre-paginated") {
          return new Promise(function(resolve) {
            resolve();
          });
        }
        let computed = contents.window.getComputedStyle(contents.content, null);
        let height = (contents.content.offsetHeight - (parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom))) * 0.95;
        let horizontalPadding = parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight);
        contents.addStylesheetRules({
          "img": {
            "max-width": (this._layout.columnWidth ? this._layout.columnWidth - horizontalPadding + "px" : "100%") + "!important",
            "max-height": height + "px!important",
            "object-fit": "contain",
            "page-break-inside": "avoid",
            "break-inside": "avoid",
            "box-sizing": "border-box"
          },
          "svg": {
            "max-width": (this._layout.columnWidth ? this._layout.columnWidth - horizontalPadding + "px" : "100%") + "!important",
            "max-height": height + "px!important",
            "page-break-inside": "avoid",
            "break-inside": "avoid"
          }
        });
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            resolve();
          }, 1);
        });
      }
      /**
       * Get the Contents object of each rendered view
       * @returns {Contents[]}
       */
      getContents() {
        return this.manager ? this.manager.getContents() : [];
      }
      /**
       * Get the views member from the manager
       * @returns {Views}
       */
      views() {
        let views = this.manager ? this.manager.views : void 0;
        return views || [];
      }
      /**
       * Hook to handle link clicks in rendered content
       * @param  {Contents} contents
       * @private
       */
      handleLinks(contents) {
        if (contents) {
          contents.on(_constants.EVENTS.CONTENTS.LINK_CLICKED, (href) => {
            let relative = this.book.path.relative(href);
            this.display(relative);
          });
        }
      }
      /**
       * Hook to handle injecting stylesheet before
       * a Section is serialized
       * @param  {document} doc
       * @param  {Section} section
       * @private
       */
      injectStylesheet(doc, section) {
        let style = doc.createElement("link");
        style.setAttribute("type", "text/css");
        style.setAttribute("rel", "stylesheet");
        style.setAttribute("href", this.settings.stylesheet);
        doc.getElementsByTagName("head")[0].appendChild(style);
      }
      /**
       * Hook to handle injecting scripts before
       * a Section is serialized
       * @param  {document} doc
       * @param  {Section} section
       * @private
       */
      injectScript(doc, section) {
        let script = doc.createElement("script");
        script.setAttribute("type", "text/javascript");
        script.setAttribute("src", this.settings.script);
        script.textContent = " ";
        doc.getElementsByTagName("head")[0].appendChild(script);
      }
      /**
       * Hook to handle the document identifier before
       * a Section is serialized
       * @param  {document} doc
       * @param  {Section} section
       * @private
       */
      injectIdentifier(doc, section) {
        let ident = this.book.packaging.metadata.identifier;
        let meta = doc.createElement("meta");
        meta.setAttribute("name", "dc.relation.ispartof");
        if (ident) {
          meta.setAttribute("content", ident);
        }
        doc.getElementsByTagName("head")[0].appendChild(meta);
      }
    };
    (0, _eventEmitter.default)(Rendition.prototype);
    var _default = Rendition;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/container.js
var require_container = __commonJS({
  "../../node_modules/epubjs/lib/container.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _pathWebpack = _interopRequireDefault(require_path());
    var _core = require_core();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var Container = class {
      constructor(containerDocument) {
        this.packagePath = "";
        this.directory = "";
        this.encoding = "";
        if (containerDocument) {
          this.parse(containerDocument);
        }
      }
      /**
       * Parse the Container XML
       * @param  {document} containerDocument
       */
      parse(containerDocument) {
        var rootfile;
        if (!containerDocument) {
          throw new Error("Container File Not Found");
        }
        rootfile = (0, _core.qs)(containerDocument, "rootfile");
        if (!rootfile) {
          throw new Error("No RootFile Found");
        }
        this.packagePath = rootfile.getAttribute("full-path");
        this.directory = _pathWebpack.default.dirname(this.packagePath);
        this.encoding = containerDocument.xmlEncoding;
      }
      destroy() {
        this.packagePath = void 0;
        this.directory = void 0;
        this.encoding = void 0;
      }
    };
    var _default = Container;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/packaging.js
var require_packaging = __commonJS({
  "../../node_modules/epubjs/lib/packaging.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _core = require_core();
    var Packaging = class {
      constructor(packageDocument) {
        this.manifest = {};
        this.navPath = "";
        this.ncxPath = "";
        this.coverPath = "";
        this.spineNodeIndex = 0;
        this.spine = [];
        this.metadata = {};
        if (packageDocument) {
          this.parse(packageDocument);
        }
      }
      /**
       * Parse OPF XML
       * @param  {document} packageDocument OPF XML
       * @return {object} parsed package parts
       */
      parse(packageDocument) {
        var metadataNode, manifestNode, spineNode;
        if (!packageDocument) {
          throw new Error("Package File Not Found");
        }
        metadataNode = (0, _core.qs)(packageDocument, "metadata");
        if (!metadataNode) {
          throw new Error("No Metadata Found");
        }
        manifestNode = (0, _core.qs)(packageDocument, "manifest");
        if (!manifestNode) {
          throw new Error("No Manifest Found");
        }
        spineNode = (0, _core.qs)(packageDocument, "spine");
        if (!spineNode) {
          throw new Error("No Spine Found");
        }
        this.manifest = this.parseManifest(manifestNode);
        this.navPath = this.findNavPath(manifestNode);
        this.ncxPath = this.findNcxPath(manifestNode, spineNode);
        this.coverPath = this.findCoverPath(packageDocument);
        this.spineNodeIndex = (0, _core.indexOfElementNode)(spineNode);
        this.spine = this.parseSpine(spineNode, this.manifest);
        this.uniqueIdentifier = this.findUniqueIdentifier(packageDocument);
        this.metadata = this.parseMetadata(metadataNode);
        this.metadata.direction = spineNode.getAttribute("page-progression-direction");
        return {
          "metadata": this.metadata,
          "spine": this.spine,
          "manifest": this.manifest,
          "navPath": this.navPath,
          "ncxPath": this.ncxPath,
          "coverPath": this.coverPath,
          "spineNodeIndex": this.spineNodeIndex
        };
      }
      /**
       * Parse Metadata
       * @private
       * @param  {node} xml
       * @return {object} metadata
       */
      parseMetadata(xml) {
        var metadata = {};
        metadata.title = this.getElementText(xml, "title");
        metadata.creator = this.getElementText(xml, "creator");
        metadata.description = this.getElementText(xml, "description");
        metadata.pubdate = this.getElementText(xml, "date");
        metadata.publisher = this.getElementText(xml, "publisher");
        metadata.identifier = this.getElementText(xml, "identifier");
        metadata.language = this.getElementText(xml, "language");
        metadata.rights = this.getElementText(xml, "rights");
        metadata.modified_date = this.getPropertyText(xml, "dcterms:modified");
        metadata.layout = this.getPropertyText(xml, "rendition:layout");
        metadata.orientation = this.getPropertyText(xml, "rendition:orientation");
        metadata.flow = this.getPropertyText(xml, "rendition:flow");
        metadata.viewport = this.getPropertyText(xml, "rendition:viewport");
        metadata.media_active_class = this.getPropertyText(xml, "media:active-class");
        metadata.spread = this.getPropertyText(xml, "rendition:spread");
        return metadata;
      }
      /**
       * Parse Manifest
       * @private
       * @param  {node} manifestXml
       * @return {object} manifest
       */
      parseManifest(manifestXml) {
        var manifest = {};
        var selected = (0, _core.qsa)(manifestXml, "item");
        var items = Array.prototype.slice.call(selected);
        items.forEach(function(item) {
          var id = item.getAttribute("id"), href = item.getAttribute("href") || "", type = item.getAttribute("media-type") || "", overlay = item.getAttribute("media-overlay") || "", properties = item.getAttribute("properties") || "";
          manifest[id] = {
            "href": href,
            // "url" : href,
            "type": type,
            "overlay": overlay,
            "properties": properties.length ? properties.split(" ") : []
          };
        });
        return manifest;
      }
      /**
       * Parse Spine
       * @private
       * @param  {node} spineXml
       * @param  {Packaging.manifest} manifest
       * @return {object} spine
       */
      parseSpine(spineXml, manifest) {
        var spine = [];
        var selected = (0, _core.qsa)(spineXml, "itemref");
        var items = Array.prototype.slice.call(selected);
        items.forEach(function(item, index) {
          var idref = item.getAttribute("idref");
          var props = item.getAttribute("properties") || "";
          var propArray = props.length ? props.split(" ") : [];
          var itemref = {
            "id": item.getAttribute("id"),
            "idref": idref,
            "linear": item.getAttribute("linear") || "yes",
            "properties": propArray,
            // "href" : manifest[Id].href,
            // "url" :  manifest[Id].url,
            "index": index
            // "cfiBase" : cfiBase
          };
          spine.push(itemref);
        });
        return spine;
      }
      /**
       * Find Unique Identifier
       * @private
       * @param  {node} packageXml
       * @return {string} Unique Identifier text
       */
      findUniqueIdentifier(packageXml) {
        var uniqueIdentifierId = packageXml.documentElement.getAttribute("unique-identifier");
        if (!uniqueIdentifierId) {
          return "";
        }
        var identifier = packageXml.getElementById(uniqueIdentifierId);
        if (!identifier) {
          return "";
        }
        if (identifier.localName === "identifier" && identifier.namespaceURI === "http://purl.org/dc/elements/1.1/") {
          return identifier.childNodes.length > 0 ? identifier.childNodes[0].nodeValue.trim() : "";
        }
        return "";
      }
      /**
       * Find TOC NAV
       * @private
       * @param {element} manifestNode
       * @return {string}
       */
      findNavPath(manifestNode) {
        var node = (0, _core.qsp)(manifestNode, "item", {
          "properties": "nav"
        });
        return node ? node.getAttribute("href") : false;
      }
      /**
       * Find TOC NCX
       * media-type="application/x-dtbncx+xml" href="toc.ncx"
       * @private
       * @param {element} manifestNode
       * @param {element} spineNode
       * @return {string}
       */
      findNcxPath(manifestNode, spineNode) {
        var node = (0, _core.qsp)(manifestNode, "item", {
          "media-type": "application/x-dtbncx+xml"
        });
        var tocId;
        if (!node) {
          tocId = spineNode.getAttribute("toc");
          if (tocId) {
            node = manifestNode.querySelector(`#${tocId}`);
          }
        }
        return node ? node.getAttribute("href") : false;
      }
      /**
       * Find the Cover Path
       * <item properties="cover-image" id="ci" href="cover.svg" media-type="image/svg+xml" />
       * Fallback for Epub 2.0
       * @private
       * @param  {node} packageXml
       * @return {string} href
       */
      findCoverPath(packageXml) {
        var pkg = (0, _core.qs)(packageXml, "package");
        var epubVersion = pkg.getAttribute("version");
        var node = (0, _core.qsp)(packageXml, "item", {
          "properties": "cover-image"
        });
        if (node) return node.getAttribute("href");
        var metaCover = (0, _core.qsp)(packageXml, "meta", {
          "name": "cover"
        });
        if (metaCover) {
          var coverId = metaCover.getAttribute("content");
          var cover = packageXml.getElementById(coverId);
          return cover ? cover.getAttribute("href") : "";
        } else {
          return false;
        }
      }
      /**
       * Get text of a namespaced element
       * @private
       * @param  {node} xml
       * @param  {string} tag
       * @return {string} text
       */
      getElementText(xml, tag) {
        var found = xml.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", tag);
        var el;
        if (!found || found.length === 0) return "";
        el = found[0];
        if (el.childNodes.length) {
          return el.childNodes[0].nodeValue;
        }
        return "";
      }
      /**
       * Get text by property
       * @private
       * @param  {node} xml
       * @param  {string} property
       * @return {string} text
       */
      getPropertyText(xml, property) {
        var el = (0, _core.qsp)(xml, "meta", {
          "property": property
        });
        if (el && el.childNodes.length) {
          return el.childNodes[0].nodeValue;
        }
        return "";
      }
      /**
       * Load JSON Manifest
       * @param  {document} packageDocument OPF XML
       * @return {object} parsed package parts
       */
      load(json) {
        this.metadata = json.metadata;
        let spine = json.readingOrder || json.spine;
        this.spine = spine.map((item, index) => {
          item.index = index;
          item.linear = item.linear || "yes";
          return item;
        });
        json.resources.forEach((item, index) => {
          this.manifest[index] = item;
          if (item.rel && item.rel[0] === "cover") {
            this.coverPath = item.href;
          }
        });
        this.spineNodeIndex = 0;
        this.toc = json.toc.map((item, index) => {
          item.label = item.title;
          return item;
        });
        return {
          "metadata": this.metadata,
          "spine": this.spine,
          "manifest": this.manifest,
          "navPath": this.navPath,
          "ncxPath": this.ncxPath,
          "coverPath": this.coverPath,
          "spineNodeIndex": this.spineNodeIndex,
          "toc": this.toc
        };
      }
      destroy() {
        this.manifest = void 0;
        this.navPath = void 0;
        this.ncxPath = void 0;
        this.coverPath = void 0;
        this.spineNodeIndex = void 0;
        this.spine = void 0;
        this.metadata = void 0;
      }
    };
    var _default = Packaging;
    exports2.default = _default;
  }
});

// ../../node_modules/epubjs/lib/navigation.js
var require_navigation = __commonJS({
  "../../node_modules/epubjs/lib/navigation.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.default = void 0;
    var _core = require_core();
    var Navigation = class {
      constructor(xml) {
        this.toc = [];
        this.tocByHref = {};
        this.tocById = {};
        this.landmarks = [];
        this.landmarksByType = {};
        this.length = 0;
        if (xml) {
          this.parse(xml);
        }
      }
      /**
       * Parse out the navigation items
       * @param {document} xml navigation html / xhtml / ncx
       */
      parse(xml) {
        let isXml = xml.nodeType;
        let html;
        let ncx;
        if (isXml) {
          html = (0, _core.qs)(xml, "html");
          ncx = (0, _core.qs)(xml, "ncx");
        }
        if (!isXml) {
          this.toc = this.load(xml);
        } else if (html) {
          this.toc = this.parseNav(xml);
          this.landmarks = this.parseLandmarks(xml);
        } else if (ncx) {
          this.toc = this.parseNcx(xml);
        }
        this.length = 0;
        this.unpack(this.toc);
      }
      /**
       * Unpack navigation items
       * @private
       * @param  {array} toc
       */
      unpack(toc) {
        var item;
        for (var i = 0; i < toc.length; i++) {
          item = toc[i];
          if (item.href) {
            this.tocByHref[item.href] = i;
          }
          if (item.id) {
            this.tocById[item.id] = i;
          }
          this.length++;
          if (item.subitems.length) {
            this.unpack(item.subitems);
          }
        }
      }
      /**
       * Get an item from the navigation
       * @param  {string} target
       * @return {object} navItem
       */
      get(target) {
        var index;
        if (!target) {
          return this.toc;
        }
        if (target.indexOf("#") === 0) {
          index = this.tocById[target.substring(1)];
        } else if (target in this.tocByHref) {
          index = this.tocByHref[target];
        }
        return this.getByIndex(target, index, this.toc);
      }
      /**
       * Get an item from navigation subitems recursively by index
       * @param  {string} target
       * @param  {number} index
       * @param  {array} navItems
       * @return {object} navItem
       */
      getByIndex(target, index, navItems) {
        if (navItems.length === 0) {
          return;
        }
        const item = navItems[index];
        if (item && (target === item.id || target === item.href)) {
          return item;
        } else {
          let result;
          for (let i = 0; i < navItems.length; ++i) {
            result = this.getByIndex(target, index, navItems[i].subitems);
            if (result) {
              break;
            }
          }
          return result;
        }
      }
      /**
       * Get a landmark by type
       * List of types: https://idpf.github.io/epub-vocabs/structure/
       * @param  {string} type
       * @return {object} landmarkItem
       */
      landmark(type) {
        var index;
        if (!type) {
          return this.landmarks;
        }
        index = this.landmarksByType[type];
        return this.landmarks[index];
      }
      /**
       * Parse toc from a Epub > 3.0 Nav
       * @private
       * @param  {document} navHtml
       * @return {array} navigation list
       */
      parseNav(navHtml) {
        var navElement = (0, _core.querySelectorByType)(navHtml, "nav", "toc");
        var list = [];
        if (!navElement) return list;
        let navList = (0, _core.filterChildren)(navElement, "ol", true);
        if (!navList) return list;
        list = this.parseNavList(navList);
        return list;
      }
      /**
       * Parses lists in the toc
       * @param  {document} navListHtml
       * @param  {string} parent id
       * @return {array} navigation list
       */
      parseNavList(navListHtml, parent2) {
        const result = [];
        if (!navListHtml) return result;
        if (!navListHtml.children) return result;
        for (let i = 0; i < navListHtml.children.length; i++) {
          const item = this.navItem(navListHtml.children[i], parent2);
          if (item) {
            result.push(item);
          }
        }
        return result;
      }
      /**
       * Create a navItem
       * @private
       * @param  {element} item
       * @return {object} navItem
       */
      navItem(item, parent2) {
        let id = item.getAttribute("id") || void 0;
        let content = (0, _core.filterChildren)(item, "a", true) || (0, _core.filterChildren)(item, "span", true);
        if (!content) {
          return;
        }
        let src = content.getAttribute("href") || "";
        if (!id) {
          id = src;
        }
        let text = content.textContent || "";
        let subitems = [];
        let nested = (0, _core.filterChildren)(item, "ol", true);
        if (nested) {
          subitems = this.parseNavList(nested, id);
        }
        return {
          "id": id,
          "href": src,
          "label": text,
          "subitems": subitems,
          "parent": parent2
        };
      }
      /**
       * Parse landmarks from a Epub > 3.0 Nav
       * @private
       * @param  {document} navHtml
       * @return {array} landmarks list
       */
      parseLandmarks(navHtml) {
        var navElement = (0, _core.querySelectorByType)(navHtml, "nav", "landmarks");
        var navItems = navElement ? (0, _core.qsa)(navElement, "li") : [];
        var length = navItems.length;
        var i;
        var list = [];
        var item;
        if (!navItems || length === 0) return list;
        for (i = 0; i < length; ++i) {
          item = this.landmarkItem(navItems[i]);
          if (item) {
            list.push(item);
            this.landmarksByType[item.type] = i;
          }
        }
        return list;
      }
      /**
       * Create a landmarkItem
       * @private
       * @param  {element} item
       * @return {object} landmarkItem
       */
      landmarkItem(item) {
        let content = (0, _core.filterChildren)(item, "a", true);
        if (!content) {
          return;
        }
        let type = content.getAttributeNS("http://www.idpf.org/2007/ops", "type") || void 0;
        let href = content.getAttribute("href") || "";
        let text = content.textContent || "";
        return {
          "href": href,
          "label": text,
          "type": type
        };
      }
      /**
       * Parse from a Epub > 3.0 NC
       * @private
       * @param  {document} navHtml
       * @return {array} navigation list
       */
      parseNcx(tocXml) {
        var navPoints = (0, _core.qsa)(tocXml, "navPoint");
        var length = navPoints.length;
        var i;
        var toc = {};
        var list = [];
        var item, parent2;
        if (!navPoints || length === 0) return list;
        for (i = 0; i < length; ++i) {
          item = this.ncxItem(navPoints[i]);
          toc[item.id] = item;
          if (!item.parent) {
            list.push(item);
          } else {
            parent2 = toc[item.parent];
            parent2.subitems.push(item);
          }
        }
        return list;
      }
      /**
       * Create a ncxItem
       * @private
       * @param  {element} item
       * @return {object} ncxItem
       */
      ncxItem(item) {
        var id = item.getAttribute("id") || false, content = (0, _core.qs)(item, "content"), src = content.getAttribute("src"), navLabel = (0, _core.qs)(item, "navLabel"), text = navLabel.textContent ? navLabel.textContent : "", subitems = [], parentNode = item.parentNode, parent2;
        if (parentNode && (parentNode.nodeName === "navPoint" || parentNode.nodeName.split(":").slice(-1)[0] === "navPoint")) {
          parent2 = parentNode.getAttribute("id");
        }
        return {
          "id": id,
          "href": src,
          "label": text,
          "subitems": subitems,
          "parent": parent2
        };
      }
      /**
       * Load Spine Items
       * @param  {object} json the items to be loaded
       * @return {Array} navItems
       */
      load(json) {
        return json.map((item) => {
          item.label = item.title;
          item.subitems = item.children ? this.load(item.children) : [];
          return item;
        });
      }
      /**
       * forEach pass through
       * @param  {Function} fn function to run on each item
       * @return {method} forEach loop
       */
      forEach(fn) {
        return this.toc.forEach(fn);
      }
    };
    var _default = Navigation;
    exports2.default = _default;
  }
});

// entry: the epub.js modules the tests load (see README.md)
module.exports = { replacements: require_replacements(), Rendition: require_rendition().default, Container: require_container().default, Packaging: require_packaging().default, Navigation: require_navigation().default, Layout: require_layout().default, Contents: require_contents().default };
