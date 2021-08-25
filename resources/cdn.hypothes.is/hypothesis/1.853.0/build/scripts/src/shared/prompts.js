import { render } from 'preact';

import { ConfirmModal } from '@hypothesis/frontend-shared';

/**
 * Show the user a prompt asking them to confirm an action.
 *
 * This is like an async version of `window.confirm` except that:
 *
 *  - It can be used inside iframes (browsers are starting to prevent this
 *    for the native `window.confirm` dialog)
 *  - The visual style of the dialog matches the Hypothesis design system
 *
 * @param {object} options - Options for the `ConfirmModal`
 *   @prop {string} [title]
 *   @prop {string} message
 *   @prop {string} [confirmAction]
 * @return {Promise<boolean>} - Promise that resolves with `true` if the user
 *   confirmed the action or `false` if they canceled it.
 */
export async function confirm({
  title = 'Confirm',
  message,
  confirmAction = 'Yes',
}) {
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'confirm-container');

  // Ensure dialog appears above any existing content. The Z-index value here
  // is Good Enough™ for current usage.
  container.style.position = 'relative';
  container.style.zIndex = '10';

  document.body.appendChild(container);

  return new Promise(resolve => {
    /** @param {boolean} result */
    const close = result => {
      render(null, container);
      container.remove();
      resolve(result);
    };

    render(
      <ConfirmModal
        title={title}
        message={message}
        confirmAction={confirmAction}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />,
      container
    );
  });
}
