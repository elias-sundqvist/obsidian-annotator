import { retryPromiseOperation } from '../util/retry';

/**
 * A service for automatically saving new highlights.
 *
 * @inject
 */
export class AutosaveService {
  /**
   * @param {import('./annotations').AnnotationsService} annotationsService
   * @param {import('../store').SidebarStore} store
   */
  constructor(annotationsService, store) {
    this._annotationsService = annotationsService;
    this._store = store;

    // A set of annotation $tags that have save requests in-flight
    this._saving = new Set();

    // A set of annotation $tags that have failed to save after retries
    this._failed = new Set();
  }

  /**
   * Begin watching the store for new unsaved highlights and save them in
   * response.
   */
  init() {
    /**
     * Determine whether we should try to send a save request for the highlight
     * indicated by `htag`
     *
     * @param {string} htag - The local unique identifier for the unsaved highlight
     * @return {boolean}
     */
    const shouldSaveHighlight = htag => {
      return !this._saving.has(htag) && !this._failed.has(htag);
    };

    /**
     * Store-subscribed call back. Automatically save new highlights.
     */
    const autosaveNewHighlights = () => {
      const newHighlights = this._store.newHighlights();

      newHighlights.forEach(highlight => {
        // Because this is a new annotation object, it does not yet have an `id`
        // property. Use the local `$tag` for uniqueness instead.
        const htag = highlight.$tag;

        if (!shouldSaveHighlight(htag)) {
          return;
        }

        this._saving.add(htag);

        retryPromiseOperation(() => this._annotationsService.save(highlight))
          .catch(() => {
            // save failed after retries
            this._failed.add(htag);
          })
          .finally(() => {
            // Request is complete, no longer attempting to save
            this._saving.delete(htag);
          });
      });
    };

    this._store.subscribe(autosaveNewHighlights);
  }

  /**
   * Return `true` if any new highlights are currently being saved.
   */
  isSaving() {
    return this._saving.size > 0;
  }
}
