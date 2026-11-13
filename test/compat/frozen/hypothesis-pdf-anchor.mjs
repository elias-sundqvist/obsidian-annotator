// ../../submodules/hypothesis-client-annotator-fork/src/shared/warn-once.js
var shownWarnings = /* @__PURE__ */ new Set();
function warnOnce(...args) {
  const key = args.join();
  if (shownWarnings.has(key)) {
    return;
  }
  console.warn(...args);
  shownWarnings.add(key);
}
warnOnce.reset = () => {
  shownWarnings.clear();
};

// ../../submodules/hypothesis-client-annotator-fork/src/annotator/util/normalize.js
function advance(str, count, filter, startPos = 0) {
  let pos = startPos;
  while (pos < str.length && count > 0) {
    if (filter(str[pos])) {
      --count;
    }
    ++pos;
  }
  return pos;
}
function countChars(str, filter, startPos, endPos) {
  let count = 0;
  for (let pos = startPos; pos < endPos; pos++) {
    if (filter(str[pos])) {
      ++count;
    }
  }
  return count;
}
function translateOffsets(input, output, start, end, filter) {
  const beforeStartCount = countChars(input, filter, 0, start);
  const startToEndCount = countChars(input, filter, start, end);
  let outputStart = advance(output, beforeStartCount, filter);
  while (outputStart < output.length && !filter(output[outputStart])) {
    ++outputStart;
  }
  const outputEnd = advance(output, startToEndCount, filter, outputStart);
  return [outputStart, outputEnd];
}

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

