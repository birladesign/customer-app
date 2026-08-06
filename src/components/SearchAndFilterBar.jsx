import { SearchIcon, FilterIcon } from './icons.jsx';
import './SearchAndFilterBar.css';

export default function SearchAndFilterBar({ query, onQueryChange, activeFilterCount, onOpenFilters }) {
  return (
    <div className="search-bar">
      <div className="search-bar__input-wrap">
        <SearchIcon className="search-bar__icon" aria-hidden="true" />
        <input
          className="search-bar__input"
          placeholder="Order ID or Product Name"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <button className="search-bar__filters" onClick={onOpenFilters}>
        <FilterIcon aria-hidden="true" />
        Filters
        {activeFilterCount > 0 && <span className="search-bar__filter-count">{activeFilterCount}</span>}
      </button>
    </div>
  );
}
