// ../../submodules/hypothesis-client-annotator-fork/node_modules/approx-string-match/build/src/index.js
function reverse(s) {
  return s.split("").reverse().join("");
}
function findMatchStarts(text, pattern, matches) {
  const patRev = reverse(pattern);
  return matches.map((m) => {
    const minStart = Math.max(0, m.end - pattern.length - m.errors);
    const textRev = reverse(text.slice(minStart, m.end));
    const start = findMatchEnds(textRev, patRev, m.errors).reduce((min, rm) => {
      if (m.end - rm.end < min) {
        return m.end - rm.end;
      }
      return min;
    }, m.end);
    return {
      start,
      end: m.end,
      errors: m.errors
    };
  });
}
function oneIfNotZero(n) {
  return (n | -n) >> 31 & 1;
}
function advanceBlock(ctx, peq, b, hIn) {
  let pV = ctx.P[b];
  let mV = ctx.M[b];
  const hInIsNegative = hIn >>> 31;
  const eq = peq[b] | hInIsNegative;
  const xV = eq | mV;
  const xH = (eq & pV) + pV ^ pV | eq;
  let pH = mV | ~(xH | pV);
  let mH = pV & xH;
  const hOut = oneIfNotZero(pH & ctx.lastRowMask[b]) - oneIfNotZero(mH & ctx.lastRowMask[b]);
  pH <<= 1;
  mH <<= 1;
  mH |= hInIsNegative;
  pH |= oneIfNotZero(hIn) - hInIsNegative;
  pV = mH | ~(xV | pH);
  mV = pH & xV;
  ctx.P[b] = pV;
  ctx.M[b] = mV;
  return hOut;
}
function findMatchEnds(text, pattern, maxErrors) {
  if (pattern.length === 0) {
    return [];
  }
  maxErrors = Math.min(maxErrors, pattern.length);
  const matches = [];
  const w = 32;
  const bMax = Math.ceil(pattern.length / w) - 1;
  const ctx = {
    P: new Uint32Array(bMax + 1),
    M: new Uint32Array(bMax + 1),
    lastRowMask: new Uint32Array(bMax + 1)
  };
  ctx.lastRowMask.fill(1 << 31);
  ctx.lastRowMask[bMax] = 1 << (pattern.length - 1) % w;
  const emptyPeq = new Uint32Array(bMax + 1);
  const peq = /* @__PURE__ */ new Map();
  const asciiPeq = [];
  for (let i = 0; i < 256; i++) {
    asciiPeq.push(emptyPeq);
  }
  for (let c = 0; c < pattern.length; c += 1) {
    const val = pattern.charCodeAt(c);
    if (peq.has(val)) {
      continue;
    }
    const charPeq = new Uint32Array(bMax + 1);
    peq.set(val, charPeq);
    if (val < asciiPeq.length) {
      asciiPeq[val] = charPeq;
    }
    for (let b = 0; b <= bMax; b += 1) {
      charPeq[b] = 0;
      for (let r = 0; r < w; r += 1) {
        const idx = b * w + r;
        if (idx >= pattern.length) {
          continue;
        }
        const match = pattern.charCodeAt(idx) === val;
        if (match) {
          charPeq[b] |= 1 << r;
        }
      }
    }
  }
  let y = Math.max(0, Math.ceil(maxErrors / w) - 1);
  const score = new Uint32Array(bMax + 1);
  for (let b = 0; b <= y; b += 1) {
    score[b] = (b + 1) * w;
  }
  score[bMax] = pattern.length;
  for (let b = 0; b <= y; b += 1) {
    ctx.P[b] = ~0;
    ctx.M[b] = 0;
  }
  for (let j = 0; j < text.length; j += 1) {
    const charCode = text.charCodeAt(j);
    let charPeq;
    if (charCode < asciiPeq.length) {
      charPeq = asciiPeq[charCode];
    } else {
      charPeq = peq.get(charCode);
      if (typeof charPeq === "undefined") {
        charPeq = emptyPeq;
      }
    }
    let carry = 0;
    for (let b = 0; b <= y; b += 1) {
      carry = advanceBlock(ctx, charPeq, b, carry);
      score[b] += carry;
    }
    if (score[y] - carry <= maxErrors && y < bMax && (charPeq[y + 1] & 1 || carry < 0)) {
      y += 1;
      ctx.P[y] = ~0;
      ctx.M[y] = 0;
      let maxBlockScore;
      if (y === bMax) {
        const remainder = pattern.length % w;
        maxBlockScore = remainder === 0 ? w : remainder;
      } else {
        maxBlockScore = w;
      }
      score[y] = score[y - 1] + maxBlockScore - carry + advanceBlock(ctx, charPeq, y, carry);
    } else {
      while (y > 0 && score[y] >= maxErrors + w) {
        y -= 1;
      }
    }
    if (y === bMax && score[y] <= maxErrors) {
      if (score[y] < maxErrors) {
        matches.splice(0, matches.length);
      }
      matches.push({
        start: -1,
        end: j + 1,
        errors: score[y]
      });
      maxErrors = score[y];
    }
  }
  return matches;
}
function search(text, pattern, maxErrors) {
  const matches = findMatchEnds(text, pattern, maxErrors);
  return findMatchStarts(text, pattern, matches);
}

