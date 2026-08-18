import { useState } from 'react';
import { splitProductSpec, getShipmentStatus, getExpectedDelivery, getDeliveredDate } from '../data/orders.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { CopyIcon, CheckIcon, ChevronRightIcon, CalendarIcon } from './icons.jsx';
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
// shows its own product image rather than a plain text-only row. `status`
// is optional: a same-SKU unit whose status matches the shipment header
// above it has nothing new to say, so that caller omits it rather than
// repeating the same label on every row.
function ShipmentUnitRow({ image, alt, title, meta, status, onClick }) {
  return (
    <button className="shipment-card__product" onClick={onClick}>
      <img className="shipment-card__product-image" src={image} alt={alt} />
      <div className="shipment-card__product-details">
        {status && (
          <span className="shipment-card__product-status" style={{ color: DOT_COLOR[status.dot] }}>
            {status.label}
          </span>
        )}
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
  const edd = getExpectedDelivery(first);
  const deliveredDate = getDeliveredDate(first);

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
              {status.dot === 'green'
                ? `All ${orders.length} units delivered together on ${deliveredDate ?? first.date}`
                : `All ${orders.length} units arriving together on ${first.date}`}
            </p>
            {edd && (
              <p className="order-card__edd">
                <CalendarIcon width="12" height="12" />
                Est. Delivery: {edd}
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
        <div className="shipment-card__units shipment-card__units--products">
          {orders.map((order) => (
            // A unit's status only shows here when it has actually diverged
            // from the shipment's own (e.g. one unit gets flagged after
            // delivery) — every unit still travels and is delivered
            // together, so repeating the identical label on every row below
            // an already-shown shipment status says nothing new.
            <ShipmentUnitRow
              key={order.id}
              image={order.image}
              alt={first.product}
              title={order.id}
              status={order.status.label === status.label ? null : order.status}
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
  // Every unit in one shipment travels and arrives together — one shared
  // delivery day for the whole card, not a different EDD per row.
  const shipmentEdd = orders.map(getExpectedDelivery).find(Boolean);
  const shipmentDeliveredDate =
    shipmentStatus.label === 'All Items Delivered' ? orders.map(getDeliveredDate).find(Boolean) : null;

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
        {shipmentDeliveredDate && <p className="order-card__caption">Delivered on {shipmentDeliveredDate}</p>}
        {shipmentEdd && (
          <p className="order-card__edd">
            <CalendarIcon width="12" height="12" />
            Est. Delivery: {shipmentEdd}
          </p>
        )}
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
