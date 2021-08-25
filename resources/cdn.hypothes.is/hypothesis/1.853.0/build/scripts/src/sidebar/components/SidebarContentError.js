import { LabeledButton, Panel } from '@hypothesis/frontend-shared';

import { useStoreProxy } from '../store/use-store';

/**
 * @typedef SidebarContentErrorProps
 * @prop {'annotation'|'group'} errorType
 * @prop {boolean} [showClearSelection] - Whether to show a "Clear selection" button.
 * @prop {() => any} onLoginRequest - A function that will launch the login flow for the user.
 */

/**
 * Show an error indicating that an annotation or group referenced in the URL
 * could not be fetched.
 *
 * @param {SidebarContentErrorProps} props
 */
export default function SidebarContentError({
  errorType,
  onLoginRequest,
  showClearSelection = false,
}) {
  const store = useStoreProxy();
  const isLoggedIn = store.isLoggedIn();

  const errorTitle =
    errorType === 'annotation' ? 'Annotation unavailable' : 'Group unavailable';

  const errorMessage = (() => {
    if (!isLoggedIn) {
      return `The ${errorType} associated with the current URL is unavailable.
        You may need to log in to see it.`;
    }
    if (errorType === 'group') {
      return `The current URL links to a group, but that group cannot be found,
        or you do not have permission to view the annotations in that group.`;
    }
    return `The current URL links to an annotation, but that annotation
      cannot be found, or you do not have permission to view it.`;
  })();

  return (
    <div className="u-sidebar-container">
      <Panel icon="restricted" title={errorTitle}>
        <p>{errorMessage}</p>
        <div className="u-layout-row--justify-right u-horizontal-rhythm">
          {showClearSelection && (
            <LabeledButton
              variant={isLoggedIn ? 'primary' : undefined}
              onClick={() => store.clearSelection()}
            >
              Show all annotations
            </LabeledButton>
          )}
          {!isLoggedIn && (
            <LabeledButton variant="primary" onClick={onLoginRequest}>
              Log in
            </LabeledButton>
          )}
        </div>
      </Panel>
    </div>
  );
}
