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
        return (
          <div key={label} className={`tracker__step tracker__step--${state}`}>
            <div className="tracker__rail">
              <span className="tracker__dot">{state === 'done' && <CheckIcon width="10" height="10" strokeWidth="3" />}</span>
              {i < steps.length - 1 && <span className="tracker__line" />}
            </div>
            <span className="tracker__label">{label}</span>
            {date && <span className="tracker__date">{date}</span>}
          </div>
        );
      })}
    </div>
  );
}
