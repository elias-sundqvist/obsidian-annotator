import classnames from 'classnames';
import { SvgIcon } from '@hypothesis/frontend-shared';

import { useShortcut } from '../../shared/shortcut';

/**
 * @param {Object} props
 *  @param {number} [props.badgeCount]
 *  @param {string} [props.icon]
 *  @param {string} props.label
 *  @param {() => any} props.onClick
 *  @param {string|null} props.shortcut
 */
function ToolbarButton({ badgeCount, icon, label, onClick, shortcut }) {
  useShortcut(shortcut, onClick);

  const title = shortcut ? `${label} (${shortcut})` : label;

  return (
    <button
      className="AdderToolbar__button"
      onClick={onClick}
      aria-label={title}
      title={title}
    >
      {icon && <SvgIcon name={icon} className="AdderToolbar__icon" />}
      {typeof badgeCount === 'number' && (
        <span className="AdderToolbar__badge">{badgeCount}</span>
      )}
      <span className="AdderToolbar__label">{label}</span>
    </button>
  );
}

/**
 * Union of possible toolbar commands.
 *
 * @typedef {'annotate'|'highlight'|'show'|'hide'} Command
 */

/**
 * @typedef AdderToolbarProps
 * @prop {'up'|'down'} arrowDirection -
 *   Whether the arrow pointing out of the toolbar towards the selected text
 *   should appear above the toolbar pointing Up or below the toolbar pointing
 *   Down.
 * @prop {boolean} isVisible - Whether to show the toolbar or not.
 * @prop {(c: Command) => any} onCommand - Called when a toolbar button is clicked.
 * @prop {number} [annotationCount] -
 *   Number of annotations associated with the selected text.
 *   If non-zero, a "Show" button is displayed to allow the user to see the
 *   annotations that correspond to the selection.
 */

/**
 * The toolbar that is displayed above selected text in the document providing
 * options to create annotations or highlights.
 *
 * @param {AdderToolbarProps} props
 */
export default function AdderToolbar({
  arrowDirection,
  isVisible,
  onCommand,
  annotationCount = 0,
}) {
  // Since the selection toolbar is only shown when there is a selection
  // of static text, we can use a plain key without any modifier as
  // the shortcut. This avoids conflicts with browser/OS shortcuts.
  const annotateShortcut = isVisible ? 'a' : null;
  const highlightShortcut = isVisible ? 'h' : null;
  const showShortcut = isVisible ? 's' : null;
  const hideShortcut = isVisible ? 'Escape' : null;

  // Add a shortcut to close the adder. Note, there is no button associated with this
  // shortcut because any outside click will also hide the adder.
  useShortcut(hideShortcut, () => onCommand('hide'));

  // nb. The adder is hidden using the `visibility` property rather than `display`
  // so that we can compute its size in order to position it before display.
  return (
    <div
      className={classnames('AdderToolbar', {
        'AdderToolbar--down': arrowDirection === 'up',
        'AdderToolbar--up': arrowDirection === 'down',
        'is-active': isVisible,
      })}
      style={{ visibility: isVisible ? 'visible' : 'hidden' }}
    >
      <div className="AdderToolbar__actions">
        <ToolbarButton
          icon="annotate"
          onClick={() => onCommand('annotate')}
          label="Annotate"
          shortcut={annotateShortcut}
        />
        <ToolbarButton
          icon="highlight"
          onClick={() => onCommand('highlight')}
          label="Highlight"
          shortcut={highlightShortcut}
        />
        {annotationCount > 0 && <div className="AdderToolbar__separator" />}
        {annotationCount > 0 && (
          <ToolbarButton
            badgeCount={annotationCount}
            onClick={() => onCommand('show')}
            label="Show"
            shortcut={showShortcut}
          />
        )}
      </div>
      <SvgIcon
        name="pointer"
        inline={true}
        className={classnames('AdderToolbar__arrow', {
          'AdderToolbar__arrow--down': arrowDirection === 'down',
          'AdderToolbar__arrow--up': arrowDirection === 'up',
        })}
      />
    </div>
  );
}
