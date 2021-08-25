import events from '../shared/bridge-events';

const ANNOTATION_COUNT_ATTR = 'data-hypothesis-annotation-count';

/**
 * Update the elements in the container element with the count data attribute
 * with the new annotation count.
 *
 * @param {Element} rootEl - The DOM element which contains the elements that
 * display annotation count.
 */

export default function annotationCounts(rootEl, crossframe) {
  crossframe.on(
    events.PUBLIC_ANNOTATION_COUNT_CHANGED,
    updateAnnotationCountElems
  );

  function updateAnnotationCountElems(newCount) {
    const elems = rootEl.querySelectorAll('[' + ANNOTATION_COUNT_ATTR + ']');
    Array.from(elems).forEach(elem => {
      elem.textContent = newCount;
    });
  }
}
