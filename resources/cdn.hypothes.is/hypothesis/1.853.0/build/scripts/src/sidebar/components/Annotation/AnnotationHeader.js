import { SvgIcon, LinkButton } from '@hypothesis/frontend-shared';
import { useMemo } from 'preact/hooks';
import { withServices } from '../../service-context';

import { useStoreProxy } from '../../store/use-store';
import { isThirdPartyUser, username } from '../../helpers/account-id';
import {
  domainAndTitle,
  isHighlight,
  isReply,
  hasBeenEdited,
} from '../../helpers/annotation-metadata';
import { annotationDisplayName } from '../../helpers/annotation-user';
import { isPrivate } from '../../helpers/permissions';

import AnnotationDocumentInfo from './AnnotationDocumentInfo';
import AnnotationShareInfo from './AnnotationShareInfo';
import AnnotationTimestamps from './AnnotationTimestamps';
import AnnotationUser from './AnnotationUser';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 * @typedef {import('../../../types/config').MergedConfig} MergedConfig
 */

/**
 * @typedef AnnotationHeaderProps
 * @prop {Annotation} annotation
 * @prop {boolean} [isEditing] - Whether the annotation is actively being edited
 * @prop {number} replyCount - How many replies this annotation currently has
 * @prop {boolean} threadIsCollapsed - Is this thread currently collapsed?
 * @prop {MergedConfig} settings - Injected
 *
 */

/**
 * Render an annotation's header summary, including metadata about its user,
 * sharing status, document and timestamp. It also allows the user to
 * toggle sub-threads/replies in certain cases.
 *
 * @param {AnnotationHeaderProps} props
 */
function AnnotationHeader({
  annotation,
  isEditing,
  replyCount,
  threadIsCollapsed,
  settings,
}) {
  const store = useStoreProxy();
  const defaultAuthority = store.defaultAuthority();
  const displayNamesEnabled = store.isFeatureEnabled('client_display_names');

  const isThirdParty = isThirdPartyUser(annotation.user, defaultAuthority);
  const authorDisplayName = annotationDisplayName(
    annotation,
    isThirdParty,
    displayNamesEnabled
  );

  const authorLink = (() => {
    if (!isThirdParty) {
      return store.getLink('user', { user: annotation.user });
    } else {
      return (
        (settings.usernameUrl &&
          `${settings.usernameUrl}${username(annotation.user)}`) ??
        undefined
      );
    }
  })();

  const isCollapsedReply = isReply(annotation) && threadIsCollapsed;

  const annotationIsPrivate = isPrivate(annotation.permissions);

  // Link (URL) to single-annotation view for this annotation, if it has
  // been provided by the service. Note: this property is not currently
  // present on third-party annotations.
  const annotationUrl = annotation.links?.html || '';

  const showTimestamps = !isEditing && annotation.created;
  const showEditedTimestamp = useMemo(() => {
    return hasBeenEdited(annotation) && !isCollapsedReply;
  }, [annotation, isCollapsedReply]);

  const replyPluralized = replyCount > 1 ? 'replies' : 'reply';
  const replyButtonText = `${replyCount} ${replyPluralized}`;
  const showReplyButton = replyCount > 0 && isCollapsedReply;
  const showExtendedInfo = !isReply(annotation);

  // Pull together some document metadata related to this annotation
  const documentInfo = domainAndTitle(annotation);
  // There are some cases at present in which linking directly to an
  // annotation's document is not immediately feasible—e.g in an LMS context
  // where the original document might not be available outside of an
  // assignment (e.g. Canvas files), and/or wouldn't be able to present
  // any associated annotations.
  // For the present, disable links to annotation documents for all third-party
  // annotations until we have a more nuanced way of making linking determinations.
  // The absence of a link to a single-annotation view is a signal that this
  // is a third-party annotation.
  // Also, of course, verify that there is a URL to the document (titleLink)
  const documentLink =
    annotationUrl && documentInfo.titleLink ? documentInfo.titleLink : '';
  // Show document information on non-sidebar routes, assuming there is a title
  // to show, at the least
  const showDocumentInfo =
    store.route() !== 'sidebar' && documentInfo.titleText;

  const onReplyCountClick = () =>
    // If an annotation has replies it must have been saved and therefore have
    // an ID.
    store.setExpanded(/** @type {string} */ (annotation.id), true);

  return (
    <header className="AnnotationHeader">
      <div className="AnnotationHeader__row u-horizontal-rhythm">
        {annotationIsPrivate && !isEditing && (
          <SvgIcon
            className="AnnotationHeader__icon"
            name="lock"
            title="This annotation is visible only to you"
          />
        )}
        <AnnotationUser
          authorLink={authorLink}
          displayName={authorDisplayName}
        />
        {showReplyButton && (
          <LinkButton onClick={onReplyCountClick} title="Expand replies">
            {replyButtonText}
          </LinkButton>
        )}

        {showTimestamps && (
          <div className="u-layout-row--justify-right u-stretch">
            <AnnotationTimestamps
              annotationCreated={annotation.created}
              annotationUpdated={annotation.updated}
              annotationUrl={annotationUrl}
              withEditedTimestamp={showEditedTimestamp}
            />
          </div>
        )}
      </div>

      {showExtendedInfo && (
        <div className="AnnotationHeader__row u-horizontal-rhythm">
          <AnnotationShareInfo annotation={annotation} />
          {!isEditing && isHighlight(annotation) && (
            <div className="AnnotationHeader__highlight">
              <SvgIcon
                name="highlight"
                title="This is a highlight. Click 'edit' to add a note or tag."
                inline={true}
                className="AnnotationHeader__highlight-icon"
              />
            </div>
          )}
          {showDocumentInfo && (
            <AnnotationDocumentInfo
              domain={documentInfo.domain}
              link={documentLink}
              title={documentInfo.titleText}
            />
          )}
        </div>
      )}
    </header>
  );
}

export default withServices(AnnotationHeader, ['settings']);
