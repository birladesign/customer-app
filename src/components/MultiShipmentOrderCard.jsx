import { useState } from 'react';
import { splitProductSpec, getExpectedDelivery } from '../data/orders.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { CopyIcon, CheckIcon, ChevronRightIcon, CalendarIcon } from './icons.jsx';
import './OrderCard.css';
import './MultiShipmentOrderCard.css';

const DOT_COLOR = {
  red: 'var(--color-action-red)',
  blue: 'var(--color-info-blue)',
  green: 'var(--color-success)',
  muted: 'var(--color-text-muted)',
};

function CopyId({ id, label }) {
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
    <button className="order-card__id" onClick={handleCopy} aria-label={`Copy ${label} ${id}`}>
      {copied ? (
        <CheckIcon className="order-card__id-icon order-card__id-icon--copied" />
      ) : (
        <CopyIcon className="order-card__id-icon" />
      )}
      <span>{id}</span>
    </button>
  );
}

// One order, fulfilled across more than one physical parcel — the My Orders
// list counterpart to OrderDetails' shipment-groups view. Same grouping
// (item.shipmentGroupId/-Label) shown right on the list instead of only
// after opening the order, so a split shipment is obvious at a glance.
export default function MultiShipmentOrderCard({ order }) {
  const { navigate } = useNavigation();
  const shipmentGroups = Object.values(
    order.items.reduce((acc, item) => {
      (acc[item.shipmentGroupId] ??= { id: item.shipmentGroupId, label: item.shipmentGroupLabel, items: [] }).items.push(
        item
      );
      return acc;
    }, {})
  );

  return (
    <article className="order-card multi-shipment-order-card">
      <div className="order-card__body">
        <div className="order-card__header">
          <CopyId id={order.id} label="order number" />
          <span className="order-card__date">{order.date}</span>
        </div>
      </div>

      <div className="multi-shipment-order-card__groups">
        {shipmentGroups.map((group) => {
          const groupStatus = group.items[0].status;
          const pill = STATUS_PILL[groupStatus.dot] ?? STATUS_PILL.muted;
          const edd = getExpectedDelivery(group.items[0]);
          return (
            <div key={group.id} className="multi-shipment-order-card__group">
              <div className="multi-shipment-order-card__group-header">
                <CopyId id={group.id} label="shipment number" />
              </div>

              <div className="multi-shipment-order-card__group-status-row">
                <span
                  className="multi-shipment-order-card__group-pill"
                  style={{ background: pill.bg, color: pill.color }}
                >
                  {groupStatus.label}
                </span>
                {edd && (
                  <span className="multi-shipment-order-card__group-edd">
                    <CalendarIcon width="12" height="12" />
                    Est. Delivery: {edd}
                  </span>
                )}
              </div>

              <div className="multi-shipment-order-card__group-items">
                {group.items.map((item) => {
                  const { name, spec } = splitProductSpec(item.product);
                  return (
                    <button
                      key={item.sku}
                      className="multi-shipment-order-card__item"
                      onClick={() => navigate('orderDetails', { orderId: order.id, sku: item.sku })}
                    >
                      <img src={item.image} alt={item.product} />
                      <span className="multi-shipment-order-card__item-text">
                        <span className="multi-shipment-order-card__item-name">{name}</span>
                        {(item.qty || spec) && (
                          <span className="multi-shipment-order-card__item-meta">
                            {item.qty && <span>Qty: {item.qty}</span>}
                            {item.qty && spec && <span className="order-card__variant-dot" aria-hidden="true" />}
                            {spec && <span>{spec}</span>}
                          </span>
                        )}
                      </span>
                      <ChevronRightIcon aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
