import { useState } from 'react';
import { splitProductSpec, getShipmentStatus } from '../data/orders.js';
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

// One row in a shipment's expanded unit list — shared by the same-SKU and
// multi-product cards below so every unit, regardless of shipment type,
// shows its own product image rather than a plain text-only row.
function ShipmentUnitRow({ image, alt, title, meta, status, onClick }) {
  return (
    <button className="shipment-card__product" onClick={onClick}>
      <img className="shipment-card__product-image" src={image} alt={alt} />
      <div className="shipment-card__product-details">
        <span className="shipment-card__product-status" style={{ color: DOT_COLOR[status.dot] }}>
          {status.label}
        </span>
        <p className="shipment-card__product-name">{title}</p>
        {meta && <p className="shipment-card__product-meta">{meta}</p>}
      </div>
      <ChevronRightIcon className="shipment-card__unit-chevron" aria-hidden="true" />
    </button>
  );
}

// Several units of the same SKU that travelled together under one shipmentId.
// They share a status and a date, so repeating a full OrderCard per unit says
// "Delivered" three times and reads as three unrelated purchases. This shows
// the shipment once, using the same order-card chrome as every other card in
// the list, with the unit count in place of a badge and the individual order
// IDs (each with its own product image and status) revealed on tap — each
// still opens its own Order Details, since returns and warranty are per-unit.
function SameProductShipmentCard({ orders, first }) {
  const { navigate } = useNavigation();
  const [expanded, setExpanded] = useState(false);
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
            </div>
            <p className="order-card__product">{productName}</p>
            {spec && (
              <p className="order-card__variant">
                <span>{spec}</span>
              </p>
            )}
            <p className="order-card__caption">
              All {orders.length} units {status.dot === 'green' ? 'delivered' : 'arriving'} together on {first.date}
            </p>
          </div>
          <ChevronRightIcon
            className={`order-card__chevron${expanded ? ' shipment-card__chevron--open' : ''}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {expanded && (
        <div className="shipment-card__units shipment-card__units--products">
          {orders.map((order) => (
            // Each unit keeps its own status rather than repeating the
            // shipment's — they travel and are delivered together, but a
            // return/warranty claim on one unit is per-order, so this is the
            // one place that has to stay live per unit, not inherited from
            // the group above.
            <ShipmentUnitRow
              key={order.id}
              image={order.image}
              alt={first.product}
              title={order.id}
              status={order.status}
              onClick={(e) => {
                e.stopPropagation();
                navigate('orderDetails', { orderId: order.id });
              }}
            />
          ))}
        </div>
      )}
    </article>
  );
}

// A shipment made of different products (not N units of one SKU) — there's
// no single representative product/status to show collapsed, so this skips
// the tap-to-expand toggle entirely and always shows every unit as its own
// product card (image, name, qty, status) right on My Orders. Each card
// still opens that unit's own Order Details on tap, same as the same-SKU
// case above.
function MultiProductShipmentCard({ orders, first }) {
  const { navigate } = useNavigation();
  const shipmentStatus = getShipmentStatus(orders);

  return (
    <article className="order-card shipment-card--multi">
      <div className="order-card__body">
        <div className="order-card__header">
          <CopyShipmentId id={first.shipmentId} />
          <span className="order-card__date">{first.date}</span>
        </div>
        <div className="order-card__status-row">
          <span className="order-card__status-label" style={{ color: DOT_COLOR[shipmentStatus.dot] }}>
            {shipmentStatus.label}
          </span>
        </div>
        <p className="order-card__caption">{orders.length} items in this shipment</p>
      </div>

      <div className="shipment-card__units shipment-card__units--products">
        {orders.map((order) => {
          const { name, spec } = splitProductSpec(order.product);
          const meta = order.qty || spec ? (
            <>
              {order.qty && <span>Qty: {order.qty}</span>}
              {order.qty && spec && <span className="order-card__variant-dot" aria-hidden="true" />}
              {spec && <span>{spec}</span>}
            </>
          ) : null;
          return (
            <ShipmentUnitRow
              key={order.id}
              image={order.image}
              alt={order.product}
              title={name}
              meta={meta}
              status={order.status}
              onClick={() => navigate('orderDetails', { orderId: order.id })}
            />
          );
        })}
      </div>
    </article>
  );
}

export default function ShipmentCard({ orders }) {
  const [first] = orders;
  const sameProduct = orders.every((order) => order.product === first.product);
  return sameProduct ? (
    <SameProductShipmentCard orders={orders} first={first} />
  ) : (
    <MultiProductShipmentCard orders={orders} first={first} />
  );
}
