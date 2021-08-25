import { SvgIcon } from '@hypothesis/frontend-shared';

import { useStoreProxy } from '../../store/use-store';
import { isPrivate } from '../../helpers/permissions';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 * @typedef {import('../../../types/api').Group} Group
 */

/**
 * @typedef AnnotationShareInfoProps
 * @prop {Annotation} annotation
 */

/**
 * Render information about what group an annotation is in and
 * whether it is private to the current user (only me)
 *
 * @param {AnnotationShareInfoProps} props
 */
function AnnotationShareInfo({ annotation }) {
  const store = useStoreProxy();
  const group = store.getGroup(annotation.group);

  // Only show the name of the group and link to it if there is a
  // URL (link) returned by the API for this group. Some groups do not have links
  const linkToGroup = group?.links.html;

  const annotationIsPrivate = isPrivate(annotation.permissions);

  return (
    <div className="AnnotationShareInfo u-layout-row--align-baseline">
      {group && linkToGroup && (
        <a
          className="u-layout-row--align-baseline u-color-text--muted"
          href={group.links.html}
          target="_blank"
          rel="noopener noreferrer"
        >
          {group.type === 'open' ? (
            <SvgIcon className="AnnotationShareInfo__icon" name="public" />
          ) : (
            <SvgIcon className="AnnotationShareInfo__icon" name="groups" />
          )}
          <span className="AnnotationShareInfo__group-info">{group.name}</span>
        </a>
      )}
      {annotationIsPrivate && !linkToGroup && (
        <span className="u-layout-row--align-baseline u-color-text--muted">
          <span className="AnnotationShareInfo__private-info">Only me</span>
        </span>
      )}
    </div>
  );
}

export default AnnotationShareInfo;
