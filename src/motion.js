// Shared motion vocabulary. Keep literal transition objects out of components —
// one spring value should mean one physical feel across the whole app.

// Critically damped (no overshoot) — the default for anything that isn't a
// momentum/drag gesture: screen pushes/pops, wizard steps, collapse/expand.
export const SPRING_STANDARD = { type: 'spring', bounce: 0, duration: 0.35 };

// Reserved for drag-dismissable / throwable UI only (bottom sheets) — a gesture
// that carried momentum earns a touch of bounce on settle; a programmatic
// reveal does not (see Apple's "Designing Fluid Interfaces" damping guidance).
export const SPRING_GESTURE = { type: 'spring', bounce: 0.15, duration: 0.4 };

// Reduced-motion fallback used in place of any spring above — a short opacity
// cross-fade, never a slide/spring/elastic.
export const DURATION_REDUCED = { duration: 0.15 };

// Where a flick would coast to if the finger let go and physics took over.
// This is Apple's own projection (the "Designing Fluid Interfaces" sample
// code), not the physics-textbook v²/2a — the same exponential decay a scroll
// view uses, so a flick lands where the rest of the platform taught the user
// a flick lands. Velocity is px/s; the result is a distance in px.
export function projectMomentum(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// How far down its own height a sheet's projected landing point has to sit
// before the gesture reads as "dismiss" rather than "settle back". A ratio,
// not a pixel count: a tall sheet shouldn't dismiss from the same absolute
// drag as a two-line confirm.
const SHEET_DISMISS_RATIO = 0.5;

// Drag-to-dismiss intent, decided from where the gesture is *going* rather
// than where the finger happened to stop. A hard flick dismisses from barely
// any drag; a long drag that's being pulled back up at release projects back
// up and settles. Distance alone can't tell those apart.
export function shouldDismissSheet({ offset, velocity, height }) {
  if (!height) return false;
  return offset + projectMomentum(velocity) > height * SHEET_DISMISS_RATIO;
}
