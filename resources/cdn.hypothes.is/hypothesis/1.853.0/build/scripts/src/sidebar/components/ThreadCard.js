import classnames from 'classnames';
import debounce from 'lodash.debounce';
import { useCallback, useMemo } from 'preact/hooks';

import { useStoreProxy } from '../store/use-store';
import { withServices } from '../service-context';

import Thread from './Thread';

/**
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 */

/**
 * @typedef ThreadCardProps
 * @prop {import('../helpers/build-thread').Thread} thread
 * @prop {import('../services/frame-sync').FrameSyncService} frameSync
 */

/**
 * A "top-level" `Thread`, rendered as a "card" in the sidebar. A `Thread`
 * renders its own child `Thread`s within itself.
 *
 * @param {ThreadCardProps} props
 */
function ThreadCard({ frameSync, thread }) {
  const store = useStoreProxy();
  const threadTag = thread.annotation && thread.annotation.$tag;
  const isFocused = threadTag && store.isAnnotationFocused(threadTag);
  const focusThreadAnnotation = useMemo(
    () =>
      debounce(tag => {
        const focusTags = tag ? [tag] : [];
        frameSync.focusAnnotations(focusTags);
      }, 10),
    [frameSync]
  );

  const scrollToAnnotation = useCallback(
    tag => {
      frameSync.scrollToAnnotation(tag);
    },
    [frameSync]
  );

  /**
   * Is the target's event an <a> or <button> element, or does it have
   * either as an ancestor?
   *
   * @param {Element} target
   */
  const isFromButtonOrLink = target => {
    return !!target.closest('button') || !!target.closest('a');
  };

  // Memoize threads to reduce avoid re-rendering when something changes in a
  // parent component but the `Thread` itself has not changed.
  const threadContent = useMemo(() => <Thread thread={thread} />, [thread]);

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    <div
      onClick={e => {
        // Prevent click events intended for another action from
        // triggering a page scroll.
        if (!isFromButtonOrLink(/** @type {Element} */ (e.target))) {
          scrollToAnnotation(threadTag);
        }
      }}
      onMouseEnter={() => focusThreadAnnotation(threadTag)}
      onMouseLeave={() => focusThreadAnnotation(null)}
      key={thread.id}
      className={classnames('ThreadCard', {
        'is-focused': isFocused,
      })}
    >
      {threadContent}
    </div>
  );
}

export default withServices(ThreadCard, ['frameSync']);
