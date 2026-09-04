import { useState } from 'react';
import { splitProductSpec } from '../../data/orders.js';
import { getVariants, getMattressModels, selectionFromSpec, specForSelection, priceForSelection } from '../../data/variants.js';
import './MattressVariantStep.css';

function chipClass(active) {
  return `mattress-variant-step__chip${active ? ' mattress-variant-step__chip--selected' : ''}`;
}

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// "Model change is possible as part of the replacement journey" / "Size
// change should be supported during the replacement journey" — a
// replacement doesn't have to be a same-for-same swap, so this reuses Edit
// Order's own variant chip picker (data/variants.js) rather than silently
// shipping back the exact item that didn't work out. Despite the name
// (originally mattress-only), this now also drives the generic "Wrong size
// or model" → Replace path for any catalog category (chair colors, sofa
// seating/color) — the chip sections below are keyed off whichever facets
// that product's variants entry actually declares. There's never a
// shipping charge here — only a genuine SKU-level price difference between
// the old and new variant, same as Edit Order already charges (or refunds)
// for a variant change outside this flow. Confirming with no actual change
// selected isn't a real replacement request, so it's blocked rather than
// silently accepted.
export default function MattressVariantStep({ order, price, onContinue }) {
  const { name, spec: currentSpec } = splitProductSpec(order.product);
  const originalVariants = getVariants(name);
  const isMattress = originalVariants?.type === 'mattress';
  const mattressModels = isMattress ? getMattressModels() : [];

  const [model, setModel] = useState(name);
  const variants = getVariants(model);
  const [selection, setSelection] = useState(() => (originalVariants ? selectionFromSpec(originalVariants, currentSpec) : {}));

  // Switching models resets Size/Height to that model's own defaults —
  // whatever was picked for the old model (e.g. a King the new model
  // doesn't offer) has no guaranteed match in the new one.
  function handleModelChange(nextModel) {
    setModel(nextModel);
    const nextVariants = getVariants(nextModel);
    setSelection({ size: nextVariants?.sizes?.[0]?.label, height: nextVariants?.heights?.[0]?.label });
  }

  const newSpec = variants ? specForSelection(variants, selection) : currentSpec;
  const modelChanged = model !== name;
  const unchanged = !modelChanged && newSpec === currentSpec;
  const newPrice = variants ? priceForSelection(variants, selection, price) : price;
  const delta = newPrice - price;

  return (
    <div className="mattress-variant-step">
      <div className="mattress-variant-step__card">
        <img className="mattress-variant-step__image" src={order.image} alt={order.product} />
        <div className="mattress-variant-step__text">
          <p className="mattress-variant-step__name">{name}</p>
          <p className="mattress-variant-step__current">Current: {currentSpec}</p>
        </div>
      </div>

      {mattressModels.length > 1 && (
        <section className="mattress-variant-step__section">
          <p className="mattress-variant-step__heading">Model</p>
          <select
            className="mattress-variant-step__select"
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
          >
            {mattressModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </section>
      )}

      {variants?.sizes && (
        <section className="mattress-variant-step__section">
          <p className="mattress-variant-step__heading">Size</p>
          <div className="mattress-variant-step__chip-row">
            {variants.sizes.map((v) => (
              <button
                key={v.label}
                className={chipClass(selection.size === v.label)}
                onClick={() => setSelection((s) => ({ ...s, size: v.label }))}
              >
                {v.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {variants?.heights && (
        <section className="mattress-variant-step__section">
          <p className="mattress-variant-step__heading">Height</p>
          <div className="mattress-variant-step__chip-row">
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
      )}

      {variants?.colors && (
        <section className="mattress-variant-step__section">
          <p className="mattress-variant-step__heading">Color</p>
          <div className="mattress-variant-step__chip-row">
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

      {variants?.seating && (
        <section className="mattress-variant-step__section">
          <p className="mattress-variant-step__heading">Seating Capacity</p>
          <div className="mattress-variant-step__chip-row">
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
      )}

      {unchanged ? (
        <p className="mattress-variant-step__hint">Choose a different model, size or height to replace with.</p>
      ) : (
        <>
          <p className="mattress-variant-step__hint">New: {modelChanged ? `${model} — ${newSpec}` : newSpec}</p>
          {delta !== 0 && (
            <div className="mattress-variant-step__delta-row">
              <span>{delta > 0 ? 'Additional Payment' : 'Refund'}</span>
              <span className="mattress-variant-step__delta-amount">{formatRupees(Math.abs(delta))}</span>
            </div>
          )}
        </>
      )}

      <button
        className="mattress-variant-step__continue"
        disabled={unchanged}
        onClick={() => onContinue({ model: modelChanged ? model : null, spec: newSpec, delta })}
      >
        Confirm Replacement
      </button>
    </div>
  );
}
