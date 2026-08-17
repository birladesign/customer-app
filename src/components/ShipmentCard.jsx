import { useState } from 'react';
import { splitProductSpec } from '../data/orders.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { ChevronRightIcon } from './icons.jsx';
import './ShipmentCard.css';

const DOT_COLOR = {
  red: 'var(--color-action-red)',
  blue: 'var(--color-info-blue)',
  green: 'var(--color-success)',
  muted: 'var(--color-text-muted)',
};

// Several units of the same SKU that travelled together under one shipmentId.
// They share a status and a date, so repeating a full OrderCard per unit says
// "Delivered" three times and reads as three unrelated purchases. This shows
// the shipment once, with the unit count, and only reveals the individual
// order IDs on tap — each still opens its own Order Details, since returns and
// warranty are per-unit.
export default function ShipmentCard({ orders }) {
  const { navigate } = useNavigation();
  const [expanded, setExpanded] = useState(false);
  const [first] = orders;
  const { name: productName, spec } = splitProductSpec(first.product);
  const status = first.status;

  return (
    <article className="shipment-card">
      <button
        className="shipment-card__summary"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <img className="shipment-card__image" src={first.image} alt={first.product} />
        <div className="shipment-card__text">
          <div className="shipment-card__status-row">
            <span className="shipment-card__status" style={{ color: DOT_COLOR[status.dot] }}>
              {status.label}
            </span>
            <span className="shipment-card__count">{orders.length} units</span>
          </div>
          <p className="shipment-card__product">{productName}</p>
          {spec && <p className="shipment-card__spec">{spec}</p>}
          <p className="shipment-card__date">{first.date}</p>
        </div>
        <ChevronRightIcon
          className={`shipment-card__chevron${expanded ? ' shipment-card__chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="shipment-card__units">
          {orders.map((order) => (
            <button
              key={order.id}
              className="shipment-card__unit"
              onClick={() => navigate('orderDetails', { orderId: order.id })}
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
