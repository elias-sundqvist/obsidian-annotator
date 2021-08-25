import { LinkButton, SvgIcon } from '@hypothesis/frontend-shared';

import { useStoreProxy } from '../store/use-store';

/**
 * @typedef LoggedOutMessageProps
 * @prop {() => any} onLogin
 */

/**
 * Render a call-to-action to log in or sign up. This message is intended to be
 * displayed to non-auth'd users when viewing a single annotation in a
 * direct-linked context (i.e. URL with syntax `/#annotations:<annotation_id>`)
 *
 * @param {LoggedOutMessageProps} props
 */
function LoggedOutMessage({ onLogin }) {
  const store = useStoreProxy();

  return (
    <div className="LoggedOutMessage">
      <span>
        This is a public annotation created with Hypothesis. <br />
        To reply or make your own annotations on this document,{' '}
        <a
          className="LoggedOutMessage__link"
          href={store.getLink('signup')}
          target="_blank"
          rel="noopener noreferrer"
        >
          create a free account
        </a>{' '}
        or{' '}
        <LinkButton
          className="InlineLinkButton"
          onClick={onLogin}
          variant="dark"
        >
          log in
        </LinkButton>
        .
      </span>
      <div className="LoggedOutMessage__logo">
        <a
          href="https://hypothes.is"
          aria-label="Hypothesis homepage"
          title="Hypothesis homepage"
        >
          <SvgIcon name="logo" className="LoggedOutMessage__logo-icon" />
        </a>
      </div>
    </div>
  );
}

export default LoggedOutMessage;
