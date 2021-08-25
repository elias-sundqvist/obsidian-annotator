import { SvgIcon } from '@hypothesis/frontend-shared';

import { useStoreProxy } from '../store/use-store';

import Menu from './Menu';
import MenuItem from './MenuItem';

/**
 * A drop-down menu of sorting options for a collection of annotations.
 */
export default function SortMenu() {
  const store = useStoreProxy();
  // The currently-applied sort order
  const sortKey = store.sortKey();
  // All available sorting options. These change depending on current
  // "tab" or context.
  const sortKeysAvailable = store.sortKeys();

  const menuItems = sortKeysAvailable.map(sortOption => {
    return (
      <MenuItem
        key={sortOption}
        label={sortOption}
        onClick={() => store.setSortKey(sortOption)}
        isSelected={sortOption === sortKey}
      />
    );
  });

  const menuLabel = (
    <span className="TopBar__menu-label">
      <SvgIcon name="sort" className="TopBar__menu-icon" />
    </span>
  );

  return (
    <div className="SortMenu">
      <Menu
        label={menuLabel}
        title={`Sort by ${sortKey}`}
        align="right"
        menuIndicator={false}
      >
        {menuItems}
      </Menu>
    </div>
  );
}
