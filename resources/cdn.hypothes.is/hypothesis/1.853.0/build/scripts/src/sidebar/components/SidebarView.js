import { useEffect, useRef } from 'preact/hooks';

import useRootThread from './hooks/use-root-thread';
import { withServices } from '../service-context';
import { useStoreProxy } from '../store/use-store';
import { tabForAnnotation } from '../helpers/tabs';

import FilterStatus from './FilterStatus';
import LoggedOutMessage from './LoggedOutMessage';
import LoginPromptPanel from './LoginPromptPanel';
import SelectionTabs from './SelectionTabs';
import SidebarContentError from './SidebarContentError';
import ThreadList from './ThreadList';

/**
 * @typedef SidebarViewProps
 * @prop {() => any} onLogin
 * @prop {() => any} onSignUp
 * @prop {import('../services/frame-sync').FrameSyncService} frameSync
 * @prop {import('../services/load-annotations').LoadAnnotationsService} loadAnnotationsService
 * @prop {import('../services/streamer').StreamerService} streamer
 */

/**
 * Render the sidebar and its components
 *
 * @param {SidebarViewProps} props
 */
function SidebarView({
  frameSync,
  onLogin,
  onSignUp,
  loadAnnotationsService,
  streamer,
}) {
  const rootThread = useRootThread();

  // Store state values
  const store = useStoreProxy();
  const focusedGroupId = store.focusedGroupId();
  const hasAppliedFilter =
    store.hasAppliedFilter() || store.hasSelectedAnnotations();
  const isLoading = store.isLoading();
  const isLoggedIn = store.isLoggedIn();

  const linkedAnnotationId = store.directLinkedAnnotationId();
  const linkedAnnotation = linkedAnnotationId
    ? store.findAnnotationByID(linkedAnnotationId)
    : undefined;
  const directLinkedTab = linkedAnnotation
    ? tabForAnnotation(linkedAnnotation)
    : 'annotation';

  const searchUris = store.searchUris();
  const sidebarHasOpened = store.hasSidebarOpened();
  const userId = store.profile().userid;

  // The local `$tag` of a direct-linked annotation; populated once it
  // has anchored: meaning that it's ready to be focused and scrolled to
  const linkedAnnotationAnchorTag =
    linkedAnnotation && linkedAnnotation.$orphan === false
      ? linkedAnnotation.$tag
      : null;

  // If, after loading completes, no `linkedAnnotation` object is present when
  // a `linkedAnnotationId` is set, that indicates an error
  const hasDirectLinkedAnnotationError =
    !isLoading && linkedAnnotationId ? !linkedAnnotation : false;

  const hasDirectLinkedGroupError = store.directLinkedGroupFetchFailed();

  const hasContentError =
    hasDirectLinkedAnnotationError || hasDirectLinkedGroupError;

  const showFilterStatus = !hasContentError;
  const showTabs = !hasContentError && !hasAppliedFilter;

  // Show a CTA to log in if successfully viewing a direct-linked annotation
  // and not logged in
  const showLoggedOutMessage =
    linkedAnnotationId &&
    !isLoggedIn &&
    !hasDirectLinkedAnnotationError &&
    !isLoading;

  /** @type {import("preact/hooks").Ref<string|null>} */
  const prevGroupId = useRef(focusedGroupId);

  // Reload annotations when group, user or document search URIs change
  useEffect(() => {
    if (!prevGroupId.current || prevGroupId.current !== focusedGroupId) {
      // Clear any selected annotations and filters when the group ID changes.
      //
      // We don't clear the selection/filters on the initial load when
      // the focused group transitions from null to non-null, as this would clear
      // any filters intended to be used for the initial display (eg. to focus
      // on a particular user).
      if (prevGroupId.current) {
        store.clearSelection();
      }
      prevGroupId.current = focusedGroupId;
    }
    if (focusedGroupId && searchUris.length) {
      loadAnnotationsService.load({
        groupId: focusedGroupId,
        uris: searchUris,
      });
    }
  }, [store, loadAnnotationsService, focusedGroupId, userId, searchUris]);

  // When a `linkedAnnotationAnchorTag` becomes available, scroll to it
  // and focus it
  useEffect(() => {
    if (linkedAnnotationAnchorTag) {
      frameSync.focusAnnotations([linkedAnnotationAnchorTag]);
      frameSync.scrollToAnnotation(linkedAnnotationAnchorTag);
      store.selectTab(directLinkedTab);
    } else if (linkedAnnotation) {
      // Make sure to allow for orphaned annotations (which won't have an anchor)
      store.selectTab(directLinkedTab);
    }
  }, [
    directLinkedTab,
    frameSync,
    linkedAnnotation,
    linkedAnnotationAnchorTag,
    store,
  ]);

  // Connect to the streamer when the sidebar has opened or if user is logged in
  const hasFetchedProfile = store.hasFetchedProfile();
  useEffect(() => {
    if (hasFetchedProfile && (sidebarHasOpened || isLoggedIn)) {
      streamer.connect({ applyUpdatesImmediately: false });
    }
  }, [hasFetchedProfile, isLoggedIn, sidebarHasOpened, streamer]);

  return (
    <div>
      <h2 className="u-screen-reader-only">Annotations</h2>
      {showFilterStatus && <FilterStatus />}
      <LoginPromptPanel onLogin={onLogin} onSignUp={onSignUp} />
      {hasDirectLinkedAnnotationError && (
        <SidebarContentError
          errorType="annotation"
          onLoginRequest={onLogin}
          showClearSelection={true}
        />
      )}
      {hasDirectLinkedGroupError && (
        <SidebarContentError errorType="group" onLoginRequest={onLogin} />
      )}
      {showTabs && <SelectionTabs isLoading={isLoading} />}
      <ThreadList threads={rootThread.children} />
      {showLoggedOutMessage && <LoggedOutMessage onLogin={onLogin} />}
    </div>
  );
}

export default withServices(SidebarView, [
  'frameSync',
  'loadAnnotationsService',
  'streamer',
]);
