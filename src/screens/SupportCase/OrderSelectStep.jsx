import { getOrdersForLane } from '../../data/support.js';
import './OrderSelectStep.css';

export default function OrderSelectStep({ lane, selectedOrder, onSelect, onContinue, staleOrderId, onFallbackGeneral }) {
  const candidates = getOrdersForLane(lane);
  const isGeneral = lane === 'general';
  const canContinue = isGeneral || Boolean(selectedOrder);

  return (
    <div className="order-select-step">
      {staleOrderId && (
        <p className="order-select-step__notfound-hint">We couldn't find order {staleOrderId} — pick one below.</p>
      )}

      {isGeneral && (
        <button
          className={`order-select-step__skip${!selectedOrder ? ' order-select-step__skip--selected' : ''}`}
          onClick={() => onSelect(null)}
        >
          <span>Not related to an order</span>
        </button>
      )}

      {candidates.length === 0 ? (
        <div className="order-select-step__empty">
          <p className="order-select-step__empty-title">No eligible orders</p>
          <p className="order-select-step__empty-body">
            None of your orders qualify for this category right now.
          </p>
          <button className="order-select-step__empty-cta" onClick={onFallbackGeneral}>
            File as a general case instead
          </button>
        </div>
      ) : (
        <div className="order-select-step__list">
          {candidates.map((order) => (
            <button
              key={order.id}
              className={`order-select-step__card${selectedOrder?.id === order.id ? ' order-select-step__card--selected' : ''}`}
              onClick={() => onSelect(order)}
            >
              <img className="order-select-step__thumb" src={order.image} alt="" />
              <span className="order-select-step__text">
                <span className="order-select-step__product">{order.product}</span>
                <span className="order-select-step__meta">{order.id} · {order.date}</span>
                <span className="order-select-step__status">{order.status.label}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {candidates.length > 0 && (
        <button className="order-select-step__continue" disabled={!canContinue} onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
