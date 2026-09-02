import { useState } from 'react';
import { splitProductSpec } from '../../data/orders.js';
import { getVariants, selectionFromSpec, specForSelection } from '../../data/variants.js';
import './MattressVariantStep.css';

function chipClass(active) {
  return `mattress-variant-step__chip${active ? ' mattress-variant-step__chip--selected' : ''}`;
}

// "Model change is possible as part of the replacement journey" / "Size
// change should be supported during the replacement journey" — a
// replacement doesn't have to be a same-for-same swap, so this reuses Edit
// Order's own Size/Height chip picker (data/variants.js) rather than
// silently shipping back the exact item that didn't work out.
export default function MattressVariantStep({ order, onContinue }) {
  const { name, spec: currentSpec } = splitProductSpec(order.product);
  const variants = getVariants(name);
  const [selection, setSelection] = useState(() => (variants ? selectionFromSpec(variants, currentSpec) : {}));
  const newSpec = variants ? specForSelection(variants, selection) : currentSpec;
  const unchanged = newSpec === currentSpec;

  return (
    <div className="mattress-variant-step">
      <div className="mattress-variant-step__card">
        <img className="mattress-variant-step__image" src={order.image} alt={order.product} />
        <div className="mattress-variant-step__text">
          <p className="mattress-variant-step__name">{name}</p>
          <p className="mattress-variant-step__current">Current: {currentSpec}</p>
        </div>
      </div>

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

      <p className="mattress-variant-step__hint">
        {unchanged ? "Keeping the same size and height — that's fine too." : `New: ${newSpec}`}
      </p>

      <button className="mattress-variant-step__continue" onClick={() => onContinue(newSpec)}>
        Confirm Replacement
      </button>
    </div>
  );
}
