import { createShadowRoot } from './util/shadow-root';
import { render } from 'preact';
import NotebookModal from './components/NotebookModal';

/** @typedef {import('../types/annotator').Destroyable} Destroyable */

/** @implements Destroyable */
export default class Notebook {
  /**
   * @param {HTMLElement} element
   * @param {import('./util/emitter').EventBus} eventBus -
   *   Enables communication between components sharing the same eventBus
   * @param {Record<string, any>} config
   */
  constructor(element, eventBus, config = {}) {
    /**
     * Un-styled shadow host for the notebook content.
     * This isolates the notebook from the page's styles.
     */
    this._outerContainer = document.createElement('hypothesis-notebook');
    element.appendChild(this._outerContainer);
    this.shadowRoot = createShadowRoot(this._outerContainer);

    render(
      <NotebookModal eventBus={eventBus} config={config} />,
      this.shadowRoot
    );
  }

  destroy() {
    render(null, this.shadowRoot);
    this._outerContainer.remove();
  }
}
