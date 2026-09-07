// One clock for the whole prototype.
//
// Previously "today" was defined three times and disagreed with itself:
// mattressRules.js froze it at 21 Aug 2026 to measure its day windows
// against orders.js's fictional 2026 timeline, while InstallationSchedule and
// DeliverySchedule booked against the real system clock inside hardcoded
// month windows. So a verdict and a date picker on the same screen could be
// weeks apart, and the pickers ran out of bookable dates the moment real time
// walked past their hardcoded end date.
//
// Everything time-related now goes through here.

// The order fixtures are written around a fictional August-2026 timeline, so
// the demo pins "today" there to keep delivered-on dates, day windows and
// booking calendars mutually consistent. Set to null to run against the real
// system clock instead (useful once fixtures are generated relative to now).
export const DEMO_TODAY = new Date(2026, 7, 21);

export function today() {
  return DEMO_TODAY ? new Date(DEMO_TODAY) : new Date();
}

export function atMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Whole days between `date` and today, floored at 0 — a date in the future
// reads as 0 days elapsed, not a negative window.
export function daysSince(date) {
  if (!date) return 0;
  const then = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, Math.round((atMidnight(today()) - atMidnight(then)) / 86400000));
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// A booking calendar expressed relative to today rather than as fixed
// calendar dates, so the picker can never run dry: `leadDays` is the earliest
// slot that can still be staffed, `spanDays` how far ahead booking is open.
export function bookingWindow({ leadDays = 1, spanDays = 30 } = {}) {
  const start = addDays(today(), leadDays);
  return { first: start, last: addDays(start, spanDays) };
}
