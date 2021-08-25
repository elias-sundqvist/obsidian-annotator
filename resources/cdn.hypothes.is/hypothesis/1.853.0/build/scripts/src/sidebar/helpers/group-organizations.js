import immutable from '../util/immutable';

/**
 * @typedef {import('../../types/api').Group} Group
 */

// TODO: Update when this is a property available on the API response
const DEFAULT_ORG_ID = '__default__';

/**
 * Generate consistent object keys for organizations so that they
 * may be sorted
 *
 * @param {Object} organization
 * @return {String}
 */
function orgKey(organization) {
  if (organization.id === DEFAULT_ORG_ID) {
    return DEFAULT_ORG_ID;
  }
  return `${organization.name.toLowerCase()}${organization.id}`;
}

/**
 * Add a clone of the group object to the given organization object's
 * groups Array.
 *
 * @param {Group} group
 * @param {Object} organization
 * @return undefined - organization is mutated in place
 */
function addGroup(group, organization) {
  // Object.assign won't suffice because of nested objects on groups
  const groupObj = Object.assign({}, group);
  const groupList = organization.groups;

  if (!groupList.length && group.organization.logo) {
    groupObj.logo = group.organization.logo;
  }

  groupList.push(immutable(groupObj));
}

/**
 * Iterate over groups and locate unique organizations. Slot groups into
 * their appropriate "parent" organizations.
 *
 * @param {Array<Group>} groups
 * @return {Object} - A collection of all unique organizations, containing
 *                    their groups. Keyed by each org's "orgKey"
 */
function organizations(groups) {
  const orgs = {};
  groups.forEach(group => {
    // Ignore groups with undefined or non-object organizations
    if (typeof group.organization !== 'object') {
      return;
    }
    const orgId = orgKey(group.organization);
    if (typeof orgs[orgId] === 'undefined') {
      // First time we've seen this org
      orgs[orgId] = Object.assign({}, group.organization);
      orgs[orgId].groups = []; // Will hold this org's groups
    }
    addGroup(group, orgs[orgId]); // Add the current group to its organization's groups
  });
  return orgs;
}

/**
 * Take groups as returned from API service and sort them by which organization
 * they are in (all groups within a given organization will be contiguous
 * in the resulting Array).
 *
 * Groups with no organization or an unexpanded organization
 * will be omitted from the resulting Array.
 *
 * Organization ordering is by name, secondarily (pub)ID. Groups in the default
 * organization will appear at the end of the list. The first group
 * in each organization will have a logo property (if available on the
 * organization).
 *
 * @param {Array<Group>} groups
 * @return {Array<Object>} - groups sorted by which organization they're in
 */
export default function groupsByOrganization(groups) {
  const orgs = organizations(groups);
  const defaultOrganizationGroups = [];
  const sortedGroups = [];

  const sortedOrgKeys = Object.keys(orgs).sort();
  sortedOrgKeys.forEach(orgKey => {
    if (orgKey === DEFAULT_ORG_ID) {
      // Handle default groups separately
      defaultOrganizationGroups.push(...orgs[orgKey].groups);
    } else {
      sortedGroups.push(...orgs[orgKey].groups);
    }
  });

  if (defaultOrganizationGroups.length) {
    // Put default groups at end
    sortedGroups.push(...defaultOrganizationGroups);
  }

  return sortedGroups;
}
