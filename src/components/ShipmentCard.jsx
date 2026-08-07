import { useNavigation } from '../navigation/NavigationContext.jsx';
import { splitProductSpec } from '../data/orders.js';
import { TruckIcon, ChevronRightIcon } from './icons.jsx';
import './ShipmentCard.css';

// Multiple line items that share a shipment (same status, same date) group
// under one shared header instead of repeating that status once per item —
// each item row still leads to its own OrderDetails via order.id, unchanged.
// Deliberately a separate, simpler component from OrderCard: no banner,
// actions row, tracker toggle, or rating — just a shipment-level summary.
export default function ShipmentCard({ orders }) {
  const { navigate } = useNavigation();
  const [first] = orders;

  return (
    <div className="shipment-card">
      <div className="shipment-card__header">
        <span className="shipment-card__header-icon">
          <TruckIcon width="18" height="18" />
        </span>
        <div className="shipment-card__header-text">
          <p className="shipment-card__status">{first.status.label}</p>
          <p className="shipment-card__date">on {first.date}</p>
        </div>
      </div>

      {orders.map((order) => {
        const { name, spec } = splitProductSpec(order.product);
        return (
          <button
            key={order.id}
            className="shipment-card__item"
            onClick={() => navigate('orderDetails', { orderId: order.id })}
          >
            <img className="shipment-card__item-image" src={order.image} alt={order.product} />
            <div className="shipment-card__item-text">
              <p className="shipment-card__item-name">{name}</p>
              {(order.qty || spec) && (
                <p className="shipment-card__item-meta">
                  {order.qty && <span>Qty: {order.qty}</span>}
                  {order.qty && spec && <span className="shipment-card__item-dot" aria-hidden="true" />}
                  {spec && <span>{spec}</span>}
                </p>
              )}
            </div>
            <ChevronRightIcon className="shipment-card__item-chevron" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
