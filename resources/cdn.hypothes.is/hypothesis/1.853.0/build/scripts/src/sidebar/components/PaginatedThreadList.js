import { useMemo } from 'preact/hooks';

import { countVisible } from '../helpers/thread';

import PaginationNavigation from './PaginationNavigation';
import ThreadList from './ThreadList';

/** @typedef {import('../helpers/build-thread').Thread} Thread */

/**
 * @typedef PaginatedThreadListProps
 * @prop {number} currentPage
 * @prop {boolean} isLoading
 * @prop {(page: number) => void} onChangePage
 * @prop {Thread[]} threads
 * @prop {number} [pageSize]
 */

/**
 * Determine which subset of all current `threads` to show on the current
 * page of results, and how many pages of results there are total.
 *
 * Render the threads for the current page of results, and pagination controls.
 *
 * @param {PaginatedThreadListProps} props
 */
function PaginatedThreadList({
  currentPage,
  isLoading,
  onChangePage,
  threads,
  pageSize = 25,
}) {
  const { paginatedThreads, totalPages } = useMemo(() => {
    const visibleThreads = threads.filter(thread => countVisible(thread) > 0);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const totalPages = Math.ceil(visibleThreads.length / pageSize);
    return {
      paginatedThreads: visibleThreads.slice(startIndex, endIndex),
      totalPages,
    };
  }, [threads, currentPage, pageSize]);

  return (
    <>
      <ThreadList threads={paginatedThreads} />
      {!isLoading && (
        <PaginationNavigation
          currentPage={currentPage}
          onChangePage={onChangePage}
          totalPages={totalPages}
        />
      )}
    </>
  );
}

export default PaginatedThreadList;
