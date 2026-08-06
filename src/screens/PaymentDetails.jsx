import { ORDERS } from '../data/orders.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import Timeline from '../components/Timeline.jsx';
import { ChevronLeftIcon, WalletIcon } from '../components/icons.jsx';
import './PaymentDetails.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function PaymentDetails({ params }) {
  const { goBack } = useNavigation();
  const order = ORDERS.find((o) => o.id === params.orderId);

  if (!order) {
    return (
      <div className="payment-details">
        <header className="payment-details__topbar">
          <button className="payment-details__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Payment & Refund</h1>
          <span className="payment-details__icon-btn-spacer" />
        </header>
        <p className="payment-details__not-found">Order not found.</p>
      </div>
    );
  }

  const { priceBreakup } = order;

  return (
    <div className="payment-details">
      <header className="payment-details__topbar">
        <button className="payment-details__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Payment & Refund</h1>
        <span className="payment-details__icon-btn-spacer" />
      </header>

      <main className="payment-details__content">
        <div className="payment-details__card">
          <p className="payment-details__card-heading">Payment Method</p>
          <div className="payment-details__method">
            <span className="payment-details__method-icon">
              <WalletIcon width="18" height="18" />
            </span>
            <div>
              <p className="payment-details__method-name">{order.payment.method}</p>
              <p className="payment-details__method-status">{order.payment.status}</p>
            </div>
          </div>
        </div>

        <div className="payment-details__card">
          <p className="payment-details__card-heading">Price Breakup</p>
          <div className="payment-details__row">
            <span>Item Price</span>
            <span>{formatRupees(priceBreakup.itemPrice)}</span>
          </div>
          <div className="payment-details__row">
            <span>Shipping</span>
            <span>{priceBreakup.shipping ? formatRupees(priceBreakup.shipping) : 'Free'}</span>
          </div>
          {priceBreakup.discount > 0 && (
            <div className="payment-details__row payment-details__row--discount">
              <span>Discount</span>
              <span>−{formatRupees(priceBreakup.discount)}</span>
            </div>
          )}
          {priceBreakup.tax > 0 && (
            <div className="payment-details__row">
              <span>Tax</span>
              <span>{formatRupees(priceBreakup.tax)}</span>
            </div>
          )}
          <div className="payment-details__row payment-details__row--total">
            <span>Total Paid</span>
            <span>{formatRupees(priceBreakup.total)}</span>
          </div>
        </div>

        {order.refund && (
          <div className="payment-details__card">
            <p className="payment-details__card-heading">Refund Status</p>
            <div className="payment-details__row">
              <span>Refund Amount</span>
              <span>{formatRupees(order.refund.amount)}</span>
            </div>
            <div className="payment-details__row">
              <span>Refund Method</span>
              <span>{order.refund.method}</span>
            </div>
            <div className="payment-details__timeline">
              <Timeline steps={order.refund.timeline.steps} currentIndex={order.refund.timeline.currentIndex} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
