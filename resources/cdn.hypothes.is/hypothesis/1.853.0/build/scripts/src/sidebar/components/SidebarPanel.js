import { Panel } from '@hypothesis/frontend-shared';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import scrollIntoView from 'scroll-into-view';

import { useStoreProxy } from '../store/use-store';

import Slider from './Slider';

/**
 * @typedef {import("../../types/sidebar").PanelName} PanelName
 */

/**
 * @typedef SidebarPanelProps
 * @prop {import("preact").ComponentChildren} children
 * @prop {string} [icon] - An optional icon name for display next to the panel's title
 * @prop {PanelName} panelName -
 *   A string identifying this panel. Only one `panelName` may be active at any time.
 *   Multiple panels with the same `panelName` would be "in sync", opening and closing together.
 * @prop {string} title - The panel's title
 * @prop {(active: boolean) => any} [onActiveChanged] -
 *   Optional callback to invoke when this panel's active status changes
 */

/**
 * Base component for a sidebar panel. Only one sidebar panel
 * (as defined by the panel's `panelName`) is active (visible) at one time.
 *
 * @param {SidebarPanelProps} props
 */
export default function SidebarPanel({
  children,
  icon = '',
  panelName,
  title,
  onActiveChanged,
}) {
  const store = useStoreProxy();
  const panelIsActive = store.isSidebarPanelOpen(panelName);

  const panelElement = useRef(/** @type {HTMLDivElement|null}*/ (null));
  const panelWasActive = useRef(panelIsActive);

  // Scroll the panel into view if it has just been opened
  useEffect(() => {
    if (panelWasActive.current !== panelIsActive) {
      panelWasActive.current = panelIsActive;
      if (panelIsActive) {
        scrollIntoView(panelElement.current);
      }
      if (typeof onActiveChanged === 'function') {
        onActiveChanged(panelIsActive);
      }
    }
  }, [panelIsActive, onActiveChanged]);

  const closePanel = useCallback(() => {
    store.toggleSidebarPanel(panelName, false);
  }, [store, panelName]);

  return (
    <Slider visible={panelIsActive}>
      <div ref={panelElement} className="u-sidebar-container">
        <Panel title={title} icon={icon} onClose={closePanel}>
          {children}
        </Panel>
      </div>
    </Slider>
  );
}
