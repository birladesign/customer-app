import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ORDERS } from '../../data/orders.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../../motion.js';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import ReasonStep from './ReasonStep.jsx';
import EvidenceStep from './EvidenceStep.jsx';
import OptionsStep from './OptionsStep.jsx';
import RefundMethodStep from './RefundMethodStep.jsx';
import ExecutionStep from './ExecutionStep.jsx';
import './ReturnReplaceFlow.css';

const STEP_TITLES = {
  reason: "What's the issue?",
  evidence: 'Tell us more',
  options: 'Choose an option',
  refundMethod: 'Confirm Refund',
  execution: 'Tracking it',
};

// Refund method + pickup confirmation only makes sense for "Return for
// Refund" — repair/replace/sendPart never move money, so those levers skip
// straight from Options to Execution instead of carrying a dead step.
const STEPS_WITH_REFUND = ['reason', 'evidence', 'options', 'refundMethod', 'execution'];
const STEPS_WITHOUT_REFUND = ['reason', 'evidence', 'options', 'execution'];

export default function ReturnReplaceFlow({ params }) {
  const { goBack } = useNavigation();
  const reduceMotion = useReducedMotion();
  const order = ORDERS.find((o) => o.id === params.orderId);
  // For a multi-SKU order, params.sku scopes the flow to one line item —
  // EvidenceStep/ExecutionStep only ever read `.product` off what's passed
  // to them, so overriding it here is enough; no changes needed there.
  const item = order?.items?.find((i) => i.sku === params.sku);
  const target = item ? { ...order, product: item.product, image: item.image } : order;
  // Per-item price for a multi-SKU order; for a single-item order, the item
  // price net of its own discount (order.priceBreakup already scopes to just
  // that one line, unlike order.amount which also folds in shipping/tax).
  const itemPrice = item
    ? item.price
    : order
    ? (order.priceBreakup?.itemPrice ?? order.amount) - (order.priceBreakup?.discount ?? 0)
    : 0;
  // Only shown for single-item orders — a line item inside a multi-SKU order
  // doesn't carry its own discount breakdown, so there's nothing honest to
  // display there.
  const itemSavings = !item ? order?.priceBreakup?.discount ?? 0 : 0;

  const [step, setStep] = useState(0);
  const [reason, setReason] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [selectedLever, setSelectedLever] = useState(null);
  const directionRef = useRef(1);

  const stepKeys = selectedLever === 'return' ? STEPS_WITH_REFUND : STEPS_WITHOUT_REFUND;
  const stepCount = stepKeys.length;
  const currentKey = stepKeys[step] ?? stepKeys[stepKeys.length - 1];

  function goToStep(next) {
    directionRef.current = next > step ? 1 : -1;
    setStep(next);
  }

  function handleBack() {
    if (step > 0) goToStep(step - 1);
    else goBack();
  }

  const direction = directionRef.current;

  if (!order) {
    return (
      <div className="return-replace">
        <header className="return-replace__topbar">
          <button className="return-replace__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Return or Replace</h1>
          <span className="return-replace__icon-btn-spacer" />
        </header>
        <p className="return-replace__not-found">Order not found.</p>
      </div>
    );
  }

  return (
    <div className="return-replace">
      <header className="return-replace__topbar">
        <button className="return-replace__icon-btn" onClick={handleBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>{STEP_TITLES[currentKey]}</h1>
        <span className="return-replace__icon-btn-spacer" />
      </header>

      <div className="return-replace__progress">
        {Array.from({ length: stepCount }, (_, i) => (
          <span key={i} className={`return-replace__dot${i <= step ? ' return-replace__dot--done' : ''}`} />
        ))}
      </div>

      <div className="return-replace__stage">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={step}
            className="return-replace__step"
            initial={reduceMotion ? { opacity: 0 } : { x: direction > 0 ? '100%' : '-30%', opacity: direction > 0 ? 1 : 0.6 }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { x: direction > 0 ? '-30%' : '100%', opacity: direction > 0 ? 0.6 : 1 }}
            transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
          >
            {currentKey === 'reason' && (
              <ReasonStep
                selected={reason}
                onSelect={setReason}
                onContinue={() => goToStep(1)}
              />
            )}
            {currentKey === 'evidence' && (
              <EvidenceStep
                order={target}
                reason={reason}
                price={itemPrice}
                savings={itemSavings}
                photo={photo}
                onPhotoChange={setPhoto}
                onChangeReason={() => goToStep(0)}
                onContinue={() => goToStep(2)}
              />
            )}
            {currentKey === 'options' && (
              <OptionsStep
                order={target}
                reason={reason}
                selectedLever={selectedLever}
                onSelectLever={setSelectedLever}
                onContinue={() => goToStep(3)}
              />
            )}
            {currentKey === 'refundMethod' && (
              <RefundMethodStep order={target} refundAmount={itemPrice} onSubmit={() => goToStep(4)} />
            )}
            {currentKey === 'execution' && (
              <ExecutionStep order={target} leverId={selectedLever} onDone={goBack} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
