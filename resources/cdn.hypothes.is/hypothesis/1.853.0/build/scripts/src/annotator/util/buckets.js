import { getBoundingClientRect } from '../highlighter';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 */

/**
 * @typedef Bucket
 * @prop {Anchor[]} anchors - The anchors in this bucket
 * @prop {number} position - The vertical pixel offset where this bucket should
 *                           appear in the bucket bar.
 */

/**
 * @typedef BucketSet
 * @prop {Bucket} above - A single bucket containing all of the anchors that
 *                        are offscreen upwards
 * @prop {Bucket} below - A single bucket containing all of the anchors that are
 *                        offscreen downwards
 * @prop {Bucket[]} buckets - On-screen buckets
 */

/**
 * @typedef WorkingBucket
 * @prop {Anchor[]} anchors - The anchors in this bucket
 * @prop {number} position - The computed position (offset) for this bucket,
 *   based on the current anchors. This is centered between `top` and `bottom`
 * @prop {number} top - The uppermost (lowest) vertical offset for the anchors
 *   in this bucket — the lowest `top` position value, akin to the top offest of
 *   a theoretical box drawn around all of the anchor highlights in this bucket
 * @prop {number} bottom - The bottommost (highest) vertical offset for the
 *   anchors in this bucket — the highest `top` position value, akin to the
 *   bottom of a theoretical box drawn around all of the anchor highlights in
 *   this bucket
 */

/**
 * @typedef AnchorPosition
 * @prop {Anchor} anchor
 * @prop {number} top - The vertical offset, in pixels, of the top of this
 *   anchor's highlight(s) bounding box
 * @prop {number} bottom - The vertical offset, in pixels, of the bottom of this
 *   anchor's highlight(s) bounding box
 */

// Only anchors with top offsets between `BUCKET_TOP_THRESHOLD` and
// `window.innerHeight - BUCKET_BOTTOM_THRESHOLD` are considered "on-screen"
// and will be bucketed. This is to account for bucket-bar tool buttons (top
// and the height of the bottom navigation bucket (bottom)
const BUCKET_TOP_THRESHOLD = 137;
const BUCKET_BOTTOM_THRESHOLD = 22;
// Generated buckets of annotation anchor highlights should be spaced by
// at least this amount, in pixels
const BUCKET_GAP_SIZE = 60;

/**
 * Find the closest valid anchor in `anchors` that is offscreen in the direction
 * indicated.
 *
 * @param {Anchor[]} anchors
 * @param {'up'|'down'} direction
 * @return {Anchor|null} - The closest anchor or `null` if no valid anchor found
 */
export function findClosestOffscreenAnchor(anchors, direction) {
  let closestAnchor = null;
  let closestTop = 0;

  for (let anchor of anchors) {
    if (!anchor.highlights?.length) {
      continue;
    }

    const top = getBoundingClientRect(anchor.highlights).top;

    // Verify that the anchor is offscreen in the direction we're headed
    if (direction === 'up' && top >= BUCKET_TOP_THRESHOLD) {
      // We're headed up but the anchor is already below the
      // visible top of the bucket bar: it's not our guy
      continue;
    } else if (
      direction === 'down' &&
      top <= window.innerHeight - BUCKET_BOTTOM_THRESHOLD
    ) {
      // We're headed down but this anchor is already above
      // the usable bottom of the screen: it's not our guy
      continue;
    }

    if (
      !closestAnchor ||
      (direction === 'up' && top > closestTop) ||
      (direction === 'down' && top < closestTop)
    ) {
      // This anchor is either:
      // - The first anchor we've encountered off-screen in the direction
      //   we're headed, or
      // - Closer to the screen than the previous `closestAnchor`
      closestAnchor = anchor;
      closestTop = top;
    }
  }

  return closestAnchor;
}

/**
 * Compute the AnchorPositions for the set of anchors provided, sorted
 * by top offset
 *
 * @param {Anchor[]} anchors
 * @return {AnchorPosition[]}
 */
