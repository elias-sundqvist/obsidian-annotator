import { normalizeKeyName } from '@hypothesis/frontend-shared';
import { useState } from 'preact/hooks';

import { withServices } from '../../service-context';
import { applyTheme } from '../../helpers/theme';
import { useStoreProxy } from '../../store/use-store';

import MarkdownEditor from '../MarkdownEditor';
import TagEditor from '../TagEditor';

import AnnotationLicense from './AnnotationLicense';
import AnnotationPublishControl from './AnnotationPublishControl';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 * @typedef {import("../../../types/config").MergedConfig} MergedConfig
 */

/**
 * @typedef AnnotationEditorProps
 * @prop {Annotation} annotation - The annotation under edit
 * @prop {import('../../services/annotations').AnnotationsService} annotationsService
 * @prop {MergedConfig} settings - Injected service
 * @prop {import('../../services/toast-messenger').ToastMessengerService} toastMessenger
 * @prop {import('../../services/tags').TagsService} tags
 */

/**
 * Display annotation content in an editable format.
 *
 * @param {AnnotationEditorProps} props
 */
function AnnotationEditor({
  annotation,
  annotationsService,
  settings,
  tags: tagsService,
  toastMessenger,
}) {
  // Track the currently-entered text in the tag editor's input
  const [pendingTag, setPendingTag] = useState(
    /** @type {string|null} */ (null)
  );

  const store = useStoreProxy();
  const draft = store.getDraft(annotation);
  const group = store.getGroup(annotation.group);

  if (!draft) {
    // If there's no draft, we can't be in editing mode
    return null;
  }

  const shouldShowLicense =
    !draft.isPrivate && group && group.type !== 'private';

  const tags = draft.tags;
  const text = draft.text;
  const isEmpty = !text && !tags.length;

  const onEditTags = ({ tags }) => {
    store.createDraft(draft.annotation, { ...draft, tags });
  };

  /**
   * Verify `newTag` has content and is not a duplicate; add the tag
   *
   * @param {string} newTag
   * @return {boolean} - `true` if tag is added
   */
  const onAddTag = newTag => {
    if (!newTag || tags.indexOf(newTag) >= 0) {
      // don't add empty or duplicate tags
      return false;
    }
    const tagList = [...tags, newTag];
    // Update the tag locally for the suggested-tag list
    tagsService.store(tagList);
    onEditTags({ tags: tagList });
    return true;
  };

  /**
   * Remove a tag from the annotation.
   *
   * @param {string} tag
   * @return {boolean} - `true` if tag extant and removed
   */
  const onRemoveTag = tag => {
    const newTagList = [...tags]; // make a copy
    const index = newTagList.indexOf(tag);
    if (index >= 0) {
      newTagList.splice(index, 1);
      onEditTags({ tags: newTagList });
      return true;
    }
    return false;
  };

  const onEditText = ({ text }) => {
    store.createDraft(draft.annotation, { ...draft, text });
  };

  const onSave = async () => {
    // If there is any content in the tag editor input field that has
    // not been committed as a tag, go ahead and add it as a tag
    // See https://github.com/hypothesis/product-backlog/issues/1122
    if (pendingTag) {
      onAddTag(pendingTag);
    }
    try {
      await annotationsService.save(annotation);
    } catch (err) {
      toastMessenger.error('Saving annotation failed');
    }
  };

  // Allow saving of annotation by pressing CMD/CTRL-Enter
  const onKeyDown = event => {
    const key = normalizeKeyName(event.key);
    if (isEmpty) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && key === 'Enter') {
      event.stopPropagation();
      event.preventDefault();
      onSave();
    }
  };

  const textStyle = applyTheme(['annotationFontFamily'], settings);

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div className="AnnotationEditor u-vertical-rhythm" onKeyDown={onKeyDown}>
      <MarkdownEditor
        textStyle={textStyle}
        label="Annotation body"
        text={text}
        onEditText={onEditText}
      />
      <TagEditor
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onTagInput={setPendingTag}
        tagList={tags}
      />
      <div className="annotation__form-actions u-layout-row">
        <AnnotationPublishControl
          annotation={annotation}
          isDisabled={isEmpty}
          onSave={onSave}
        />
      </div>
      {shouldShowLicense && <AnnotationLicense />}
    </div>
  );
}

export default withServices(AnnotationEditor, [
  'annotationsService',
  'settings',
  'tags',
  'toastMessenger',
]);