// ../../submodules/hypothesis-client-annotator-fork/src/annotator/anchoring/match-quote.js
function search2(text, str, maxErrors) {
  let matchPos = 0;
  let exactMatches = [];
  while (matchPos !== -1) {
    matchPos = text.indexOf(str, matchPos);
    if (matchPos !== -1) {
      exactMatches.push({
        start: matchPos,
        end: matchPos + str.length,
        errors: 0
      });
      matchPos += 1;
    }
  }
  if (exactMatches.length > 0) {
    return exactMatches;
  }
  return search(text, str, maxErrors);
}
function textMatchScore(text, str) {
  if (str.length === 0 || text.length === 0) {
    return 0;
  }
  const matches = search2(text, str, str.length);
  return 1 - matches[0].errors / str.length;
}
function matchQuote(text, quote, context = {}) {
  if (quote.length === 0) {
    return null;
  }
  const maxErrors = Math.min(256, quote.length / 2);
  const matches = search2(text, quote, maxErrors);
  if (matches.length === 0) {
    return null;
  }
  const scoreMatch = (match) => {
    const quoteWeight = 50;
    const prefixWeight = 20;
    const suffixWeight = 20;
    const posWeight = 2;
    const quoteScore = 1 - match.errors / quote.length;
    const prefixScore = context.prefix ? textMatchScore(
      text.slice(
        Math.max(0, match.start - context.prefix.length),
        match.start
      ),
      context.prefix
    ) : 1;
    const suffixScore = context.suffix ? textMatchScore(
      text.slice(match.end, match.end + context.suffix.length),
      context.suffix
    ) : 1;
    let posScore = 1;
    if (typeof context.hint === "number") {
      const offset = Math.abs(match.start - context.hint);
      posScore = 1 - offset / text.length;
    }
    const rawScore = quoteWeight * quoteScore + prefixWeight * prefixScore + suffixWeight * suffixScore + posWeight * posScore;
    const maxScore = quoteWeight + prefixWeight + suffixWeight + posWeight;
    const normalizedScore = rawScore / maxScore;
    return normalizedScore;
  };
  const scoredMatches = matches.map((m) => ({
    start: m.start,
    end: m.end,
    score: scoreMatch(m)
  }));
  scoredMatches.sort((a, b) => b.score - a.score);
  return scoredMatches[0];
}

