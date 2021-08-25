import { LabeledButton, SvgIcon } from '@hypothesis/frontend-shared';

import { useStoreProxy } from '../../store/use-store';
import { isNew, isReply } from '../../helpers/annotation-metadata';
import { isShared } from '../../helpers/permissions';
import { withServices } from '../../service-context';
import { applyTheme } from '../../helpers/theme';

import Menu from '../Menu';
import MenuItem from '../MenuItem';

/**
 * @typedef {import('../../../types/api').Annotation} Annotation
 * @typedef {import('../../../types/config').MergedConfig} MergedConfig
 */

/**
 * @typedef AnnotationPublishControlProps
 * @prop {Annotation} annotation
 * @prop {boolean} [isDisabled]
 *  - Should the save button be disabled? Hint: it will be if the annotation has no content
 * @prop {() => any} onSave - Callback for save button click
 * @prop {MergedConfig} settings - Injected service
 */

/**
 * Render a compound control button for publishing (saving) an annotation:
 * - Save the annotation — left side of button
 * - Choose sharing/privacy option - drop-down menu on right side of button
 *
 * @param {AnnotationPublishControlProps} props
 */
function AnnotationPublishControl({
  annotation,
  isDisabled,
  onSave,
  settings,
}) {
  const store = useStoreProxy();
  const draft = store.getDraft(annotation);
  const group = store.getGroup(annotation.group);

  if (!group) {
    // If there is no group, then don't render anything as a missing group
    // may mean the group is not loaded yet.
    return null;
  }

  const isPrivate = draft ? draft.isPrivate : !isShared(annotation.permissions);

  const publishDestination = isPrivate ? 'Only Me' : group.name;

  // Revert changes to this annotation
  const onCancel = () => {
    store.removeDraft(annotation);
    if (isNew(annotation)) {
      store.removeAnnotations([annotation]);
    }
  };

  const onSetPrivacy = level => {
    store.createDraft(annotation, { ...draft, isPrivate: level === 'private' });
    // Persist this as privacy default for future annotations unless this is a reply
    if (!isReply(annotation)) {
      store.setDefault('annotationPrivacy', level);
    }
  };

  const buttonStyle = applyTheme(
    ['ctaTextColor', 'ctaBackgroundColor'],
    settings
  );

  const menuLabel = (
    <div className="annotation-publish-button__menu-label" style={buttonStyle}>
      <SvgIcon name="expand-menu" className="u-icon--small" />
    </div>
  );

  return (
    <div className="AnnotationPublishControl">
      <div className="annotation-publish-button">
        <LabeledButton
          className="PublishControlButton"
          style={buttonStyle}
          onClick={onSave}
          disabled={isDisabled}
          size="large"
          variant="primary"
        >
          Post to {publishDestination}
        </LabeledButton>
        {/* This wrapper div is necessary because of peculiarities with
             Safari: see https://github.com/hypothesis/client/issues/2302 */}
        <div
          className="annotation-publish-button__menu-wrapper"
          style={buttonStyle}
        >
          <Menu
            arrowClass="annotation-publish-button__menu-arrow"
            containerPositioned={false}
            contentClass="annotation-publish-button__menu-content"
            label={menuLabel}
            menuIndicator={false}
            title="Change annotation sharing setting"
            align="left"
          >
            <MenuItem
              icon={group.type === 'open' ? 'public' : 'groups'}
              label={group.name}
              isSelected={!isPrivate}
              onClick={() => onSetPrivacy('shared')}
            />
            <MenuItem
              icon="lock"
              label="Only Me"
              isSelected={isPrivate}
              onClick={() => onSetPrivacy('private')}
            />
          </Menu>
        </div>
      </div>
      <div>
        <LabeledButton icon="cancel" onClick={onCancel} size="large">
          Cancel
        </LabeledButton>
      </div>
    </div>
  );
}

export default withServices(AnnotationPublishControl, ['settings']);
