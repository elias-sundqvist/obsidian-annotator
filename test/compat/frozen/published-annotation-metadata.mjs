// .generated/published-client/src/sidebar/helpers/annotation-metadata.js
function documentMetadata(annotation) {
  const uri = annotation.uri;
  let domain;
  try {
    domain = new URL(uri).hostname;
  } catch {
    domain = "";
  }
  if (domain === "localhost") {
    domain = "";
  }
  let title = domain;
  if (annotation.document && annotation.document.title) {
    title = annotation.document.title[0];
  }
  return {
    uri,
    domain,
    title
  };
}
function domainAndTitle(annotation) {
  return {
    domain: domainTextFromAnnotation(annotation),
    titleText: titleTextFromAnnotation(annotation),
    titleLink: titleLinkFromAnnotation(annotation)
  };
}
function titleLinkFromAnnotation(annotation) {
  let titleLink = (
    /** @type {string|null} */
    annotation.uri
  );
  if (titleLink && !(titleLink.indexOf("http://") === 0 || titleLink.indexOf("https://") === 0)) {
    titleLink = null;
  }
  if (annotation.links && annotation.links.incontext) {
    titleLink = annotation.links.incontext;
  }
  return titleLink;
}
function domainTextFromAnnotation(annotation) {
  const document = documentMetadata(annotation);
  let domainText = "";
  if (document.uri && document.uri.indexOf("file://") === 0 && document.title) {
    const parts = document.uri.split("/");
    const filename = parts[parts.length - 1];
    if (filename) {
      domainText = filename;
    }
  } else if (document.domain && document.domain !== document.title) {
    domainText = document.domain;
  }
  return domainText;
}
function titleTextFromAnnotation(annotation) {
  const document = documentMetadata(annotation);
  let titleText = document.title;
  if (titleText.length > 30) {
    titleText = titleText.slice(0, 30) + "\u2026";
  }
  return titleText;
}
function isReply(annotation) {
  return (annotation.references || []).length > 0;
}
function isSaved(annotation) {
  return !!annotation.id;
}
function isNew(annotation) {
  return !annotation.id;
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
function hasSelector(annotation) {
  return !!(annotation.target && annotation.target.length > 0 && annotation.target[0].selector);
}
function isWaitingToAnchor(annotation) {
  return hasSelector(annotation) && typeof annotation.$orphan === "undefined" && !annotation.$anchorTimeout;
}
function isHidden(annotation) {
  return !!annotation.hidden;
}
function isHighlight(annotation) {
  if (annotation.$highlight) {
    return true;
  }
  if (isNew(annotation)) {
    return false;
  }
  return !isPageNote(annotation) && !isReply(annotation) && !annotation.hidden && // A hidden annotation has some form of objectionable content
  !annotation.text && !(annotation.tags && annotation.tags.length);
}
function isOrphan(annotation) {
  return hasSelector(annotation) && annotation.$orphan === true;
}
function isPageNote(annotation) {
  return !hasSelector(annotation) && !isReply(annotation);
}
function isAnnotation(annotation) {
  return !!(hasSelector(annotation) && !isOrphan(annotation));
}
function annotationRole(annotation) {
  if (isReply(annotation)) {
    return "Reply";
  } else if (isHighlight(annotation)) {
    return "Highlight";
  } else if (isPageNote(annotation)) {
    return "Page note";
  }
  return "Annotation";
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
function flagCount(annotation) {
  if (!annotation.moderation) {
    return null;
  }
  return annotation.moderation.flagCount;
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
function hasBeenEdited(annotation) {
  const UPDATED_THRESHOLD = 2e3;
  if (!annotation.updated || !annotation.created || annotation.updated === annotation.created) {
    return false;
  }
  const created = new Date(annotation.created).getTime();
  const updated = new Date(annotation.updated).getTime();
  if (isNaN(created) || isNaN(updated)) {
    return false;
  }
  return updated - created > UPDATED_THRESHOLD;
}
export {
  annotationRole,
  documentMetadata,
  domainAndTitle,
  flagCount,
  hasBeenEdited,
  isAnnotation,
  isHidden,
  isHighlight,
  isNew,
  isOrphan,
  isPageNote,
  isPublic,
  isReply,
  isSaved,
  isWaitingToAnchor,
  location,
  quote
};
