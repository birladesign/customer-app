import './QuickActionTile.css';

// Peer tiles all read as equally prominent regardless of whether a
// destination is wired yet — Repair/Warranty are present-but-inert (no
// onClick), the same enabled-looking-but-unwired precedent already used for
// several action buttons elsewhere (e.g. OrderCard's "Get Help").
export default function QuickActionTile({ icon: Icon, label, onClick }) {
  return (
    <button className="quick-action-tile" onClick={onClick}>
      <span className="quick-action-tile__icon">
        <Icon width="22" height="22" />
      </span>
      <span className="quick-action-tile__label">{label}</span>
    </button>
  );
}
