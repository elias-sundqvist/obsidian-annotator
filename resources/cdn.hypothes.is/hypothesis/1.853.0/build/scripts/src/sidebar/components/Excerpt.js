import { LinkButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks';

import observeElementSize from '../util/observe-element-size';
import { withServices } from '../service-context';
import { applyTheme } from '../helpers/theme';

/**
 * @typedef InlineControlsProps
 * @prop {boolean} isCollapsed
 * @prop {(collapsed: boolean) => any} setCollapsed
 * @prop {Object} [linkStyle]
 */

/**
 * An optional toggle link at the bottom of an excerpt which controls whether
 * it is expanded or collapsed.
 *
 * @param {InlineControlsProps} props
 */
function InlineControls({ isCollapsed, setCollapsed, linkStyle = {} }) {
  const toggleLabel = isCollapsed ? 'More' : 'Less';

  return (
    <div className="Excerpt__inline-controls">
      <div className="Excerpt__toggle-container">
        <LinkButton
          className="InlineLinkButton"
          onClick={() => setCollapsed(!isCollapsed)}
          expanded={!isCollapsed}
          title="Toggle visibility of full excerpt text"
          style={linkStyle}
          variant="dark"
        >
          {toggleLabel}
        </LinkButton>
      </div>
    </div>
  );
}

const noop = () => {};

/**
 * @typedef ExcerptProps
 * @prop {Object} [children]
 * @prop {boolean} [inlineControls] - If `true`, the excerpt provides internal
 *   controls to expand and collapse the content. If `false`, the caller sets
 *   the collapsed state via the `collapse` prop.  When using inline controls,
 *   the excerpt is initially collapsed.
 * @prop {boolean} [collapse] - If the content should be truncated if its height
 *   exceeds `collapsedHeight + overflowThreshold`.  This prop is only used if
 *   `inlineControls` is false.
 * @prop {number} collapsedHeight - Maximum height of the container, in pixels,
 *   when it is collapsed.
 * @prop {number} [overflowThreshold] - An additional margin of pixels by which
 *   the content height can exceed `collapsedHeight` before it becomes collapsible.
 * @prop {(isCollapsible: boolean) => void} [onCollapsibleChanged] - Called when the content height
 *   exceeds or falls below `collapsedHeight + overflowThreshold`.
 * @prop {(collapsed: boolean) => void} [onToggleCollapsed] - When `inlineControls` is `false`, this
 *   function is called when the user requests to expand the content by clicking a
 *   zone at the bottom of the container.
 * @prop {Object} [settings] - Used for theming.
 */

/**
 * A container which truncates its content when they exceed a specified height.
 *
 * The collapsed state of the container can be handled either via internal
 * controls (if `inlineControls` is `true`) or by the caller using the
 * `collapse` prop.
 *
 * @param {ExcerptProps} props
 */
function Excerpt({
  children,
  collapse = false,
  collapsedHeight,
  inlineControls = true,
  onCollapsibleChanged = noop,
  onToggleCollapsed = noop,
  overflowThreshold = 0,
  settings = {},
}) {
  const [collapsedByInlineControls, setCollapsedByInlineControls] =
    useState(true);

  // Container for the excerpt's content.
  const contentElement = useRef(/** @type {HTMLDivElement|null} */ (null));

  // Measured height of `contentElement` in pixels.
  const [contentHeight, setContentHeight] = useState(0);

  // Update the measured height of the content after the initial render and
  // when the size of the content element changes.
  const updateContentHeight = useCallback(() => {
    const newContentHeight = contentElement.current.clientHeight;
    setContentHeight(newContentHeight);

    // prettier-ignore
    const isCollapsible =
      newContentHeight > (collapsedHeight + overflowThreshold);
    onCollapsibleChanged(isCollapsible);
  }, [collapsedHeight, onCollapsibleChanged, overflowThreshold]);

  useLayoutEffect(() => {
    const cleanup = observeElementSize(
      contentElement.current,
      updateContentHeight
    );
    updateContentHeight();
    return cleanup;
  }, [updateContentHeight]);

  // Render the (possibly truncated) content and controls for
  // expanding/collapsing the content.
  // prettier-ignore
  const isOverflowing = contentHeight > (collapsedHeight + overflowThreshold);
  const isCollapsed = inlineControls ? collapsedByInlineControls : collapse;
  const isExpandable = isOverflowing && isCollapsed;

  /** @type {Object} */
  const contentStyle = {};
  if (contentHeight !== 0) {
    contentStyle['max-height'] = isExpandable ? collapsedHeight : contentHeight;
  }

  const setCollapsed = collapsed =>
    inlineControls
      ? setCollapsedByInlineControls(collapsed)
      : onToggleCollapsed(collapsed);

  return (
    <div className="Excerpt" style={contentStyle}>
      <div className="Excerpt__content" ref={contentElement}>
        {children}
      </div>
      <div
        role="presentation"
        onClick={() => setCollapsed(false)}
        className={classnames({
          Excerpt__shadow: true,
          'Excerpt__shadow--transparent': inlineControls,
          'is-hidden': !isExpandable,
        })}
        title="Show the full excerpt"
      />
      {isOverflowing && inlineControls && (
        <InlineControls
          isCollapsed={collapsedByInlineControls}
          setCollapsed={setCollapsed}
          linkStyle={applyTheme(['selectionFontFamily'], settings)}
        />
      )}
    </div>
  );
}

export default withServices(Excerpt, ['settings']);
