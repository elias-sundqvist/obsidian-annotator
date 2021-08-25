import { LinkButton } from '@hypothesis/frontend-shared';

/**
 * @typedef AnnotationReplyToggleProps
 * @prop {() => any} onToggleReplies
 * @prop {number} replyCount
 * @prop {boolean} threadIsCollapsed
 */

/**
 * Render a thread-card control to toggle (expand or collapse) all of this
 * thread's children.
 *
 * @param {AnnotationReplyToggleProps} props
 */
function AnnotationReplyToggle({
  onToggleReplies,
  replyCount,
  threadIsCollapsed,
}) {
  const toggleAction = threadIsCollapsed ? 'Show replies' : 'Hide replies';
  const toggleText = `${toggleAction} (${replyCount})`;

  return (
    <LinkButton onClick={onToggleReplies} title={toggleText}>
      {toggleText}
    </LinkButton>
  );
}

export default AnnotationReplyToggle;