function getAnchorPositions(anchors) {
  const anchorPositions = [];

  anchors.forEach(anchor => {
    if (!anchor.highlights?.length) {
      return;
    }
    const anchorBox = getBoundingClientRect(anchor.highlights);
    if (anchorBox.top >= anchorBox.bottom) {
      // Empty rect. The highlights may be disconnected from the document or hidden.
      return;
    }
    anchorPositions.push({
      top: anchorBox.top,
      bottom: anchorBox.bottom,
      anchor,
    });
  });

  // Now sort by top position
  anchorPositions.sort((a, b) => {
    if (a.top < b.top) {
      return -1;
    }
    return 1;
  });

  return anchorPositions;
}

/**
 * Compute buckets
 *
 * @param {Anchor[]} anchors
 * @return {BucketSet}
 */
export function anchorBuckets(anchors) {
  const anchorPositions = getAnchorPositions(anchors);
  const aboveScreen = new Set();
  const belowScreen = new Set();
  const buckets = /** @type {Bucket[]} */ ([]);

  // Hold current working anchors and positions as we build each bucket
  /** @type {WorkingBucket|null} */
  let currentBucket = null;

  /**
   * Create a new working bucket based on the provided `AnchorPosition`
   *
   * @param {AnchorPosition} anchorPosition
   * @return {WorkingBucket}
   */
  function newBucket(anchorPosition) {
    const anchorHeight = anchorPosition.bottom - anchorPosition.top;
    const bucketPosition = anchorPosition.top + anchorHeight / 2;
    const bucket = /** @type WorkingBucket */ ({
      anchors: [anchorPosition.anchor],
      top: anchorPosition.top,
      bottom: anchorPosition.bottom,
      position: bucketPosition,
    });
    return bucket;
  }

  // Build buckets from position information
  anchorPositions.forEach(aPos => {
    if (aPos.top < BUCKET_TOP_THRESHOLD) {
      aboveScreen.add(aPos.anchor);
      return;
    } else if (aPos.top > window.innerHeight - BUCKET_BOTTOM_THRESHOLD) {
      belowScreen.add(aPos.anchor);
      return;
    }

    if (!currentBucket) {
      // We've encountered our first on-screen anchor position:
      // We'll need a bucket!
      currentBucket = newBucket(aPos);
      return;
    }
    // We want to contain overlapping highlights and those near each other
    // within a shared bucket
    const isContainedWithin =
      aPos.top > currentBucket.top && aPos.bottom < currentBucket.bottom;

    // The new anchor's position is far enough below the bottom of the current
    // bucket to justify starting a new bucket
    const isLargeGap = aPos.top - currentBucket.bottom > BUCKET_GAP_SIZE;

    if (isLargeGap && !isContainedWithin) {
      // We need to start a new bucket; push the working bucket and create
      // a new bucket
      buckets.push(currentBucket);
      currentBucket = newBucket(aPos);
    } else {
      // We'll add this anchor to the current working bucket and update
      // offset properties accordingly.
      // We can be confident that `aPos.top` is >= `currentBucket.top` because
      // AnchorPositions are sorted by their `top` offset — meaning that
      // `currentBucket.top` still accurately represents the `top` offset of
      // the virtual rectangle enclosing all anchors in this bucket. But
      // let's check to see if the bottom is larger/lower:
      const updatedBottom =
        aPos.bottom > currentBucket.bottom ? aPos.bottom : currentBucket.bottom;
      const updatedHeight = updatedBottom - currentBucket.top;

      currentBucket.anchors.push(aPos.anchor);
      currentBucket.bottom = updatedBottom;
      currentBucket.position = currentBucket.top + updatedHeight / 2;
    }
  });

  if (currentBucket) {
    buckets.push(currentBucket);
  }

  // Add an upper "navigation" bucket with offscreen-above anchors
  const above = {
    anchors: Array.from(aboveScreen),
    position: BUCKET_TOP_THRESHOLD,
  };

  // Add a lower "navigation" bucket with offscreen-below anchors
  const below = {
    anchors: Array.from(belowScreen),
    position: window.innerHeight - BUCKET_BOTTOM_THRESHOLD,
  };

  return {
    above,
    below,
    buckets,
  };
}
