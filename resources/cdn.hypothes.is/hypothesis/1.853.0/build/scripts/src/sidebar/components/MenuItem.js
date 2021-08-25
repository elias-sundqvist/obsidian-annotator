import classnames from 'classnames';
import { SvgIcon, normalizeKeyName } from '@hypothesis/frontend-shared';
import { useEffect, useRef } from 'preact/hooks';

import MenuKeyboardNavigation from './MenuKeyboardNavigation';
import Slider from './Slider';

/**
 * @typedef MenuItemProps
 * @prop {string} [href] -
 *   URL of the external link to open when this item is clicked. Either the `href` or an
 *   `onClick` callback should be supplied.
 * @prop {string} [iconAlt] - Alt text for icon.
 * @prop {string} [icon] -
 *   Name or URL of icon to display. If the value is a URL it is displayed using an `<img>`,
 *   if it is a name it is displayed using `SvgIcon`.  If the property is `"blank"` a blank
 *   placeholder is displayed in place of an icon. If the property is falsey, no placeholder
 *   is displayed. The placeholder is useful to keep menu item labels aligned in a list if
 *   some items have icons and others do not.
 * @prop {boolean} [isDisabled] -
 *   Dim the label to indicate that this item is not currently available.  The `onClick`
 *   callback will still be invoked when this item is clicked and the submenu, if any,
 *   can still be toggled.
 * @prop {boolean} [isExpanded] -
 *   Indicates that the submenu associated with this item is currently open.
 * @prop {boolean} [isSelected] -
 *   Display an indicator to show that this menu item represents something which is currently
 *   selected/active/focused.
 * @prop {boolean} [isSubmenuItem] -
 *   True if this item is part of a submenu, in which case it is rendered with a different
 *   style (shaded background)
 * @prop {boolean|undefined} [isSubmenuVisible] -
 *   If present, display a button to toggle the sub-menu associated with this item and
 *   indicate the current state; `true` if the submenu is visible. Note. Omit this prop,
 *    or set it to null, if there is no `submenu`.
 * @prop {string} label - Label of the menu item.
 * @prop {(e: Event) => any} [onClick] - Callback to invoke when the menu item is clicked.
 * @prop {(e: Event) => any} [onToggleSubmenu] -
 *   Callback when the user clicks on the toggle to change the expanded state of the menu.
 * @prop {Object} [submenu] -
 *   Contents of the submenu for this item.  This is typically a list of `MenuItem` components
 *    with the `isSubmenuItem` prop set to `true`, but can include other content as well.
 *    The submenu is only rendered if `isSubmenuVisible` is `true`.
 */

/**
 * An item in a dropdown menu.
 *
 * Dropdown menu items display an icon, a label and can optionally have a submenu
 * associated with them.
 *
 * When clicked, menu items either open an external link, if the `href` prop
 * is provided, or perform a custom action via the `onClick` callback.
 *
 * The icon can either be an external SVG image, referenced by URL, or a named
 * icon rendered by an `SvgIcon`.
 *
 * For items that have submenus, the `MenuItem` will call the `renderSubmenu`
 * prop to render the content of the submenu, when the submenu is visible.
 * Note that the `submenu` is not supported for link (`href`) items.
 *
 * @param {MenuItemProps} props
 */
