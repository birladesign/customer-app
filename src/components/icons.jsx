// Shared icon set — plain inline SVGs, not emoji. Emoji render inconsistently
// across platforms and clash with the rest of the visual system; a single
// consistent stroke weight/size reads as designed rather than assembled.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function SearchIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function FilterIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.5" {...base} {...props}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2.5" {...base} {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" strokeWidth="3" {...base} {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function HelpCircleIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9.75c0 1.5-2 1.75-2.4 3" />
      <line x1="12" y1="16.5" x2="12" y2="16.6" />
    </svg>
  );
}

export function BellIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10.5 20a1.7 1.7 0 0 0 3 0" />
    </svg>
  );
}

export function ZapIcon(props) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" />
    </svg>
  );
}

export function AlertTriangleIcon(props) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12" y2="17.1" />
    </svg>
  );
}

export function WalletIcon(props) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M21 7H6a3 3 0 0 0 0 6h15Z" />
      <path d="M21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13" />
      <circle cx="17" cy="10" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CheckCircleIcon(props) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12.5 11 15 15.5 9.5" />
    </svg>
  );
}

export function StarIcon({ filled, ...props }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="12 2.5 15.1 8.8 22 9.8 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.8 8.9 8.8" />
    </svg>
  );
}

export function InboxIcon(props) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" strokeWidth="1.5" {...base} {...props}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z" />
    </svg>
  );
}

export function CopyIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.5" {...base} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function HouseIcon(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function HeadsetIcon(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M19 19v1a2 2 0 0 1-2 2h-3" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </svg>
  );
}

export function WrenchIcon(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2Z" />
    </svg>
  );
}

export function TruckIcon(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <rect x="1" y="6" width="13" height="11" rx="1" />
      <path d="M14 10h4l3 3v4h-7Z" />
      <circle cx="6" cy="19" r="1.6" />
      <circle cx="17" cy="19" r="1.6" />
    </svg>
  );
}

export function PackageIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <line x1="12" y1="13" x2="12" y2="21" />
    </svg>
  );
}

export function EditIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function ShieldIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6Z" />
      <polyline points="9 12 11.3 14.3 15.5 10" />
    </svg>
  );
}

export function FileTextIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <polyline points="14 3 14 8 19 8" />
      <line x1="8.5" y1="13" x2="15.5" y2="13" />
      <line x1="8.5" y1="17" x2="13" y2="17" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

export function ExternalLinkIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...base} {...props}>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

export function MoreIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
