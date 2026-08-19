import { CheckIcon } from './icons.jsx';
import './DetailedTracking.css';

// A step that hasn't happened yet has no real courier update to show — but
// "nothing to say" still reads as a blank, broken-feeling row. This gives
// every known milestone label a plain-language one-liner so an upcoming step
// shows what will happen, not just when.
const UPCOMING_STEP_TEXT = {
  Confirmed: 'Your order will be confirmed',
  Packing: 'Your order will be packed',
  Dispatched: 'Your order will be dispatched',
  Shipped: 'Your order will be shipped',
  'Out for Delivery': 'Your order will be out for delivery',
  Delivered: 'Your order will be delivered',
  'Delivery Failed': "We'll update you if delivery fails",
  'Delivery Delayed': "We'll notify you if delivery is delayed",
  'Received at Warehouse': 'Your item will be received at our warehouse',
  'Refund Initiated': 'Your refund will be initiated',
  'Pickup Scheduled': 'Your pickup will be scheduled',
  'Picked Up': 'Your item will be picked up',
  'Quality Check': 'Your item will undergo quality check',
};

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
              {/* Not reached yet, so there's no real update log — show the
                  generic one-liner for this milestone plus, when known, the
                  date it's expected by. */}
              {updates.length === 0 && (
                <div className="detailed-tracking__update">
                  <p className="detailed-tracking__update-text">
                    {UPCOMING_STEP_TEXT[step.label] ?? step.label}
                  </p>
                  {step.expectedDate && (
                    <p className="detailed-tracking__update-time detailed-tracking__update-time--expected">
                      Expected {step.expectedDate}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
