import classnames from 'classnames';

import { setHighlightsFocused } from '../highlighter';
import { findClosestOffscreenAnchor } from '../util/buckets';

/**
 * @typedef {import('../../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../util/buckets').Bucket} Bucket
 */

/**
 * A left-pointing indicator button that, when hovered or clicked, highlights
 * or selects associated annotations.
 *
 * @param {Object} props
 *  @param {Bucket} props.bucket
 *  @param {(annotations: AnnotationData[], toggle: boolean) => any} props.onSelectAnnotations
 */
function BucketButton({ bucket, onSelectAnnotations }) {
  const annotations = bucket.anchors.map(anchor => anchor.annotation);
  const buttonTitle = `Select nearby annotations (${bucket.anchors.length})`;

  function selectAnnotations(event) {
    onSelectAnnotations(annotations, event.metaKey || event.ctrlKey);
  }

  function setFocus(focusState) {
    bucket.anchors.forEach(anchor => {
      setHighlightsFocused(anchor.highlights || [], focusState);
    });
  }

  return (
    <button
      className="Buckets__button Buckets__button--left"
      onClick={event => selectAnnotations(event)}
      onMouseMove={() => setFocus(true)}
      onMouseOut={() => setFocus(false)}
      onBlur={() => setFocus(false)}
      title={buttonTitle}
      aria-label={buttonTitle}
    >
      {bucket.anchors.length}
    </button>
  );
}

/**
 * An up- or down-pointing button that will scroll to the next closest bucket
 * of annotations in the given direction.
 *
 * @param {Object} props
 *   @param {Bucket} props.bucket
 *   @param {'up'|'down'} props.direction
 *   @param {(a: Anchor) => void} props.scrollToAnchor - Callback invoked to
 *     scroll the document to a given anchor
 */
function NavigationBucketButton({ bucket, direction, scrollToAnchor }) {
  const buttonTitle = `Go ${direction} to next annotations (${bucket.anchors.length})`;

  function scrollToClosest() {
    const closest = findClosestOffscreenAnchor(bucket.anchors, direction);
    if (closest) {
      scrollToAnchor(closest);
    }
  }

  return (
    <button
      className={classnames('Buckets__button', `Buckets__button--${direction}`)}
      onClick={scrollToClosest}
      title={buttonTitle}
      aria-label={buttonTitle}
    >
      {bucket.anchors.length}
    </button>
  );
}

/**
 * A list of buckets, including up and down navigation (when applicable) and
 * on-screen buckets
 *
 * @param {Object} props
 *   @param {Bucket} props.above
 *   @param {Bucket} props.below
 *   @param {Bucket[]} props.buckets
 *   @param {(annotations: AnnotationData[], toggle: boolean) => any} props.onSelectAnnotations
 *   @param {(a: Anchor) => void} props.scrollToAnchor - Callback invoked to
 *     scroll the document to a given anchor
 */
export default function Buckets({
  above,
  below,
  buckets,
  onSelectAnnotations,
  scrollToAnchor,
}) {
  const showUpNavigation = above.anchors.length > 0;
  const showDownNavigation = below.anchors.length > 0;

  return (
    <ul className="Buckets__list">
      {showUpNavigation && (
        <li className="Buckets__bucket" style={{ top: above.position }}>
          <NavigationBucketButton
            bucket={above}
            direction="up"
            scrollToAnchor={scrollToAnchor}
          />
        </li>
      )}
      {buckets.map((bucket, index) => (
        <li
          className="Buckets__bucket"
          style={{ top: bucket.position }}
          key={index}
        >
          <BucketButton
            bucket={bucket}
            onSelectAnnotations={onSelectAnnotations}
          />
        </li>
      ))}
      {showDownNavigation && (
        <li className="Buckets__bucket" style={{ top: below.position }}>
          <NavigationBucketButton
            bucket={below}
            direction="down"
            scrollToAnchor={scrollToAnchor}
          />
        </li>
      )}
    </ul>
  );
}
