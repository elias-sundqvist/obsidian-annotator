import { useMemo } from 'preact/hooks';

import { useStoreProxy } from '../../store/use-store';
import threadAnnotations from '../../helpers/thread-annotations';

/** @typedef {import('../../helpers/build-thread').Thread} Thread */

/**
 * Gather together state relevant to building a root thread of annotations and
 * replies and return an updated root thread when changes occur.
 *
 * @return {Thread}
 */
export default function useRootThread() {
  const store = useStoreProxy();
  const annotations = store.allAnnotations();
  const query = store.filterQuery();
  const route = store.route();
  const selectionState = store.selectionState();
  const filters = store.getFilterValues();

  const threadState = useMemo(() => {
    /** @type {Object.<string,string>} */
    return {
      annotations,
      route,
      selection: { ...selectionState, filterQuery: query, filters },
    };
  }, [annotations, query, route, selectionState, filters]);

  return threadAnnotations(threadState);
}
