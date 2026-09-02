import { AlertTriangleIcon, ZapIcon, PackageIcon, InboxIcon, HelpCircleIcon } from '../../components/icons.jsx';

// One icon per RETURN_REASONS entry (data/remediation.js) — kept as a
// dedicated map, not inline in ReasonStep, so EvidenceStep's recap can
// reuse the exact same glyph for the reason the customer already picked.
export const REASON_ICONS = {
  Damaged: AlertTriangleIcon,
  'Defective / Not working': ZapIcon,
  'Wrong size or model': PackageIcon,
  'Missing parts': InboxIcon,
  'Discomfort / Not as expected': HelpCircleIcon,
};
