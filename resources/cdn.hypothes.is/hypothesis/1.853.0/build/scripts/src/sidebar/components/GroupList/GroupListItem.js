import { orgName } from '../../helpers/group-list-item-common';
import { withServices } from '../../service-context';
import { useStoreProxy } from '../../store/use-store';
import { copyText } from '../../util/copy-to-clipboard';
import { confirm } from '../../../shared/prompts';

import MenuItem from '../MenuItem';

/**
 * @typedef {import('../../../types/api').Group} Group
 */

/**
 * @typedef GroupListItemProps
 * @prop {Group} group
 * @prop {boolean} [isExpanded] - Whether the submenu for this group is expanded
 * @prop {(expand: boolean) => any} onExpand -
 *   Callback invoked to expand or collapse the current group
 * @prop {import('../../services/groups').GroupsService} groups
 * @prop {import('../../services/toast-messenger').ToastMessengerService} toastMessenger
 */

/**
 * An item in the groups selection menu.
 *
 * The item has a primary action which selects the group, along with a set of
 * secondary actions accessible via a toggle menu.
 *
 * @param {GroupListItemProps} props
 */
function GroupListItem({
  isExpanded,
  group,
  groups: groupsService,
  onExpand,
  toastMessenger,
}) {
  const activityUrl = group.links.html;
  const hasActionMenu = activityUrl || group.canLeave;
  const isSelectable =
    (group.scopes && !group.scopes.enforced) || group.isScopedToUri;

  const store = useStoreProxy();
  const focusedGroupId = store.focusedGroupId();
  const isSelected = group.id === focusedGroupId;

  const focusGroup = () => {
    store.clearDirectLinkedGroupFetchFailed();
    store.clearDirectLinkedIds();
    groupsService.focus(group.id);
  };

  const leaveGroup = async () => {
    const message = `Are you sure you want to leave the group "${group.name}"?`;
    if (
      await confirm({
        title: 'Leave group?',
        message,
        confirmAction: 'Leave',
      })
    ) {
      groupsService.leave(group.id);
    }
  };

  /**
   * Opens or closes the submenu.
   *
   * @param {Event} event
   */
  const toggleSubmenu = event => {
    event.stopPropagation();

    // Prevents group items opening a new window when clicked.
    // TODO - Fix this more cleanly in `MenuItem`.
    event.preventDefault();

    onExpand(!isExpanded);
  };

  /**
   * @param {string} url
   */
  const copyLink = url => {
    try {
      copyText(url);
      toastMessenger.success(`Copied link for "${group.name}"`);
    } catch (err) {
      toastMessenger.error('Unable to copy link');
    }
  };

  const copyLinkLabel =
    group.type === 'private' ? 'Copy invite link' : 'Copy activity link';

  return (
    <MenuItem
      icon={group.logo || 'blank'}
      iconAlt={orgName(group)}
      isDisabled={!isSelectable}
      isExpanded={hasActionMenu ? isExpanded : false}
      isSelected={isSelected}
      isSubmenuVisible={hasActionMenu ? isExpanded : undefined}
      label={group.name}
      onClick={isSelectable ? focusGroup : toggleSubmenu}
      onToggleSubmenu={toggleSubmenu}
      submenu={
        <>
          <ul>
            {activityUrl && (
              <li>
                <MenuItem
                  href={activityUrl}
                  icon="external"
                  isSubmenuItem={true}
                  label="View group activity"
                />
              </li>
            )}
            {activityUrl && (
              <li>
                <MenuItem
                  onClick={() => copyLink(activityUrl)}
                  icon="copy"
                  isSubmenuItem={true}
                  label={copyLinkLabel}
                />
              </li>
            )}
            {group.canLeave && (
              <li>
                <MenuItem
                  icon="leave"
                  isSubmenuItem={true}
                  label="Leave group"
                  onClick={leaveGroup}
                />
              </li>
            )}
          </ul>
          {!isSelectable && (
            <p className="GroupListItem__footer">
              This group is restricted to specific URLs.
            </p>
          )}
        </>
      }
    />
  );
}

export default withServices(GroupListItem, ['groups', 'toastMessenger']);
