import './CalendarPicker.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function toYYYYMMDD(dateObj) {
  if (!dateObj) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CalendarPicker({ value, onChange, minDate, maxDate }) {
  const selectedDateObj = parseSlotDate(value);
  
  const handleChange = (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    onChange(formatSlotDate(dateObj));
  };

  return (
    <div className="calendar-picker-native">
      <input 
        type="date" 
        className="calendar-picker-native__input"
        value={selectedDateObj ? toYYYYMMDD(selectedDateObj) : ''} 
        min={minDate ? toYYYYMMDD(minDate) : ''}
        max={maxDate ? toYYYYMMDD(maxDate) : ''}
        onChange={handleChange}
      />
    </div>
  );
}
