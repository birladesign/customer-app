import { CheckIcon } from './icons.jsx';
import './Tracker.css';

// Accepts plain-string steps (existing OrderCard usage) or {label, date}
// objects (Home's dated preview card) — same visual language either way.
export default function Tracker({ steps, currentIndex }) {
  return (
    <div className="tracker">
      {steps.map((step, i) => {
        const label = typeof step === 'string' ? step : step.label;
        const date = typeof step === 'string' ? null : step.date;
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
        // Split the connecting line into a left/right half around the dot,
        // rather than one full-width line after it — a dot centered on
        // [left half][dot][right half] lands at the column's midpoint, the
        // same place the label centers under, so dot and label actually line
        // up. The outer half on the first/last step stays present (so the
        // dot doesn't drift off-center) but invisible, since there's no
        // neighboring step for it to connect to.
        const prevDone = i > 0 && i - 1 < currentIndex;
        return (
          <div key={label} className={`tracker__step tracker__step--${state}`}>
            <div className="tracker__rail">
              <span
                className={`tracker__line tracker__line--left${i === 0 ? ' tracker__line--hidden' : ''}${prevDone ? ' tracker__line--done' : ''}`}
              />
              <span className="tracker__dot">{state === 'done' && <CheckIcon width="10" height="10" strokeWidth="3" />}</span>
              <span
                className={`tracker__line tracker__line--right${i === steps.length - 1 ? ' tracker__line--hidden' : ''}${state === 'done' ? ' tracker__line--done' : ''}`}
              />
            </div>
            <span className="tracker__label">{label}</span>
            {date && <span className="tracker__date">{date}</span>}
          </div>
        );
      })}
    </div>
  );
}