export default function MenuItem({
  href,
  icon,
  iconAlt,
  isDisabled,
  isExpanded,
  isSelected,
  isSubmenuItem,
  isSubmenuVisible,
  label,
  onClick,
  onToggleSubmenu,
  submenu,
}) {
  const iconClass = 'MenuItem__icon';
  const iconIsUrl = icon && icon.indexOf('/') !== -1;

  const hasLeftIcon = icon || isSubmenuItem;
  const hasRightIcon = icon && isSubmenuItem;

  const menuItemRef = useRef(
    /** @type {(HTMLAnchorElement & HTMLDivElement)|null} */ (null)
  );
  let focusTimer = null;

  let renderedIcon = null;
  if (icon && icon !== 'blank') {
    renderedIcon = iconIsUrl ? (
      <img className={iconClass} alt={iconAlt} src={icon} />
    ) : (
      <SvgIcon name={icon} className="MenuItem__icon" />
    );
  }
  const leftIcon = isSubmenuItem ? null : renderedIcon;
  const rightIcon = isSubmenuItem ? renderedIcon : null;

  // menuItem can be either a link or a button
  let menuItem;
  const hasSubmenuVisible = typeof isSubmenuVisible === 'boolean';
  const isRadioButtonType = typeof isSelected === 'boolean';

  useEffect(() => {
    return () => {
      // unmount
      clearTimeout(focusTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCloseSubmenu = event => {
    if (onToggleSubmenu) {
      onToggleSubmenu(event);
    }
    // The focus won't work without delaying rendering.
    focusTimer = setTimeout(() => {
      menuItemRef.current.focus();
    });
  };

  const onKeyDown = event => {
    switch (normalizeKeyName(event.key)) {
      case 'ArrowRight':
        if (onToggleSubmenu) {
          event.stopPropagation();
          event.preventDefault();
          onToggleSubmenu(event);
        }
        break;
      case 'Enter':
      case ' ':
        if (onClick) {
          // Let event propagate so the menu closes
          onClick(event);
        }
    }
  };
  if (href) {
    // The menu item is a link
    menuItem = (
      <a
        ref={menuItemRef}
        className={classnames('MenuItem', {
          'is-submenu': isSubmenuItem,
          'is-disabled': isDisabled,
        })}
        href={href}
        target="_blank"
        tabIndex={-1}
        rel="noopener noreferrer"
        role="menuitem"
        onKeyDown={onKeyDown}
      >
        {hasLeftIcon && (
          <div className="MenuItem__icon-container">{leftIcon}</div>
        )}
        <span className="MenuItem__label">{label}</span>
        {hasRightIcon && (
          <div className="MenuItem__icon-container">{rightIcon}</div>
        )}
      </a>
    );
  } else {
    // The menu item is a clickable button or radio button.
    // In either case there may be an optional submenu.

    menuItem = (
      <div
        ref={menuItemRef}
        className={classnames('MenuItem', {
          'is-submenu': isSubmenuItem,
          'is-disabled': isDisabled,
          'is-expanded': isExpanded,
          'is-selected': isSelected,
        })}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={onClick}
        role={isRadioButtonType ? 'menuitemradio' : 'menuitem'}
        aria-checked={isRadioButtonType ? isSelected : undefined}
        aria-haspopup={hasSubmenuVisible}
        aria-expanded={hasSubmenuVisible ? isSubmenuVisible : undefined}
      >
        {hasLeftIcon && (
          <div className="MenuItem__icon-container">{leftIcon}</div>
        )}
        <span className="MenuItem__label">{label}</span>
        {hasRightIcon && (
          <div className="MenuItem__icon-container">{rightIcon}</div>
        )}

        {hasSubmenuVisible && (
          <div
            // We should not have a <button> inside of the menu item itself
            // but we have a non-standard mechanism with the toggle control
            // requiring an onClick event nested inside a "menuitemradio|menuitem".
            // Therefore, a static element with a role="none" is necessary here.
            role="none"
            icon={isSubmenuVisible ? 'collapse-menu' : 'expand-menu'}
            className="MenuItem__toggle"
            onClick={onToggleSubmenu}
            title={`Show actions for ${label}`}
          >
            <SvgIcon
              name={isSubmenuVisible ? 'collapse-menu' : 'expand-menu'}
              className="MenuItem__toggle-icon"
            />
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      {menuItem}
      {hasSubmenuVisible && (
        <Slider visible={/** @type {boolean} */ (isSubmenuVisible)}>
          <MenuKeyboardNavigation
            closeMenu={onCloseSubmenu}
            visible={/** @type {boolean} */ (isSubmenuVisible)}
            className="MenuItem__submenu"
          >
            {submenu}
          </MenuKeyboardNavigation>
        </Slider>
      )}
    </>
  );
}
