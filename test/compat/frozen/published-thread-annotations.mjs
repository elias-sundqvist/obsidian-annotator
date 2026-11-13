// .generated/published-client/src/shared/has-own.js
function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

// .generated/published-client/src/sidebar/helpers/build-thread.js
var DEFAULT_THREAD_STATE = {
  collapsed: false,
  depth: 0,
  visible: true,
  replyCount: 0
};
function annotationId(annotation) {
  return annotation.id || annotation.$tag;
}
function hasPathToRoot(threads, id, ancestorId) {
  const ancestor = threads[ancestorId];
  if (!ancestor || ancestor.parent === id) {
    return false;
  } else if (!ancestor.parent) {
    return true;
  }
  return hasPathToRoot(threads, id, ancestor.parent);
}
function setParent(threads, id, parents = []) {
  if (threads[id].parent || !parents.length) {
    return;
  }
  const parentId = parents[parents.length - 1];
  if (!threads[parentId]) {
    threads[parentId] = {
      ...DEFAULT_THREAD_STATE,
      children: [],
      id: parentId
    };
    setParent(threads, parentId, parents.slice(0, -1));
  }
  if (hasPathToRoot(threads, id, parentId)) {
    threads[id].parent = parentId;
    threads[parentId].children.push(threads[id]);
  }
}
function threadAnnotations(annotations) {
  const threads = {};
  annotations.forEach((annotation) => {
    const id = annotationId(annotation);
    threads[id] = {
      ...DEFAULT_THREAD_STATE,
      children: [],
      annotation,
      id
    };
  });
  annotations.forEach((annotation) => {
    const parents = (annotation.references || []).filter(
      (id) => id !== annotation.id
    );
    return setParent(threads, annotationId(annotation), parents);
  });
  const rootThreads = [];
  for (const rootThreadId in threads) {
    if (!threads[rootThreadId].parent) {
      threads[rootThreadId].collapsed = true;
      rootThreads.push(threads[rootThreadId]);
    }
  }
  const rootThread = {
    ...DEFAULT_THREAD_STATE,
    id: "root",
    children: rootThreads
  };
  return rootThread;
}
function mapThread(thread, mapFn) {
  return Object.assign({}, mapFn(thread), {
    children: thread.children.map((child) => {
      return mapThread(child, mapFn);
    })
  });
}
function sortThread(thread, compareFn, replyCompareFn) {
  const children = thread.children.map(
    (child) => sortThread(child, replyCompareFn, replyCompareFn)
  );
  const sortedChildren = children.slice().sort(compareFn);
  return { ...thread, children: sortedChildren };
}
function countRepliesAndDepth(thread, depth) {
  const children = thread.children.map((c) => countRepliesAndDepth(c, depth + 1));
  const replyCount = children.reduce(
    (total, child) => total + 1 + child.replyCount,
    0
  );
  return {
    ...thread,
    children,
    depth,
    replyCount
  };
}
function hasVisibleChildren(thread) {
  return thread.children.some((child) => {
    return child.visible || hasVisibleChildren(child);
  });
}
var replySortCompareFn = (a, b) => {
  if (!a.annotation || !b.annotation) {
    return 0;
  }
  if (a.annotation.created < b.annotation.created) {
    return -1;
  } else if (a.annotation.created > b.annotation.created) {
    return 1;
  }
  return 0;
};
function buildThread(annotations, options) {
  const hasSelection = options.selected.length > 0;
  const hasForcedVisible = options.forcedVisible.length > 0;
  let thread = threadAnnotations(annotations);
  if (hasSelection) {
    thread.children = thread.children.filter((child) => {
      const isSelected = options.selected.includes(child.id);
      const isForcedVisible = hasForcedVisible && options.forcedVisible.includes(child.id);
      return isSelected || isForcedVisible;
    });
  }
  if (options.threadFilterFn) {
    thread.children = thread.children.filter(options.threadFilterFn);
  }
  thread.visible = false;
  thread = mapThread(thread, (thread2) => {
    let threadIsVisible = thread2.visible;
    if (options.filterFn) {
      if (hasForcedVisible && options.forcedVisible.includes(thread2.id)) {
        threadIsVisible = true;
      } else if (thread2.annotation) {
        threadIsVisible = !!options.filterFn(thread2.annotation);
      } else {
        threadIsVisible = false;
      }
    }
    return { ...thread2, visible: threadIsVisible };
  });
  thread.children = thread.children.filter(
    (child) => child.visible || hasVisibleChildren(child)
  );
  thread = mapThread(thread, (thread2) => {
    const threadStates = {
      collapsed: thread2.collapsed
    };
    if (hasOwn(options.expanded, thread2.id)) {
      threadStates.collapsed = !options.expanded[thread2.id];
    } else {
      const hasUnfilteredChildren = options.filterFn && hasVisibleChildren(thread2);
      threadStates.collapsed = thread2.collapsed && !hasUnfilteredChildren;
    }
    return { ...thread2, ...threadStates };
  });
  thread = sortThread(thread, options.sortCompareFn, replySortCompareFn);
  thread = countRepliesAndDepth(thread, -1);
  return thread;
}

