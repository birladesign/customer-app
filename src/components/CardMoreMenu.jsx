import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MoreIcon, MapPinIcon, CalendarIcon, HelpCircleIcon } from './icons.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';

// Shared kebab menu for every card type on My Orders (plain order, same-SKU
// shipment, multi-product shipment, multi-shipment order) — each caller
// supplies its own handlers since only it knows which order/shipment/item
// the action should target, but the toggle/scrim/menu chrome is identical
// everywhere, so it lives here once instead of being copy-pasted per card.
// onEditAddress is optional — a multi-shipment order's per-shipment menu
// omits it since address editing lives at the order level there, not per
// physical parcel.
export default function CardMoreMenu({ onEditAddress, onReschedule, onNeedHelp }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

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
      <AnimatePresence>
        {open && (
          <>
            <span className="order-card__more-scrim" onClick={close} />
            {/* Anchored to the button that opened it (top right, where the
                menu is positioned) and scaled up from there rather than just
                faded in — it should read as emerging from the kebab, not as
                a layer that materializes out of nowhere. Critically damped:
                this is a UI reveal, not a momentum gesture, so no bounce. */}
            <motion.div
              className="order-card__more-menu"
              onClick={(e) => e.stopPropagation()}
              style={{ transformOrigin: 'top right' }}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
              transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
            >
              {onEditAddress && (
                <button className="order-card__more-item" onClick={run(onEditAddress)}>
                  <MapPinIcon width="15" height="15" />
                  <span>Edit Address</span>
                </button>
              )}
              <button className="order-card__more-item" onClick={run(onReschedule)}>
                <CalendarIcon width="15" height="15" />
                <span>Reschedule Delivery</span>
              </button>
              <button className="order-card__more-item" onClick={run(onNeedHelp)}>
                <HelpCircleIcon width="15" height="15" />
                <span>Need Help</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
