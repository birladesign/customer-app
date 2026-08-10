import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ORDERS } from '../../data/orders.js';
import { CASE_LANES, getOrdersForLane, createCase } from '../../data/support.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../../motion.js';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import ConfirmSheet from '../../components/ConfirmSheet.jsx';
import CategoryStep from './CategoryStep.jsx';
import OrderSelectStep from './OrderSelectStep.jsx';
import DescribeStep from './DescribeStep.jsx';
import ReviewStep from './ReviewStep.jsx';
import SuccessStep from './SuccessStep.jsx';
import './SupportCaseFlow.css';

const STEP_TITLES = ["What's this about?", 'Which order?', 'Tell us what happened', 'Review your case', 'Case filed'];
const STEP_COUNT = STEP_TITLES.length;

function isReturnEligible(order) {
  return Boolean(order) && getOrdersForLane('returns').some((o) => o.id === order.id);
}

export default function SupportCaseFlow({ params }) {
  const { goBack, replace } = useNavigation();
  const reduceMotion = useReducedMotion();

  const presetOrder = params.orderId ? ORDERS.find((o) => o.id === params.orderId) : null;
  const staleOrderId = params.orderId && !presetOrder ? params.orderId : null;

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(presetOrder);
  const [skippedOrderStep, setSkippedOrderStep] = useState(false);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [caseResult, setCaseResult] = useState(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const directionRef = useRef(1);

  const isDirty = Boolean(category) || Boolean(selectedOrder) || description.trim().length > 0 || Boolean(photo);

  function goToStep(next) {
    directionRef.current = next > step ? 1 : -1;
    setStep(next);
  }

  // Never re-ask what's already known (PRD HO-03): a Returns pick with an
  // already-eligible preset order jumps straight into the existing wizard;
  // any other lane with a preset order skips Order Select entirely.
  function handleCategoryContinue() {
    const lane = CASE_LANES.find((l) => l.key === category);
    if (lane?.redirectsTo) {
      if (presetOrder && isReturnEligible(presetOrder)) {
        replace(lane.redirectsTo, { orderId: presetOrder.id });
        return;
      }
      setSkippedOrderStep(false);
      goToStep(1);
      return;
    }
    if (presetOrder) {
      setSelectedOrder(presetOrder);
      setSkippedOrderStep(true);
      goToStep(2);
      return;
    }
    setSkippedOrderStep(false);
    goToStep(1);
  }

  function handleOrderContinue() {
    const lane = CASE_LANES.find((l) => l.key === category);
    if (lane?.redirectsTo && selectedOrder) {
      replace(lane.redirectsTo, { orderId: selectedOrder.id });
      return;
    }
    goToStep(2);
  }

  function handleFallbackGeneral() {
    setCategory('general');
    setSelectedOrder(null);
    setSkippedOrderStep(false);
    goToStep(2);
  }

  function handleSubmitCase() {
    const record = createCase({
      lane: category,
      order: selectedOrder,
      description,
      hasPhoto: Boolean(photo),
      escalate: Boolean(params.escalate),
    });
    setCaseResult(record);
    goToStep(4);
  }

  function handleBack() {
    if (step === 4) {
      goBack();
      return;
    }
    if (step === 2 && skippedOrderStep) {
      goToStep(0);
      return;
    }
    if (step === 0) {
      if (isDirty) setConfirmingDiscard(true);
      else goBack();
      return;
    }
    goToStep(step - 1);
  }

  function handleDiscard() {
    setConfirmingDiscard(false);
    goBack();
  }

  const direction = directionRef.current;

  return (
    <div className="support-case">
      <header className="support-case__topbar">
        <button className="support-case__icon-btn" onClick={handleBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>{STEP_TITLES[step]}</h1>
        <span className="support-case__icon-btn-spacer" />
      </header>

      <div className="support-case__progress">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <span key={i} className={`support-case__dot${i <= step ? ' support-case__dot--done' : ''}`} />
        ))}
      </div>

      <div className="support-case__stage">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={step}
            className="support-case__step"
            initial={reduceMotion ? { opacity: 0 } : { x: direction > 0 ? '100%' : '-30%', opacity: direction > 0 ? 1 : 0.6 }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { x: direction > 0 ? '-30%' : '100%', opacity: direction > 0 ? 0.6 : 1 }}
            transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
          >
            {step === 0 && <CategoryStep selected={category} onSelect={setCategory} onContinue={handleCategoryContinue} />}
            {step === 1 && (
              <OrderSelectStep
                lane={category}
                selectedOrder={selectedOrder}
                onSelect={setSelectedOrder}
                onContinue={handleOrderContinue}
                staleOrderId={staleOrderId}
                onFallbackGeneral={handleFallbackGeneral}
              />
            )}
            {step === 2 && (
              <DescribeStep
                order={selectedOrder}
                lane={category}
                description={description}
                onDescriptionChange={setDescription}
                photo={photo}
                onPhotoChange={setPhoto}
                onContinue={() => goToStep(3)}
              />
            )}
            {step === 3 && (
              <ReviewStep
                lane={category}
                order={selectedOrder}
                description={description}
                photo={photo}
                escalate={Boolean(params.escalate)}
                onSubmit={handleSubmitCase}
              />
            )}
            {step === 4 && caseResult && <SuccessStep caseResult={caseResult} onDone={goBack} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <ConfirmSheet
        open={confirmingDiscard}
        title="Discard this case?"
        body="Your selections and description won't be saved."
        confirmLabel="Discard"
        danger
        onConfirm={handleDiscard}
        onClose={() => setConfirmingDiscard(false)}
      />
    </div>
  );
}
