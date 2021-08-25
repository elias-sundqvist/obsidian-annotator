import {
  SvgIcon,
  normalizeKeyName,
  useElementShouldClose,
} from '@hypothesis/frontend-shared';
import { useRef, useState } from 'preact/hooks';

import { withServices } from '../service-context';

import AutocompleteList from './AutocompleteList';

/** @typedef {import("preact").JSX.Element} JSXElement */

// Global counter used to create a unique id for each instance of a TagEditor
let tagEditorIdCounter = 0;

/**
 * @typedef TagEditorProps
 * @prop {(tag: string) => boolean} onAddTag - Callback to add a tag to the annotation
 * @prop {(tag: string) => boolean} onRemoveTag - Callback to remove a tag from the annotation
 * @prop {(tag: string) => any} onTagInput - Callback when inputted tag text changes
 * @prop {string[]} tagList - The list of tags for the annotation under edit
 * @prop {import('../services/tags').TagsService} tags
 */

/**
 * Component to edit annotation's tags.
 *
 * Component accessibility is modeled after "Combobox with Listbox Popup Examples" found here:
 * https://www.w3.org/TR/wai-aria-practices/examples/combobox/aria1.1pattern/listbox-combo.html
 *
 * @param {TagEditorProps} props
 */
function TagEditor({
  onAddTag,
  onRemoveTag,
  onTagInput,
  tagList,
  tags: tagsService,
}) {
  const inputEl = useRef(/** @type {HTMLInputElement|null} */ (null));
  const [suggestions, setSuggestions] = useState(/** @type {string[]} */ ([]));
  const [activeItem, setActiveItem] = useState(-1); // -1 is unselected
  const [suggestionsListOpen, setSuggestionsListOpen] = useState(false);
  const [tagEditorId] = useState(() => {
    ++tagEditorIdCounter;
    return `TagEditor-${tagEditorIdCounter}`;
  });

  // Set up callback to monitor outside click events to close the AutocompleteList
  const closeWrapperRef = useRef(/** @type {HTMLElement|null} */ (null));
  useElementShouldClose(closeWrapperRef, suggestionsListOpen, () => {
    setSuggestionsListOpen(false);
  });

  /**
   * Retrieve the current trimmed text value of the tag <input>
   */
  const pendingTag = () => inputEl.current.value.trim();
  const hasPendingTag = () => pendingTag() && pendingTag().length > 0;
  const clearPendingTag = () => {
    inputEl.current.value = '';
    onTagInput?.('');
  };

  /**
   * Helper function that returns a list of suggestions less any
   * results also found from the duplicates list.
   *
   * @param {string[]} suggestions - Original list of suggestions
   * @param {string[]} duplicates - Items to be removed from the result
   * @return {string[]}
   */
  const removeDuplicates = (suggestions, duplicates) => {
    const suggestionsSet = [];
    suggestions.forEach(suggestion => {
      if (duplicates.indexOf(suggestion) < 0) {
        suggestionsSet.push(suggestion);
      }
    });
    return suggestionsSet.sort();
  };

  /**
   * Get a list of suggestions returned from the tagsService
   * reset the activeItem and open the AutocompleteList
   */
  const updateSuggestions = () => {
    if (!hasPendingTag()) {
      // If there is no input, just hide the suggestions
      setSuggestionsListOpen(false);
    } else {
      // Call filter() with a query value to return all matching suggestions.
      const suggestions = tagsService.filter(pendingTag());
      // Remove any repeated suggestions that are already tags
      // and set those to state.
      setSuggestions(removeDuplicates(suggestions, tagList));
      setSuggestionsListOpen(suggestions.length > 0);
    }
    setActiveItem(-1);
  };

  /**
   * Invokes callback to add tag. If the tag was added, close the suggestions
   * list, clear the field content and maintain focus.
   *
   * @param {string} newTag
   */
  const addTag = newTag => {
    if (onAddTag(newTag)) {
      setSuggestionsListOpen(false);
      setActiveItem(-1);

      clearPendingTag();
      inputEl.current.focus();
    }
  };

  const handleOnInput = () => {
    onTagInput?.(pendingTag());
    updateSuggestions();
  };

  /**
   *  Callback when the user clicked one of the items in the suggestions list.
   *  This will add a new tag.
   *
   * @param {string} item
   */
  const handleSelect = item => {
    if (item) {
      addTag(item);
    }
  };

  /**
   * Opens the AutocompleteList on focus if there is a value in the input
   */
  const handleFocus = () => {
    if (hasPendingTag()) {
      setSuggestionsListOpen(true);
    }
  };

  /**
   *  Called when the user uses keyboard navigation to move
   *  up or down the suggestions list creating a highlighted
   *  item.
   *
   *  The first value in the list is an unselected value (-1).
   *  A user can arrive at this value by pressing the up arrow back to
   *  the beginning or the down arrow until the end.
   *
   * @param {number} direction - Pass 1 for the next item or -1 for the previous
   */
  const changeSelectedItem = direction => {
    let nextActiveItem = activeItem + direction;
    if (nextActiveItem < -1) {
      nextActiveItem = suggestions.length - 1;
    } else if (nextActiveItem >= suggestions.length) {
      nextActiveItem = -1;
    }
    setActiveItem(nextActiveItem);
  };

  /**
   * Keydown handler for keyboard navigation of the tag editor field and the
   * suggested-tags list.
   *
   * @param {KeyboardEvent} e
   */
  const handleKeyDown = e => {
    switch (normalizeKeyName(e.key)) {
      case 'ArrowUp':
        // Select the previous item in the suggestion list
        changeSelectedItem(-1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        // Select the next item in the suggestion list
        changeSelectedItem(1);
        e.preventDefault();
        break;
      case 'Escape':
        // Clear any entered text, but retain focus
        clearPendingTag();
        e.preventDefault();
        break;
      case 'Enter':
      case ',':
        // Commit a tag
        if (activeItem === -1) {
          // nothing selected, just add the typed text
          addTag(pendingTag());
        } else {
          // Add the selected tag
          addTag(suggestions[activeItem]);
        }
        e.preventDefault();
        break;
      case 'Tab':
        // Commit a tag, or tab out of the field if it is empty (default browser
        // behavior)
        if (!hasPendingTag()) {
          // If the tag field is empty, allow `Tab` to have its default
          // behavior: continue to the next element in tab order
          break;
        }
        if (activeItem !== -1) {
          // If there is a selected item in the suggested tag list,
          // commit that tag (just like `Enter` and `,` in this case)
          addTag(suggestions[activeItem]);
        } else if (suggestions.length === 1) {
          // If there is exactly one suggested tag match, commit that tag
          // This emulates a "tab-complete" behavior
          addTag(suggestions[0]);
        } else {
          // Commit the tag as typed in the field
          addTag(pendingTag());
        }
        // Retain focus
        e.preventDefault();
        break;
    }
  };

  /**
   * Callback for formatting a suggested tag item. Use selective bolding
   * to help delineate which part of the entered tag text matches the
   * suggestion.
   *
   * @param {string} item - Suggested tag
   * @return {JSXElement} - Formatted tag for use in list
   */
  const formatSuggestedItem = item => {
    // filtering of tags is case-insensitive
    const curVal = pendingTag().toLowerCase();
    const suggestedTag = item.toLowerCase();
    const matchIndex = suggestedTag.indexOf(curVal);

    // If the current input doesn't seem to match the suggested tag,
    // just render the tag as-is.
    if (matchIndex === -1) {
      return <span>{item}</span>;
    }

    // Break the suggested tag into three parts:
    // 1. Substring of the suggested tag that occurs before the match
    //    with the current input
    const prefix = item.slice(0, matchIndex);
    // 2. Substring of the suggested tag that matches the input text. NB:
    //    This may be in a different case than the input text.
    const matchString = item.slice(matchIndex, matchIndex + curVal.length);
    // 3. Substring of the suggested tag that occurs after the matched input
    const suffix = item.slice(matchIndex + curVal.length);

    return (
      <span>
        <strong>{prefix}</strong>
        {matchString}
        <strong>{suffix}</strong>
      </span>
    );
  };

  // The activedescendant prop should match the activeItem's value except
  // when its -1 (no item selected), and in this case set the activeDescendant to "".
  const activeDescendant =
    activeItem >= 0 ? `${tagEditorId}-AutocompleteList-item-${activeItem}` : '';

  return (
    <div className="TagEditor">
      <ul
        className="TagEditor__tags"
        aria-label="Suggested tags for annotation"
      >
        {tagList.map(tag => {
          return (
            <li
              key={`${tag}`}
              className="TagEditor__item"
              aria-label={`Tag: ${tag}`}
            >
              <span lang="" className="TagEditor__edit">
                {tag}
              </span>
              <button
                onClick={() => {
                  onRemoveTag(tag);
                }}
                aria-label={`Remove Tag: ${tag}`}
                title={`Remove Tag: ${tag}`}
                className="TagEditor__delete"
              >
                <SvgIcon name="cancel" />
              </button>
            </li>
          );
        })}
      </ul>
      <span
        id={tagEditorId}
        className="TagEditor__combobox-wrapper"
        ref={closeWrapperRef}
        // Disabled because aria-controls must be attached to the <input> field
        // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
        role="combobox"
        aria-expanded={suggestionsListOpen.toString()}
        aria-owns={`${tagEditorId}-AutocompleteList`}
        aria-haspopup="listbox"
      >
        <input
          onInput={handleOnInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          ref={inputEl}
          placeholder="Add new tags"
          className="TagEditor__input"
          type="text"
          autoComplete="off"
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          aria-controls={`${tagEditorId}-AutocompleteList`}
          dir="auto"
        />
        <AutocompleteList
          id={`${tagEditorId}-AutocompleteList`}
          list={suggestions}
          listFormatter={formatSuggestedItem}
          open={suggestionsListOpen}
          onSelectItem={handleSelect}
          itemPrefixId={`${tagEditorId}-AutocompleteList-item-`}
          activeItem={activeItem}
        />
      </span>
    </div>
  );
}

export default withServices(TagEditor, ['tags']);
