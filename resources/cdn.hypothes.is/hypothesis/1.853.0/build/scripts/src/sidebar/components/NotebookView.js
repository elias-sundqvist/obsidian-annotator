import { IconButton, Panel } from '@hypothesis/frontend-shared';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import scrollIntoView from 'scroll-into-view';

import { ResultSizeError } from '../search-client';
import { withServices } from '../service-context';
import { useStoreProxy } from '../store/use-store';

import NotebookFilters from './NotebookFilters';
import NotebookResultCount from './NotebookResultCount';
import PaginatedThreadList from './PaginatedThreadList';
import useRootThread from './hooks/use-root-thread';

/**
 * @typedef NotebookViewProps
 * @prop {import('../services/load-annotations').LoadAnnotationsService} loadAnnotationsService
 * @prop {import('../services/streamer').StreamerService} streamer
 */

/**
 * The main content of the "notebook" route (https://hypothes.is/notebook)
 *
 * @param {NotebookViewProps} props
 */
function NotebookView({ loadAnnotationsService, streamer }) {
  const store = useStoreProxy();

  const filters = store.getFilterValues();
  const focusedGroup = store.focusedGroup();
  const forcedVisibleCount = store.forcedVisibleThreads().length;
  const hasAppliedFilter = store.hasAppliedFilter();
  const isLoading = store.isLoading();
  const resultCount = store.annotationResultCount();
  const pendingUpdateCount = store.pendingUpdateCount();

  const rootThread = useRootThread();

  const groupName = focusedGroup?.name ?? '…';

  // Get the ID of the group to fetch annotations from.
  //
  // Once groups have been fetched and one has been focused, use its ID. If
  // groups haven't been fetched yet but we know the ID of the group that is
  // likely to be focused (eg. because the notebook has been configured to
  // display a particular group when launched), we can optimistically fetch
  // annotations from that group.
  const groupId = focusedGroup?.id || store.directLinkedGroupId();

  const lastPaginationPage = useRef(1);
  const [paginationPage, setPaginationPage] = useState(1);

  const [hasTooManyAnnotationsError, setHasTooManyAnnotationsError] =
    useState(false);

  // Load all annotations in the group, unless there are more than 5000
  // of them: this is a performance safety valve.
  const maxResults = 5000;

  const onLoadError = error => {
    if (error instanceof ResultSizeError) {
      setHasTooManyAnnotationsError(true);
    }
  };

  const hasFetchedProfile = store.hasFetchedProfile();

  // Establish websocket connection
  useEffect(() => {
    if (hasFetchedProfile) {
      streamer.connect({ applyUpdatesImmediately: false });
    }
  }, [hasFetchedProfile, streamer]);

  // Load all annotations; re-load if `focusedGroup` changes
  useEffect(() => {
    // NB: In current implementation, this will only happen/load once (initial
    // annotation fetch on application startup), as there is no mechanism
    // within the Notebook to change the `focusedGroup`. If the focused group
    // is changed within the sidebar and the Notebook re-opened, an entirely
    // new iFrame/app is created. This will need to be revisited.
    store.setSortKey('Newest');
    if (groupId) {
      loadAnnotationsService.load({
        groupId,
        // Load annotations in reverse-chronological order because that is how
        // threads are sorted in the notebook view. By aligning the fetch
        // order with the thread display order we reduce the changes in visible
        // content as annotations are loaded. This reduces the amount of time
        // the user has to wait for the content to load before they can start
        // reading it.
        //
        // Fetching is still suboptimal because we fetch both annotations and
        // replies together from the backend, but the user initially sees only
        // the top-level threads.
        sortBy: 'updated',
        sortOrder: 'desc',
        maxResults,
        onError: onLoadError,
        streamFilterBy: 'group',
      });
    }
  }, [loadAnnotationsService, groupId, store]);

  // Pagination-page-changing callback
  const onChangePage = newPage => {
    setPaginationPage(newPage);
  };

  // When filter values or focused group are changed, reset pagination to page 1
  useEffect(() => {
    onChangePage(1);
  }, [filters, focusedGroup]);

  // Scroll back to here when pagination page changes
  const threadListScrollTop = useRef(/** @type {HTMLElement|null}*/ (null));
  useLayoutEffect(() => {
    // TODO: Transition and effects here should be improved
    if (paginationPage !== lastPaginationPage.current) {
      scrollIntoView(threadListScrollTop.current);
      lastPaginationPage.current = paginationPage;
    }
  }, [paginationPage]);

  const tooltip = `Show ${pendingUpdateCount} new or updated ${
    pendingUpdateCount > 1 ? 'annotations' : 'annotation'
  }`;

  return (
    <div className="NotebookView">
      <header className="NotebookView__heading" ref={threadListScrollTop}>
        <h1 className="NotebookView__group-name">{groupName}</h1>
      </header>
      <div className="NotebookView__filters">
        <NotebookFilters />
      </div>
      <div className="NotebookView__results u-layout-row--align-center u-font--large">
        {pendingUpdateCount > 0 && !hasAppliedFilter && (
          <IconButton
            icon="refresh"
            onClick={() => streamer.applyPendingUpdates()}
            variant="primary"
            title={tooltip}
          />
        )}
        <NotebookResultCount
          forcedVisibleCount={forcedVisibleCount}
          isFiltered={hasAppliedFilter}
          isLoading={isLoading}
          resultCount={resultCount}
        />
      </div>
      <div className="NotebookView__items">
        {hasTooManyAnnotationsError && (
          <div className="NotebookView__messages">
            <Panel title="Too many results to show">
              This preview of the Notebook can show{' '}
              <strong>up to {maxResults} results</strong> at a time (there are{' '}
              {resultCount} to show here).{' '}
              <a href="mailto:support@hypothes.is?subject=Hypothesis%20Notebook&body=Please%20notify%20me%20when%20the%20Hypothesis%20Notebook%20is%20updated%20to%20support%20more%20than%205000%20annotations">
                Contact us
              </a>{' '}
              if you would like to be notified when support for more annotations
              is available.
            </Panel>
          </div>
        )}
        <PaginatedThreadList
          currentPage={paginationPage}
          isLoading={isLoading}
          onChangePage={onChangePage}
          threads={rootThread.children}
        />
      </div>
    </div>
  );
}

export default withServices(NotebookView, [
  'loadAnnotationsService',
  'streamer',
]);
