import { useState } from 'react';
import { ORDERS, splitProductSpec, recomputeOrderTotals, getOrderStatus } from '../data/orders.js';
import { getVariants, selectionFromSpec, specForSelection, priceForSelection } from '../data/variants.js';
import { getEditEligibility, getAddressEditEligibility } from '../data/intents.js';
import { ADDRESSES } from '../data/profile.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import { ChevronLeftIcon, CheckIcon, MapPinIcon } from '../components/icons.jsx';
import './EditOrder.css';

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function withSpec(name, spec) {
  return spec ? `${name} (${spec})` : name;
}

function selectionsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function chipClass(active) {
  return `edit-order__chip${active ? ' edit-order__chip--selected' : ''}`;
}

function formatAddressLine(address) {
  return `${address.lines.join(', ')}`;
}

function formatBillingLine(address) {
  return address.billingLines ? address.billingLines.join(', ') : null;
}

const QTY_MIN = 1;
const QTY_MAX = 5;

const DOT_COLOR = {
  red: 'var(--color-action-red)',
  blue: 'var(--color-info-blue)',
  green: 'var(--color-success)',
  muted: 'var(--color-text-muted)',
};

export default function EditOrder({ params }) {
  const { goBack, navigate } = useNavigation();
  const order = ORDERS.find((o) => o.id === params.orderId);
  const item = order?.items?.find((i) => i.sku === params.sku) ?? null;
  const target = item ?? order;
  // Address editing lives at the order level only (My Orders' own Edit
  // Address CTA/kebab) — opened from OrderDetails' "Edit Details" instead,
  // this screen is qty/variant only.
  const hideAddress = Boolean(params.hideAddress);

  // Every hook this component uses is declared here, before any conditional
  // return below — target may be undefined (order not found), so these fall
  // back to safe defaults rather than reading off it directly.
  const { name: baseName, spec: currentSpec } = target ? splitProductSpec(target.product) : { name: '', spec: null };
  const variants = target ? getVariants(baseName) : null;
  const initialQty = target?.qty ?? 1;
  const initialSelection = variants ? selectionFromSpec(variants, currentSpec) : {};

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [qty, setQty] = useState(initialQty);
  const [selection, setSelection] = useState(initialSelection);
  const [selectedAddress, setSelectedAddress] = useState('current');
  // Same reasoning as InstallationSchedule's bookingConfirmed — saving
  // shouldn't just dump the customer back on Order Details. Captured here
  // (not re-derived after the mutation) so the summary can still say what
  // changed once qty/selectedSize/selectedAddress equal their new values.
  const [savedSummary, setSavedSummary] = useState(null);

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

  // Address-only entry (My Orders' Edit Address CTA) tolerates a later
  // stage than the qty/variant entry (OrderDetails' Edit Order) — see
  // getAddressEditEligibility.
  const eligibility = hideAddress ? getEditEligibility(target) : getAddressEditEligibility(target);
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

  const newUnitPrice = variants ? priceForSelection(variants, selection, unitPrice) : unitPrice;
  const newLinePrice = newUnitPrice * qty;
  const delta = newLinePrice - oldLinePrice;
  const newOrderTotal = oldOrderTotal + delta;
  const variantChanged = Boolean(variants) && !selectionsEqual(selection, initialSelection);
  const hasChanges = qty !== initialQty || variantChanged || selectedAddress !== 'current';

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
    const newProduct = variants ? withSpec(baseName, specForSelection(variants, selection)) : target.product;
    const addressChanged = selectedAddress !== 'current';
    const newAddress = addressChanged ? ADDRESSES.find((a) => a.id === selectedAddress) : null;

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

    if (newAddress) {
      order.address = formatAddressLine(newAddress);
      order.billingAddress = formatBillingLine(newAddress);
      order.gstin = newAddress.gstin ?? null;
      order.businessName = newAddress.businessName ?? null;
    }

    setConfirmOpen(false);
    setSavedSummary({
      qtyChanged: qty !== initialQty,
      newQty: qty,
      variantChanged,
      newVariantLabel: variants ? specForSelection(variants, selection) : null,
      addressChanged: Boolean(newAddress),
      newAddressText: newAddress ? formatAddressLine(newAddress) : null,
    });
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
        {savedSummary ? (
          <>
            <div className="edit-order__success">
              <span className="edit-order__success-icon">
                <CheckIcon width="20" height="20" strokeWidth="3" />
              </span>
              <p className="edit-order__success-title">Changes Saved</p>
              <p className="edit-order__success-body">
                {delta > 0
                  ? `${formatRupees(delta)} will be charged to your original payment method.`
                  : delta < 0
                  ? `${formatRupees(Math.abs(delta))} will be refunded within 5–7 business days.`
                  : `${withSpec(baseName, currentSpec)} has been updated.`}
              </p>
            </div>

            <div className="edit-order__status-row">
              <span
                className="edit-order__status-dot"
                style={{ background: DOT_COLOR[getOrderStatus(order).dot] }}
              />
              <span className="edit-order__status-label">Order Status: {getOrderStatus(order).label}</span>
            </div>

            {savedSummary.addressChanged && (
              <div className="edit-order__address-updated">
                <span className="edit-order__address-updated-icon">
                  <MapPinIcon width="16" height="16" />
                </span>
                <div>
                  <p className="edit-order__address-updated-label">Delivery Address Updated</p>
                  <p className="edit-order__address-updated-value">{savedSummary.newAddressText}</p>
                </div>
              </div>
            )}

            <section className="edit-order__summary">
              {savedSummary.qtyChanged && (
                <div className="edit-order__summary-row">
                  <span>Quantity</span>
                  <span>{savedSummary.newQty}</span>
                </div>
              )}
              {savedSummary.variantChanged && (
                <div className="edit-order__summary-row">
                  <span>Variant</span>
                  <span>{savedSummary.newVariantLabel}</span>
                </div>
              )}
              <div className="edit-order__summary-row">
                <span>New Total</span>
                <span>{formatRupees(newOrderTotal)}</span>
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="edit-order__product-card">
              <img className="edit-order__image" src={target.image} alt={target.product} />
              <div className="edit-order__product-text">
                <p className="edit-order__product">{baseName}</p>
                {currentSpec && <p className="edit-order__spec">Current: {currentSpec}</p>}
              </div>
            </div>



            {variants?.type === 'mattress' && (
              <>
                <section className="edit-order__section">
                  <p className="edit-order__section-heading">Size</p>
                  <div className="edit-order__chip-row">
                    {variants.sizes.map((v) => (
                      <button
                        key={v.label}
                        className={chipClass(selection.size === v.label)}
                        onClick={() => setSelection((s) => ({ ...s, size: v.label }))}
                      >
                        {v.label}
                      </button>
                    ))}
                    <button
                      className={chipClass(selection.size === 'Custom')}
                      onClick={() => setSelection((s) => ({ ...s, size: 'Custom' }))}
                    >
                      Custom
                    </button>
                  </div>
                  {selection.size === 'Custom' && (
                    <div className="edit-order__custom-dims-row">
                      <input
                        className="edit-order__custom-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="Length (in)"
                        value={selection.customLength ?? ''}
                        onChange={(e) =>
                          setSelection((s) => ({ ...s, customLength: e.target.value.replace(/\D/g, '') }))
                        }
                      />
                      <input
                        className="edit-order__custom-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="Breadth (in)"
                        value={selection.customBreadth ?? ''}
                        onChange={(e) =>
                          setSelection((s) => ({ ...s, customBreadth: e.target.value.replace(/\D/g, '') }))
                        }
                      />
                    </div>
                  )}
                </section>

                <section className="edit-order__section">
                  <p className="edit-order__section-heading">Height</p>
                  <div className="edit-order__chip-row">
                    {variants.heights.map((h) => (
                      <button
                        key={h.label}
                        className={chipClass(selection.height === h.label)}
                        onClick={() => setSelection((s) => ({ ...s, height: h.label }))}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {variants?.type === 'chair' && (
              <section className="edit-order__section">
                <p className="edit-order__section-heading">Color</p>
                <div className="edit-order__chip-row">
                  {variants.colors.map((c) => (
                    <button
                      key={c.label}
                      className={chipClass(selection.color === c.label)}
                      onClick={() => setSelection((s) => ({ ...s, color: c.label }))}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {variants?.type === 'sofa' && (
              <>
                <section className="edit-order__section">
                  <p className="edit-order__section-heading">Seating Capacity</p>
                  <div className="edit-order__chip-row">
                    {variants.seating.map((v) => (
                      <button
                        key={v.label}
                        className={chipClass(selection.seating === v.label)}
                        onClick={() => setSelection((s) => ({ ...s, seating: v.label }))}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="edit-order__section">
                  <p className="edit-order__section-heading">Color</p>
                  <div className="edit-order__chip-row">
                    {variants.colors.map((c) => (
                      <button
                        key={c.label}
                        className={chipClass(selection.color === c.label)}
                        onClick={() => setSelection((s) => ({ ...s, color: c.label }))}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {!hideAddress && (
              <section className="edit-order__section">
                <p className="edit-order__section-heading">Delivery Address</p>
                <button
                  className={`edit-order__address-card${selectedAddress === 'current' ? ' edit-order__address-card--selected' : ''}`}
                  onClick={() => setSelectedAddress('current')}
                >
                  <input
                    className="edit-order__address-radio"
                    type="radio"
                    readOnly
                    tabIndex={-1}
                    checked={selectedAddress === 'current'}
                  />
                  <span className="edit-order__address-text">{order.address}</span>
                </button>
                {ADDRESSES.map((a) => (
                  <button
                    key={a.id}
                    className={`edit-order__address-card${selectedAddress === a.id ? ' edit-order__address-card--selected' : ''}`}
                    onClick={() => setSelectedAddress(a.id)}
                  >
                    <input
                      className="edit-order__address-radio"
                      type="radio"
                      readOnly
                      tabIndex={-1}
                      checked={selectedAddress === a.id}
                    />
                    <span className="edit-order__address-badge">{a.label}</span>
                    <span className="edit-order__address-text">{formatAddressLine(a)}</span>
                  </button>
                ))}
                <button className="edit-order__add-address" onClick={() => navigate('addAddress', { forOrder: true })}>
                  + Add New Address
                </button>
              </section>
            )}

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
          </>
        )}
      </main>

      <div className="edit-order__footer">
        {savedSummary ? (
          <button className="edit-order__continue" onClick={goBack}>
            Done
          </button>
        ) : (
          <button className="edit-order__continue" disabled={!hasChanges} onClick={() => setConfirmOpen(true)}>
            {delta > 0 ? 'Continue to Payment' : delta < 0 ? 'Continue to Refund' : 'Save Changes'}
          </button>
        )}
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
