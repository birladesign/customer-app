import { useState } from 'react';
import { ORDERS, splitProductSpec, recomputeOrderTotals } from '../../data/orders.js';
import { getPriceMatchTier } from '../../data/priceMatch.js';
import { createCase, CASE_PREFIX } from '../../data/support.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import { ChevronLeftIcon, CheckIcon, ClockIcon } from '../../components/icons.jsx';
import '../ReturnReplace/ExecutionStep.css';
import './PriceMatchFlow.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// PRD FN-02 / §7.16 — capture proof, compute a verdict off the approval
// ladder (≤₹2K Agent auto-approves, above that needs a human), then apply
// the credit. This is the "found cheaper" deflection CX-02 calls out, which
// previously fell straight through to the generic hold-or-cancel sheet.
export default function PriceMatchFlow({ params }) {
  const { goBack } = useNavigation();
  const order = ORDERS.find((o) => o.id === params.orderId);
  const [competitor, setCompetitor] = useState('');
  const [competitorPrice, setCompetitorPrice] = useState('');
  const [photo, setPhoto] = useState([]);
  // The verdict — diff, qualifies, tier, the order's own total — is frozen
  // here the instant "Check Eligibility" is tapped, and every screen after
  // that reads only from this. applyCredit mutates the order's own amount,
  // so re-deriving the diff from the live order afterward would compare the
  // already-discounted new total against itself and silently read as ₹0 —
  // `decision` is what actually drives everything from here on.
  const [decision, setDecision] = useState(null);
  const [approved, setApproved] = useState(false);

  if (!order) {
    return (
      <div className="price-match">
        <header className="price-match__topbar">
          <button className="price-match__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Price Match</h1>
          <span className="price-match__icon-btn-spacer" />
        </header>
        <p className="price-match__not-found">Order not found.</p>
      </div>
    );
  }

  const { name, spec } = splitProductSpec(order.product);
  const orderAmount = order.priceBreakup?.total ?? order.amount;
  const parsedPrice = Number(competitorPrice);
  const canSubmit = competitor.trim().length > 0 && parsedPrice > 0 && photo.length > 0;

  function applyCredit(d) {
    const newTotal = Math.max(0, d.orderAmount - d.diff);
    Object.assign(order, {
      amount: order.items ? order.amount : newTotal,
      priceBreakup: order.priceBreakup ? { ...order.priceBreakup, total: newTotal } : order.priceBreakup,
      caption: `Price match applied — ${formatRupees(d.diff)} credited (matched ${d.competitor}).`,
    });
    if (!order.items) recomputeOrderTotals(order);
    setDecision({ ...d, newTotal });
    setApproved(true);
  }

  function handleSubmit() {
    const diff = orderAmount - parsedPrice;
    const qualifies = diff > 0;
    const tier = qualifies ? getPriceMatchTier(diff) : null;
    const frozen = { competitor, parsedPrice, orderAmount, diff, qualifies, tier };
    if (qualifies && tier.autoApprove) {
      applyCredit(frozen);
    } else {
      setDecision(frozen);
    }
  }

  function handleSimulateApproval() {
    applyCredit(decision);
  }

  function fileOutcomeCase(outcome, chosen) {
    const d = decision;
    createCase({
      lane: 'refunds',
      prefix: CASE_PREFIX.refund,
      order,
      item: null,
      description: d.qualifies
        ? `Price-match request — ${d.competitor} at ${formatRupees(d.parsedPrice)} (diff ${formatRupees(d.diff)}, ${d.tier.approver} tier)`
        : `Price-match request — ${d.competitor} at ${formatRupees(d.parsedPrice)} did not beat our price`,
      hasPhoto: Boolean(photo.length),
      escalate: Boolean(d.tier && !d.tier.autoApprove),
      messages: [],
      intent: 'cancel',
      family: 'finance',
      reason: 'Found a better price',
      ruleTrace: d.qualifies ? [`§7.16 price-match — ${d.tier.approver} tier`] : ['§7.16 price-match — not qualifying'],
      offered: ['priceMatch', 'cancel'],
      chosen,
      outcome,
    });
  }

  if (approved && decision) {
    return (
      <div className="price-match">
        <header className="price-match__topbar">
          <button className="price-match__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Price Match</h1>
          <span className="price-match__icon-btn-spacer" />
        </header>
        <div className="price-match__stage">
          <div className="execution-step">
            <div className="execution-step__confirm">
              <span className="execution-step__confirm-icon">
                <CheckIcon width="18" height="18" strokeWidth="3" />
              </span>
              <div>
                <p className="execution-step__confirm-title">Price match applied</p>
                <p className="execution-step__confirm-body">
                  {formatRupees(decision.diff)} has been credited against your order — no need to cancel.
                </p>
              </div>
            </div>
            <div className="execution-step__card">
              <div className="execution-step__detail-row">
                <span>New Total</span>
                <span className="execution-step__detail-strong">{formatRupees(decision.newTotal)}</span>
              </div>
            </div>
            <button
              className="execution-step__done"
              onClick={() => {
                fileOutcomeCase('retained_price_match', 'priceMatch');
                goBack();
              }}
            >
              Back to Order Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (decision && decision.qualifies && !decision.tier.autoApprove) {
    return (
      <div className="price-match">
        <header className="price-match__topbar">
          <button className="price-match__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Price Match</h1>
          <span className="price-match__icon-btn-spacer" />
        </header>
        <div className="price-match__stage">
          <div className="execution-step">
            <div className="execution-step__confirm">
              <span className="execution-step__confirm-icon">
                <ClockIcon width="18" height="18" strokeWidth="3" />
              </span>
              <div>
                <p className="execution-step__confirm-title">Needs {decision.tier.approver} approval</p>
                <p className="execution-step__confirm-body">
                  A {formatRupees(decision.diff)} match goes to {decision.tier.approver} for sign-off — usually under
                  4 hours.
                </p>
              </div>
            </div>
            <button className="price-match__dev-link" onClick={handleSimulateApproval}>
              Simulate {decision.tier.approver} Approval
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (decision && !decision.qualifies) {
    return (
      <div className="price-match">
        <header className="price-match__topbar">
          <button className="price-match__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Price Match</h1>
          <span className="price-match__icon-btn-spacer" />
        </header>
        <div className="price-match__stage">
          <div className="execution-step">
            <p className="execution-step__confirm-body">
              {formatRupees(decision.parsedPrice)} at {decision.competitor} isn't below our price of{' '}
              {formatRupees(decision.orderAmount)}, so there's nothing to match here.
            </p>
            <button
              className="execution-step__done"
              onClick={() => {
                fileOutcomeCase('not_retained', 'none');
                goBack();
              }}
            >
              Back to Order Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="price-match">
      <header className="price-match__topbar">
        <button className="price-match__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Price Match</h1>
        <span className="price-match__icon-btn-spacer" />
      </header>
      <div className="price-match__stage">
        <div className="execution-step__card">
          <p className="execution-step__card-heading">Item</p>
          <div className="execution-step__item">
            <img className="execution-step__item-image" src={order.image} alt={order.product} />
            <div className="execution-step__item-text">
              <p className="execution-step__item-name">{name}</p>
              {spec && <p className="execution-step__item-spec">{spec}</p>}
            </div>
            <span className="execution-step__item-price">{formatRupees(orderAmount)}</span>
          </div>
        </div>

        <label className="price-match__label" htmlFor="pm-competitor">
          Where did you see it cheaper?
        </label>
        <input
          id="pm-competitor"
          className="price-match__input"
          type="text"
          placeholder="e.g. Amazon, Flipkart"
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
        />

        <label className="price-match__label" htmlFor="pm-price">
          Their price
        </label>
        <input
          id="pm-price"
          className="price-match__input"
          type="number"
          inputMode="numeric"
          placeholder="₹"
          value={competitorPrice}
          onChange={(e) => setCompetitorPrice(e.target.value)}
        />

        <p className="price-match__label">A screenshot of the listing</p>
        <PhotoUploadTile onChange={setPhoto} max={1} />

        <button className="price-match__continue" disabled={!canSubmit} onClick={handleSubmit}>
          Check Eligibility
        </button>
      </div>
    </div>
  );
}
