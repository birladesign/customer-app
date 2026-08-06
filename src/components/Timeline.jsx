import { CheckIcon } from './icons.jsx';
import './Timeline.css';

// Full-page, timestamped, vertical sibling of Tracker's compact horizontal
// step view — same dot/line/done-current-upcoming language, same
// currentIndex-driven state derivation, different orientation and detail
// level for a dedicated screen rather than an inline card peek.
export default function Timeline({ steps, currentIndex }) {
  return (
    <div className="timeline">
      {steps.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
        return (
          <div key={step.label} className={`timeline__step timeline__step--${state}`}>
            <div className="timeline__rail">
              <span className="timeline__dot">{state === 'done' && <CheckIcon width="11" height="11" strokeWidth="3" />}</span>
              {i < steps.length - 1 && <span className="timeline__line" />}
            </div>
            <div className="timeline__content">
              <p className="timeline__label">{step.label}</p>
              {step.timestamp && <p className="timeline__timestamp">{step.timestamp}</p>}
              {step.description && <p className="timeline__description">{step.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
