import { TinyEmitter } from 'tiny-emitter';

/**
 * @typedef {import('../types/api').Annotation} Annotation
 * @typedef {import('../types/api').SearchQuery} SearchQuery
 * @typedef {import('../types/api').SearchResult} SearchResult
 *
 */

/**
 * Indicates that there are more annotations matching the current API
 * search request than the interface can currently handle displaying
 * (Notebook).
 */
export class ResultSizeError extends Error {
  /**
   * @param {number} limit
   */
  constructor(limit) {
    super(`Results size exceeds ${limit}`);
  }
}

/**
 * @typedef {'created'|'updated'} SortBy
 * @typedef {'asc'|'desc'} SortOrder
 */
/**
 * Default callback used to get the page size for iterating through annotations.
 *
 * This uses a small number for the first page to reduce the time until some
 * results are displayed and a larger number for remaining pages to lower the
 * total fetch time.
 *
 * @param {number} index
 */
function defaultPageSize(index) {
  return index === 0 ? 50 : 200;
}

/**
 * Client for the Hypothesis search API [1]
 *
 * SearchClient handles paging through results, canceling search etc.
 *
 * [1] https://h.readthedocs.io/en/latest/api-reference/#tag/annotations/paths/~1search/get
 */
export class SearchClient extends TinyEmitter {
  /**
   * @param {(query: SearchQuery) => Promise<SearchResult>} searchFn - Function for querying the search API
   * @param {Object} options
   *   @param {(index: number) => number} [options.getPageSize] -
   *     Callback that returns the page size to use when fetching the index'th
   *     page of results.  Callers can vary this to balance the latency of
   *     getting some results against the time taken to fetch all results.
   *
   *     The returned page size must be at least 1 and no more than the maximum
   *     value of the `limit` query param for the search API.
   *   @param {boolean} [options.separateReplies] - When `true`, request that
   *   top-level annotations and replies be returned separately.
   *   NOTE: This has issues with annotations that have large numbers of
   *   replies.
   *   @param {boolean} [options.incremental] - Emit `results` events incrementally
   *   as pages of annotations are fetched
   *   @param {number|null} [options.maxResults] - Safety valve for protection when
   *   loading all annotations in a group in the NotebookView. If the Notebook
   *   is opened while focused on a group that contains many thousands of
   *   annotations, it could cause rendering and network misery in the browser.
   *   When present, do not load annotations if the result set size exceeds
   *   this value.
   *   @param {SortBy} [options.sortBy] - Together with `sortOrder`, specifies in
   *     what order annotations are fetched from the backend.
   *   @param {SortOrder} [options.sortOrder]
   */
  constructor(
    searchFn,
    {
      getPageSize = defaultPageSize,
      separateReplies = true,
      incremental = true,
      maxResults = null,
      sortBy = 'created',
      sortOrder = 'asc',
    } = {}
  ) {
    super();
    this._searchFn = searchFn;
    this._getPageSize = getPageSize;
    this._separateReplies = separateReplies;
    this._incremental = incremental;
    this._maxResults = maxResults;
    this._sortBy = sortBy;
    this._sortOrder = sortOrder;

    this._canceled = false;
    /** @type {Annotation[]} */
    this._results = [];
    this._resultCount = null;
  }

  /**
   * Fetch a page of annotations.
   *
   * @param {SearchQuery} query - Query params for /api/search call
   * @param {string} [searchAfter] - Cursor value to use when paginating
   *   through results. Omitted for the first page. See docs for `search_after`
   *   query param for /api/search API.
   * @param {number} [pageIndex]
   */
  async _getPage(query, searchAfter, pageIndex = 0) {
    const pageSize = this._getPageSize(pageIndex);

    /** @type {SearchQuery} */
    const searchQuery = {
      limit: pageSize,
      sort: this._sortBy,
      order: this._sortOrder,
      _separate_replies: this._separateReplies,

      ...query,
    };

    if (searchAfter) {
      searchQuery.search_after = searchAfter;
    }

    try {
      const results = await this._searchFn(searchQuery);
      if (this._canceled) {
        return;
      }

      if (this._resultCount === null) {
        // Emit the result count (total) on first encountering it
        this._resultCount = results.total;
        this.emit('resultCount', this._resultCount);
      }

      // For now, abort loading of annotations if `maxResults` is set and the
      // number of annotations in the results set exceeds that value.
      //
      // NB: We can’t currently, reliably load a subset of a group’s
      // annotations, as replies are mixed in with top-level annotations—when
      // `separateReplies` is false, which it is in most or all cases—so we’d
      // end up with partially-loaded threads.
      //
      // This change has no effect on loading annotations in the SidebarView,
      // where the `maxResults` option is not used.
      if (this._maxResults && results.total > this._maxResults) {
        this.emit('error', new ResultSizeError(this._maxResults));
        this.emit('end');
        return;
      }

      const page = results.rows.concat(results.replies || []);

      if (this._incremental) {
        this.emit('results', page);
      } else {
        this._results = this._results.concat(page);
      }

      // If the current page was full, there might be additional pages available.
      const nextPageAvailable = page.length === pageSize;

      // Get the cursor for the start of the next page. This is the last
      // value for whatever field results are sorted by from the current page.
      const nextSearchAfter =
        page.length > 0 ? page[page.length - 1][this._sortBy] : null;

      if (nextPageAvailable && nextSearchAfter) {
        this._getPage(query, nextSearchAfter, pageIndex + 1);
      } else {
        if (!this._incremental) {
          this.emit('results', this._results);
        }
        this.emit('end');
      }
    } catch (err) {
      if (this._canceled) {
        return;
      }
      this.emit('error', err);
      this.emit('end');
    }
  }

  /**
   * Perform a search against the Hypothesis API.
   *
   * Emits a 'results' event with an array of annotations as they become
   * available (in incremental mode) or when all annotations are available
   * (in non-incremental mode).
   *
   * Emits an 'error' event if the search fails.
   * Emits an 'end' event once the search completes.
   *
   * @param {SearchQuery} query
   */
  get(query) {
    this._results = [];
    this._resultCount = null;
    this._getPage(query);
  }

  /**
   * Cancel the current search and emit the 'end' event.
   * No further events will be emitted after this.
   */
  cancel() {
    this._canceled = true;
    this.emit('end');
  }
}
