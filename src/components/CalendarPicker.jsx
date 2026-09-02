import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons.jsx';
import './CalendarPicker.css';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The app stores slot dates as plain "20 Aug 2026" strings (see order
// .deliverySlot/.installationSlot), so the picker speaks that format at its
// boundaries and only uses Date objects internally for grid math.
export function formatSlotDate(date) {
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function parseSlotDate(value) {
  if (!value) return null;
  const [day, mon, year] = value.split(' ');
  const monthIndex = MONTHS.indexOf(mon);
  if (monthIndex === -1) return null;
  return new Date(Number(year), monthIndex, Number(day));
}

function sameDay(a, b) {
  return (
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// A real month grid instead of a fixed row of five day-chips — a slot more
// than a few days out was simply unreachable before, and "Thu 20 Aug" in a
// horizontal strip gives no sense of the week it sits in. `minDate`/`maxDate`
// bound the bookable window; days outside it render disabled rather than
// disappearing, so the shape of the month stays readable.
export default function CalendarPicker({ value, onChange, minDate, maxDate }) {
  const selected = parseSlotDate(value);
  const min = minDate ? startOfDay(minDate) : null;
  const max = maxDate ? startOfDay(maxDate) : null;
  const [viewMonth, setViewMonth] = useState(() => {
    const anchor = selected ?? min ?? new Date();
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Leading blanks keep the 1st under its real weekday column.
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  function isDisabled(date) {
    if (min && date < min) return true;
    if (max && date > max) return true;
    return false;
  }

  // Stepping past the bookable window has nothing to show, so the arrows
  // switch off at its edges rather than scrolling into empty months.
  const prevDisabled = min && new Date(year, month, 1) <= new Date(min.getFullYear(), min.getMonth(), 1);
  const nextDisabled = max && new Date(year, month, 1) >= new Date(max.getFullYear(), max.getMonth(), 1);

  function shiftMonth(delta) {
    setViewMonth(new Date(year, month + delta, 1));
  }

  return (
    <div className="calendar-picker">
      <div className="calendar-picker__header">
        <button
          type="button"
          className="calendar-picker__nav"
          onClick={() => shiftMonth(-1)}
          disabled={prevDisabled}
          aria-label="Previous month"
        >
          <ChevronLeftIcon width="16" height="16" />
        </button>
        <span className="calendar-picker__month" aria-live="polite">
          {MONTHS_LONG[month]} {year}
        </span>
        <button
          type="button"
          className="calendar-picker__nav"
          onClick={() => shiftMonth(1)}
          disabled={nextDisabled}
          aria-label="Next month"
        >
          <ChevronRightIcon width="16" height="16" />
        </button>
      </div>

      <div className="calendar-picker__weekdays" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="calendar-picker__weekday">
            {d}
          </span>
        ))}
      </div>

      <div className="calendar-picker__grid" role="grid">
        {cells.map((date, i) =>
          date ? (
            <button
              key={date.toISOString()}
              type="button"
              className={`calendar-picker__day${sameDay(date, selected) ? ' calendar-picker__day--selected' : ''}`}
              disabled={isDisabled(date)}
              aria-pressed={sameDay(date, selected)}
              onClick={() => onChange(formatSlotDate(date))}
            >
              {date.getDate()}
            </button>
          ) : (
            <span key={`blank-${i}`} className="calendar-picker__blank" />
          )
        )}
      </div>
    </div>
  );
}
