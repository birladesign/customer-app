import { CASE_LANES } from '../../data/support.js';
import './CategoryStep.css';

export default function CategoryStep({ selected, onSelect, onContinue }) {
  return (
    <div className="category-step">
      <p className="category-step__prompt">What can we help with? This helps us route it to the right team.</p>
      <div className="category-step__tiles">
        {CASE_LANES.map((lane) => {
          const isSelected = selected === lane.key;
          return (
            <button
              key={lane.key}
              className={`category-step__tile${isSelected ? ' category-step__tile--selected' : ''}`}
              onClick={() => onSelect(lane.key)}
            >
              <span className="category-step__tile-text">
                <span className="category-step__tile-label">{lane.label}</span>
                <span className="category-step__tile-desc">{lane.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      <button className="category-step__continue" disabled={!selected} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
