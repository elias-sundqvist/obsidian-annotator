import { render } from 'preact';
import Buckets from './components/Buckets';

import { anchorBuckets } from './util/buckets';
import { ListenerCollection } from './util/listener-collection';

/**
 * @typedef BucketBarOptions
 * @prop {Element} [contentContainer] - The scrollable container element for the
 *   document content. All of the highlights that the bucket bar's buckets point
 *   at should be contained within this element.
 *
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * Controller for the "bucket bar" shown alongside the sidebar indicating where
 * annotations are in the document.
 *
 * @implements Destroyable
 */
export default class BucketBar {
  /**
   * @param {HTMLElement} container
   * @param {Pick<import('./guest').default, 'anchors'|'scrollToAnchor'|'selectAnnotations'>} guest
   * @param {BucketBarOptions} [options]
   */
  constructor(container, guest, { contentContainer = document.body } = {}) {
    this._contentContainer = contentContainer;

    this._bucketsContainer = document.createElement('div');
    container.appendChild(this._bucketsContainer);

    this._guest = guest;

    this._listeners = new ListenerCollection();

    this._listeners.add(window, 'resize', () => this.update());
    this._listeners.add(window, 'scroll', () => this.update());
    this._listeners.add(contentContainer, 'scroll', () => this.update());

    // Immediately render the buckets for the current anchors.
    this._update();
  }

  destroy() {
    this._listeners.removeAll();
    this._bucketsContainer.remove();
  }

  update() {
    if (this._updatePending) {
      return;
    }
    this._updatePending = true;
    requestAnimationFrame(() => {
      this._update();
      this._updatePending = false;
    });
  }

  _update() {
    const buckets = anchorBuckets(this._guest.anchors);
    render(
      <Buckets
        above={buckets.above}
        below={buckets.below}
        buckets={buckets.buckets}
        onSelectAnnotations={(annotations, toggle) =>
          this._guest.selectAnnotations(annotations, toggle)
        }
        scrollToAnchor={anchor => this._guest.scrollToAnchor(anchor)}
      />,
      this._bucketsContainer
    );
  }
}
