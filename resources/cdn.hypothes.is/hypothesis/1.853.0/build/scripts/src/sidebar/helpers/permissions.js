/**
 * Utils for working with permissions principals on annotations.
 *
 * This is the same as the `permissions` field retrieved on an annotation via
 * the API.
 *
 * Principals are strings of the form `type:id` where `type` is `'acct'` (for a
 * specific user) or `'group'` (for a group).
 *
 * @typedef Permissions
 * @property {string[]} read - List of principals that can read the annotation
 * @property {string[]} update - List of principals that can edit the annotation
 * @property {string[]} delete - List of principals that can delete the
 * annotation
 */

function defaultLevel(savedLevel) {
  switch (savedLevel) {
    case 'private':
    case 'shared':
      return savedLevel;
    default:
      return 'shared';
  }
}

/**
 * Return the permissions for a private annotation.
 *
 * A private annotation is one which is readable only by its author.
 *
 * @param {string} userid - User ID of the author
 * @return {Permissions}
 */
export function privatePermissions(userid) {
  return {
    read: [userid],
    update: [userid],
    delete: [userid],
  };
}

/**
 * Return the permissions for an annotation that is shared with the given
 * group.
 *
 * @param {string} userid - User ID of the author
 * @param {string} groupid - ID of the group the annotation is being
 * shared with
 * @return {Permissions}
 */
export function sharedPermissions(userid, groupid) {
  return Object.assign(privatePermissions(userid), {
    read: ['group:' + groupid],
  });
}
/**
 * Return the default permissions for an annotation in a given group.
 *
 * @param {string} userid - User ID of the author
 * @param {string} groupid - ID of the group the annotation is being shared
 * with
 * @return {Permissions}
 */
export function defaultPermissions(userid, groupid, savedLevel) {
  if (defaultLevel(savedLevel) === 'private' && userid) {
    return privatePermissions(userid);
  } else {
    return sharedPermissions(userid, groupid);
  }
}

/**
 * Return true if an annotation with the given permissions is shared with any
 * group.
 *
 * @param {Permissions} perms
 * @return {boolean}
 */
export function isShared(perms) {
  return perms.read.some(principal => {
    return principal.indexOf('group:') === 0;
  });
}

/**
 * Return true if an annotation with the given permissions is private.
 *
 * @param {Permissions} perms
 * @return {boolean}
 */
export function isPrivate(perms) {
  return !isShared(perms);
}

/**
 * Return true if a user can perform the given `action` on an annotation.
 *
 * @param {Permissions} perms
 * @param {'update'|'delete'} action
 * @param {string|null} userid
 * @return {boolean}
 */
export function permits(perms, action, userid) {
  return perms[action].indexOf(userid || '') !== -1;
}
