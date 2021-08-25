import { IconButton } from '@hypothesis/frontend-shared';

import { confirm } from '../../../shared/prompts';
import { serviceConfig } from '../../config/service-config';
import {
  sharingEnabled,
  annotationSharingLink,
} from '../../helpers/annotation-sharing';
import { isPrivate, permits } from '../../helpers/permissions';
import { withServices } from '../../service-context';
import { useStoreProxy } from '../../store/use-store';

import AnnotationShareControl from './AnnotationShareControl';

/**
 *  @typedef {import("../../../types/api").Annotation} Annotation
 *  @typedef {import('../../../types/config').HostConfig} HostConfig
 */

/**
 * @typedef AnnotationActionBarProps
 * @prop {Annotation} annotation - The annotation in question
 * @prop {() => any} onReply - Callbacks for when action buttons are clicked/tapped
 * @prop {import('../../services/annotations').AnnotationsService} annotationsService
 * @prop {HostConfig} settings
 * @prop {import('../../services/toast-messenger').ToastMessengerService} toastMessenger
 */

/** @param {HostConfig} settings */
function flaggingEnabled(settings) {
  const service = serviceConfig(settings);
  if (service?.allowFlagging === false) {
    return false;
  }
  return true;
}

/**
 * A collection of buttons in the footer area of an annotation that take
 * actions on the annotation.
 *
 * @param {AnnotationActionBarProps} props
 */
function AnnotationActionBar({
  annotation,
  annotationsService,
  onReply,
  settings,
  toastMessenger,
}) {
  const store = useStoreProxy();
  const userProfile = store.profile();
  const annotationGroup = store.getGroup(annotation.group);
  const isLoggedIn = store.isLoggedIn();

  // Is the current user allowed to take the given `action` on this annotation?
  const userIsAuthorizedTo = action => {
    return permits(annotation.permissions, action, userProfile.userid);
  };

  const showDeleteAction = userIsAuthorizedTo('delete');
  const showEditAction = userIsAuthorizedTo('update');

  //  Only authenticated users can flag an annotation, except the annotation's author.
  const showFlagAction =
    flaggingEnabled(settings) &&
    !!userProfile.userid &&
    userProfile.userid !== annotation.user;

  const shareLink =
    sharingEnabled(settings) && annotationSharingLink(annotation);

  const onDelete = async () => {
    if (
      await confirm({
        title: 'Delete annotation?',
        message: 'Are you sure you want to delete this annotation?',
        confirmAction: 'Delete',
      })
    ) {
      try {
        await annotationsService.delete(annotation);
      } catch (err) {
        toastMessenger.error(err.message);
      }
    }
  };

  const onEdit = () => {
    store.createDraft(annotation, {
      tags: annotation.tags,
      text: annotation.text,
      isPrivate: isPrivate(annotation.permissions),
    });
  };

  const onFlag = () => {
    annotationsService
      .flag(annotation)
      .catch(() => toastMessenger.error('Flagging annotation failed'));
  };

  const onReplyClick = () => {
    if (!isLoggedIn) {
      store.openSidebarPanel('loginPrompt');
      return;
    }
    onReply();
  };

  return (
    <div className="AnnotationActionBar u-layout-row u-font--xlarge">
      {showEditAction && (
        <IconButton icon="edit" title="Edit" onClick={onEdit} />
      )}
      {showDeleteAction && (
        <IconButton icon="trash" title="Delete" onClick={onDelete} />
      )}
      <IconButton icon="reply" title="Reply" onClick={onReplyClick} />
      {shareLink && (
        <AnnotationShareControl
          annotation={annotation}
          group={annotationGroup}
          shareUri={shareLink}
        />
      )}
      {showFlagAction && !annotation.flagged && (
        <IconButton
          icon="flag"
          title="Report this annotation to moderators"
          onClick={onFlag}
        />
      )}
      {showFlagAction && annotation.flagged && (
        <IconButton
          pressed={true}
          icon="flag--active"
          title="Annotation has been reported to the moderators"
        />
      )}
    </div>
  );
}

export default withServices(AnnotationActionBar, [
  'annotationsService',
  'settings',
  'toastMessenger',
]);
