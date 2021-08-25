import { isReply } from '../helpers/annotation-metadata';
import { SearchClient } from '../search-client';

/**
 * @typedef {import('../search-client').SortBy} SortBy
 * @typedef {import('../search-client').SortOrder} SortOrder
 */

/**
 * @typedef LoadAnnotationOptions
 * @prop {string} groupId
 * @prop {string[]} [uris]
 * @prop {number} [maxResults] - If number of annotations in search results
 *   exceeds this value, do not load annotations (see: `SearchClient`)
 * @prop {SortBy} [sortBy] - Together with `sortOrder`, this controls in what
 *   order annotations are loaded. To minimize visible content changing as
 *   annotations load, `sortBy` and `sortOrder` should be chosen to correlate
 *   with the expected presentation order of annotations/threads in the current
 *   view.
 * @prop {SortOrder} [sortOrder]
 * @prop {(error: Error) => any} [onError] - Optional error handler for
 *   SearchClient. Default error handling logs errors to console.
 * @prop {'uri'|'group'} [streamFilterBy] - Set the websocket stream
 *   to filter by either URIs or groupIds.
 */

/**
 * A service for fetching annotations via the Hypothesis API and loading them
 * into the store.
 *
 * In addition to fetching annotations it also handles configuring the
 * WebSocket connection so that appropriate real-time updates are received
 * for the set of annotations being displayed.
 *
 * @inject
 */
export class LoadAnnotationsService {
  /**
   * @param {import('./api').APIService} api
   * @param {import('../store').SidebarStore} store
   * @param {import('./streamer').StreamerService} streamer
   * @param {import('./stream-filter').StreamFilter} streamFilter
   */
  constructor(api, store, streamer, streamFilter) {
    this._api = api;
    this._store = store;
    this._streamer = streamer;
    this._streamFilter = streamFilter;

    /** @type {SearchClient|null} */
    this._searchClient = null;
  }

  /**
   * Load annotations from Hypothesis.
   *
   * The existing set of loaded annotations is cleared before the new set
   * is fetched. If an existing annotation fetch is in progress it is canceled.
   *
   * @param {LoadAnnotationOptions} options
   */
  load({
    groupId,
    uris,
    onError,
    maxResults,
    sortBy,
    sortOrder,
    streamFilterBy = 'uri',
  }) {
    this._store.removeAnnotations(this._store.savedAnnotations());

    // Cancel previously running search client.
    //
    // This will emit the "end" event for the existing client and trigger cleanup
    // associated with that client (eg. resetting the count of in-flight
    // annotation fetches).
    if (this._searchClient) {
      this._searchClient.cancel();
    }

    // Set the filter for the websocket stream
    switch (streamFilterBy) {
      case 'group':
        this._streamFilter
          .resetFilter()
          .addClause('/group', 'equals', groupId, true);
        this._streamer.setConfig('filter', {
          filter: this._streamFilter.getFilter(),
        });
        break;
      case 'uri':
      default:
        if (uris && uris.length > 0) {
          this._streamFilter.resetFilter().addClause('/uri', 'one_of', uris);
          this._streamer.setConfig('filter', {
            filter: this._streamFilter.getFilter(),
          });
        }
        break;
    }

    const searchOptions = {
      incremental: true,
      separateReplies: false,
      maxResults,

      // Annotations are fetched in order of creation by default. This is expected
      // to roughly correspond to the order in which threads end up being sorted
      // because:
      //
      // 1. The default thread sort order in the sidebar is by document location
      // 2. When users annotate a document, they will tend to annotate content in
      //    document order. Annotations near the top of the document will
      //    tend to have earlier creation dates.
      //
      // If the backend would allow us to sort on document location, we could do even better.

      sortBy,
      sortOrder,
    };

    this._searchClient = new SearchClient(this._api.search, searchOptions);

    this._searchClient.on('resultCount', resultCount => {
      this._store.setAnnotationResultCount(resultCount);
    });

    this._searchClient.on('results', results => {
      if (results.length) {
        this._store.addAnnotations(results);
      }
    });

    this._searchClient.on('error', error => {
      if (typeof onError === 'function') {
        onError(error);
      } else {
        console.error(error);
      }
    });

    this._searchClient.on('end', () => {
      // Remove client as it's no longer active.
      this._searchClient = null;

      if (uris && uris.length > 0) {
        this._store.frames().forEach(frame => {
          if (uris.indexOf(frame.uri) >= 0) {
            this._store.updateFrameAnnotationFetchStatus(frame.uri, true);
          }
        });
      }
      this._store.annotationFetchFinished();
    });

    this._store.annotationFetchStarted();
    this._searchClient.get({ group: groupId, uri: uris });
  }

  /**
   * Fetch all annotations in the same thread as `id` and add them to the store.
   *
   * @param {string} id - Annotation ID. This may be an annotation or a reply.
   * @return Promise<Annotation[]> - The annotation, followed by any replies.
   */
  async loadThread(id) {
    let annotation;
    let replySearchResult;

    // Clear out any annotations already in the store before fetching new ones
    this._store.clearAnnotations();

    try {
      this._store.annotationFetchStarted();
      // 1. Fetch the annotation indicated by `id` — the target annotation
      annotation = await this._api.annotation.get({ id });

      // 2. If annotation is not the top-level annotation in its thread,
      //    fetch the top-level annotation
      if (isReply(annotation)) {
        annotation = await this._api.annotation.get({
          id: /** @type {string[]} */ (annotation.references)[0],
        });
      }

      // 3. Fetch all of the annotations in the thread, based on the
      //    top-level annotation
      replySearchResult = await this._api.search({ references: annotation.id });
    } finally {
      this._store.annotationFetchFinished();
    }
    const threadAnnotations = [annotation, ...replySearchResult.rows];

    this._store.addAnnotations(threadAnnotations);

    // If we've been successful in retrieving a thread, with a top-level annotation,
    // configure the connection to the real-time update service to send us
    // updates to any of the annotations in the thread.
    if (!isReply(annotation)) {
      const id = /** @type {string} */ (annotation.id);
      this._streamFilter
        .addClause('/references', 'one_of', id, true)
        .addClause('/id', 'equals', id, true);
      this._streamer.setConfig('filter', {
        filter: this._streamFilter.getFilter(),
      });
      this._streamer.connect();
    }

    return threadAnnotations;
  }
}
