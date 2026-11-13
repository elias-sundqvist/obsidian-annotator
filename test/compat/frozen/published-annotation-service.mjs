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

// .generated/published-client/src/sidebar/helpers/annotation-metadata.js
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

// .generated/published-client/src/sidebar/helpers/permissions.js
function defaultLevel(savedLevel) {
  switch (savedLevel) {
    case "private":
    case "shared":
      return savedLevel;
    default:
      return "shared";
  }
}
function privatePermissions(userid) {
  return {
    read: [userid],
    update: [userid],
    delete: [userid]
  };
}
function sharedPermissions(userid, groupid) {
  return Object.assign(privatePermissions(userid), {
    read: ["group:" + groupid]
  });
}
function defaultPermissions(userid, groupid, savedLevel) {
  if (defaultLevel(savedLevel) === "private" && userid) {
    return privatePermissions(userid);
  } else {
    return sharedPermissions(userid, groupid);
  }
}

// .generated/published-client/src/sidebar/services/annotations.js
var AnnotationsService = class {
  /**
   * @param {import('./api').APIService} api
   * @param {import('./annotation-activity').AnnotationActivityService} annotationActivity
   * @param {import('../store').SidebarStore} store
   */
  constructor(annotationActivity, api, store) {
    this._activity = annotationActivity;
    this._api = api;
    this._store = store;
  }
  /**
   * Apply changes for the given `annotation` from its draft in the store (if
   * any) and return a new object with those changes integrated.
   *
   * @param {Annotation} annotation
   */
  _applyDraftChanges(annotation) {
    const changes = {};
    const draft = this._store.getDraft(annotation);
    if (draft) {
      changes.tags = draft.tags;
      changes.text = draft.text;
      changes.permissions = draft.isPrivate ? privatePermissions(annotation.user) : sharedPermissions(annotation.user, annotation.group);
    }
    return { ...annotation, ...changes };
  }
  /**
   * Extend new annotation objects with defaults and permissions.
   *
   * @param {Omit<AnnotationData, '$tag'>} annotationData
   * @param {Date} now
   * @return {Annotation}
   */
  _initialize(annotationData, now = /* @__PURE__ */ new Date()) {
    const defaultPrivacy = this._store.getDefault("annotationPrivacy");
    const groupid = this._store.focusedGroupId();
    const profile = this._store.profile();
    if (!groupid) {
      throw new Error("Cannot create annotation without a group");
    }
    const userid = profile.userid;
    if (!userid) {
      throw new Error("Cannot create annotation when logged out");
    }
    const userInfo = profile.user_info;
    const $tag = "s:" + generateHexString(8);
    const annotation = Object.assign(
      {
        created: now.toISOString(),
        group: groupid,
        permissions: defaultPermissions(userid, groupid, defaultPrivacy),
        tags: [],
        text: "",
        updated: now.toISOString(),
        user: userid,
        user_info: userInfo,
        $tag,
        hidden: false,
        links: {},
        document: { title: "" }
      },
      annotationData
    );
    if (isHighlight(annotation)) {
      annotation.permissions = privatePermissions(userid);
    }
    return annotation;
  }
  /**
   * Populate a new annotation object from `annotation` and add it to the store.
   * Create a draft for it unless it's a highlight and clear other empty
   * drafts out of the way.
   *
   * @param {Omit<AnnotationData, '$tag'>} annotationData
   * @param {Date} now
   */
  create(annotationData, now = /* @__PURE__ */ new Date()) {
    const annotation = this._initialize(annotationData, now);
    this._store.addAnnotations([annotation]);
    this._store.deleteNewAndEmptyDrafts();
    if (!isHighlight(annotation)) {
      this._store.createDraft(annotation, {
        tags: annotation.tags,
        text: annotation.text,
        isPrivate: !isPublic(annotation)
      });
    }
    if (isPageNote(annotation)) {
      this._store.selectTab("note");
    } else if (isAnnotation(annotation)) {
      this._store.selectTab("annotation");
    }
    (annotation.references || []).forEach((parent) => {
      this._store.setExpanded(parent, true);
    });
  }
  /**
   * Create a new empty "page note" annotation and add it to the store. If the
   * user is not logged in, open the `loginPrompt` panel instead.
   */
  createPageNote() {
    const topLevelFrame = this._store.mainFrame();
    if (!this._store.isLoggedIn()) {
      this._store.openSidebarPanel("loginPrompt");
      return;
    }
    if (!topLevelFrame) {
      return;
    }
    const pageNoteAnnotation = {
      target: [],
      uri: topLevelFrame.uri
    };
    this.create(pageNoteAnnotation);
  }
  /**
   * Delete an annotation via the API and update the store.
   *
   * @param {SavedAnnotation} annotation
   */
  async delete(annotation) {
    await this._api.annotation.delete({ id: annotation.id });
    this._activity.reportActivity("delete", annotation);
    this._store.removeAnnotations([annotation]);
  }
  /**
   * Flag an annotation for review by a moderator.
   *
   * @param {SavedAnnotation} annotation
   */
  async flag(annotation) {
    await this._api.annotation.flag({ id: annotation.id });
    this._activity.reportActivity("flag", annotation);
    this._store.updateFlagStatus(annotation.id, true);
  }
  /**
   * Create a reply to `annotation` by the user `userid` and add to the store.
   *
   * @param {SavedAnnotation} annotation
   * @param {string} userid
   */
  reply(annotation, userid) {
    const replyAnnotation = {
      group: annotation.group,
      permissions: isPublic(annotation) ? sharedPermissions(userid, annotation.group) : privatePermissions(userid),
      references: (annotation.references || []).concat(annotation.id),
      target: [{ source: annotation.target[0].source }],
      uri: annotation.uri
    };
    this.create(replyAnnotation);
  }
  /**
   * Save new (or update existing) annotation. On success,
   * the annotation's `Draft` will be removed and the annotation added
   * to the store.
   *
   * @param {Annotation} annotation
   */
  async save(annotation) {
    let saved;
    let eventType;
    const annotationWithChanges = this._applyDraftChanges(annotation);
    if (!isSaved(annotation)) {
      saved = this._api.annotation.create({}, annotationWithChanges);
      eventType = "create";
    } else {
      saved = this._api.annotation.update(
        { id: annotation.id },
        annotationWithChanges
      );
      eventType = "update";
    }
    let savedAnnotation;
    this._store.annotationSaveStarted(annotation);
    try {
      savedAnnotation = await saved;
      this._activity.reportActivity(eventType, savedAnnotation);
    } finally {
      this._store.annotationSaveFinished(annotation);
    }
    for (let [key, value] of Object.entries(annotation)) {
      if (key.startsWith("$")) {
        const fields = (
          /** @type {Record<string, any>} */
          savedAnnotation
        );
        fields[key] = value;
      }
    }
    this._store.removeDraft(annotation);
    this._store.addAnnotations([savedAnnotation]);
    return savedAnnotation;
  }
};
export {
  AnnotationsService
};