// .generated/published-client/src/sidebar/util/memoize.js
function memoize(fn) {
  if (fn.length !== 1) {
    throw new Error("Memoize input must be a function of one argument");
  }
  let lastArg;
  let lastResult;
  return function(arg) {
    if (arg === lastArg) {
      return lastResult;
    }
    lastArg = arg;
    lastResult = fn(arg);
    return lastResult;
  };
}

// .generated/published-client/src/sidebar/util/search-filter.js
function splitTerm(term) {
  const filter = term.slice(0, term.indexOf(":"));
  if (!filter) {
    return [null, term];
  }
  if (["group", "quote", "since", "tag", "text", "uri", "user"].includes(filter)) {
    const data = term.slice(filter.length + 1);
    return [filter, data];
  } else {
    return [null, term];
  }
}
function tokenize(searchText) {
  if (!searchText) {
    return [];
  }
  const removeQuoteCharacter = (text) => {
    const start = text.slice(0, 1);
    const end = text.slice(-1);
    if ((start === '"' || start === "'") && start === end) {
      text = text.slice(1, text.length - 1);
    }
    return text;
  };
  let tokens = searchText.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  tokens = tokens.map(removeQuoteCharacter);
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const [filter, data] = splitTerm(token);
    if (filter) {
      tokens[index] = filter + ":" + removeQuoteCharacter(data);
    }
  }
  return tokens;
}
function generateFacetedFilter(searchText, focusFilters = {}) {
  let terms;
  const any = [];
  const quote2 = [];
  const since = [];
  const tag = [];
  const text = [];
  const uri = [];
  const user = focusFilters.user ? [focusFilters.user] : [];
  if (searchText) {
    terms = tokenize(searchText);
    for (const term of terms) {
      const filter = term.slice(0, term.indexOf(":"));
      const fieldValue = term.slice(filter.length + 1);
      switch (filter) {
        case "quote":
          quote2.push(fieldValue);
          break;
        case "since":
          {
            const time = term.slice(6).toLowerCase();
            const secondsPerDay = 24 * 60 * 60;
            const secondsPerUnit = {
              sec: 1,
              min: 60,
              hour: 60 * 60,
              day: secondsPerDay,
              week: 7 * secondsPerDay,
              month: 30 * secondsPerDay,
              year: 365 * secondsPerDay
            };
            const match = time.match(
              /^(\d+)(sec|min|hour|day|week|month|year)?$/
            );
            if (match) {
              const value = parseFloat(match[1]);
              const unit = (
                /** @type {keyof secondsPerUnit} */
                match[2] || "sec"
              );
              since.push(value * secondsPerUnit[unit]);
            }
          }
          break;
        case "tag":
          tag.push(fieldValue);
          break;
        case "text":
          text.push(fieldValue);
          break;
        case "uri":
          uri.push(fieldValue);
          break;
        case "user":
          user.push(fieldValue);
          break;
        default:
          any.push(term);
      }
    }
  }
  return {
    any: {
      terms: any,
      operator: "and"
    },
    quote: {
      terms: quote2,
      operator: "and"
    },
    since: {
      terms: since,
      operator: "and"
    },
    tag: {
      terms: tag,
      operator: "and"
    },
    text: {
      terms: text,
      operator: "and"
    },
    uri: {
      terms: uri,
      operator: "or"
    },
    user: {
      terms: user,
      operator: "or"
    }
  };
}