// ../../submodules/hypothesis-client-annotator-fork/src/annotator/anchoring/text-range.js
function nodeTextLength(node) {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
    case Node.TEXT_NODE:
      return (
        /** @type {string} */
        node.textContent.length
      );
    default:
      return 0;
  }
}
function previousSiblingsTextLength(node) {
  let sibling = node.previousSibling;
  let length = 0;
  while (sibling) {
    length += nodeTextLength(sibling);
    sibling = sibling.previousSibling;
  }
  return length;
}
function resolveOffsets(element, ...offsets) {
  let nextOffset = offsets.shift();
  const nodeIter = (
    /** @type {Document} */
    element.ownerDocument.createNodeIterator(element, NodeFilter.SHOW_TEXT)
  );
  const results = [];
  let currentNode = nodeIter.nextNode();
  let textNode;
  let length = 0;
  while (nextOffset !== void 0 && currentNode) {
    textNode = /** @type {Text} */
    currentNode;
    if (length + textNode.data.length > nextOffset) {
      results.push({ node: textNode, offset: nextOffset - length });
      nextOffset = offsets.shift();
    } else {
      currentNode = nodeIter.nextNode();
      length += textNode.data.length;
    }
  }
  while (nextOffset !== void 0 && textNode && length === nextOffset) {
    results.push({ node: textNode, offset: textNode.data.length });
    nextOffset = offsets.shift();
  }
  if (nextOffset !== void 0) {
    throw new RangeError("Offset exceeds text length");
  }
  return results;
}
var RESOLVE_FORWARDS = 1;
var RESOLVE_BACKWARDS = 2;
var TextPosition = class _TextPosition {
  /**
   * Construct a `TextPosition` that refers to the text position `offset` within
   * the text content of `element`.
   *
   * @param {Element} element
   * @param {number} offset
   */
  constructor(element, offset) {
    if (offset < 0) {
      throw new Error("Offset is invalid");
    }
    this.element = element;
    this.offset = offset;
  }
  /**
   * Return a copy of this position with offset relative to a given ancestor
   * element.
   *
   * @param {Element} parent - Ancestor of `this.element`
   * @return {TextPosition}
   */
  relativeTo(parent) {
    if (!parent.contains(this.element)) {
      throw new Error("Parent is not an ancestor of current element");
    }
    let el = this.element;
    let offset = this.offset;
    while (el !== parent) {
      offset += previousSiblingsTextLength(el);
      el = /** @type {Element} */
      el.parentElement;
    }
    return new _TextPosition(el, offset);
  }
  /**
   * Resolve the position to a specific text node and offset within that node.
   *
   * Throws if `this.offset` exceeds the length of the element's text. In the
   * case where the element has no text and `this.offset` is 0, the `direction`
   * option determines what happens.
   *
   * Offsets at the boundary between two nodes are resolved to the start of the
   * node that begins at the boundary.
   *
   * @param {object} [options]
   *   @param {RESOLVE_FORWARDS|RESOLVE_BACKWARDS} [options.direction] -
   *     Specifies in which direction to search for the nearest text node if
   *     `this.offset` is `0` and `this.element` has no text. If not specified
   *     an error is thrown.
   * @return {{ node: Text, offset: number }}
   * @throws {RangeError}
   */
  resolve(options = {}) {
    try {
      return resolveOffsets(this.element, this.offset)[0];
    } catch (err) {
      if (this.offset === 0 && options.direction !== void 0) {
        const tw = document.createTreeWalker(
          this.element.getRootNode(),
          NodeFilter.SHOW_TEXT
        );
        tw.currentNode = this.element;
        const forwards = options.direction === RESOLVE_FORWARDS;
        const text = (
          /** @type {Text|null} */
          forwards ? tw.nextNode() : tw.previousNode()
        );
        if (!text) {
          throw err;
        }
        return { node: text, offset: forwards ? 0 : text.data.length };
      } else {
        throw err;
      }
    }
  }
  /**
   * Construct a `TextPosition` that refers to the `offset`th character within
   * `node`.
   *
   * @param {Node} node
   * @param {number} offset
   * @return {TextPosition}
   */
  static fromCharOffset(node, offset) {
    switch (node.nodeType) {
      case Node.TEXT_NODE:
        return _TextPosition.fromPoint(node, offset);
      case Node.ELEMENT_NODE:
        return new _TextPosition(
          /** @type {Element} */
          node,
          offset
        );
      default:
        throw new Error("Node is not an element or text node");
    }
  }
  /**
   * Construct a `TextPosition` representing the range start or end point (node, offset).
   *
   * @param {Node} node - Text or Element node
   * @param {number} offset - Offset within the node.
   * @return {TextPosition}
   */
  static fromPoint(node, offset) {
    switch (node.nodeType) {
      case Node.TEXT_NODE: {
        if (offset < 0 || offset > /** @type {Text} */
        node.data.length) {
          throw new Error("Text node offset is out of range");
        }
        if (!node.parentElement) {
          throw new Error("Text node has no parent");
        }
        const textOffset = previousSiblingsTextLength(node) + offset;
        return new _TextPosition(node.parentElement, textOffset);
      }
      case Node.ELEMENT_NODE: {
        if (offset < 0 || offset > node.childNodes.length) {
          throw new Error("Child node offset is out of range");
        }
        let textOffset = 0;
        for (let i = 0; i < offset; i++) {
          textOffset += nodeTextLength(node.childNodes[i]);
        }
        return new _TextPosition(
          /** @type {Element} */
          node,
          textOffset
        );
      }
      default:
        throw new Error("Point is not in an element or text node");
    }
  }
};
var TextRange = class _TextRange {
  /**
   * Construct an immutable `TextRange` from a `start` and `end` point.
   *
   * @param {TextPosition} start
   * @param {TextPosition} end
   */
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
  /**
   * Return a copy of this range with start and end positions relative to a
   * given ancestor. See `TextPosition.relativeTo`.
   *
   * @param {Element} element
   */
  relativeTo(element) {
    return new _TextRange(
      this.start.relativeTo(element),
      this.end.relativeTo(element)
    );
  }
  /**
   * Resolve the `TextRange` to a DOM range.
   *
   * The resulting DOM Range will always start and end in a `Text` node.
   * Hence `TextRange.fromRange(range).toRange()` can be used to "shrink" a
   * range to the text it contains.
   *
   * May throw if the `start` or `end` positions cannot be resolved to a range.
   *
   * @return {Range}
   */
  toRange() {
    let start;
    let end;
    if (this.start.element === this.end.element && this.start.offset <= this.end.offset) {
      [start, end] = resolveOffsets(
        this.start.element,
        this.start.offset,
        this.end.offset
      );
    } else {
      start = this.start.resolve({ direction: RESOLVE_FORWARDS });
      end = this.end.resolve({ direction: RESOLVE_BACKWARDS });
    }
    const range = new Range();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range;
  }
  /**
   * Convert an existing DOM `Range` to a `TextRange`
   *
   * @param {Range} range
   * @return {TextRange}
   */
  static fromRange(range) {
    const start = TextPosition.fromPoint(
      range.startContainer,
      range.startOffset
    );
    const end = TextPosition.fromPoint(range.endContainer, range.endOffset);
    return new _TextRange(start, end);
  }
  /**
   * Return a `TextRange` from the `start`th to `end`th characters in `root`.
   *
   * @param {Element} root
   * @param {number} start
   * @param {number} end
   */
  static fromOffsets(root, start, end) {
    return new _TextRange(
      new TextPosition(root, start),
      new TextPosition(root, end)
    );
  }
};

