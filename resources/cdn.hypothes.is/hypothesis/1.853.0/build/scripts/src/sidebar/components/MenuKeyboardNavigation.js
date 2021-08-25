import { normalizeKeyName } from '@hypothesis/frontend-shared';
import { useEffect, useRef } from 'preact/hooks';

function isElementVisible(element) {
  return element.offsetParent !== null;
}

/**
 * @typedef MenuKeyboardNavigationProps
 * @prop {string} [className]
 * @prop {(e: KeyboardEvent) => any} [closeMenu] - Callback when the menu is closed via keyboard input
 * @prop {boolean} [visible] - When  true`, sets focus on the first item in the list
 * @prop {Object} children - Array of nodes which may contain <MenuItems> or any nodes
 */

/**
 * Helper component used by Menu and MenuItem to facilitate keyboard navigation of a
 * list of <MenuItem> components. This component should not be used directly.
 *
 * Note that `ArrowRight` shall be handled by the parent <MenuItem> directly and
 * all other focus() related navigation is handled here.
 *
 * @param {MenuKeyboardNavigationProps} props
 */
export default function MenuKeyboardNavigation({
  className,
  closeMenu,
  children,
  visible,
}) {
  const menuRef = useRef(/** @type {HTMLDivElement|null} */ (null));

  useEffect(() => {
    let focusTimer = null;
    if (visible) {
      focusTimer = setTimeout(() => {
        // The focus won't work without delaying rendering.
        const firstItem = menuRef.current.querySelector('[role^="menuitem"]');
        if (firstItem) {
          /** @type {HTMLElement} */ (firstItem).focus();
        }
      });
    }
    return () => {
      // unmount
      clearTimeout(focusTimer);
    };
  }, [visible]);

  const onKeyDown = event => {
    const menuItems = Array.from(
      /** @type {NodeListOf<HTMLElement>} */
      (menuRef.current.querySelectorAll('[role^="menuitem"]'))
    ).filter(isElementVisible);

    let focusedIndex = menuItems.findIndex(el =>
      el.contains(document.activeElement)
    );

    let handled = false;

    switch (normalizeKeyName(event.key)) {
      case 'ArrowLeft':
      case 'Escape':
        if (closeMenu) {
          closeMenu(event);
          handled = true;
        }
        break;
      case 'ArrowUp':
        focusedIndex -= 1;
        if (focusedIndex < 0) {
          focusedIndex = menuItems.length - 1;
        }
        handled = true;
        break;
      case 'ArrowDown':
        focusedIndex += 1;
        if (focusedIndex === menuItems.length) {
          focusedIndex = 0;
        }
        handled = true;
        break;
      case 'Home':
        focusedIndex = 0;
        handled = true;
        break;
      case 'End':
        focusedIndex = menuItems.length - 1;
        handled = true;
        break;
    }

    if (handled && focusedIndex >= 0) {
      event.stopPropagation();
      event.preventDefault();
      menuItems[focusedIndex].focus();
    }
  };

  return (
    // This element needs to have role="menu" to facilitate readers
    // correctly enumerating discrete submenu items, but it also needs
    // to facilitate keydown events for navigation. Disable the linter
    // error so it can do both.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div role="menu" className={className} ref={menuRef} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}
