import { LabeledButton, SvgIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { applyTheme } from '../helpers/theme';
import { useStoreProxy } from '../store/use-store';
import { withServices } from '../service-context';

/**
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 * @typedef {import('../../types/sidebar').TabName} TabName
 */

/**
 * @typedef TabProps
 * @prop {Object} children - Child components.
 * @prop {number} count - The total annotations for this tab.
 * @prop {boolean} isSelected - Is this tab currently selected?
 * @prop {boolean} isWaitingToAnchor - Are there any annotations still waiting to anchor?
 * @prop {string} label - A string label to use for `aria-label` and `title`
 * @prop {() => any} onSelect - Callback to invoke when this tab is selected.
 */

/**
 * Display name of the tab and annotation count.
 *
 * @param {TabProps} props
 */
function Tab({
  children,
  count,
  isWaitingToAnchor,
  isSelected,
  label,
  onSelect,
}) {
  const selectTab = () => {
    if (!isSelected) {
      onSelect();
    }
  };

  const title = count > 0 ? `${label} (${count} available)` : label;

  return (
    <div>
      <button
        className={classnames('SelectionTabs__type', {
          'is-selected': isSelected,
        })}
        // Listen for `onMouseDown` so that the tab is selected when _pressed_
        // as this makes the UI feel faster. Also listen for `onClick` as a fallback
        // to enable selecting the tab via other input methods.
        onClick={selectTab}
        onMouseDown={selectTab}
        role="tab"
        tabIndex={0}
        title={title}
        aria-label={title}
        aria-selected={isSelected.toString()}
      >
        {children}
        {count > 0 && !isWaitingToAnchor && (
          <span className="SelectionTabs__count"> {count}</span>
        )}
      </button>
    </div>
  );
}

/**
 * @typedef SelectionTabsProps
 * @prop {boolean} isLoading - Are we waiting on any annotations from the server?
 * @prop {MergedConfig} settings - Injected service.
 * @prop {import('../services/annotations').AnnotationsService} annotationsService
 */

/**
 * Tabbed display of annotations and notes.
 *
 * @param {SelectionTabsProps} props
 */
function SelectionTabs({ annotationsService, isLoading, settings }) {
  const store = useStoreProxy();
  const selectedTab = store.selectedTab();
  const noteCount = store.noteCount();
  const annotationCount = store.annotationCount();
  const orphanCount = store.orphanCount();
  const isWaitingToAnchorAnnotations = store.isWaitingToAnchorAnnotations();

  /**
   * @param {TabName} tabId
   */
  const selectTab = tabId => {
    store.clearSelection();
    store.selectTab(tabId);
  };

  const showAnnotationsUnavailableMessage =
    selectedTab === 'annotation' &&
    annotationCount === 0 &&
    !isWaitingToAnchorAnnotations;

  const showNotesUnavailableMessage = selectedTab === 'note' && noteCount === 0;

  return (
    <div className="SelectionTabs-container">
      <div className="SelectionTabs" role="tablist">
        <Tab
          count={annotationCount}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          isSelected={selectedTab === 'annotation'}
          label="Annotations"
          onSelect={() => selectTab('annotation')}
        >
          Annotations
        </Tab>
        <Tab
          count={noteCount}
          isWaitingToAnchor={isWaitingToAnchorAnnotations}
          isSelected={selectedTab === 'note'}
          label="Page notes"
          onSelect={() => selectTab('note')}
        >
          Page Notes
        </Tab>
        {orphanCount > 0 && (
          <Tab
            count={orphanCount}
            isWaitingToAnchor={isWaitingToAnchorAnnotations}
            isSelected={selectedTab === 'orphan'}
            label="Orphans"
            onSelect={() => selectTab('orphan')}
          >
            Orphans
          </Tab>
        )}
      </div>
      {selectedTab === 'note' && settings.enableExperimentalNewNoteButton && (
        <div className="u-layout-row--justify-right">
          <LabeledButton
            icon="add"
            onClick={() => annotationsService.createPageNote()}
            variant="primary"
            style={applyTheme(['ctaBackgroundColor'], settings)}
          >
            New note
          </LabeledButton>
        </div>
      )}
      {!isLoading && showNotesUnavailableMessage && (
        <div className="SelectionTabs__message">
          There are no page notes in this group.
        </div>
      )}
      {!isLoading && showAnnotationsUnavailableMessage && (
        <div className="SelectionTabs__message">
          There are no annotations in this group.
          <br />
          Create one by selecting some text and clicking the{' '}
          <SvgIcon
            name="annotate"
            inline={true}
            className="SelectionTabs__icon"
          />{' '}
          button.
        </div>
      )}
    </div>
  );
}

export default withServices(SelectionTabs, ['annotationsService', 'settings']);
