import BottomSheet from './BottomSheet.jsx';
import { CloseIcon } from './icons.jsx';
import './FilterSheet.css';

const STATUS_CHIPS = ['All', 'Active', 'Done', 'Closed', 'Returns'];

export default function FilterSheet({ open, selected, onSelect, onClear, onApply, onClose }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="filter-sheet__header">
        <h2>Filter Orders</h2>
        <button className="filter-sheet__close" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </div>

      <p className="filter-sheet__section-label">STATUS</p>
      <div className="filter-sheet__chips">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip}
            className={`filter-sheet__chip${selected === chip ? ' filter-sheet__chip--selected' : ''}`}
            onClick={() => onSelect(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="filter-sheet__footer">
        <button className="filter-sheet__clear" onClick={onClear}>
          Clear All
        </button>
        <button className="filter-sheet__apply" onClick={onApply}>
          Apply Filters
        </button>
      </div>
    </BottomSheet>
  );
}
