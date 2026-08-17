import { useState } from 'react';
import { splitProductSpec } from '../data/orders.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { CopyIcon, CheckIcon, ChevronRightIcon } from './icons.jsx';
import './OrderCard.css';
import './ShipmentCard.css';

const DOT_COLOR = {
  red: 'var(--color-action-red)',
  blue: 'var(--color-info-blue)',
  green: 'var(--color-success)',
  muted: 'var(--color-text-muted)',
};

function CopyShipmentId({ id }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // Clipboard API unavailable — the checkmark still confirms the tap.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button className="order-card__id" onClick={handleCopy} aria-label={`Copy shipment number ${id}`}>
      {copied ? (
        <CheckIcon className="order-card__id-icon order-card__id-icon--copied" />
      ) : (
        <CopyIcon className="order-card__id-icon" />
      )}
      <span>{id}</span>
    </button>
  );
}

// Several units of the same SKU that travelled together under one shipmentId.
// They share a status and a date, so repeating a full OrderCard per unit says
// "Delivered" three times and reads as three unrelated purchases. This shows
// the shipment once, using the same order-card chrome as every other card in
// the list, with the unit count in place of a badge and the individual order
// IDs revealed on tap — each still opens its own Order Details, since returns
// and warranty are per-unit.
export default function ShipmentCard({ orders }) {
  const { navigate } = useNavigation();
  const [expanded, setExpanded] = useState(false);
  const [first] = orders;
  const { name: productName, spec } = splitProductSpec(first.product);
  const status = first.status;

  return (
    <article
      className="order-card"
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
    >
      <div className="order-card__body">
        <div className="order-card__header">
          <CopyShipmentId id={first.shipmentId} />
          <span className="order-card__date">{first.date}</span>
        </div>

        <div className="order-card__main">
          <img className="order-card__image" src={first.image} alt={first.product} />
          <div className="order-card__details">
            <div className="order-card__status-row">
              <span className="order-card__status-label" style={{ color: DOT_COLOR[status.dot] }}>
                {status.label}
              </span>
              <span className="order-card__pill-badge">{orders.length} units</span>
            </div>
            <p className="order-card__product">{productName}</p>
            {spec && (
              <p className="order-card__variant">
                <span>{spec}</span>
              </p>
            )}
          </div>
          <ChevronRightIcon
            className={`order-card__chevron${expanded ? ' shipment-card__chevron--open' : ''}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {expanded && (
        <div className="shipment-card__units">
          {orders.map((order) => (
            <button
              key={order.id}
              className="shipment-card__unit"
              onClick={(e) => {
                e.stopPropagation();
                navigate('orderDetails', { orderId: order.id });
              }}
            >
              <span className="shipment-card__unit-id">{order.id}</span>
              <ChevronRightIcon className="shipment-card__unit-chevron" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