// ../../submodules/hypothesis-client-annotator-fork/src/annotator/anchoring/xpath.js
function getNodeName(node) {
  const nodeName = node.nodeName.toLowerCase();
  let result = nodeName;
  if (nodeName === "#text") {
    result = "text()";
  }
  return result;
}
function getNodePosition(node) {
  let pos = 0;
  let tmp = node;
  while (tmp) {
    if (tmp.nodeName === node.nodeName) {
      pos += 1;
    }
    tmp = tmp.previousSibling;
  }
  return pos;
}
function getPathSegment(node) {
  const name = getNodeName(node);
  const pos = getNodePosition(node);
  return `${name}[${pos}]`;
}
function xpathFromNode(node, root) {
  let xpath = "";
  let elem = node;
  while (elem !== root) {
    if (!elem) {
      throw new Error("Node is not a descendant of root");
    }
    xpath = getPathSegment(elem) + "/" + xpath;
    elem = elem.parentNode;
  }
  xpath = "/" + xpath;
  xpath = xpath.replace(/\/$/, "");
  return xpath;
}
function nthChildOfType(element, nodeName, index) {
  nodeName = nodeName.toUpperCase();
  let matchIndex = -1;
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i];
    if (child.nodeName.toUpperCase() === nodeName) {
      ++matchIndex;
      if (matchIndex === index) {
        return child;
      }
    }
  }
  return null;
}
function evaluateSimpleXPath(xpath, root) {
  const isSimpleXPath = xpath.match(/^(\/[A-Za-z0-9-]+(\[[0-9]+\])?)+$/) !== null;
  if (!isSimpleXPath) {
    throw new Error("Expression is not a simple XPath");
  }
  const segments = xpath.split("/");
  let element = root;
  segments.shift();
  for (let segment of segments) {
    let elementName;
    let elementIndex;
    const separatorPos = segment.indexOf("[");
    if (separatorPos !== -1) {
      elementName = segment.slice(0, separatorPos);
      const indexStr = segment.slice(separatorPos + 1, segment.indexOf("]"));
      elementIndex = parseInt(indexStr) - 1;
      if (elementIndex < 0) {
        return null;
      }
    } else {
      elementName = segment;
      elementIndex = 0;
    }
    const child = nthChildOfType(element, elementName, elementIndex);
    if (!child) {
      return null;
    }
    element = child;
  }
  return element;
}
function nodeFromXPath(xpath, root = document.body) {
  try {
    return evaluateSimpleXPath(xpath, root);
  } catch (err) {
    return document.evaluate(
      "." + xpath,
      root,
      // nb. The `namespaceResolver` and `result` arguments are optional in the spec
      // but required in Edge Legacy.
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
      /* result */
    ).singleNodeValue;
  }
}

