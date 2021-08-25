import { Panel } from '@hypothesis/frontend-shared';

/**
 * @typedef LaunchErrorPanelProps
 * @prop {Error} error - The error that prevented the client from launching
 */

/**
 * An error panel displayed when a fatal error occurs during app startup.
 *
 * Note that this component cannot use any of the services or store that are
 * normally available to UI components in the client.
 *
 * @param {LaunchErrorPanelProps} props
 */
export default function LaunchErrorPanel({ error }) {
  return (
    <div className="LaunchErrorPanel">
      <Panel title="Unable to start Hypothesis">{error.message}</Panel>
    </div>
  );
}
