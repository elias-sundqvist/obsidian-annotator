import { SvgIcon } from '@hypothesis/frontend-shared';

import Menu from './Menu';
import MenuItem from './MenuItem';

/**
 * @typedef {import('../store/modules/filters').FilterOption} FilterOption
 */

/**
 * @typedef FilterSelectProps
 * @prop {FilterOption} defaultOption
 * @prop {string} [icon]
 * @prop {(selectedFilter: FilterOption) => any} onSelect
 * @prop {FilterOption[]} options
 * @prop {FilterOption} [selectedOption]
 * @prop {string} title
 */

/**
 * A select-element-like control for selecting one of a defined set of
 * options.
 *
 * @param {FilterSelectProps} props
 */
function FilterSelect({
  defaultOption,
  icon,
  onSelect,
  options,
  selectedOption,
  title,
}) {
  const filterOptions = [defaultOption, ...options];
  const selected = selectedOption ?? defaultOption;

  const menuLabel = (
    <span className="FilterSelect__menu-label">
      {icon && <SvgIcon name={icon} className="FilterSelect__menu-icon" />}
      {selected.display}
    </span>
  );

  return (
    <Menu label={menuLabel} title={title} contentClass="FilterSelect__menu">
      {filterOptions.map(filterOption => (
        <MenuItem
          onClick={() => onSelect(filterOption)}
          key={filterOption.value}
          isSelected={filterOption.value === selected.value}
          label={filterOption.display}
        />
      ))}
    </Menu>
  );
}

export default FilterSelect;
