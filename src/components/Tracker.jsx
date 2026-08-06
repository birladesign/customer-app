import { CheckIcon } from './icons.jsx';
import './Tracker.css';

export default function Tracker({ steps, currentIndex }) {
  return (
    <div className="tracker">
      {steps.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
        return (
          <div key={step} className={`tracker__step tracker__step--${state}`}>
            <div className="tracker__rail">
              <span className="tracker__dot">{state === 'done' && <CheckIcon width="10" height="10" strokeWidth="3" />}</span>
              {i < steps.length - 1 && <span className="tracker__line" />}
            </div>
            <span className="tracker__label">{step}</span>
          </div>
        );
      })}
    </div>
  );
}
