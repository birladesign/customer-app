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
// the list, and taps straight into the first unit's Order Details — same as
// any other order card — which already lists every sibling unit under "Other
// Items in This Shipment", so there's no separate expand step to duplicate it.
function SameProductShipmentCard({ orders, first }) {
  const { navigate } = useNavigation();
  const { name: productName, spec } = splitProductSpec(first.product);
  // Reads as first.status for every current fixture (identical units share
  // one status by construction), but a flagged unit always wins the header
  // regardless of position — otherwise a non-first unit that diverges after
  // delivery (e.g. one gets flagged damaged) would be masked by unit #1's
  // own (unflagged) status. Deliberately not getShipmentStatus's full
  // rollup here — that would rename the common case to "All Items
  // Delivered" instead of the plainer "Delivered" this header already shows.
  const status = orders.find((o) => o.status.dot === 'red')?.status ?? first.status;
  // Whether every unit still shares one status — used below to decide if a
  // unit's own status row would just repeat what the header already says.
  const allUnitsSameStatus = orders.every((o) => o.status.label === orders[0].status.label);
  const edd = getExpectedDelivery(first);
  const deliveredDate = getDeliveredDate(first);

  return (
    <article
      className="order-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate('orderDetails', { orderId: first.id })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate('orderDetails', { orderId: first.id });
        }
      }}
    >
      <div className="order-card__body">
        <div className="order-card__header">
          <CopyShipmentId id={first.shipmentId} />
          <span className="order-card__date">{first.date}</span>
        </div>

        <div className="order-card__status-row">
          <span className="order-card__status-label" style={{ color: DOT_COLOR[status.dot] }}>
            {status.label}
          </span>
          {edd && (
            <p className="order-card__edd">
              <CalendarIcon width="12" height="12" />
              Est. Delivery: {edd}
            </p>
          )}
        </div>

        <div className="order-card__main">
          <img className="order-card__image" src={first.image} alt={first.product} />
          <div className="order-card__details">
            <p className="order-card__product">{productName}</p>
            {spec && (
              <p className="order-card__variant">
                <span>{spec}</span>
              </p>
            )}
            {status.dot === 'green' && (
              <p className="order-card__caption">
                All {orders.length} units delivered together on {deliveredDate ?? first.date}
              </p>
            )}
          </div>
          <ChevronRightIcon className="order-card__chevron" aria-hidden="true" />
        </div>
      </div>
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
  // The rolled-up shipmentStatus label is often a synthesized phrase ("3
  // Items · In Transit") that never string-matches any single unit's own
  // label ("Confirmed · Packing") even when every unit is genuinely
  // identical — comparing against that would leave every row's status
  // showing. Compare units to each other instead: identical across the
  // board means nothing new to say per row; a real difference (e.g. one
  // unit flagged after delivery) still needs its own row to call it out.
  const allUnitsSameStatus = orders.every((o) => o.status.label === orders[0].status.label);

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
          {shipmentEdd && (
            <p className="order-card__edd">
              <CalendarIcon width="12" height="12" />
              Est. Delivery: {shipmentEdd}
            </p>
          )}
        </div>
        {shipmentDeliveredDate && <p className="order-card__caption">Delivered on {shipmentDeliveredDate}</p>}
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
              // Repeating the shipment's own status on every row said nothing
              // new when every unit matched it — only show a row's own status
              // when it has actually diverged (e.g. one unit flagged damaged
              // while the rest are delivered), same rule as the same-SKU case.
              status={allUnitsSameStatus ? null : order.status}
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