// .generated/published-client/src/sidebar/helpers/annotation-metadata.js
function isReply(annotation) {
  return (annotation.references || []).length > 0;
}
function hasSelector(annotation) {
  return !!(annotation.target && annotation.target.length > 0 && annotation.target[0].selector);
}
function isWaitingToAnchor(annotation) {
  return hasSelector(annotation) && typeof annotation.$orphan === "undefined" && !annotation.$anchorTimeout;
}
function isOrphan(annotation) {
  return hasSelector(annotation) && annotation.$orphan === true;
}
function isPageNote(annotation) {
  return !hasSelector(annotation) && !isReply(annotation);
}
function location(annotation) {
  if (annotation) {
    const targets = annotation.target || [];
    for (let i = 0; i < targets.length; i++) {
      const selectors = targets[i].selector || [];
      for (const selector of selectors) {
        if (selector.type === "TextPositionSelector") {
          return selector.start;
        }
      }
    }
  }
  return Number.POSITIVE_INFINITY;
}
function quote(annotation) {
  if (annotation.target.length === 0) {
    return null;
  }
  const target = annotation.target[0];
  if (!target.selector) {
    return null;
  }
  const quoteSel = target.selector.find((s) => s.type === "TextQuoteSelector");
  return quoteSel ? (
    /** @type {TextQuoteSelector}*/
    quoteSel.exact
  ) : null;
}

// .generated/published-client/src/sidebar/util/unicode.js
var COMBINING_MARKS = (
  // eslint-disable-next-line no-misleading-character-class
  /[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08E4-\u08FE\u0900-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C01-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C82\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D02\u0D03\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u18A9\u1920-\u192B\u1930-\u193B\u19B0-\u19C0\u19C8\u19C9\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1DC0-\u1DE6\u1DFC-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C4\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE26]/g
);
function fold(str) {
  return str.replace(COMBINING_MARKS, "");
}
function normalize(str) {
  return str.normalize("NFKD");
}

// .generated/published-client/src/sidebar/helpers/view-filter.js
function normalizeStr(val) {
  return fold(normalize(val)).toLowerCase();
}
var TermFilter = class {
  /**
   * @param {TermType} term
   * @param {Matcher<TermType>} matcher
   */
  constructor(term, matcher) {
    this.term = matcher.normalize(term);
    this.matcher = matcher;
  }
  /**
   * Return true if an annotation matches this filter.
   *
   * @param {Annotation} ann
   */
  matches(ann) {
    const matcher = this.matcher;
    return matcher.fieldValues(ann).some((value) => matcher.matches(matcher.normalize(value), this.term));
  }
};
var BooleanOpFilter = class {
  /**
   * @param {'and'|'or'} op - Boolean operator
   * @param {Filter[]} filters - Array of filters to test against
   */
  constructor(op, filters) {
    this.operator = op;
    this.filters = filters;
  }
  /**
   * Return true if an annotation matches this filter.
   *
   * @param {Annotation} ann
   */
  matches(ann) {
    if (this.operator === "and") {
      return this.filters.every((filter) => filter.matches(ann));
    } else {
      return this.filters.some((filter) => filter.matches(ann));
    }
  }
};
function stringFieldMatcher(fieldValues) {
  return {
    fieldValues,
    matches: (value, term) => value.includes(term),
    normalize: normalizeStr
  };
}
var fieldMatchers = {
  quote: stringFieldMatcher((ann) => [quote(ann) ?? ""]),
  /** @type {Matcher<number>} */
  since: {
    fieldValues: (ann) => [new Date(ann.updated).valueOf()],
    matches: (updatedTime, age) => {
      const delta = (Date.now() - updatedTime) / 1e3;
      return delta <= age;
    },
    normalize: (timestamp) => timestamp
  },
  tag: stringFieldMatcher((ann) => ann.tags),
  text: stringFieldMatcher((ann) => [ann.text]),
  uri: stringFieldMatcher((ann) => [ann.uri]),
  user: stringFieldMatcher((ann) => [
    ann.user,
    ann.user_info?.display_name ?? ""
  ])
};
function filterAnnotations(annotations, filters) {
  const makeTermFilter = (field, term) => new TermFilter(
    term,
    // Suppress error about potential mismatch of query term type
    // and what the matcher expects. We assume these match up.
    /** @type {Matcher<any>} */
    fieldMatchers[field]
  );
  const fieldFilters = Object.entries(filters).filter(([, filter]) => filter.terms.length > 0).map(([field, filter]) => {
    let termFilters;
    if (field === "any") {
      const anyFields = ["quote", "text", "tag", "user"];
      termFilters = filter.terms.map(
        (term) => new BooleanOpFilter(
          "or",
          anyFields.map((field2) => makeTermFilter(field2, term))
        )
      );
    } else {
      termFilters = filter.terms.map((term) => makeTermFilter(field, term));
    }
    return new BooleanOpFilter(filter.operator, termFilters);
  });
  const rootFilter = new BooleanOpFilter("and", fieldFilters);
  return annotations.filter((ann) => {
    return ann.id && rootFilter.matches(ann);
  }).map((ann) => (
    /** @type {string} */
    ann.id
  ));
}

