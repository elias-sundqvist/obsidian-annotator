import classnames from 'classnames';

import { useStoreProxy } from '../store/use-store';
import * as annotationMetadata from '../helpers/annotation-metadata';
import { withServices } from '../service-context';

/**
 * @typedef {import('../../types/api').Annotation} Annotation
 */

/**
 * @typedef ModerationBannerProps
 * @prop {Annotation} annotation -
 *   The annotation object for this banner. This contains state about the flag count
 *   or its hidden value.
 * @prop {import('../services/api').APIService} api
 * @prop {import('../services/toast-messenger').ToastMessengerService} toastMessenger
 */

/**
 * Banner allows moderators to hide/unhide the flagged
 * annotation from other users.
 *
 * @param {ModerationBannerProps} props
 */
function ModerationBanner({ annotation, api, toastMessenger }) {
  const store = useStoreProxy();
  const flagCount = annotationMetadata.flagCount(annotation);

  const isHiddenOrFlagged =
    flagCount !== null && (flagCount > 0 || annotation.hidden);

  /**
   * Hide an annotation from non-moderator users.
   */
  const hideAnnotation = () => {
    const id = /** @type {string} */ (annotation.id);
    api.annotation
      .hide({ id })
      .then(() => {
        store.hideAnnotation(id);
      })
      .catch(() => {
        toastMessenger.error('Failed to hide annotation');
      });
  };

  /**
   * Un-hide an annotation from non-moderator users.
   */
  const unhideAnnotation = () => {
    const id = /** @type {string} */ (annotation.id);
    api.annotation
      .unhide({ id })
      .then(() => {
        store.unhideAnnotation(id);
      })
      .catch(() => {
        toastMessenger.error('Failed to unhide annotation');
      });
  };

  const toggleButtonProps = (() => {
    const buttonProps = {};
    if (annotation.hidden) {
      buttonProps.onClick = unhideAnnotation;
      buttonProps.title = 'Make this annotation visible to everyone';
    } else {
      buttonProps.onClick = hideAnnotation;
      buttonProps.title = 'Hide this annotation from non-moderators';
    }
    buttonProps['aria-label'] = buttonProps.title;
    return buttonProps;
  })();

  const bannerClasses = classnames('ModerationBanner', {
    'is-flagged': flagCount !== null && flagCount > 0,
    'is-hidden': annotation.hidden,
    'is-reply': annotationMetadata.isReply(annotation),
  });

  if (!isHiddenOrFlagged) {
    return null;
  }
  return (
    <div className={bannerClasses}>
      {!!flagCount && !annotation.hidden && (
        <span>Flagged for review x{flagCount}</span>
      )}
      {annotation.hidden && (
        <span>Hidden from users. Flagged x{flagCount}</span>
      )}
      <span className="u-stretch" />
      <button {...toggleButtonProps}>
        {annotation.hidden ? 'Unhide' : 'Hide'}
      </button>
    </div>
  );
}

export default withServices(ModerationBanner, ['api', 'toastMessenger']);
