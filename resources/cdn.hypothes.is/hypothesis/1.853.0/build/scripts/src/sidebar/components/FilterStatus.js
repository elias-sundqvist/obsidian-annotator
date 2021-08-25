import { LabeledButton } from '@hypothesis/frontend-shared';

import { useMemo } from 'preact/hooks';

import { countVisible } from '../helpers/thread';
import { useStoreProxy } from '../store/use-store';

import useRootThread from './hooks/use-root-thread';

/**
 * @typedef {import('../helpers/build-thread').Thread} Thread
 */

/**
 * @typedef FilterState
 * @prop {string|null} filterQuery
 * @prop {boolean} focusActive
 * @prop {boolean} focusConfigured
 * @prop {string|null} focusDisplayName
 * @prop {number} forcedVisibleCount
 * @prop {number} selectedCount
 */

/**
 * @typedef FilterStatusPanelProps
 * @prop {object} actionButton -
 *   A `Button` component that serves as an action button, typically to clear
 *   the currently-applied filters
 * @prop {number} [additionalCount=0] -
 *   A count of items that don't match the filter(s) but should be visible
 *   anyway: threads that have been forced-visible by the user, or newly-created
 *   annotations or replies that don't match the current filter(s), but should
 *   be visible. Similar to `resultCount`, this value includes both annotations
 *   and replies, except when there are selected annotations, when it includes
 *   top-level annotations only.
 * @prop {string} [entitySingular="annotation"] -
 *   singular variant of the "thing" being shown (e.g. "result" when there is
 *   a query string)
 * @prop {string} [entityPlural="annotations"]
 * @prop {string|null} [filterQuery] - Currently-applied filter query string, if any
 * @prop {string|null} [focusDisplayName] -
 *   Display name for the user currently being focused
 * @prop {number} resultCount -
 *   The number of "things" that match the current filter(s). When searching by
 *   query or focusing on a user, this value includes annotations and replies.
 *   When there are selected annotations, this number includes only top-level
 *   annotations.
 */

/**
 * @typedef FilterModeProps
 * @prop {FilterState} filterState
 * @prop {Thread} rootThread
 */

/**
 * Render information about the currently-applied filters and a button that
 * allows the user to clear filters (or toggle user-focus mode on and off).
 *
 * @param {FilterStatusPanelProps} props
 */
function FilterStatusPanel({
  actionButton,
  additionalCount = 0,
  entitySingular = 'annotation',
  entityPlural = 'annotations',
  filterQuery,
  focusDisplayName,
  resultCount,
}) {
  return (
    <div className="FilterStatus">
      <div className="u-layout-row--align-center">
        <div className="FilterStatus__text">
          {resultCount > 0 && <span>Showing </span>}
          <span className="filter-facet">
            {resultCount > 0 ? resultCount : 'No'}{' '}
            {resultCount === 1 ? entitySingular : entityPlural}
          </span>
          {filterQuery && (
            <span>
              {' '}
              for{' '}
              <span className="filter-facet--pre">&#39;{filterQuery}&#39;</span>
            </span>
          )}
          {focusDisplayName && (
            <span>
              {' '}
              by <span className="filter-facet">{focusDisplayName}</span>
            </span>
          )}
          {additionalCount > 0 && (
            <span className="filter-facet--muted">
              {' '}
              (and {additionalCount} more)
            </span>
          )}
        </div>
        <div>{actionButton}</div>
      </div>
    </div>
  );
}

/**
 * This status is used when there are selected annotations (including direct-
 * linked annotations). This status takes precedence over others.
 *
 * Message formatting:
 * "[Showing] (No|<resultCount>) annotation[s] [\(and <additionalCount> more\)]"
 * Button:
 * "<cancel icon> Show all [\(<totalCount)\)]" - clears the selection
 *
 * @param {FilterModeProps} props
 */
function SelectionFilterStatus({ filterState, rootThread }) {
  const store = useStoreProxy();
  const directLinkedId = store.directLinkedAnnotationId();
  // The total number of top-level annotations (visible or not)
  const totalCount = store.annotationCount();
  // Count the number of visible annotations—top-level only
  const visibleAnnotationCount = (rootThread.children || []).filter(
    thread => thread.annotation && thread.visible
  ).length;

  // The number displayed in "(and x more)" is the difference between
  // all visible top-level annotations and the count of selected annotations
  // (i.e. additionalCount accounts for any visible top-level annotations
  // that are not in the current selection)
  const additionalCount = visibleAnnotationCount - filterState.selectedCount;

  // Because of the confusion between counts of entities between selected
  // annotations and filtered annotations, don't display the total number
  // when in user-focus mode because the numbers won't appear to make sense.
  // Don't display total count, either, when viewing a direct-linked annotation.
  const showCount = !filterState.focusConfigured && !directLinkedId;
  const buttonText = showCount ? `Show all (${totalCount})` : 'Show all';

  const button = (
    <LabeledButton
      title={buttonText}
      variant="primary"
      onClick={() => store.clearSelection()}
      icon="cancel"
    >
      {buttonText}
    </LabeledButton>
  );
  return (
    <FilterStatusPanel
      resultCount={filterState.selectedCount}
      additionalCount={additionalCount}
      actionButton={button}
    />
  );
}