// .generated/published-client/src/sidebar/helpers/tabs.js
function tabForAnnotation(ann) {
  if (isOrphan(ann)) {
    return "orphan";
  } else if (isPageNote(ann)) {
    return "note";
  } else {
    return "annotation";
  }
}
function shouldShowInTab(ann, tab) {
  if (isWaitingToAnchor(ann)) {
    return false;
  }
  return tabForAnnotation(ann) === tab;
}

// .generated/published-client/src/sidebar/util/typing.js
function notNull(arg) {
  return (
    /** @type {NonNullable<T>} */
    arg
  );
}

// .generated/published-client/src/sidebar/helpers/thread.js
function rootAnnotations(threads) {
  const threadAnnotations3 = threads.filter((thread) => !!thread.annotation).map((thread) => notNull(thread.annotation));
  if (threadAnnotations3.length) {
    return threadAnnotations3;
  }
  const allChildren = [];
  threads.forEach((thread) => {
    if (thread.children) {
      allChildren.push(...thread.children);
    }
  });
  if (allChildren.length) {
    return rootAnnotations(allChildren);
  }
  throw new Error("Thread contains no annotations");
}

// .generated/published-client/src/sidebar/helpers/thread-sorters.js
function compareHeadlessThreads(a, b) {
  if (!a.annotation && !b.annotation) {
    return 0;
  } else {
    return !a.annotation ? -1 : 1;
  }
}
function newestRootAnnotationDate(thread) {
  const annotations = rootAnnotations([thread]);
  return annotations.reduce(
    (newestDate, annotation) => annotation.created > newestDate ? annotation.created : newestDate,
    ""
  );
}
function oldestRootAnnotationDate(thread) {
  const annotations = rootAnnotations([thread]);
  return annotations.reduce((oldestDate, annotation) => {
    if (!oldestDate) {
      oldestDate = annotation.created;
    }
    return annotation.created < oldestDate ? annotation.created : oldestDate;
  }, "");
}
var sorters = {
  /** @type {SortFunction} */
  Newest: (a, b) => {
    const dateA = newestRootAnnotationDate(a);
    const dateB = newestRootAnnotationDate(b);
    if (dateA > dateB) {
      return -1;
    } else if (dateA < dateB) {
      return 1;
    }
    return 0;
  },
  /** @type {SortFunction} */
  Oldest: (a, b) => {
    const dateA = oldestRootAnnotationDate(a);
    const dateB = oldestRootAnnotationDate(b);
    if (dateA < dateB) {
      return -1;
    } else if (dateA > dateB) {
      return 1;
    }
    return 0;
  },
  /** @type {SortFunction} */
  Location: (a, b) => {
    if (!a.annotation || !b.annotation) {
      return compareHeadlessThreads(a, b);
    }
    const aLocation = location(a.annotation);
    const bLocation = location(b.annotation);
    if (aLocation < bLocation) {
      return -1;
    } else if (aLocation > bLocation) {
      return 1;
    }
    return 0;
  }
};

// .generated/published-client/src/sidebar/helpers/thread-annotations.js
function buildRootThread(threadState) {
  const selection = threadState.selection;
  const options = {
    expanded: selection.expanded,
    forcedVisible: selection.forcedVisible,
    selected: selection.selected,
    sortCompareFn: sorters[selection.sortKey]
  };
  const annotationsFiltered = !!selection.filterQuery || Object.keys(selection.filters).length > 0;
  if (annotationsFiltered) {
    const filters = generateFacetedFilter(
      selection.filterQuery || "",
      selection.filters
    );
    options.filterFn = (ann) => filterAnnotations([ann], filters).length > 0;
  }
  const threadFiltered = !annotationsFiltered && threadState.route === "sidebar";
  if (threadFiltered) {
    options.threadFilterFn = (thread) => {
      if (!thread.annotation) {
        return false;
      }
      return shouldShowInTab(thread.annotation, selection.selectedTab);
    };
  }
  return buildThread(threadState.annotations, options);
}
var threadAnnotations2 = memoize(buildRootThread);
export {
  threadAnnotations2 as threadAnnotations
};