// ../../submodules/hypothesis-client-annotator-fork/src/annotator/anchoring/types.js
var RangeAnchor = class _RangeAnchor {
  /**
   * @param {Node} root - A root element from which to anchor.
   * @param {Range} range -  A range describing the anchor.
   */
  constructor(root, range) {
    this.root = root;
    this.range = range;
  }
  /**
   * @param {Node} root -  A root element from which to anchor.
   * @param {Range} range -  A range describing the anchor.
   */
  static fromRange(root, range) {
    return new _RangeAnchor(root, range);
  }
  /**
   * Create an anchor from a serialized `RangeSelector` selector.
   *
   * @param {Element} root -  A root element from which to anchor.
   * @param {RangeSelector} selector
   */
  static fromSelector(root, selector) {
    const startContainer = nodeFromXPath(selector.startContainer, root);
    if (!startContainer) {
      throw new Error("Failed to resolve startContainer XPath");
    }
    const endContainer = nodeFromXPath(selector.endContainer, root);
    if (!endContainer) {
      throw new Error("Failed to resolve endContainer XPath");
    }
    const startPos = TextPosition.fromCharOffset(
      startContainer,
      selector.startOffset
    );
    const endPos = TextPosition.fromCharOffset(
      endContainer,
      selector.endOffset
    );
    const range = new TextRange(startPos, endPos).toRange();
    return new _RangeAnchor(root, range);
  }
  toRange() {
    return this.range;
  }
  /**
   * @return {RangeSelector}
   */
  toSelector() {
    const normalizedRange = TextRange.fromRange(this.range).toRange();
    const textRange = TextRange.fromRange(normalizedRange);
    const startContainer = xpathFromNode(textRange.start.element, this.root);
    const endContainer = xpathFromNode(textRange.end.element, this.root);
    return {
      type: "RangeSelector",
      startContainer,
      startOffset: textRange.start.offset,
      endContainer,
      endOffset: textRange.end.offset
    };
  }
};
var TextPositionAnchor = class _TextPositionAnchor {
  /**
   * @param {Element} root
   * @param {number} start
   * @param {number} end
   */
  constructor(root, start, end) {
    this.root = root;
    this.start = start;
    this.end = end;
  }
  /**
   * @param {Element} root
   * @param {Range} range
   */
  static fromRange(root, range) {
    const textRange = TextRange.fromRange(range).relativeTo(root);
    return new _TextPositionAnchor(
      root,
      textRange.start.offset,
      textRange.end.offset
    );
  }
  /**
   * @param {Element} root
   * @param {TextPositionSelector} selector
   */
  static fromSelector(root, selector) {
    return new _TextPositionAnchor(root, selector.start, selector.end);
  }
  /**
   * @return {TextPositionSelector}
   */
  toSelector() {
    return {
      type: "TextPositionSelector",
      start: this.start,
      end: this.end
    };
  }
  toRange() {
    return TextRange.fromOffsets(this.root, this.start, this.end).toRange();
  }
};
var TextQuoteAnchor = class _TextQuoteAnchor {
  /**
   * @param {Element} root - A root element from which to anchor.
   * @param {string} exact
   * @param {object} context
   *   @param {string} [context.prefix]
   *   @param {string} [context.suffix]
   */
  constructor(root, exact, context = {}) {
    this.root = root;
    this.exact = exact;
    this.context = context;
  }
  /**
   * Create a `TextQuoteAnchor` from a range.
   *
   * Will throw if `range` does not contain any text nodes.
   *
   * @param {Element} root
   * @param {Range} range
   */
  static fromRange(root, range) {
    const text = (
      /** @type {string} */
      root.textContent
    );
    const textRange = TextRange.fromRange(range).relativeTo(root);
    const start = textRange.start.offset;
    const end = textRange.end.offset;
    const contextLen = 32;
    return new _TextQuoteAnchor(root, text.slice(start, end), {
      prefix: text.slice(Math.max(0, start - contextLen), start),
      suffix: text.slice(end, Math.min(text.length, end + contextLen))
    });
  }
  /**
   * @param {Element} root
   * @param {TextQuoteSelector} selector
   */
  static fromSelector(root, selector) {
    const { prefix, suffix } = selector;
    return new _TextQuoteAnchor(root, selector.exact, { prefix, suffix });
  }
  /**
   * @return {TextQuoteSelector}
   */
  toSelector() {
    return {
      type: "TextQuoteSelector",
      exact: this.exact,
      prefix: this.context.prefix,
      suffix: this.context.suffix
    };
  }
  /**
   * @param {QuoteMatchOptions} [options]
   */
  toRange(options = {}) {
    return this.toPositionAnchor(options).toRange();
  }
  /**
   * @param {QuoteMatchOptions} [options]
   */
  toPositionAnchor(options = {}) {
    const text = (
      /** @type {string} */
      this.root.textContent
    );
    const match = matchQuote(text, this.exact, {
      ...this.context,
      hint: options.hint
    });
    if (!match) {
      throw new Error("Quote not found");
    }
    return new TextPositionAnchor(this.root, match.start, match.end);
  }
};

