import scrollIntoView from 'scroll-into-view';

import { anchor, describe } from '../anchoring/html';

import { HTMLMetadata } from './html-metadata';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Integration} Integration
 */

/**
 * Document type integration for ordinary web pages.
 *
 * This integration is used for web pages and applications that are not handled
 * by a more specific integration (eg. for PDFs).
 *
 * @implements {Integration}
 */
export class HTMLIntegration {
  constructor(container = document.body) {
    this.container = container;
    this.anchor = anchor;
    this.describe = describe;

    this._htmlMeta = new HTMLMetadata();
  }

  destroy() {
    // There is nothing to do here yet.
  }

  contentContainer() {
    return this.container;
  }

  fitSideBySide() {
    // Not yet implemented.
    return false;
  }

  async getMetadata() {
    return this._htmlMeta.getDocumentMetadata();
  }

  async uri() {
    return this._htmlMeta.uri();
  }

  /**
   * @param {Anchor} anchor
   */
  scrollToAnchor(anchor) {
    const highlights = /** @type {Element[]} */ (anchor.highlights);
    return new Promise(resolve => {
      scrollIntoView(highlights[0], resolve);
    });
  }
}
