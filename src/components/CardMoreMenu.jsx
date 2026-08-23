import { useState } from 'react';
import { MoreIcon, MapPinIcon, CalendarIcon, HelpCircleIcon } from './icons.jsx';

// Shared kebab menu for every card type on My Orders (plain order, same-SKU
// shipment, multi-product shipment, multi-shipment order) — each caller
// supplies its own handlers since only it knows which order/shipment/item
// the action should target, but the toggle/scrim/menu chrome is identical
// everywhere, so it lives here once instead of being copy-pasted per card.
export default function CardMoreMenu({ onEditAddress, onReschedule, onNeedHelp }) {
  const [open, setOpen] = useState(false);

  function toggle(e) {
    e.stopPropagation();
    setOpen((v) => !v);
  }

  function close(e) {
    e.stopPropagation();
    setOpen(false);
  }

  function run(handler) {
    return (e) => {
      e.stopPropagation();
      setOpen(false);
      handler();
    };
  }

  return (
    <>
      <button className="order-card__more-btn" onClick={toggle} aria-label="More actions">
        <MoreIcon className="order-card__more-icon" width="16" height="16" />
      </button>
      {open && (
        <>
          <span className="order-card__more-scrim" onClick={close} />
          <div className="order-card__more-menu" onClick={(e) => e.stopPropagation()}>
            <button className="order-card__more-item" onClick={run(onEditAddress)}>
              <MapPinIcon width="15" height="15" />
              <span>Edit Address</span>
            </button>
            <button className="order-card__more-item" onClick={run(onReschedule)}>
              <CalendarIcon width="15" height="15" />
              <span>Reschedule Delivery</span>
            </button>
            <button className="order-card__more-item" onClick={run(onNeedHelp)}>
              <HelpCircleIcon width="15" height="15" />
              <span>Need Help</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