// ../../submodules/hypothesis-client-annotator-fork/src/annotator/anchoring/html.js
async function querySelector(anchor2, options = {}) {
  return anchor2.toRange(options);
}
function anchor(root, selectors, options = {}) {
  let position = (
    /** @type {TextPositionSelector|null} */
    null
  );
  let quote = (
    /** @type {TextQuoteSelector|null} */
    null
  );
  let range = (
    /** @type {RangeSelector|null} */
    null
  );
  for (let selector of selectors) {
    switch (selector.type) {
      case "TextPositionSelector":
        position = selector;
        options.hint = position.start;
        break;
      case "TextQuoteSelector":
        quote = selector;
        break;
      case "RangeSelector":
        range = selector;
        break;
    }
  }
  const maybeAssertQuote = (range2) => {
    if (quote?.exact && range2.toString() !== quote.exact) {
      throw new Error("quote mismatch");
    } else {
      return range2;
    }
  };
  let promise = Promise.reject("unable to anchor");
  if (range) {
    const range_ = range;
    promise = promise.catch(() => {
      let anchor2 = RangeAnchor.fromSelector(root, range_);
      return querySelector(anchor2, options).then(maybeAssertQuote);
    });
  }
  if (position) {
    const position_ = position;
    promise = promise.catch(() => {
      let anchor2 = TextPositionAnchor.fromSelector(root, position_);
      return querySelector(anchor2, options).then(maybeAssertQuote);
    });
  }
  if (quote) {
    const quote_ = quote;
    promise = promise.catch(() => {
      let anchor2 = TextQuoteAnchor.fromSelector(root, quote_);
      return querySelector(anchor2, options);
    });
  }
  return promise;
}
function describe(root, range) {
  const types = [RangeAnchor, TextPositionAnchor, TextQuoteAnchor];
  const result = [];
  for (let type of types) {
    try {
      const anchor2 = type.fromRange(root, range);
      result.push(anchor2.toSelector());
    } catch (error) {
      continue;
    }
  }
  return result;
}
export {
  anchor,
  describe
};
