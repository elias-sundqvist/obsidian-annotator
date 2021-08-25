/**
 * Utility functions for querying annotation metadata.
 */

/** @typedef {import('../../types/api').Annotation} Annotation */
/** @typedef {import('../../types/api').TextPositionSelector} TextPositionSelector */
/** @typedef {import('../../types/api').TextQuoteSelector} TextQuoteSelector */

/**
 * Extract document metadata from an annotation.
 *
 * @param {Annotation} annotation
 */
export function documentMetadata(annotation) {
  const uri = annotation.uri;

  let domain;
  try {
    domain = new URL(uri).hostname;
  } catch {
    // Annotation URI parsing on the backend is very liberal compared to the URL
    // constructor. There is also some historic invalid data in h (eg [1]).
    // Hence we must handle URL parsing failures in the client.
    //
    // [1] https://github.com/hypothesis/client/issues/3666
    domain = '';
  }
  if (domain === 'localhost') {
    domain = '';
  }

  let title = domain;
  if (annotation.document && annotation.document.title) {
    title = annotation.document.title[0];
  }

  return {
    uri,
    domain,
    title,
  };
}

/**
 * Return the domain and title of an annotation for display on an annotation
 * card.
 *
 * @param {Annotation} annotation
 */
export function domainAndTitle(annotation) {
  return {
    domain: domainTextFromAnnotation(annotation),
    titleText: titleTextFromAnnotation(annotation),
    titleLink: titleLinkFromAnnotation(annotation),
  };
}

/**
 * @param {Annotation} annotation
 */
function titleLinkFromAnnotation(annotation) {
  let titleLink = /** @type {string|null} */ (annotation.uri);

  if (
    titleLink &&
    !(titleLink.indexOf('http://') === 0 || titleLink.indexOf('https://') === 0)
  ) {
    // We only link to http(s) URLs.
    titleLink = null;
  }

  if (annotation.links && annotation.links.incontext) {
    titleLink = annotation.links.incontext;
  }

  return titleLink;
}
/**
 * Returns the domain text from an annotation.
 *
 * @param {Annotation} annotation
 */
function domainTextFromAnnotation(annotation) {
  const document = documentMetadata(annotation);

  let domainText = '';
  if (document.uri && document.uri.indexOf('file://') === 0 && document.title) {
    const parts = document.uri.split('/');
    const filename = parts[parts.length - 1];
    if (filename) {
      domainText = filename;
    }
  } else if (document.domain && document.domain !== document.title) {
    domainText = document.domain;
  }

  return domainText;
}

/**
 * Returns the title text from an annotation and crops it to 30 chars
 * if needed.
 *
 * @param {Annotation} annotation
 */
function titleTextFromAnnotation(annotation) {
  const document = documentMetadata(annotation);

  let titleText = document.title;
  if (titleText.length > 30) {
    titleText = titleText.slice(0, 30) + '…';
  }

  return titleText;
}

/**
 * Return `true` if the given annotation is a reply, `false` otherwise.
 *
 * @param {Annotation} annotation
 */
export function isReply(annotation) {
  return (annotation.references || []).length > 0;
}

/** Return `true` if the given annotation is new, `false` otherwise.
 *
 * "New" means this annotation has been newly created client-side and not
 * saved to the server yet.
 *
 * @param {Annotation} annotation
 */
export function isNew(annotation) {
  return !annotation.id;
}

/**
 * Return `true` if the given annotation is public, `false` otherwise.
 *
 * @param {Annotation} annotation
 */
export function isPublic(annotation) {
  let isPublic = false;

  if (!annotation.permissions) {
    return isPublic;
  }

  annotation.permissions.read.forEach(perm => {
    const readPermArr = perm.split(':');
    if (readPermArr.length === 2 && readPermArr[0] === 'group') {
      isPublic = true;
    }
  });

  return isPublic;
}

/**
 * Return `true` if `annotation` has a selector.
 *
 * An annotation which has a selector refers to a specific part of a document,
 * as opposed to a Page Note which refers to the whole document or a reply,
 * which refers to another annotation.
 *
 * @param {Annotation} annotation
 */
function hasSelector(annotation) {
  return !!(
    annotation.target &&
    annotation.target.length > 0 &&
    annotation.target[0].selector
  );
}

/**
 * Return `true` if the given annotation is not yet anchored.
 *
 * Returns false if anchoring is still in process but the flag indicating that
 * the initial timeout allowed for anchoring has expired.
 *
 * @param {Annotation} annotation
 */
export function isWaitingToAnchor(annotation) {
  return (
    hasSelector(annotation) &&
    typeof annotation.$orphan === 'undefined' &&
    !annotation.$anchorTimeout
  );
}

