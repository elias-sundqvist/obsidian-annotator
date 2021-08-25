import { SvgIcon } from '@hypothesis/frontend-shared';
import { useState } from 'preact/hooks';

import bridgeEvents from '../../shared/bridge-events';
import { serviceConfig } from '../config/service-config';
import { isThirdPartyUser } from '../helpers/account-id';
import { useStoreProxy } from '../store/use-store';
import { withServices } from '../service-context';

import Menu from './Menu';
import MenuItem from './MenuItem';
import MenuSection from './MenuSection';

/**
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 * /

/**
 * @typedef AuthStateLoggedIn
 * @prop {'logged-in'} status
 * @prop {string} displayName
 * @prop {string} userid
 * @prop {string} username
 * @typedef {{status: 'logged-out'|'unknown'} | AuthStateLoggedIn}  AuthState
 */

/**
 * @typedef UserMenuProps
 * @prop {AuthStateLoggedIn} auth - object representing authenticated user and auth status
 * @prop {() => any} onLogout - onClick callback for the "log out" button
 * @prop {Object} bridge
 * @prop {MergedConfig} settings
 */

/**
 * A menu with user and account links.
 *
 * This menu will contain different items depending on service configuration,
 * context and whether the user is first- or third-party.
 *
 * @param {UserMenuProps} props
 */
function UserMenu({ auth, bridge, onLogout, settings }) {
  const store = useStoreProxy();
  const defaultAuthority = store.defaultAuthority();

  const isThirdParty = isThirdPartyUser(auth.userid, defaultAuthority);
  const service = serviceConfig(settings);
  const isNotebookEnabled = store.isFeatureEnabled('notebook_launch');
  const [isOpen, setOpen] = useState(false);

  const serviceSupports = feature => service && !!service[feature];

  const isSelectableProfile =
    !isThirdParty || serviceSupports('onProfileRequestProvided');
  const isLogoutEnabled =
    !isThirdParty || serviceSupports('onLogoutRequestProvided');

  const onSelectNotebook = () => {
    bridge.call('openNotebook', store.focusedGroupId());
  };

  // Temporary access to the Notebook without feature flag:
  // type the key 'n' when user menu is focused/open
  const onKeyDown = event => {
    if (event.key === 'n') {
      onSelectNotebook();
      setOpen(false);
    }
  };

  const onProfileSelected = () =>
    isThirdParty && bridge.call(bridgeEvents.PROFILE_REQUESTED);

  // Generate dynamic props for the profile <MenuItem> component
  const profileItemProps = (() => {
    const props = {};
    if (isSelectableProfile) {
      if (!isThirdParty) {
        props.href = store.getLink('user', { user: auth.username });
      }
      props.onClick = onProfileSelected;
    }
    return props;
  })();

  const menuLabel = (
    <span className="TopBar__menu-label">
      <SvgIcon name="profile" className="TopBar__menu-icon" />
    </span>
  );
  return (
    // FIXME: KeyDown handling is temporary for Notebook "easter egg"
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div className="UserMenu" onKeyDown={onKeyDown}>
      <Menu
        label={menuLabel}
        title={auth.displayName}
        align="right"
        open={isOpen}
        onOpenChanged={setOpen}
      >
        <MenuSection>
          <MenuItem
            label={auth.displayName}
            isDisabled={!isSelectableProfile}
            {...profileItemProps}
          />
          {!isThirdParty && (
            <MenuItem
              label="Account settings"
              href={store.getLink('account.settings')}
            />
          )}
          {isNotebookEnabled && (
            <MenuItem
              label="Open notebook"
              onClick={() => onSelectNotebook()}
            />
          )}
        </MenuSection>
        {isLogoutEnabled && (
          <MenuSection>
            <MenuItem label="Log out" onClick={onLogout} />
          </MenuSection>
        )}
      </Menu>
    </div>
  );
}

export default withServices(UserMenu, ['bridge', 'settings']);
