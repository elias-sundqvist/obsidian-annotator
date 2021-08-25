/**
 * @typedef {import('../../types/config').HostConfig} HostConfig
 * @typedef {import('../../types/api').Group} Group
 */

// @ts-expect-error - Ignore error about default-importing a CommonJS module.
import escapeStringRegexp from 'escape-string-regexp';

import { serviceConfig } from '../config/service-config';

/**
 * Should users be able to leave private groups of which they
 * are a member? Users may leave private groups unless
 * explicitly disallowed in the service configuration of the
 * `settings` object.
 *
 * @param {HostConfig} settings
 * @return {boolean}
 */
function allowLeavingGroups(settings) {
  const config = serviceConfig(settings);
  if (!config) {
    return true;
  }
  return !!config.allowLeavingGroups;
}

/**
 * Combine groups from multiple api calls together to form a unique list of groups.
 * Add an isMember property to each group indicating whether the logged in user is a member.
 * Add an isScopedToUri property to each group indicating whether the uri matches the group's
 *   uri patterns. If no uri patterns are specified, defaults to True.
 *
 * @param {Group[]} userGroups - groups the user is a member of
 * @param {Group[]} featuredGroups - all other groups, may include some duplicates from the userGroups
 * @param {string|null} uri - uri of the current page
 * @param {HostConfig} settings
 */
export function combineGroups(userGroups, featuredGroups, uri, settings) {
  const worldGroup = featuredGroups.find(g => g.id === '__world__');
  if (worldGroup) {
    userGroups.unshift(worldGroup);
  }

  const myGroupIds = userGroups.map(g => g.id);
  featuredGroups = featuredGroups.filter(g => !myGroupIds.includes(g.id));

  // Set the isMember property indicating user membership.
  featuredGroups.forEach(group => (group.isMember = false));
  userGroups.forEach(group => (group.isMember = true));

  const groups = userGroups.concat(featuredGroups);

  // Set the `canLeave` property. Groups can be left if they are private unless
  // the global `allowLeavingGroups` value is false in the config settings object.
  groups.forEach(group => {
    group.canLeave = !allowLeavingGroups(settings)
      ? false
      : group.type === 'private';
  });

  // Add isScopedToUri property indicating whether a group is within scope
  // of the given uri. If the scope check cannot be performed, isScopedToUri
  // defaults to true.
  groups.forEach(group => (group.isScopedToUri = isScopedToUri(group, uri)));

  return groups;
}

/**
 * @param {Group} group
 * @param {string|null} uri
 */
function isScopedToUri(group, uri) {
  /* If a scope check cannot be performed, meaning:
   * - the group doesn't have a scopes attribute
   * - the group has no scopes.uri_patterns present
   * - there is no uri to compare against (aka: uri=null)
   * the group is defaulted to in-scope.
   */
  if (group.scopes && group.scopes.uri_patterns.length > 0 && uri) {
    return uriMatchesScopes(uri, group.scopes.uri_patterns);
  }
  return true;
}

function uriMatchesScopes(uri, scopes) {
  return (
    scopes.find(uriRegex =>
      uri.match(
        // Convert *'s to .*'s for regex matching and escape all other special characters.
        uriRegex.split('*').map(escapeStringRegexp).join('.*')
      )
    ) !== undefined
  );
}