/**
 * Has this annotation hidden by moderators?
 *
 * @param {Annotation} annotation
 * @return {boolean}
 */
export function isHidden(annotation) {
  return !!annotation.hidden;
}

/**
 * Is this annotation a highlight?
 *
 * Highlights are generally identifiable by having no text content AND no tags,
 * but there is some nuance.
 *
 * @param {Annotation} annotation
 * @return {boolean}
 */
export function isHighlight(annotation) {
  // `$highlight` is an ephemeral attribute set by the `annotator` on new
  // annotation objects (created by clicking the "highlight" button).
  // It is not persisted and cannot be relied upon, but if it IS present,
  // this is definitely a highlight (one which is not yet saved).
  if (annotation.$highlight) {
    return true;
  }

  if (isNew(annotation)) {
    // For new (unsaved-to-service) annotations, unless they have a truthy
    // `$highlight` attribute, we don't know yet if they are a highlight.
    return false;
  }

  // Note that it is possible to end up with an empty (no `text`) annotation
  // that is not a highlight by adding at least one tag—thus, it is necessary
  // to check for the existence of tags as well as text content.

  return (
    !isPageNote(annotation) &&
    !isReply(annotation) &&
    !annotation.hidden && // A hidden annotation has some form of objectionable content
    !annotation.text &&
    !(annotation.tags && annotation.tags.length)
  );
}

/**
 * Return `true` if the given annotation is an orphan.
 *
 * @param {Annotation} annotation
 */
export function isOrphan(annotation) {
  return hasSelector(annotation) && annotation.$orphan === true;
}

/**
 * Return `true` if the given annotation is a page note.
 *
 * @param {Annotation} annotation
 */
export function isPageNote(annotation) {
  return !hasSelector(annotation) && !isReply(annotation);
}

/**
 * Return `true` if the given annotation is a top level annotation, `false` otherwise.
 *
 * @param {Annotation} annotation
 */
export function isAnnotation(annotation) {
  return !!(hasSelector(annotation) && !isOrphan(annotation));
}

/** Return a numeric key that can be used to sort annotations by location.
 *
 * @param {Annotation} annotation
 * @return {number} - A key representing the location of the annotation in
 *                    the document, where lower numbers mean closer to the
 *                    start.
 */
export function location(annotation) {
  if (annotation) {
    const targets = annotation.target || [];
    for (let i = 0; i < targets.length; i++) {
      const selectors = targets[i].selector || [];
      for (const selector of selectors) {
        if (selector.type === 'TextPositionSelector') {
          return selector.start;
        }
      }
    }
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Return the number of times the annotation has been flagged
 * by other users. If moderation metadata is not present, returns `null`.
 *
 * @param {Annotation} annotation
 * @return {number|null}
 */
export function flagCount(annotation) {
  if (!annotation.moderation) {
    return null;
  }
  return annotation.moderation.flagCount;
}

/**
 * Return the text quote that an annotation refers to.
 *
 * @param {Annotation} annotation
 * @return {string|null}
 */
export function quote(annotation) {
  if (annotation.target.length === 0) {
    return null;
  }
  const target = annotation.target[0];
  if (!target.selector) {
    return null;
  }
  const quoteSel = target.selector.find(s => s.type === 'TextQuoteSelector');
  return quoteSel ? /** @type {TextQuoteSelector}*/ (quoteSel).exact : null;
}

/**
 * Has this annotation been edited subsequent to its creation?
 *
 * @param {Annotation} annotation
 * @return {boolean}
 */
export function hasBeenEdited(annotation) {
  // New annotations created with the current `h` API service will have
  // equivalent (string) values for `created` and `updated` datetimes.
  // However, in the past, these values could have sub-second differences,
  // which can make them appear as having been edited when they have not
  // been. Only consider an annotation as "edited" if its creation time is
  // more than 2 seconds before its updated time.
  const UPDATED_THRESHOLD = 2000;

  // If either time string is non-extant or they are equivalent...
  if (
    !annotation.updated ||
    !annotation.created ||
    annotation.updated === annotation.created
  ) {
    return false;
  }

  // Both updated and created SHOULD be ISO-8601-formatted strings
  // with microsecond resolution; (NB: Date.prototype.getTime() returns
  // milliseconds since epoch, so we're dealing in ms after this)
  const created = new Date(annotation.created).getTime();
  const updated = new Date(annotation.updated).getTime();
  if (isNaN(created) || isNaN(updated)) {
    // If either is not a valid date...
    return false;
  }
  return updated - created > UPDATED_THRESHOLD;
}
