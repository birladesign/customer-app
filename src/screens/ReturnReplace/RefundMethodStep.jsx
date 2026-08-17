import { CURRENT_USER } from '../../data/profile.js';
import { ClockIcon, MapPinIcon, PhoneIcon } from '../../components/icons.jsx';
import './RefundMethodStep.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Only shown for the "Return for Refund" lever — replace/sendPart
// don't move money, so there's no refund or pickup to confirm. Refunds only
// ever go to the original payment method — no wallet — so this is a plain
// confirmation, not a choice between options.
export default function RefundMethodStep({ order, refundAmount, onSubmit }) {
  return (
    <div className="refund-method-step">
      <div className="refund-method-step__scroll">
        <h2 className="refund-method-step__heading">How you'll receive your refund</h2>
        <div className="refund-method-step__options">
          <div className="refund-method-step__option">
            <span className="refund-method-step__option-icon">
              <ClockIcon width="18" height="18" />
            </span>
            <span className="refund-method-step__option-text">
              <span className="refund-method-step__option-title-row">
                <span className="refund-method-step__option-title">Original Payment Mode</span>
              </span>
              <span className="refund-method-step__option-body">
                {formatRupees(refundAmount)} will be refunded to your original payment method within 2–5 business
                days after the quality check is passed.
              </span>
            </span>
          </div>
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
