import { createRef, render } from 'preact';

import Toolbar from './components/Toolbar';

/**
 * @typedef ToolbarOptions
 * @prop {() => any} createAnnotation
 * @prop {(open: boolean) => any} setSidebarOpen
 * @prop {(visible: boolean) => any} setHighlightsVisible
 */

/**
 * Controller for the toolbar on the edge of the sidebar.
 *
 * This toolbar provides controls for opening and closing the sidebar, toggling
 * highlight visibility etc.
 */
export class ToolbarController {
  /**
   * @param {HTMLElement} container - Element into which the toolbar is rendered
   * @param {ToolbarOptions} options
   */
  constructor(container, options) {
    const { createAnnotation, setSidebarOpen, setHighlightsVisible } = options;

    this._container = container;

    this._useMinimalControls = false;

    /** @type {'annotation'|'note'} */
    this._newAnnotationType = 'note';

    this._highlightsVisible = false;
    this._sidebarOpen = false;

    this._closeSidebar = () => setSidebarOpen(false);
    this._toggleSidebar = () => setSidebarOpen(!this._sidebarOpen);
    this._toggleHighlights = () =>
      setHighlightsVisible(!this._highlightsVisible);
    this._createAnnotation = () => {
      createAnnotation();
      setSidebarOpen(true);
    };

    /** Reference to the sidebar toggle button. */
    this._sidebarToggleButton = createRef();

    this.render();
  }

  getWidth() {
    const content = /** @type {HTMLElement} */ (this._container.firstChild);
    return content.getBoundingClientRect().width;
  }

  /**
   * Set whether the toolbar is in the "minimal controls" mode where
   * only the "Close" button is shown.
   */
  set useMinimalControls(minimal) {
    this._useMinimalControls = minimal;
    this.render();
  }

  get useMinimalControls() {
    return this._useMinimalControls;
  }

  /**
   * Update the toolbar to reflect whether the sidebar is open or not.
   */
  set sidebarOpen(open) {
    this._sidebarOpen = open;
    this.render();
  }

  get sidebarOpen() {
    return this._sidebarOpen;
  }

  /**
   * Update the toolbar to reflect whether the "Create annotation" button will
   * create a page note (if there is no selection) or an annotation (if there is
   * a selection).
   */
  set newAnnotationType(type) {
    this._newAnnotationType = type;
    this.render();
  }

  get newAnnotationType() {
    return this._newAnnotationType;
  }

  /**
   * Update the toolbar to reflect whether highlights are currently visible.
   */
  set highlightsVisible(visible) {
    this._highlightsVisible = visible;
    this.render();
  }

  get highlightsVisible() {
    return this._highlightsVisible;
  }

  /**
   * Return the DOM element that toggles the sidebar's visibility.
   *
   * @type {HTMLButtonElement}
   */
  get sidebarToggleButton() {
    return this._sidebarToggleButton.current;
  }

  render() {
    render(
      <Toolbar
        closeSidebar={this._closeSidebar}
        createAnnotation={this._createAnnotation}
        newAnnotationType={this._newAnnotationType}
        isSidebarOpen={this._sidebarOpen}
        showHighlights={this._highlightsVisible}
        toggleHighlights={this._toggleHighlights}
        toggleSidebar={this._toggleSidebar}
        toggleSidebarRef={this._sidebarToggleButton}
        useMinimalControls={this.useMinimalControls}
      />,
      this._container
    );
  }
}
