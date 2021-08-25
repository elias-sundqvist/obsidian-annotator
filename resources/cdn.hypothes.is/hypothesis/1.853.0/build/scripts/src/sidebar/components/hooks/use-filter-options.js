import { useMemo } from 'preact/hooks';

import { useStoreProxy } from '../../store/use-store';
import { isThirdPartyUser, username } from '../../helpers/account-id';
import { annotationDisplayName } from '../../helpers/annotation-user';

/** @typedef {import('../../store/modules/filters').FilterOption} FilterOption */

/**
 * Generate a list of users for filtering annotations; update when set of
 * annotations or filter state changes meaningfully.
 *
 * @return {FilterOption[]}
 */
export function useUserFilterOptions() {
  const store = useStoreProxy();
  const annotations = store.allAnnotations();
  const defaultAuthority = store.defaultAuthority();
  const displayNamesEnabled = store.isFeatureEnabled('client_display_names');
  const focusFilters = store.getFocusFilters();
  const currentUsername = username(store.profile().userid);

  return useMemo(() => {
    // Determine unique users (authors) in annotation collection
    const users = {};
    annotations.forEach(annotation => {
      const username_ = username(annotation.user);
      users[username_] = annotationDisplayName(
        annotation,
        isThirdPartyUser(annotation.user, defaultAuthority),
        displayNamesEnabled
      );
    });

    // If user-focus is configured (even if not applied) add a filter
    // option for that user. Note that this always respects the display
    // value, even if `client_display_names` feature flags is not enabled:
    // this matches current implementation of focus mode.
    if (focusFilters.user) {
      const username_ =
        username(focusFilters.user.value) || focusFilters.user.value;
      users[username_] = focusFilters.user.display;
    }

    // Convert to an array of `FilterOption` objects
    const userOptions = Object.keys(users).map(user => {
      // If the user is the current user, add "(Me)" to the displayed name
      const display =
        user === currentUsername ? `${users[user]} (Me)` : users[user];
      return { display, value: user };
    });

    userOptions.sort((a, b) => {
      // Ensure that the current user "Me" resides at the front of the list
      if (currentUsername === a.value) {
        return -1;
      } else if (currentUsername === b.value) {
        return 1;
      } else {
        return a.display.localeCompare(b.display);
      }
    });

    return userOptions;
  }, [
    annotations,
    currentUsername,
    defaultAuthority,
    displayNamesEnabled,
    focusFilters.user,
  ]);
}
