import { useState } from 'react';
import { ORDERS } from '../data/orders.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import Timeline from '../components/Timeline.jsx';
import IntentList from '../components/IntentList.jsx';
import { ChevronLeftIcon, CopyIcon, CheckIcon } from '../components/icons.jsx';
import './OrderDetails.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function OrderDetails({ params }) {
  const { goBack } = useNavigation();
  const [copied, setCopied] = useState(false);
  const order = ORDERS.find((o) => o.id === params.orderId);

  if (!order) {
    return (
      <div className="order-details">
        <header className="order-details__topbar">
          <button className="order-details__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Order Details</h1>
          <span className="order-details__icon-btn-spacer" />
        </header>
        <p className="order-details__not-found">Order not found.</p>
      </div>
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(order.id);
    } catch {
      // Clipboard API unavailable — the checkmark still confirms the tap.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="order-details">
      <header className="order-details__topbar">
        <button className="order-details__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Order Details</h1>
        <span className="order-details__icon-btn-spacer" />
      </header>

      <main className="order-details__content">
        <div className="order-details__summary">
          <img className="order-details__image" src={order.image} alt={order.product} />
          <div className="order-details__summary-text">
            <p className="order-details__product">{order.product}</p>
            <button className="order-details__id" onClick={handleCopy}>
              {copied ? <CheckIcon width="13" height="13" strokeWidth="3" /> : <CopyIcon width="13" height="13" />}
              <span>{order.id}</span>
            </button>
            <p className="order-details__date">Ordered on {order.date}</p>
          </div>
        </div>

        <div className="order-details__card">
          <div className="order-details__row">
            <span>Order Amount</span>
            <strong>{formatRupees(order.amount)}</strong>
          </div>
          <div className="order-details__row">
            <span>Payment</span>
            <strong>{order.payment.method} · {order.payment.status}</strong>
          </div>
          {order.address && (
            <div className="order-details__row order-details__row--address">
              <span>Delivery Address</span>
              <strong>{order.address}</strong>
            </div>
          )}
        </div>

        {order.timeline && (
          <div className="order-details__card">
            <p className="order-details__card-heading">Order Journey</p>
            <Timeline steps={order.timeline.steps} currentIndex={order.timeline.currentIndex} />
          </div>
        )}

        <IntentList order={order} />
      </main>
    </div>
  );
}
