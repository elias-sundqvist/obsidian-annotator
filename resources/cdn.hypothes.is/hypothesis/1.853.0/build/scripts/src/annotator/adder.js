import { render } from 'preact';

import AdderToolbar from './components/AdderToolbar';
import { isTouchDevice } from '../shared/user-agent';
import { createShadowRoot } from './util/shadow-root';

/**
 *  @typedef {1} ArrowPointingDown
 * Show the adder above the selection with an arrow pointing down at the
 * selected text.
 */
export const ARROW_POINTING_DOWN = 1;

/**
 *  @typedef {2} ArrowPointingUp
 * Show the adder above the selection with an arrow pointing up at the
 * selected text.
 */
export const ARROW_POINTING_UP = 2;

/**
 *  @typedef {ArrowPointingDown|ArrowPointingUp} ArrowDirection
 * Show the adder above the selection with an arrow pointing up at the
 * selected text.
 */

/**
 * @typedef Target
 * @prop {number} left - Offset from left edge of viewport.
 * @prop {number} top - Offset from top edge of viewport.
 * @prop {ArrowDirection} arrowDirection - Direction of the adder's arrow.
 */

function toPx(pixels) {
  return pixels.toString() + 'px';
}

const ARROW_HEIGHT = 10;

// The preferred gap between the end of the text selection and the adder's
// arrow position.
const ARROW_H_MARGIN = 20;

/**
 * Return the closest ancestor of `el` which has been positioned.
 *
 * If no ancestor has been positioned, returns the root element.
 *
 * @param {Element} el
 * @return {Element}
 */
function nearestPositionedAncestor(el) {
  let parentEl = /** @type {Element} */ (el.parentElement);
  while (parentEl.parentElement) {
    if (getComputedStyle(parentEl).position !== 'static') {
      break;
    }
    parentEl = parentEl.parentElement;
  }
  return parentEl;
}

/**
 * @typedef AdderOptions
 * @prop {() => any} onAnnotate - Callback invoked when "Annotate" button is clicked
 * @prop {() => any} onHighlight - Callback invoked when "Highlight" button is clicked
 * @prop {(annotations: Object[]) => any} onShowAnnotations -
 *   Callback invoked when  "Show" button is clicked
 *
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * Container for the 'adder' toolbar which provides controls for the user to
 * annotate and highlight the selected text.
 *
 * The toolbar implementation is split between this class, which is
 * the container for the toolbar that positions it on the page and isolates
 * it from the page's styles using shadow DOM, and the `AdderToolbar` Preact
 * component which actually renders the toolbar.
 *
 * @implements Destroyable
 */
export class Adder {
  /**
   * Create the toolbar's container and hide it.
   *
   * The adder is initially hidden.
   *
   * @param {HTMLElement} element - The DOM element into which the adder will be created
   * @param {AdderOptions} options - Options object specifying `onAnnotate` and `onHighlight`
   *        event handlers.
   */
  constructor(element, options) {
    this._outerContainer = document.createElement('hypothesis-adder');
    element.appendChild(this._outerContainer);
    this._shadowRoot = createShadowRoot(this._outerContainer);

    // Set initial style
    Object.assign(this._outerContainer.style, {
      // take position out of layout flow initially
      position: 'absolute',
      top: 0,
      left: 0,
    });

    this._view = /** @type {Window} */ (element.ownerDocument.defaultView);

    this._width = () => {
      const firstChild = /** @type {Element} */ (this._shadowRoot.firstChild);
      return firstChild.getBoundingClientRect().width;
    };

    this._height = () => {
      const firstChild = /** @type {Element} */ (this._shadowRoot.firstChild);
      return firstChild.getBoundingClientRect().height;
    };

    this._isVisible = false;

    /** @type {'up'|'down'} */
    this._arrowDirection = 'up';

    this._onAnnotate = options.onAnnotate;
    this._onHighlight = options.onHighlight;
    this._onShowAnnotations = options.onShowAnnotations;

    /**
     * Annotation objects associated with the current selection. If non-empty,
     * a "Show" button appears in the toolbar. Clicking the button calls the
     * `onShowAnnotations` callback with the current value of `annotationsForSelection`.
     *
     * @type {Object[]}
     */
    this.annotationsForSelection = [];

    this._render();
  }

  /** Hide the adder */
  hide() {
    this._isVisible = false;
    this._render();
    // Reposition the outerContainer because it affects the responsiveness of host page
    // https://github.com/hypothesis/client/issues/3193
    Object.assign(this._outerContainer.style, {
      top: 0,
      left: 0,
    });
  }

  destroy() {
    render(null, this._shadowRoot); // First, unload the Preact component
    this._outerContainer.remove();
  }

  /**
   * Display the adder in the best position in order to target the
   * selected text in `selectionRect`.
   *
   * @param {DOMRect} selectionRect - The rect of text to target, in viewport
   *        coordinates.
   * @param {boolean} isRTLselection - True if the selection was made
   *        rigth-to-left, such that the focus point is mosty likely at the
   *        top-left edge of `targetRect`.
   */
  show(selectionRect, isRTLselection) {
    const { left, top, arrowDirection } = this._calculateTarget(
      selectionRect,
      isRTLselection
    );
    this._showAt(left, top);

    this._isVisible = true;
    this._arrowDirection = arrowDirection === ARROW_POINTING_UP ? 'up' : 'down';

    this._render();
  }

