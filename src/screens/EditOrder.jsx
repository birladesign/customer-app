import { useState } from 'react';
import { ORDERS, splitProductSpec, recomputeOrderTotals } from '../data/orders.js';
import { getVariants } from '../data/variants.js';
import { getEditEligibility } from '../data/intents.js';
import { ADDRESSES } from '../data/profile.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import { ChevronLeftIcon } from '../components/icons.jsx';
import './EditOrder.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function withSpec(name, spec) {
  return spec ? `${name} (${spec})` : name;
}

function formatAddressLine(address) {
  return `${address.lines.join(', ')}`;
}

const QTY_MIN = 1;
const QTY_MAX = 5;

export default function EditOrder({ params }) {
  const { goBack } = useNavigation();
  const order = ORDERS.find((o) => o.id === params.orderId);
  const item = order?.items?.find((i) => i.sku === params.sku) ?? null;
  const target = item ?? order;

  // Every hook this component uses is declared here, before any conditional
  // return below — target may be undefined (order not found), so these fall
  // back to safe defaults rather than reading off it directly.
  const { name: baseName, spec: currentSpec } = target ? splitProductSpec(target.product) : { name: '', spec: null };
  const variants = target ? getVariants(baseName) : null;
  const initialQty = target?.qty ?? 1;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [qty, setQty] = useState(initialQty);
  const [selectedSize, setSelectedSize] = useState(currentSpec);
  const [selectedAddress, setSelectedAddress] = useState('current');

  if (!order || (params.sku && !item)) {
    return (
      <div className="edit-order">
        <header className="edit-order__topbar">
          <button className="edit-order__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Edit Order</h1>
          <span className="edit-order__icon-btn-spacer" />
        </header>
        <p className="edit-order__not-found">Order not found.</p>
      </div>
    );
  }

  const eligibility = getEditEligibility(target);
  const oldLinePrice = item ? item.price : order.priceBreakup?.itemPrice ?? order.amount;
  const oldOrderTotal = order.priceBreakup?.total ?? order.amount;
  const unitPrice = oldLinePrice / initialQty;

  if (!eligibility.enabled) {
    return (
      <div className="edit-order">
        <header className="edit-order__topbar">
          <button className="edit-order__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Edit Order</h1>
          <span className="edit-order__icon-btn-spacer" />
        </header>
        <div className="edit-order__locked">
          <img className="edit-order__locked-image" src={target.image} alt={target.product} />
          <p className="edit-order__locked-title">{eligibility.reason}</p>
          <p className="edit-order__locked-body">
            {withSpec(baseName, currentSpec)} can no longer be edited here.
          </p>
        </div>
      </div>
    );
  }

  const newUnitPrice = variants ? variants.find((v) => v.label === selectedSize)?.price ?? unitPrice : unitPrice;
  const newLinePrice = newUnitPrice * qty;
  const delta = newLinePrice - oldLinePrice;
  const newOrderTotal = oldOrderTotal + delta;
  const hasChanges = qty !== initialQty || selectedSize !== currentSpec || selectedAddress !== 'current';

  const sheetCopy =
    delta > 0
      ? {
          title: `Pay ${formatRupees(delta)} more?`,
          body: `Your order total will increase to ${formatRupees(newOrderTotal)}. This will be charged to your original payment method.`,
          confirmLabel: `Pay ${formatRupees(delta)}`,
        }
      : delta < 0
      ? {
          title: 'Confirm these changes?',
          body: `${formatRupees(Math.abs(delta))} will be refunded to your original payment method within 5–7 business days. New total: ${formatRupees(newOrderTotal)}.`,
          confirmLabel: 'Confirm & Refund',
        }
      : {
          title: 'Save these changes?',
          body: `No change to your order total (${formatRupees(newOrderTotal)}).`,
          confirmLabel: 'Save Changes',
        };

  function handleConfirm() {
    const newProduct = variants ? withSpec(baseName, selectedSize) : target.product;

    if (item) {
      Object.assign(item, { product: newProduct, qty, price: newLinePrice });
      recomputeOrderTotals(order);
    } else {
      Object.assign(order, {
        product: newProduct,
        qty,
        amount: newOrderTotal,
        priceBreakup: { ...order.priceBreakup, itemPrice: newLinePrice, total: newOrderTotal },
      });
    }

    if (selectedAddress !== 'current') {
      const address = ADDRESSES.find((a) => a.id === selectedAddress);
      if (address) order.address = formatAddressLine(address);
    }

    setConfirmOpen(false);
    goBack();
  }

  return (
    <div className="edit-order">
      <header className="edit-order__topbar">
        <button className="edit-order__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Edit Order</h1>
        <span className="edit-order__icon-btn-spacer" />
      </header>

      <main className="edit-order__content">
        <div className="edit-order__product-card">
          <img className="edit-order__image" src={target.image} alt={target.product} />
          <div className="edit-order__product-text">
            <p className="edit-order__product">{baseName}</p>
            {currentSpec && <p className="edit-order__spec">Current: {currentSpec}</p>}
          </div>
        </div>

        <section className="edit-order__section">
          <p className="edit-order__section-heading">Quantity</p>
          <div className="edit-order__stepper">
            <button
              className="edit-order__stepper-btn"
              disabled={qty <= QTY_MIN}
              onClick={() => setQty((q) => Math.max(QTY_MIN, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="edit-order__stepper-value">{qty}</span>
            <button
              className="edit-order__stepper-btn"
              disabled={qty >= QTY_MAX}
              onClick={() => setQty((q) => Math.min(QTY_MAX, q + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </section>

        {variants && (
          <section className="edit-order__section">
            <p className="edit-order__section-heading">Size</p>
            <div className="edit-order__chip-row">
              {variants.map((v) => (
                <button
                  key={v.label}
                  className={`edit-order__chip${selectedSize === v.label ? ' edit-order__chip--selected' : ''}`}
                  onClick={() => setSelectedSize(v.label)}
                >
                  {v.label}
                  <span className="edit-order__chip-price">{formatRupees(v.price)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="edit-order__section">
          <p className="edit-order__section-heading">Delivery Address</p>
          <button
            className={`edit-order__address-card${selectedAddress === 'current' ? ' edit-order__address-card--selected' : ''}`}
            onClick={() => setSelectedAddress('current')}
          >
            <span className="edit-order__address-badge">CURRENT</span>
            <span className="edit-order__address-text">{order.address}</span>
          </button>
          {ADDRESSES.map((a) => (
            <button
              key={a.id}
              className={`edit-order__address-card${selectedAddress === a.id ? ' edit-order__address-card--selected' : ''}`}
              onClick={() => setSelectedAddress(a.id)}
            >
              <span className="edit-order__address-badge">{a.label}</span>
              <span className="edit-order__address-text">{formatAddressLine(a)}</span>
            </button>
          ))}
        </section>

        <section className="edit-order__summary">
          <div className="edit-order__summary-row">
            <span>Previous Amount</span>
            <span>{formatRupees(oldOrderTotal)}</span>
          </div>
          <div className="edit-order__summary-row">
            <span>New Amount</span>
            <span>{formatRupees(newOrderTotal)}</span>
          </div>
          {delta !== 0 && (
            <div className="edit-order__summary-row edit-order__summary-row--delta">
              <span>{delta > 0 ? 'Additional Payment' : 'Refund'}</span>
              <span>{formatRupees(Math.abs(delta))}</span>
            </div>
          )}
        </section>
      </main>

      <div className="edit-order__footer">
        <button className="edit-order__continue" disabled={!hasChanges} onClick={() => setConfirmOpen(true)}>
          {delta > 0 ? 'Continue to Payment' : delta < 0 ? 'Continue to Refund' : 'Save Changes'}
        </button>
      </div>

      <ConfirmSheet
        open={confirmOpen}
        title={sheetCopy.title}
        body={sheetCopy.body}
        confirmLabel={sheetCopy.confirmLabel}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