/**
 * This status is used when there is an applied filter query and
 * `SelectionFilterStatus` does not apply.
 *
 * Message formatting:
 * "[Showing] (No|<resultCount>) result[s] for '<filterQuery>'
 *  [by <focusDisplayName] [\(and <additionalCount> more\)]""
 *
 * Button:
 * "<cancel icon> Clear search" - Clears the selection
 *
 * @param {FilterModeProps} props
 */
function QueryFilterStatus({ filterState, rootThread }) {
  const store = useStoreProxy();
  const visibleCount = countVisible(rootThread);
  const resultCount = visibleCount - filterState.forcedVisibleCount;

  const button = (
    <LabeledButton
      icon="cancel"
      variant="primary"
      title="Clear search"
      onClick={() => store.clearSelection()}
    >
      Clear search
    </LabeledButton>
  );

  return (
    <FilterStatusPanel
      actionButton={button}
      additionalCount={filterState.forcedVisibleCount}
      entitySingular="result"
      entityPlural="results"
      filterQuery={filterState.filterQuery}
      focusDisplayName={filterState.focusDisplayName}
      resultCount={resultCount}
    />
  );
}

/**
 * This status is used if user-focus mode is configured and neither
 * `SelectionFilterStatus` nor `QueryFilterStatus` apply.
 *
 * Message formatting:
 * "[Showing] (No|<resultCount>) annotation[s] [by <focusDisplayName>]
 *   [\(and <additionalCount> more\)]"
 *
 * Button:
 *  - If there are no forced-visible threads:
 * "Show (all|only <focusDisplayName>)" - Toggles the user filter activation
 * - If there are any forced-visible threads:
 * "Reset filters" - Clears selection (does not affect user filter activation)
 *
 * @param {FilterModeProps} props
 */
function FocusFilterStatus({ filterState, rootThread }) {
  const store = useStoreProxy();
  const visibleCount = countVisible(rootThread);
  const resultCount = visibleCount - filterState.forcedVisibleCount;
  const buttonProps = {};

  if (filterState.forcedVisibleCount > 0) {
    buttonProps.onClick = () => store.clearSelection();
    buttonProps.title = 'Reset filters';
  } else {
    buttonProps.onClick = () => store.toggleFocusMode();
    buttonProps.title = filterState.focusActive
      ? 'Show all'
      : `Show only ${filterState.focusDisplayName}`;
  }
  const focusDisplayName = filterState.focusActive
    ? filterState.focusDisplayName
    : '';

  const button = (
    <LabeledButton variant="primary" {...buttonProps}>
      {buttonProps.title}
    </LabeledButton>
  );

  return (
    <FilterStatusPanel
      resultCount={resultCount}
      actionButton={button}
      additionalCount={filterState.forcedVisibleCount}
      filterQuery={filterState.filterQuery}
      focusDisplayName={focusDisplayName}
    />
  );
}

/**
 * Determine which (if any) of the filter status variants to render depending
 * on current `filterState`. Only one filter status panel is displayed at a time:
 * they are mutually exclusive.
 */
export default function FilterStatus() {
  const rootThread = useRootThread();

  const store = useStoreProxy();
  const focusState = store.focusState();
  const forcedVisibleCount = store.forcedVisibleThreads().length;
  const filterQuery = store.filterQuery();
  const selectedCount = store.selectedAnnotations().length;

  // Build a memoized state object with filter and selection details
  // This will be used by the FilterStatus subcomponents
  const filterState = useMemo(() => {
    return {
      filterQuery,
      focusActive: focusState.active,
      focusConfigured: focusState.configured,
      focusDisplayName: focusState.displayName,
      forcedVisibleCount,
      selectedCount,
    };
  }, [focusState, forcedVisibleCount, filterQuery, selectedCount]);

  if (filterState.selectedCount > 0) {
    return (
      <SelectionFilterStatus
        filterState={filterState}
        rootThread={rootThread}
      />
    );
  } else if (filterState.filterQuery) {
    return (
      <QueryFilterStatus filterState={filterState} rootThread={rootThread} />
    );
  } else if (filterState.focusConfigured) {
    return (
      <FocusFilterStatus filterState={filterState} rootThread={rootThread} />
    );
  }
  return null;
}
