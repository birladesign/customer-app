import { useState } from 'react';
import { ORDERS, splitProductSpec, getOrderStatus } from '../data/orders.js';
import { getVariants } from '../data/variants.js';
import { getShipmentEditEligibility } from '../data/intents.js';
import { ADDRESSES } from '../data/profile.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import { ChevronLeftIcon, CheckIcon, MapPinIcon } from '../components/icons.jsx';
import './EditOrder.css';
import './EditShipmentOrder.css';

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

const DOT_COLOR = {
  red: 'var(--color-action-red)',
  blue: 'var(--color-info-blue)',
  green: 'var(--color-success)',
  muted: 'var(--color-text-muted)',
};

// Every unit in a shipment travels and is delivered together (see
// ShipmentCard.jsx), so editing it is one screen covering every sibling
// order sharing this shipmentId — a shared delivery address for the whole
// parcel, plus each product's own qty/size (collapsed to one shared control
// when every unit is the same SKU, since they're interchangeable there the
// same way ShipmentCard already treats them).
export default function EditShipmentOrder({ params }) {
  const { goBack } = useNavigation();
  const units = params.shipmentId ? ORDERS.filter((o) => o.shipmentId === params.shipmentId) : [];
  const sameProduct = units.length > 0 && units.every((u) => u.product === units[0].product);

  const { name: baseName, spec: sharedCurrentSpec } = sameProduct
    ? splitProductSpec(units[0].product)
    : { name: '', spec: null };
  const sharedVariants = sameProduct ? getVariants(baseName) : null;

  // Every hook this component uses is declared here, before any conditional
  // return below — units may be empty (shipment not found), so initializers
  // fall back to safe defaults rather than reading off unit[0] directly.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sharedQty, setSharedQty] = useState(units[0]?.qty ?? 1);
  const [sharedSize, setSharedSize] = useState(sharedCurrentSpec);
  const [lineEdits, setLineEdits] = useState(() =>
    units.map((u) => ({ qty: u.qty ?? 1, selectedSize: splitProductSpec(u.product).spec }))
  );
  const [selectedAddress, setSelectedAddress] = useState('current');
  // Same reasoning as EditOrder's savedSummary — saving shouldn't just dump
  // the customer back on Order Details.
  const [savedSummary, setSavedSummary] = useState(null);

  if (units.length === 0) {
    return (
      <div className="edit-order">
        <header className="edit-order__topbar">
          <button className="edit-order__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Edit Order</h1>
          <span className="edit-order__icon-btn-spacer" />
        </header>
        <p className="edit-order__not-found">Shipment not found.</p>
      </div>
    );
  }

  const eligibility = getShipmentEditEligibility(units);

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
          <img className="edit-order__locked-image" src={units[0].image} alt={units[0].product} />
          <p className="edit-order__locked-title">{eligibility.reason}</p>
          <p className="edit-order__locked-body">This shipment can no longer be edited here.</p>
        </div>
      </div>
    );
  }

  // Unifies the two input modes (one shared control vs. one per unit) into
  // one parallel-to-units array so every downstream calculation only has
  // one shape to deal with regardless of sameProduct.
  const perUnitChanges = sameProduct
    ? units.map(() => ({ qty: sharedQty, selectedSize: sharedSize }))
    : lineEdits;

  const computed = units.map((unit, i) => {
    const { name, spec: currentSpec } = splitProductSpec(unit.product);
    const variants = getVariants(name);
    const initialQty = unit.qty ?? 1;
    const { qty, selectedSize } = perUnitChanges[i];
    const oldLinePrice = unit.priceBreakup?.itemPrice ?? unit.amount;
    const unitPrice = oldLinePrice / initialQty;
    const newUnitPrice = variants ? variants.find((v) => v.label === selectedSize)?.price ?? unitPrice : unitPrice;
    const newLinePrice = newUnitPrice * qty;
    const delta = newLinePrice - oldLinePrice;
    const oldTotal = unit.priceBreakup?.total ?? unit.amount;
    const newTotal = oldTotal + delta;
    const newProduct = variants ? withSpec(name, selectedSize) : unit.product;
    return { unit, name, currentSpec, variants, initialQty, qty, selectedSize, newProduct, newLinePrice, delta, newTotal };
  });

  const totalDelta = computed.reduce((sum, c) => sum + c.delta, 0);
  const oldShipmentTotal = units.reduce((sum, u) => sum + (u.priceBreakup?.total ?? u.amount), 0);
  const newShipmentTotal = oldShipmentTotal + totalDelta;
  const hasChanges =
    computed.some((c) => c.qty !== c.initialQty || c.selectedSize !== c.currentSpec) || selectedAddress !== 'current';

  function updateLineQty(index, dir) {
    setLineEdits((prev) =>
      prev.map((le, i) => (i === index ? { ...le, qty: Math.max(QTY_MIN, Math.min(QTY_MAX, le.qty + dir)) } : le))
    );
  }

  function updateLineSize(index, size) {
    setLineEdits((prev) => prev.map((le, i) => (i === index ? { ...le, selectedSize: size } : le)));
  }

  const sheetCopy =
    totalDelta > 0
      ? {
          title: `Pay ${formatRupees(totalDelta)} more?`,
          body: `Your shipment total will increase to ${formatRupees(newShipmentTotal)}. This will be charged to your original payment method.`,
          confirmLabel: `Pay ${formatRupees(totalDelta)}`,
        }
      : totalDelta < 0
      ? {
          title: 'Confirm these changes?',
          body: `${formatRupees(Math.abs(totalDelta))} will be refunded to your original payment method within 5–7 business days. New total: ${formatRupees(newShipmentTotal)}.`,
          confirmLabel: 'Confirm & Refund',
        }
      : {
          title: 'Save these changes?',
          body: `No change to your shipment total (${formatRupees(newShipmentTotal)}).`,
          confirmLabel: 'Save Changes',
        };

  function handleConfirm() {
    const addressChanged = selectedAddress !== 'current';
    const newAddress = addressChanged ? ADDRESSES.find((a) => a.id === selectedAddress) : null;

    const perUnitSummaries = computed.map((c) => {
      Object.assign(c.unit, {
        product: c.newProduct,
        qty: c.qty,
        amount: c.newTotal,
        priceBreakup: { ...c.unit.priceBreakup, itemPrice: c.newLinePrice, total: c.newTotal },
      });
      if (newAddress) c.unit.address = formatAddressLine(newAddress);
      return {
        orderId: c.unit.id,
        product: c.newProduct,
        qtyChanged: c.qty !== c.initialQty,
        newQty: c.qty,
        sizeChanged: Boolean(c.variants) && c.selectedSize !== c.currentSpec,
        newSize: c.selectedSize,
      };
    });

    setConfirmOpen(false);
    setSavedSummary({
      perUnit: perUnitSummaries.filter((s) => s.qtyChanged || s.sizeChanged),
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
                {totalDelta > 0
                  ? `${formatRupees(totalDelta)} will be charged to your original payment method.`
                  : totalDelta < 0
                  ? `${formatRupees(Math.abs(totalDelta))} will be refunded within 5–7 business days.`
                  : `Your shipment has been updated.`}
              </p>
            </div>

            <div className="edit-order__status-row">
              <span
                className="edit-order__status-dot"
                style={{ background: DOT_COLOR[getOrderStatus(units[0]).dot] }}
              />
              <span className="edit-order__status-label">Shipment Status: {getOrderStatus(units[0]).label}</span>
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
              {savedSummary.perUnit.map((s) => (
                <div key={s.orderId} className="edit-order__summary-row">
                  <span>{splitProductSpec(s.product).name}</span>
                  <span>
                    {s.qtyChanged && `Qty: ${s.newQty}`}
                    {s.qtyChanged && s.sizeChanged && ' · '}
                    {s.sizeChanged && s.newSize}
                  </span>
                </div>
              ))}
              <div className="edit-order__summary-row">
                <span>New Total</span>
                <span>{formatRupees(newShipmentTotal)}</span>
              </div>
            </section>
          </>
        ) : (
          <>
            <p className="edit-shipment-order__intro">
              {units.length} items shipped together — edit any item or the delivery address below.
            </p>

            {sameProduct ? (
              <>
                <div className="edit-order__product-card">
                  <img className="edit-order__image" src={units[0].image} alt={units[0].product} />
                  <div className="edit-order__product-text">
                    <p className="edit-order__product">{baseName}</p>
                    {sharedCurrentSpec && <p className="edit-order__spec">Current: {sharedCurrentSpec}</p>}
                  </div>
                </div>

                <section className="edit-order__section">
                  <p className="edit-order__section-heading">Quantity (applies to all {units.length} units)</p>
                  <div className="edit-order__stepper">
                    <button
                      className="edit-order__stepper-btn"
                      disabled={sharedQty <= QTY_MIN}
                      onClick={() => setSharedQty((q) => Math.max(QTY_MIN, q - 1))}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="edit-order__stepper-value">{sharedQty}</span>
                    <button
                      className="edit-order__stepper-btn"
                      disabled={sharedQty >= QTY_MAX}
                      onClick={() => setSharedQty((q) => Math.min(QTY_MAX, q + 1))}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </section>

                {sharedVariants && (
                  <section className="edit-order__section">
                    <p className="edit-order__section-heading">Size</p>
                    <div className="edit-order__chip-row">
                      {sharedVariants.map((v) => (
                        <button
                          key={v.label}
                          className={`edit-order__chip${sharedSize === v.label ? ' edit-order__chip--selected' : ''}`}
                          onClick={() => setSharedSize(v.label)}
                        >
                          {v.label}
                          <span className="edit-order__chip-price">{formatRupees(v.price)}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              computed.map((c, i) => (
                <div key={c.unit.id} className="edit-shipment-order__unit">
                  <div className="edit-order__product-card">
                    <img className="edit-order__image" src={c.unit.image} alt={c.unit.product} />
                    <div className="edit-order__product-text">
                      <p className="edit-order__product">{c.name}</p>
                      {c.currentSpec && <p className="edit-order__spec">Current: {c.currentSpec}</p>}
                    </div>
                  </div>

                  <section className="edit-order__section">
                    <p className="edit-order__section-heading">Quantity</p>
                    <div className="edit-order__stepper">
                      <button
                        className="edit-order__stepper-btn"
                        disabled={lineEdits[i].qty <= QTY_MIN}
                        onClick={() => updateLineQty(i, -1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="edit-order__stepper-value">{lineEdits[i].qty}</span>
                      <button
                        className="edit-order__stepper-btn"
                        disabled={lineEdits[i].qty >= QTY_MAX}
                        onClick={() => updateLineQty(i, 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </section>

                  {c.variants && (
                    <section className="edit-order__section">
                      <p className="edit-order__section-heading">Size</p>
                      <div className="edit-order__chip-row">
                        {c.variants.map((v) => (
                          <button
                            key={v.label}
                            className={`edit-order__chip${
                              lineEdits[i].selectedSize === v.label ? ' edit-order__chip--selected' : ''
                            }`}
                            onClick={() => updateLineSize(i, v.label)}
                          >
                            {v.label}
                            <span className="edit-order__chip-price">{formatRupees(v.price)}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ))
            )}

            <section className="edit-order__section">
              <p className="edit-order__section-heading">Delivery Address</p>
              <button
                className={`edit-order__address-card${selectedAddress === 'current' ? ' edit-order__address-card--selected' : ''}`}
                onClick={() => setSelectedAddress('current')}
              >
                <span className="edit-order__address-badge">Current</span>
                <span className="edit-order__address-text">{units[0].address}</span>
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
                <span>{formatRupees(oldShipmentTotal)}</span>
              </div>
              <div className="edit-order__summary-row">
                <span>New Amount</span>
                <span>{formatRupees(newShipmentTotal)}</span>
              </div>
              {totalDelta !== 0 && (
                <div className="edit-order__summary-row edit-order__summary-row--delta">
                  <span>{totalDelta > 0 ? 'Additional Payment' : 'Refund'}</span>
                  <span>{formatRupees(Math.abs(totalDelta))}</span>
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
            {totalDelta > 0 ? 'Continue to Payment' : totalDelta < 0 ? 'Continue to Refund' : 'Save Changes'}
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
