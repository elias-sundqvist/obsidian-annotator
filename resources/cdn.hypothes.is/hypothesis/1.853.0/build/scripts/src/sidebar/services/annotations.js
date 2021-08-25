/** @typedef {import('../../types/api').Annotation} Annotation */
/** @typedef {import('../../types/annotator').AnnotationData} AnnotationData */

import * as metadata from '../helpers/annotation-metadata';
import {
  defaultPermissions,
  privatePermissions,
  sharedPermissions,
} from '../helpers/permissions';
import { generateHexString } from '../util/random';

/**
 * A service for creating, updating and persisting annotations both in the
 * local store and on the backend via the API.
 */
// @inject
export class AnnotationsService {
  /**
   * @param {import('./api').APIService} api
   * @param {import('../store').SidebarStore} store
   */
  constructor(api, store) {
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
      changes.permissions = draft.isPrivate
        ? privatePermissions(annotation.user)
        : sharedPermissions(annotation.user, annotation.group);
    }

    // Integrate changes from draft into object to be persisted
    return { ...annotation, ...changes };
  }

  /**
   * Extend new annotation objects with defaults and permissions.
   *
   * @param {AnnotationData} annotationData
   * @param {Date} now
   * @return {Annotation}
   */
  _initialize(annotationData, now = new Date()) {
    const defaultPrivacy = this._store.getDefault('annotationPrivacy');
    const groupid = this._store.focusedGroupId();
    const profile = this._store.profile();

    if (!groupid) {
      throw new Error('Cannot create annotation without a group');
    }

    const userid = profile.userid;
    const userInfo = profile.user_info;

    // We need a unique local/app identifier for this new annotation such
    // that we might look it up later in the store. It won't have an ID yet,
    // as it has not been persisted to the service.
    const $tag = generateHexString(8);

    /** @type {Annotation} */
    const annotation = Object.assign(
      {
        created: now.toISOString(),
        group: groupid,
        permissions: defaultPermissions(userid, groupid, defaultPrivacy),
        tags: [],
        text: '',
        updated: now.toISOString(),
        user: userid,
        user_info: userInfo,
        $tag,
        hidden: false,
        links: {},
      },
      annotationData
    );

    // Highlights are peculiar in that they always have private permissions
    if (metadata.isHighlight(annotation)) {
      annotation.permissions = privatePermissions(userid);
    }
    return annotation;
  }

  /**
   * Populate a new annotation object from `annotation` and add it to the store.
   * Create a draft for it unless it's a highlight and clear other empty
   * drafts out of the way.
   *
   * @param {Object} annotationData
   * @param {Date} now
   */
  create(annotationData, now = new Date()) {
    const annotation = this._initialize(annotationData, now);

    this._store.addAnnotations([annotation]);

    // Remove other drafts that are in the way, and their annotations (if new)
    this._store.deleteNewAndEmptyDrafts();

    // Create a draft unless it's a highlight
    if (!metadata.isHighlight(annotation)) {
      this._store.createDraft(annotation, {
        tags: annotation.tags,
        text: annotation.text,
        isPrivate: !metadata.isPublic(annotation),
      });
    }

    // NB: It may make sense to move the following code at some point to
    // the UI layer
    // Select the correct tab
    // If the annotation is of type note or annotation, make sure
    // the appropriate tab is selected. If it is of type reply, user
    // stays in the selected tab.
    if (metadata.isPageNote(annotation)) {
      this._store.selectTab('note');
    } else if (metadata.isAnnotation(annotation)) {
      this._store.selectTab('annotation');
    }

    (annotation.references || []).forEach(parent => {
      // Expand any parents of this annotation.
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
      this._store.openSidebarPanel('loginPrompt');
      return;
    }
    if (!topLevelFrame) {
      return;
    }
    const pageNoteAnnotation = {
      target: [],
      uri: topLevelFrame.uri,
    };
    this.create(pageNoteAnnotation);
  }

  /**
   * Delete an annotation via the API and update the store.
   */
  async delete(annotation) {
    await this._api.annotation.delete({ id: annotation.id });
    this._store.removeAnnotations([annotation]);
  }

  /**
   * Flag an annotation for review by a moderator.
   */
  async flag(annotation) {
    await this._api.annotation.flag({ id: annotation.id });
    this._store.updateFlagStatus(annotation.id, true);
  }

  /**
   * Create a reply to `annotation` by the user `userid` and add to the store.
   *
   * @param {Object} annotation
   * @param {string} userid
   */
  reply(annotation, userid) {
    const replyAnnotation = {
      group: annotation.group,
      permissions: metadata.isPublic(annotation)
        ? sharedPermissions(userid, annotation.group)
        : privatePermissions(userid),
      references: (annotation.references || []).concat(annotation.id),
      target: [{ source: annotation.target[0].source }],
      uri: annotation.uri,
    };
    this.create(replyAnnotation);
  }

  /**
   * Save new (or update existing) annotation. On success,
   * the annotation's `Draft` will be removed and the annotation added
   * to the store.
   */
  async save(annotation) {
    let saved;

    const annotationWithChanges = this._applyDraftChanges(annotation);

    if (metadata.isNew(annotation)) {
      saved = this._api.annotation.create({}, annotationWithChanges);
    } else {
      saved = this._api.annotation.update(
        { id: annotation.id },
        annotationWithChanges
      );
    }

    let savedAnnotation;
    this._store.annotationSaveStarted(annotation);
    try {
      savedAnnotation = await saved;
    } finally {
      this._store.annotationSaveFinished(annotation);
    }

    Object.keys(annotation).forEach(key => {
      if (key[0] === '$') {
        savedAnnotation[key] = annotation[key];
      }
    });

    // Clear out any pending changes (draft)
    this._store.removeDraft(annotation);

    // Add (or, in effect, update) the annotation to the store's collection
    this._store.addAnnotations([savedAnnotation]);
    return savedAnnotation;
  }
}
