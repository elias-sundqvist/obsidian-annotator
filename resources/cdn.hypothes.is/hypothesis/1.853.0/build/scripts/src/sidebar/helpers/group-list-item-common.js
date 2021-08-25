/**
 * @typedef {import('../../types/api').Group} Group
 */

/**
 * @param {Group} group
 * @return {string}
 */
export function orgName(group) {
  return group.organization && group.organization.name;
}
