/**
 * @typedef {import("../../types/api").Annotation} Annotation
 */

import { username } from './account-id';

/**
 * What string should we use to represent the author (user) of a given
 * annotation: a display name or a username?
 *
 * The nice, human-readable display name should be used when a display_name
 * is available on the annotation AND:
 * - The author (user) associated with the annotation is a third-party user, OR
 * - The `client_display_names` feature flag is enabled
 *
 * Return the string that should be used for display on an annotation: either the
 * username or the display name.
 *
 * @param {Pick<Annotation, 'user'|'user_info'>} annotation
 * @param {boolean} isThirdPartyUser - Is the annotation's user third-party?
 * @param {boolean} isFeatureFlagEnabled - Is the `client_display_names`
 *   feature flag enabled
 * @returns {string}
 */
export function annotationDisplayName(
  annotation,
  isThirdPartyUser,
  isFeatureFlagEnabled
) {
  const useDisplayName = isFeatureFlagEnabled || isThirdPartyUser;
  return useDisplayName && annotation.user_info?.display_name
    ? annotation.user_info.display_name
    : username(annotation.user);
}