  /**
   *  Determine the best position for the Adder and its pointer-arrow.
   * - Position the pointer-arrow near the end of the selection (where the user's
   *   cursor/input is most likely to be)
   * - Position the Adder to center horizontally on the pointer-arrow
   * - Position the Adder below the selection (arrow pointing up) for LTR selections
   *   and above (arrow down) for RTL selections
   *
   * @param {DOMRect} selectionRect - The rect of text to target, in viewport
   *        coordinates.
   * @param {boolean} isRTLselection - True if the selection was made
   *        rigth-to-left, such that the focus point is mosty likely at the
   *        top-left edge of `targetRect`.
   * @return {Target}
   */
  _calculateTarget(selectionRect, isRTLselection) {
    // Set the initial arrow direction based on whether the selection was made
    // forwards/upwards or downwards/backwards.
    /** @type {ArrowDirection} */ let arrowDirection;
    if (isRTLselection && !isTouchDevice()) {
      arrowDirection = ARROW_POINTING_DOWN;
    } else {
      // Render the adder below the selection for touch devices due to competing
      // space with the native copy/paste bar that typical (not always) renders above
      // the selection.
      arrowDirection = ARROW_POINTING_UP;
    }
    let top;
    let left;

    // Position the adder such that the arrow it is above or below the selection
    // and close to the end.
    const hMargin = Math.min(ARROW_H_MARGIN, selectionRect.width);
    const adderWidth = this._width();
    // Render the adder a little lower on touch devices to provide room for the native
    // selection handles so that the interactions with selection don't compete with the adder.
    const touchScreenOffset = isTouchDevice() ? 10 : 0;
    const adderHeight = this._height();
    if (isRTLselection) {
      left = selectionRect.left - adderWidth / 2 + hMargin;
    } else {
      left =
        selectionRect.left + selectionRect.width - adderWidth / 2 - hMargin;
    }

    // Flip arrow direction if adder would appear above the top or below the
    // bottom of the viewport.
    if (
      selectionRect.top - adderHeight < 0 &&
      arrowDirection === ARROW_POINTING_DOWN
    ) {
      arrowDirection = ARROW_POINTING_UP;
    } else if (selectionRect.top + adderHeight > this._view.innerHeight) {
      arrowDirection = ARROW_POINTING_DOWN;
    }

    if (arrowDirection === ARROW_POINTING_UP) {
      top =
        selectionRect.top +
        selectionRect.height +
        ARROW_HEIGHT +
        touchScreenOffset;
    } else {
      top = selectionRect.top - adderHeight - ARROW_HEIGHT;
    }

    // Constrain the adder to the viewport.
    left = Math.max(left, 0);
    left = Math.min(left, this._view.innerWidth - adderWidth);

    top = Math.max(top, 0);
    top = Math.min(top, this._view.innerHeight - adderHeight);

    return { top, left, arrowDirection };
  }

  /**
   * Find a Z index value that will cause the adder to appear on top of any
   * content in the document when the adder is shown at (left, top).
   *
   * @param {number} left - Horizontal offset from left edge of viewport.
   * @param {number} top - Vertical offset from top edge of viewport.
   * @return {number} - greatest zIndex (default value of 1)
   */
  _findZindex(left, top) {
    if (document.elementsFromPoint === undefined) {
      // In case of not being able to use `document.elementsFromPoint`,
      // default to the large arbitrary number (2^15)
      return 32768;
    }

    const adderWidth = this._width();
    const adderHeight = this._height();

    // Find the Z index of all the elements in the screen for five positions
    // around the adder (left-top, left-bottom, middle-center, right-top,
    // right-bottom) and use the greatest.

    // Unique elements so `getComputedStyle` is called the minimum amount of times.
    const elements = new Set([
      ...document.elementsFromPoint(left, top),
      ...document.elementsFromPoint(left, top + adderHeight),
      ...document.elementsFromPoint(
        left + adderWidth / 2,
        top + adderHeight / 2
      ),
      ...document.elementsFromPoint(left + adderWidth, top),
      ...document.elementsFromPoint(left + adderWidth, top + adderHeight),
    ]);

    const zIndexes = [...elements]
      .map(element => +getComputedStyle(element).zIndex)
      .filter(Number.isInteger);

    // Make sure the array contains at least one element,
    // otherwise `Math.max(...[])` results in +Infinity
    zIndexes.push(0);

    return Math.max(...zIndexes) + 1;
  }

  /**
   * Show the adder at the given position and with the arrow pointing in
   * `arrowDirection`.
   *
   * @param {number} left - Horizontal offset from left edge of viewport.
   * @param {number} top - Vertical offset from top edge of viewport.
   */
  _showAt(left, top) {
    // Translate the (left, top) viewport coordinates into positions relative to
    // the adder's nearest positioned ancestor (NPA).
    //
    // Typically the adder is a child of the `<body>` and the NPA is the root
    // `<html>` element. However page styling may make the `<body>` positioned.
    // See https://github.com/hypothesis/client/issues/487.
    const positionedAncestor = nearestPositionedAncestor(this._outerContainer);
    const parentRect = positionedAncestor.getBoundingClientRect();

    const zIndex = this._findZindex(left, top);

    Object.assign(this._outerContainer.style, {
      left: toPx(left - parentRect.left),
      top: toPx(top - parentRect.top),
      zIndex,
    });
  }

  _render() {
    const handleCommand = command => {
      switch (command) {
        case 'annotate':
          this._onAnnotate();
          this.hide();
          break;
        case 'highlight':
          this._onHighlight();
          this.hide();
          break;
        case 'show':
          this._onShowAnnotations(this.annotationsForSelection);
          break;
        case 'hide':
          this.hide();
          break;
        default:
          break;
      }
    };

    render(
      <AdderToolbar
        isVisible={this._isVisible}
        arrowDirection={this._arrowDirection}
        onCommand={handleCommand}
        annotationCount={this.annotationsForSelection.length}
      />,
      this._shadowRoot
    );
  }
}
