/**
 * @typedef {import('../helpers/build-thread').Thread} Thread
 */

/**
 * A service for performing operations related to the current set of threads.
 */
// @inject
export class ThreadsService {
  /**
   * @param {import('../store').SidebarStore} store
   */
  constructor(store) {
    this._store = store;
  }

  /**
   * Make this thread and all of its children "visible". This has the effect of
   * "unhiding" a thread which is currently hidden by an applied search filter
   * (as well as its child threads). Only threads that are not currently visible
   * will be forced visible.
   *
   * @param {Thread} thread
   */
  forceVisible(thread) {
    thread.children.forEach(child => {
      this.forceVisible(child);
    });
    if (!thread.visible) {
      this._store.setForcedVisible(thread.id, true);
    }
  }
}
