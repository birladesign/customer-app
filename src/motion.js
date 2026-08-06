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
