/**
 * Return a fake annotation with the basic properties filled in.
 */
export function defaultAnnotation() {
  return {
    id: 'deadbeef',
    created: '2015-05-10T20:18:56.613388+00:00',
    document: {
      title: 'A special document',
    },
    permissions: {
      read: ['group:__world__'],
    },
    tags: [],
    target: [{ source: 'source', selector: [] }],
    text: '',
    uri: 'http://example.com',
    user: 'acct:bill@localhost',
    updated: '2015-05-10T20:18:56.613388+00:00',
  };
}

/**
 * Return a fake draft based on a default annotation.
 */
export function defaultDraft() {
  return {
    annotation: defaultAnnotation(),
    text: '',
    tags: [],
    isPrivate: false,
  };
}

/**
 * Return a fake public annotation with the basic properties filled in.
 */
export function publicAnnotation() {
  return {
    id: 'pubann',
    document: {
      title: 'A special document',
    },
    permissions: {
      read: ['group:__world__'],
    },
    target: [{ source: 'source', selector: [] }],
    uri: 'http://example.com',
    user: 'acct:bill@localhost',
    updated: '2015-05-10T20:18:56.613388+00:00',
  };
}

/** Return an annotation domain model object for a new annotation
 * (newly-created client-side, not yet saved to the server).
 * Components will never see this data structure, as it will have been
 * amended by store reducers.
 */
export function newAnnotation() {
  return {
    id: undefined,
    $highlight: undefined,
    target: ['foo', 'bar'],
    references: [],
    text: 'Annotation text',
    tags: ['tag_1', 'tag_2'],
    user: 'acct:bill@localhost',
  };
}

/** Return a new reply */
export function newReply() {
  return {
    id: undefined,
    $highlight: undefined,
    target: ['foo', 'bar'],
    references: ['parent-id'],
    text: 'Annotation text',
    tags: ['tag_1', 'tag_2'],
  };
}

/** Return a new annotation which has no tags or text. */
export function newEmptyAnnotation() {
  return {
    id: undefined,
    $highlight: undefined,
    target: ['foo'],
    references: [],
    text: '',
    tags: [],
  };
}

/** Return an annotation domain model object for a new highlight
 * (newly-created client-side, not yet saved to the server).
 */
export function newHighlight() {
  return {
    id: undefined,
    $highlight: true,
    target: [{ source: 'http://example.org' }],
    user: 'acct:bill@localhost',
  };
}

/** Return an annotation domain model object for a new page note.
 */
export function newPageNote() {
  return {
    $highlight: undefined,
    target: [{ source: 'http://example.org' }],
    references: [],
    text: '',
    tags: [],
  };
}

/** Return an annotation domain model object for an existing annotation
 *  received from the server.
 */
export function oldAnnotation() {
  return {
    id: 'annotation_id',
    $highlight: undefined,
    target: [{ source: 'source', selector: [] }],
    references: [],
    text: 'This is my annotation',
    tags: ['tag_1', 'tag_2'],
  };
}

/** Return an annotation domain model object for an existing highlight
 *  received from the server.
 */
export function oldHighlight() {
  return {
    id: 'annotation_id',
    $highlight: undefined,
    target: [{ source: 'source', selector: [] }],
    references: [],
    text: '',
    tags: [],
  };
}

/** Return an annotation domain model object for an existing page note
 *  received from the server.
 */
export function oldPageNote() {
  return {
    id: 'note_id',
    $highlight: undefined,
    target: [{ source: 'http://example.org' }],
    references: [],
    text: '',
    tags: [],
  };
}

/** Return an annotation domain model object for an existing reply
 *  received from the server.
 */
export function oldReply() {
  return {
    highlight: undefined,
    target: ['foo'],
    references: ['parent_annotation_id'],
    text: '',
    tags: [],
  };
}

/**
 * @typedef ModerationState
 * @prop {boolean} hidden
 * @prop {number} flagCount
 */

/**
 * Return an annotation with the given moderation state.
 *
 * @param {ModerationState} modInfo
 */
export function moderatedAnnotation(modInfo) {
  return Object.assign(defaultAnnotation(), {
    id: 'ann-id',
    hidden: !!modInfo.hidden,
    moderation: {
      flagCount: modInfo.flagCount || 0,
    },
  });
}
