import { CheckIcon } from './icons.jsx';
import './DetailedTracking.css';

// Granular sibling of Timeline — where Timeline shows one description/
// timestamp per milestone, this expands each milestone into the courier-style
// sub-event log ("Item has reached the courier facility in...") that actually
// reduces tracking anxiety. Falls back to a single-line entry (reusing
// whatever description/timestamp the step already has) for steps that don't
// carry a real `updates` array, so orders without granular data still render
// something sensible instead of an empty section.
export default function DetailedTracking({ steps, currentIndex }) {
  return (
    <div className="detailed-tracking">
      {steps.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
        const updates = step.updates?.length
          ? step.updates
          : step.timestamp
          ? [{ text: step.description ?? step.label, timestamp: step.timestamp }]
          : [];
        return (
          <div key={step.label} className={`detailed-tracking__step detailed-tracking__step--${state}`}>
            <div className="detailed-tracking__rail">
              <span className="detailed-tracking__dot">
                {state === 'done' && <CheckIcon width="11" height="11" strokeWidth="3" />}
              </span>
              {i < steps.length - 1 && <span className="detailed-tracking__line" />}
            </div>
            <div className="detailed-tracking__content">
              <p className="detailed-tracking__label">{step.label}</p>
              {updates.map((u, idx) => (
                <div className="detailed-tracking__update" key={idx}>
                  <p className="detailed-tracking__update-text">{u.text}</p>
                  {u.timestamp && <p className="detailed-tracking__update-time">{u.timestamp}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
