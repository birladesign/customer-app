import { CURRENT_USER } from '../../data/profile.js';
import { WalletIcon, ClockIcon, CheckIcon, MapPinIcon, PhoneIcon } from '../../components/icons.jsx';
import './RefundMethodStep.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const METHODS = [
  {
    id: 'wallet',
    icon: WalletIcon,
    title: 'TSC Wallet',
    badge: 'INSTANT',
    body: (amount) => `${formatRupees(amount)} will be refunded to your TSC Wallet instantly after the quality check is passed.`,
  },
  {
    id: 'original',
    icon: ClockIcon,
    title: 'Original Payment Mode',
    badge: null,
    body: (amount) => `${formatRupees(amount)} will be refunded to your original payment method within 2–5 business days after the quality check is passed.`,
  },
];

// Only shown for the "Return for Refund" lever — repair/replace/sendPart
// don't move money, so there's no refund method or pickup to confirm.
export default function RefundMethodStep({ order, refundAmount, method, onSelectMethod, onSubmit }) {
  return (
    <div className="refund-method-step">
      <div className="refund-method-step__scroll">
        <h2 className="refund-method-step__heading">How would you like to receive your refund?</h2>
        <div className="refund-method-step__options">
          {METHODS.map(({ id, icon: Icon, title, badge, body }) => (
            <button
              key={id}
              className={`refund-method-step__option${method === id ? ' refund-method-step__option--selected' : ''}`}
              onClick={() => onSelectMethod(id)}
            >
              <span className="refund-method-step__option-icon">
                <Icon width="18" height="18" />
              </span>
              <span className="refund-method-step__option-text">
                <span className="refund-method-step__option-title-row">
                  <span className="refund-method-step__option-title">{title}</span>
                  {badge && <span className="refund-method-step__option-badge">{badge}</span>}
                </span>
                <span className="refund-method-step__option-body">{body(refundAmount)}</span>
              </span>
              <span className="refund-method-step__radio" aria-hidden="true">
                {method === id && <CheckIcon width="11" height="11" strokeWidth="3" />}
              </span>
            </button>
          ))}
        </div>

        <h2 className="refund-method-step__heading">Confirm Pickup Details</h2>
        <div className="refund-method-step__address-card">
          <p className="refund-method-step__address-name">
            <MapPinIcon width="14" height="14" />
            {CURRENT_USER.firstName} {CURRENT_USER.lastName}
          </p>
          <p className="refund-method-step__address-lines">{order.address}</p>
          <div className="refund-method-step__address-divider" />
          <p className="refund-method-step__address-phone">
            <PhoneIcon width="13" height="13" />
            +91 {CURRENT_USER.phone}
          </p>
        </div>
      </div>

      <div className="refund-method-step__footer">
        <div className="refund-method-step__footer-amount">
          <p className="refund-method-step__footer-label">Refund Amount</p>
          <p className="refund-method-step__footer-value">{formatRupees(refundAmount)}</p>
        </div>
        <button className="refund-method-step__submit" onClick={onSubmit}>
          Request Return
        </button>
      </div>
    </div>
  );
}
