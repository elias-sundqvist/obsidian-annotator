import { useStoreProxy } from '../store/use-store';
import { useUserFilterOptions } from './hooks/use-filter-options';

import FilterSelect from './FilterSelect';

/**
 * @typedef {import('../store/modules/filters').FilterOption} FilterOption
 */

/**
 * Filters for the Notebook
 */
function NotebookFilters() {
  const store = useStoreProxy();

  const userFilter = store.getFilter('user');
  const userFilterOptions = useUserFilterOptions();

  return (
    <FilterSelect
      defaultOption={{ value: '', display: 'Everybody' }}
      icon="profile"
      onSelect={userFilter => store.setFilter('user', userFilter)}
      options={userFilterOptions}
      selectedOption={userFilter}
      title="Filter by user"
    />
  );
}

export default NotebookFilters;
