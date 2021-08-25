import classnames from 'classnames';
import { useMemo } from 'preact/hooks';

const defaultListFormatter = item => item;

/**
 * @template T
 * @typedef AutocompleteListProps
 * @prop {number} [activeItem] - The index of the highlighted item.
 * @prop {string} [id] - Optional unique HTML attribute id. This can be used
 *   for parent `aria-controls` coupling.
 * @prop {string} [itemPrefixId] - Optional unique HTML attribute id prefix
 *   for each item in the list. The final value of each items' id is
 *   `{itemPrefixId}{activeItem}`
 * @prop {T[]} list - The list of items to render. This can be a simple
 *   list of strings or a list of objects when used with listFormatter.
 * @prop {(item: T, index?: number) => any} [listFormatter] - An optional formatter
 *   to render each item inside an <li> tag This is useful if the list is an array of
 *   objects rather than just strings.
 * @prop {(item: T) => void} onSelectItem - Callback when an item is clicked with
 *   the mouse.
 * @prop {boolean} [open] - Is the list open or closed?
 */

/**
 * Custom autocomplete component. Use this in conjunction with an <input> field.
 * To make this component W3 accessibility compliant, it is is intended to be
 * coupled to an <input> field or the TagEditor component and can not be
 * used by itself.
 *
 * Modeled after the "ARIA 1.1 Combobox with Listbox Popup"
 *
 * @template T
 * @param {AutocompleteListProps<T>} props
 */
export default function AutocompleteList({
  activeItem = -1,
  id,
  itemPrefixId,
  list,
  listFormatter = defaultListFormatter,
  onSelectItem,
  open = false,
}) {
  const items = useMemo(() => {
    return list.map((item, index) => {
      // only add an id if itemPrefixId is passed
      const props = itemPrefixId ? { id: `${itemPrefixId}${index}` } : {};

      return (
        // The parent <input> field should capture keyboard events
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <li
          key={`AutocompleteList-${index}`}
          role="option"
          aria-selected={(activeItem === index).toString()}
          className={classnames(
            {
              'is-selected': activeItem === index,
            },
            'AutocompleteList__li'
          )}
          onClick={() => {
            onSelectItem(item);
          }}
          {...props}
        >
          {listFormatter(item, index)}
        </li>
      );
    });
  }, [activeItem, itemPrefixId, list, listFormatter, onSelectItem]);

  const props = id ? { id } : {}; // only add the id if its passed
  const isHidden = list.length === 0 || !open;
  return (
    <div
      className={classnames(
        {
          'is-hidden': isHidden,
        },
        'AutocompleteList'
      )}
    >
      <ul
        className="AutocompleteList__items"
        tabIndex={-1}
        aria-label="Suggestions"
        role="listbox"
        {...props}
      >
        {items}
      </ul>
    </div>
  );
}
