import { IconButton } from '@hypothesis/frontend-shared';
import { useEffect, useRef, useState } from 'preact/hooks';
import classnames from 'classnames';

import { createSidebarConfig } from '../config/sidebar';

/**
 * @typedef NotebookIframeProps
 * @prop {Record<string, any>} config
 * @prop {string} groupId
 */

/**
 * Create the iframe that will load the notebook application.
 *
 * @param {NotebookIframeProps} props
 */
function NotebookIframe({ config, groupId }) {
  const notebookConfig = createSidebarConfig(config);
  // Explicity set the "focused" group
  notebookConfig.group = groupId;
  const configParam = encodeURIComponent(JSON.stringify(notebookConfig));
  const notebookAppSrc = `${config.notebookAppUrl}#config=${configParam}`;

  return (
    <iframe
      title={'Hypothesis annotation notebook'}
      className="NotebookIframe"
      // Enable media in annotations to be shown fullscreen
      allowFullScreen
      src={notebookAppSrc}
    />
  );
}

/**
 * @typedef NotebookModalProps
 * @prop {import('../util/emitter').EventBus} eventBus
 * @prop {Record<string, any>} config
 */

/**
 * Create a modal component that hosts (1) the notebook iframe and (2) a button to close the modal.
 *
 * @param {NotebookModalProps} props
 */
export default function NotebookModal({ eventBus, config }) {
  // Temporary solution: while there is no mechanism to sync new annotations in
  // the notebook, we force re-rendering of the iframe on every 'openNotebook'
  // event, so that the new annotations are displayed.
  // https://github.com/hypothesis/client/issues/3182
  const [iframeKey, setIframeKey] = useState(0);
  const [isHidden, setIsHidden] = useState(true);
  const [groupId, setGroupId] = useState(/** @type {string|null} */ (null));
  const originalDocumentOverflowStyle = useRef('');
  const emitter = useRef(
    /** @type {ReturnType<eventBus['createEmitter']>|null} */ (null)
  );

  // Stores the original overflow CSS property of document.body and reset it
  // when the component is destroyed
  useEffect(() => {
    originalDocumentOverflowStyle.current = document.body.style.overflow;

    return () => {
      document.body.style.overflow = originalDocumentOverflowStyle.current;
    };
  }, []);

  // The overflow CSS property is set to hidden to prevent scrolling of the host page,
  // while the notebook modal is open. It is restored when the modal is closed.
  useEffect(() => {
    if (isHidden) {
      document.body.style.overflow = originalDocumentOverflowStyle.current;
    } else {
      document.body.style.overflow = 'hidden';
    }
  }, [isHidden]);

  useEffect(() => {
    emitter.current = eventBus.createEmitter();
    emitter.current.subscribe(
      'openNotebook',
      (/** @type {string} */ groupId) => {
        setIsHidden(false);
        setIframeKey(iframeKey => iframeKey + 1);
        setGroupId(groupId);
      }
    );

    return () => {
      emitter.current.destroy();
    };
  }, [eventBus]);

  const onClose = () => {
    setIsHidden(true);
    emitter.current.publish('closeNotebook');
  };

  if (groupId === null) {
    return null;
  }

  return (
    <div
      className={classnames('NotebookModal__outer', { 'is-hidden': isHidden })}
    >
      <div className="NotebookModal__inner">
        <div className="NotebookModal__close-button-container">
          <IconButton
            icon="cancel"
            title="Close the Notebook"
            onClick={onClose}
            variant="dark"
          />
        </div>
        <NotebookIframe key={iframeKey} config={config} groupId={groupId} />
      </div>
    </div>
  );
}