// ../../submodules/hypothesis-client-annotator-fork/src/annotator/anchoring/placeholder.js
var placeholderSelector = ".annotator-placeholder";
function createPlaceholder(container) {
  let placeholder = container.querySelector(placeholderSelector);
  if (placeholder) {
    return placeholder;
  }
  placeholder = document.createElement("span");
  placeholder.classList.add("annotator-placeholder");
  placeholder.textContent = "Loading annotations...";
  container.appendChild(placeholder);
  return placeholder;
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

// ../../submodules/hypothesis-client-annotator-fork/src/annotator/anchoring/types.js
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

// ../../submodules/hypothesis-client-annotator-fork/src/annotator/anchoring/pdf.js
var RenderingStates = {
  INITIAL: 0,
  RUNNING: 1,
  PAUSED: 2,
  FINISHED: 3
};
var pageTextCache = /* @__PURE__ */ new Map();
var quotePositionCache = /* @__PURE__ */ new Map();
function quotePositionCacheKey(quote, pos) {
  return `${quote}:${pos}`;
}
function getSiblingIndex(node) {
  let index = 0;
  while (node.previousSibling) {
    ++index;
    node = node.previousSibling;
  }
  return index;
}
function getNodeTextLayer(node) {
  const el = "closest" in node ? node : node.parentElement;
  return el?.closest(".textLayer") ?? null;
}
function getPDFViewer() {
  return PDFViewerApplication.pdfViewer;
}
async function getPageView(pageIndex) {
  const pdfViewer = getPDFViewer();
  let pageView = pdfViewer.getPageView(pageIndex);
  if (!pageView || !pageView.pdfPage) {
    pageView = await new Promise((resolve) => {
      const onPagesLoaded = () => {
        if (pdfViewer.eventBus) {
          pdfViewer.eventBus.off("pagesloaded", onPagesLoaded);
        } else {
          document.removeEventListener("pagesloaded", onPagesLoaded);
        }
        resolve(pdfViewer.getPageView(pageIndex));
      };
      if (pdfViewer.eventBus) {
        pdfViewer.eventBus.on("pagesloaded", onPagesLoaded);
      } else {
        document.addEventListener("pagesloaded", onPagesLoaded);
      }
    });
  }
  return (
    /** @type {PDFPageView} */
    pageView
  );
}
async function documentHasText() {
  const viewer = getPDFViewer();
  let hasText = false;
  for (let i = 0; i < viewer.pagesCount; i++) {
    const pageText = await getPageTextContent(i);
    if (pageText.trim().length > 0) {
      hasText = true;
      break;
    }
  }
  return hasText;
}
function getPageTextContent(pageIndex) {
  const cachedText = pageTextCache.get(pageIndex);
  if (cachedText) {
    return cachedText;
  }
  const getPageText = async () => {
    const pageView = await getPageView(pageIndex);
    const textContent = await pageView.pdfPage.getTextContent({
      // Deprecated option, set for compatibility with older PDF.js releases.
      normalizeWhitespace: true
    });
    return textContent.items.map((it) => it.str).join("");
  };
  const pageText = getPageText();
  pageTextCache.set(pageIndex, pageText);
  return pageText;
}
async function getPageOffset(pageIndex) {
  const viewer = getPDFViewer();
  if (pageIndex >= viewer.pagesCount) {
    throw new Error("Invalid page index");
  }
  let offset = 0;
  for (let i = 0; i < pageIndex; i++) {
    const text = await getPageTextContent(i);
    offset += text.length;
  }
  return offset;
}
async function findPageByOffset(offset) {
  const viewer = getPDFViewer();
  let pageStartOffset = 0;
  let pageEndOffset = 0;
  let text = "";
  for (let i = 0; i < viewer.pagesCount; i++) {
    text = await getPageTextContent(i);
    pageStartOffset = pageEndOffset;
    pageEndOffset += text.length;
    if (pageEndOffset >= offset) {
      return { index: i, offset: pageStartOffset, text };
    }
  }
  return { index: viewer.pagesCount - 1, offset: pageStartOffset, text };
}
function isSpace(char) {
  switch (char) {
    case " ":
    case "\f":
    case "\n":
    case "\r":
    case "	":
    case "\v":
    case "\xA0":
      return true;
    default:
      return false;
  }
}
var isNotSpace = (char) => !isSpace(char);
async function anchorByPosition(pageIndex, start, end) {
  const [page, pageText] = await Promise.all([
    getPageView(pageIndex),
    getPageTextContent(pageIndex)
  ]);
  if (page.renderingState === RenderingStates.FINISHED && page.textLayer && page.textLayer.renderingDone) {
    const root = page.textLayer.textLayerDiv;
    const textLayerStr = (
      /** @type {string} */
      root.textContent
    );
    const [textLayerStart, textLayerEnd] = translateOffsets(
      pageText,
      textLayerStr,
      start,
      end,
      isNotSpace
    );
    const textLayerQuote = stripSpaces(
      textLayerStr.slice(textLayerStart, textLayerEnd)
    );
    const pageTextQuote = stripSpaces(pageText.slice(start, end));
    if (textLayerQuote !== pageTextQuote) {
      warnOnce(
        "Text layer text does not match page text. Highlights will be mis-aligned."
      );
    }
    const startPos = new TextPosition(root, textLayerStart);
    const endPos = new TextPosition(root, textLayerEnd);
    return new TextRange(startPos, endPos).toRange();
  }
  const placeholder = createPlaceholder(page.div);
  const range = document.createRange();
  range.setStartBefore(placeholder);
  range.setEndAfter(placeholder);
  return range;
}
function stripSpaces(str) {
  let stripped = "";
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (isSpace(char)) {
      continue;
    }
    stripped += char;
  }
  return stripped;
}
async function anchorQuote(quoteSelector, positionHint) {
  const pageCount = getPDFViewer().pagesCount;
  const pageIndexes = Array(pageCount).fill(0).map((_, i) => i);
  let expectedPageIndex;
  let expectedOffsetInPage;
  if (positionHint) {
    const { index, offset } = await findPageByOffset(positionHint);
    expectedPageIndex = index;
    expectedOffsetInPage = positionHint - offset;
    pageIndexes.sort((a, b) => {
      const distA = Math.abs(a - index);
      const distB = Math.abs(b - index);
      return distA - distB;
    });
  }
  const strippedPrefix = quoteSelector.prefix !== void 0 ? stripSpaces(quoteSelector.prefix) : void 0;
  const strippedSuffix = quoteSelector.suffix !== void 0 ? stripSpaces(quoteSelector.suffix) : void 0;
  const strippedQuote = stripSpaces(quoteSelector.exact);
  let bestMatch;
  for (let page of pageIndexes) {
    const text = await getPageTextContent(page);
    const strippedText = stripSpaces(text);
    let strippedHint;
    if (expectedPageIndex !== void 0 && expectedOffsetInPage !== void 0) {
      if (page < expectedPageIndex) {
        strippedHint = strippedText.length;
      } else if (page === expectedPageIndex) {
        [strippedHint] = translateOffsets(
          text,
          strippedText,
          expectedOffsetInPage,
          expectedOffsetInPage,
          isNotSpace
        );
      } else {
        strippedHint = 0;
      }
    }
    const match = matchQuote(strippedText, strippedQuote, {
      prefix: strippedPrefix,
      suffix: strippedSuffix,
      hint: strippedHint
    });
    if (!match) {
      continue;
    }
    if (!bestMatch || match.score > bestMatch.match.score) {
      const [start, end] = translateOffsets(
        strippedText,
        text,
        match.start,
        match.end,
        isNotSpace
      );
      bestMatch = {
        page,
        match: {
          start,
          end,
          score: match.score
        }
      };
      const exactQuoteMatch = strippedText.slice(match.start, match.end) === strippedQuote;
      const exactPrefixMatch = strippedPrefix !== void 0 && strippedText.slice(
        Math.max(0, match.start - strippedPrefix.length),
        match.start
      ) === strippedPrefix;
      const exactSuffixMatch = strippedSuffix !== void 0 && strippedText.slice(match.end, strippedSuffix.length) === strippedSuffix;
      const hasContext = strippedPrefix !== void 0 || strippedSuffix !== void 0;
      if (exactQuoteMatch && (exactPrefixMatch || exactSuffixMatch || !hasContext)) {
        break;
      }
    }
  }
  if (bestMatch) {
    const { page, match } = bestMatch;
    if (positionHint) {
      const cacheKey = quotePositionCacheKey(quoteSelector.exact, positionHint);
      quotePositionCache.set(cacheKey, {
        pageIndex: page,
        anchor: match
      });
    }
    return anchorByPosition(page, match.start, match.end);
  }
  throw new Error("Quote not found");
}
async function anchor(root, selectors) {
  const quote = (
    /** @type {TextQuoteSelector|undefined} */
    selectors.find((s) => s.type === "TextQuoteSelector")
  );
  if (!quote) {
    throw new Error("No quote selector found");
  }
  const position = (
    /** @type {TextPositionSelector|undefined} */
    selectors.find((s) => s.type === "TextPositionSelector")
  );
  if (position) {
    try {
      const { index, offset, text } = await findPageByOffset(position.start);
      const start = position.start - offset;
      const end = position.end - offset;
      const matchedText = text.substring(start, end);
      if (quote.exact !== matchedText) {
        throw new Error("quote mismatch");
      }
      const range = await anchorByPosition(index, start, end);
      return range;
    } catch {
    }
    try {
      const cacheKey = quotePositionCacheKey(quote.exact, position.start);
      const cachedPos = quotePositionCache.get(cacheKey);
      if (cachedPos) {
        const { pageIndex, anchor: anchor2 } = cachedPos;
        const range = await anchorByPosition(
          pageIndex,
          anchor2.start,
          anchor2.end
        );
        return range;
      }
    } catch {
    }
  }
  return anchorQuote(quote, position?.start);
}
function getTextLayerForRange(range) {
  try {
    range = TextRange.fromRange(range).toRange();
  } catch {
    throw new Error("Selection does not contain text");
  }
  const startTextLayer = getNodeTextLayer(range.startContainer);
  const endTextLayer = getNodeTextLayer(range.endContainer);
  if (!startTextLayer || !endTextLayer) {
    throw new Error("Selection is outside page text");
  }
  if (startTextLayer !== endTextLayer) {
    throw new Error("Selecting across page breaks is not supported");
  }
  return [range, startTextLayer];
}
function canDescribe(range) {
  try {
    getTextLayerForRange(range);
    return true;
  } catch {
    return false;
  }
}
async function describe(root, range) {
  const [textRange, textLayer] = getTextLayerForRange(range);
  const startPos = TextPosition.fromPoint(
    textRange.startContainer,
    textRange.startOffset
  ).relativeTo(textLayer);
  const endPos = TextPosition.fromPoint(
    textRange.endContainer,
    textRange.endOffset
  ).relativeTo(textLayer);
  const startPageIndex = getSiblingIndex(
    /** @type {Node} */
    textLayer.parentNode
  );
  const pageOffset = await getPageOffset(startPageIndex);
  const position = {
    type: "TextPositionSelector",
    start: pageOffset + startPos.offset,
    end: pageOffset + endPos.offset
  };
  const quote = TextQuoteAnchor.fromRange(root, textRange).toSelector();
  return [position, quote];
}
function purgeCache() {
  pageTextCache.clear();
  quotePositionCache.clear();
}
export {
  RenderingStates,
  anchor,
  canDescribe,
  describe,
  documentHasText,
  purgeCache
};
