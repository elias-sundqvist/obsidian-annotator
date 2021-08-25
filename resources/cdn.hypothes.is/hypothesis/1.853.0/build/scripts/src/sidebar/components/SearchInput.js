import { IconButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useRef, useState } from 'preact/hooks';

import { useStoreProxy } from '../store/use-store';

import Spinner from './Spinner';

/**
 * @typedef SearchInputProps
 * @prop {boolean} [alwaysExpanded] -
 *   If true, the input field is always shown. If false, the input field is only shown
 *   if the query is non-empty.
 * @prop {string|null} query - The currently active filter query
 * @prop {(value: string) => any} onSearch -
 *   Callback to invoke when the current filter query changes
 */

/**
 * An input field in the top bar for entering a query that filters annotations
 * (in the sidebar) or searches annotations (in the stream/single annotation
 * view).
 *
 * This component also renders a eloading spinner to indicate when the client
 * is fetching for data from the API or in a "loading" state for any other
 * reason.
 *
 * @param {SearchInputProps} props
 */
export default function SearchInput({ alwaysExpanded, query, onSearch }) {
  const store = useStoreProxy();
  const isLoading = store.isLoading();
  const input = useRef(/** @type {HTMLInputElement|null} */ (null));

  // The active filter query from the previous render.
  const [prevQuery, setPrevQuery] = useState(query);

  // The query that the user is currently typing, but may not yet have applied.
  const [pendingQuery, setPendingQuery] = useState(query);

  const onSubmit = e => {
    e.preventDefault();
    if (input.current.value || prevQuery) {
      // Don't set an initial empty query, but allow a later empty query to
      // clear `prevQuery`
      onSearch(input.current.value);
    }
  };

  // When the active query changes outside of this component, update the input
  // field to match. This happens when clearing the current filter for example.
  if (query !== prevQuery) {
    setPendingQuery(query);
    setPrevQuery(query);
  }

  return (
    <form
      action="#"
      className="SearchInput__form"
      name="searchForm"
      onSubmit={onSubmit}
    >
      <input
        aria-label="Search"
        className={classnames('SearchInput__input', {
          'is-expanded': alwaysExpanded || query,
        })}
        dir="auto"
        type="text"
        name="query"
        placeholder={(isLoading && 'Loading…') || 'Search…'}
        disabled={isLoading}
        ref={input}
        value={pendingQuery || ''}
        onInput={e =>
          setPendingQuery(/** @type {HTMLInputElement} */ (e.target).value)
        }
      />
      {!isLoading && (
        <div className="SearchInput__button-container">
          <IconButton
            icon="search"
            onClick={() => input.current.focus()}
            size="small"
            title="Search annotations"
          />
        </div>
      )}
      {isLoading && <Spinner />}
    </form>
  );
}
