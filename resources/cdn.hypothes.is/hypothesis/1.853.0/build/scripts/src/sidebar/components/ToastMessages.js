import classnames from 'classnames';
import { SvgIcon } from '@hypothesis/frontend-shared';

import { useStoreProxy } from '../store/use-store';
import { withServices } from '../service-context';

/**
 * @typedef {import('../store/modules/toast-messages').ToastMessage} ToastMessage
 */

/**
 * @typedef ToastMessageProps
 * @prop {ToastMessage} message - The message object to render
 * @prop {(id: string) => any} onDismiss
 */

/**
 * An individual toast message—a brief and transient success or error message.
 * The message may be dismissed by clicking on it.
 * Otherwise, the `toastMessenger` service handles removing messages after a
 * certain amount of time.
 *
 * @param {ToastMessageProps} props
 */
function ToastMessage({ message, onDismiss }) {
  // Capitalize the message type for prepending
  const prefix = message.type.charAt(0).toUpperCase() + message.type.slice(1);
  const iconName = message.type === 'notice' ? 'cancel' : message.type;
  /**
   * a11y linting is disabled here: There is a click-to-remove handler on a
   * non-interactive element. This allows sighted users to get the toast message
   * out of their way if it interferes with interacting with the underlying
   * components. This shouldn't pose the same irritation to users with screen-
   * readers as the rendered toast messages shouldn't impede interacting with
   * the underlying document.
   */
  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
    <li
      className={classnames('toast-message-container', {
        'is-dismissed': message.isDismissed,
      })}
      onClick={() => onDismiss(message.id)}
    >
      <div
        className={classnames(
          'toast-message',
          `toast-message--${message.type}`
        )}
      >
        <div className="toast-message__type">
          <SvgIcon name={iconName} className="toast-message__icon" />
        </div>
        <div className="toast-message__message">
          <strong>{prefix}: </strong>
          {message.message}
          {message.moreInfoURL && (
            <div className="toast-message__link">
              <a
                href={message.moreInfoURL}
                onClick={
                  event =>
                    event.stopPropagation() /* consume the event so that it does not dismiss the message */
                }
                target="_new"
              >
                More info
              </a>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * @typedef ToastMessagesProps
 * @prop {Object} toastMessenger - Injected service
 */

/**
 * A collection of toast messages. These are rendered within an `aria-live`
 * region for accessibility with screen readers.
 *
 * @param {ToastMessagesProps} props
 */
function ToastMessages({ toastMessenger }) {
  const store = useStoreProxy();
  const messages = store.getToastMessages();
  return (
    <div>
      <ul
        aria-live="polite"
        aria-relevant="additions"
        className="ToastMessages"
      >
        {messages.map(message => (
          <ToastMessage
            message={message}
            key={message.id}
            onDismiss={id => toastMessenger.dismiss(id)}
          />
        ))}
      </ul>
    </div>
  );
}

export default withServices(ToastMessages, ['toastMessenger']);
