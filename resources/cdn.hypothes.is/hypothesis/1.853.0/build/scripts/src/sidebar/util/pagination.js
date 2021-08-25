/**
 * The number of an available pagination page, or `null`, indicating a gap
 * between sequential numbered pages.
 *
 * @typedef {number|null} PageNumber
 */

/**
 * Determine the set of (pagination) page numbers that should be provided to
 * a user, given the current page the user is on, the total number of pages
 * available, and the number of individual page options desired.
 *
 * The first, last and current pages will always be included in the returned
 * results. Additional pages adjacent to the current page will be added until
 * `maxPages` is reached. Gaps in the sequence of pages are represented by
 * `null` values.
 *
 * @example
 *   pageNumberOptions(1, 10, 5) => [1, 2, 3, 4, null, 10]
 *   pageNumberOptions(3, 10, 5) => [1, 2, 3, 4, null, 10]
 *   pageNumberOptions(6, 10, 5) => [1, null, 5, 6, 7, null, 10]
 *   pageNumberOptions(9, 10, 5) => [1, null, 7, 8, 9, 10]
 *   pageNumberOptions(2, 3, 5) => [1, 2, 3]
 *
 * @param {number} currentPage - The currently-visible/-active page of results.
 *   Note that pages are 1-indexed
 * @param {number} totalPages
 * @param {number} [maxPages] - The maximum number of numbered pages to make
 *   available
 * @return {PageNumber[]} Set of navigation page options to show. `null`
 *   values represent gaps in the sequence of pages, to be represented later
 *   as ellipses (...)
 */
export function pageNumberOptions(currentPage, totalPages, maxPages = 5) {
  if (totalPages <= 1) {
    return [];
  }

  // Start with first, last and current page. Use a set to avoid dupes.
  const pageNumbers = new Set([1, currentPage, totalPages]);

  // Fill out the `pageNumbers` with additional pages near the currentPage,
  // if available
  let increment = 1;
  while (pageNumbers.size < Math.min(totalPages, maxPages)) {
    // Build the set "outward" from the currently-active page
    if (currentPage + increment <= totalPages) {
      pageNumbers.add(currentPage + increment);
    }
    if (currentPage - increment >= 1) {
      pageNumbers.add(currentPage - increment);
    }
    ++increment;
  }

  const pageOptions = /** @type {PageNumber[]} */ ([]);

  // Construct a numerically-sorted array with `null` entries inserted
  // between non-sequential entries
  [...pageNumbers]
    .sort((a, b) => a - b)
    .forEach((page, idx, arr) => {
      if (idx > 0 && page - arr[idx - 1] > 1) {
        // Two page entries are non-sequential. Push a `null` value between
        // them to indicate the gap, which will later be represented as an
        // ellipsis
        pageOptions.push(null);
      }
      pageOptions.push(page);
    });
  return pageOptions;
}
