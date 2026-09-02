import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ORDERS } from '../../data/orders.js';
import { getRemediationOptions, getPostBookingUpdate } from '../../data/remediation.js';
import { createCase } from '../../data/support.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../../motion.js';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import EvidenceStep from './EvidenceStep.jsx';
import OptionsStep from './OptionsStep.jsx';
import RefundMethodStep from './RefundMethodStep.jsx';
import ExecutionStep from './ExecutionStep.jsx';
import ApprovalPendingStep from './ApprovalPendingStep.jsx';
import './ReturnReplaceFlow.css';

const STEP_TITLES = {
  // Reason and evidence used to be two separate steps/taps — merged into
  // one screen (EvidenceStep now owns both), so one title covers both.
  evidence: "What's the issue?",
  options: 'Choose an option',
  refundMethod: 'Confirm Refund',
  execution: 'Tracking it',
};

// Refund method + pickup confirmation only makes sense for "Return for
// Refund" — replace/sendPart never move money, so those levers skip
// straight from Options to Execution instead of carrying a dead step.
const STEPS_WITH_REFUND = ['evidence', 'options', 'refundMethod', 'execution'];
const STEPS_WITHOUT_REFUND = ['evidence', 'options', 'execution'];

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
  // A page-level Replace/Return card (Order Details, once delivered) already
  // declares the lever — Options only exists to ask that same question, so
  // the flow it starts skips straight past it instead of re-asking what's
  // already been answered. Entry points that don't know the lever up front
  // (e.g. Support chat's Returns lane) still get the full picker.
  const presetLever = params.lever === 'return' || params.lever === 'replace' ? params.lever : null;

  const [step, setStep] = useState(0);
  const [reason, setReason] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [selectedLever, setSelectedLever] = useState(presetLever);
  const [ticketId, setTicketId] = useState(null);
  const directionRef = useRef(1);
  // Return for Refund hands off to a human agent instead of resolving
  // automatically — "Request Return" is the one moment that's true, so a
  // real, trackable support ticket is created right there (same case record
  // Support's own chat creates), not just a static confirmation screen. The
  // ref guards against creating a second ticket if the customer goes back
  // to RefundMethodStep and submits again.
  const ticketCreatedRef = useRef(false);

  // Only skip Options while the preset lever is still actually on offer for
  // whatever reason gets picked — "Missing parts" only offers Send Part, so
  // a preset Replace/Return falls back to asking normally in that one case
  // rather than forcing a lever that was never available.
  const skipOptions = Boolean(
    presetLever && (!reason || getRemediationOptions(order, reason).some((o) => o.id === presetLever))
  );
  const baseStepKeys = selectedLever === 'return' ? STEPS_WITH_REFUND : STEPS_WITHOUT_REFUND;
  const stepKeys = skipOptions ? baseStepKeys.filter((k) => k !== 'options') : baseStepKeys;
  const stepCount = stepKeys.length;
  const currentKey = stepKeys[step] ?? stepKeys[stepKeys.length - 1];
  // A needsApproval lever (currently only Return for Refund) ends the flow
  // at a plain "sent for review" screen instead of the automated tracker —
  // there's no system-driven progression to show once a human takes over.
  const needsApproval = Boolean(
    selectedLever && order && getRemediationOptions(order, reason).find((o) => o.id === selectedLever)?.needsApproval
  );
  const headerTitle = currentKey === 'execution' && needsApproval ? 'Request Sent' : STEP_TITLES[currentKey];

  function goToStep(next) {
    directionRef.current = next > step ? 1 : -1;
    setStep(next);
  }

  // Steps are conditional (Options is skipped for a preset lever, Refund
  // only exists for `return`), so advance by name rather than by a hardcoded
  // index that shifts as the list changes.
  function goNext() {
    goToStep(Math.min(step + 1, stepKeys.length - 1));
  }

  function handleBack() {
    if (step > 0) goToStep(step - 1);
    else goBack();
  }

  function handleSubmitReturnRequest() {
    if (!ticketCreatedRef.current) {
      ticketCreatedRef.current = true;
      const record = createCase({
        lane: 'returns',
        order,
        item: item ?? null,
        description: `Return requested — ${reason}`,
        hasPhoto: Boolean(photo),
        escalate: true,
        messages: [],
      });
      setTicketId(record.id);
    }
    goNext();
  }

  // No backend in this prototype — mutate the shared order (or, for a
  // multi-SKU order, the one line item) in place, same pattern as
  // OrderDetails' handleCancelOrder/handlePutOnHold, so My Orders and Order
  // Details both reflect the booked journey the moment we navigate back.
  function handleJourneyComplete() {
    const update = getPostBookingUpdate(selectedLever, needsApproval);
    const newStatus = { dot: 'blue', label: update.label };

    if (item) {
      Object.assign(item, { status: newStatus, tracker: { steps: update.trackerSteps, currentIndex: 0 } });
      item.timeline?.steps.push({ label: update.label, timestamp: null, description: update.description });
      if (item.timeline) item.timeline.currentIndex = item.timeline.steps.length - 1;
    } else {
      Object.assign(order, {
        section: 'inProgress',
        status: newStatus,
        actions: update.actions,
        intentOverrides: { ...order.intentOverrides, returnReplace: update.overrideReason },
      });
      if (order.tracker) order.tracker = { steps: update.trackerSteps, currentIndex: 0 };
      order.timeline?.steps.push({ label: update.label, timestamp: null, description: update.description });
      if (order.timeline) order.timeline.currentIndex = order.timeline.steps.length - 1;
    }
    goBack();
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
        <h1>{headerTitle}</h1>
        <span className="return-replace__icon-btn-spacer" />
      </header>

      <div className="return-replace__progress">
        {Array.from({ length: stepCount }, (_, i) => (
          <span
            key={i}
            className={`return-replace__dot${i < step ? ' return-replace__dot--done' : ''}${
              i === step ? ' return-replace__dot--current' : ''
            }`}
          />
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
            {currentKey === 'evidence' && (
              <EvidenceStep
                order={target}
                reason={reason}
                onSelectReason={setReason}
                price={itemPrice}
                savings={itemSavings}
                photo={photo}
                onPhotoChange={setPhoto}
                onContinue={goNext}
              />
            )}
            {currentKey === 'options' && (
              <OptionsStep
                order={target}
                reason={reason}
                selectedLever={selectedLever}
                onSelectLever={setSelectedLever}
                onContinue={goNext}
              />
            )}
            {currentKey === 'refundMethod' && (
              <RefundMethodStep order={target} refundAmount={itemPrice} onSubmit={handleSubmitReturnRequest} />
            )}
            {currentKey === 'execution' && needsApproval && (
              <ApprovalPendingStep
                order={target}
                refundAmount={itemPrice}
                reason={reason}
                ticketId={ticketId}
                onDone={handleJourneyComplete}
              />
            )}
            {currentKey === 'execution' && !needsApproval && (
              <ExecutionStep order={target} leverId={selectedLever} onDone={handleJourneyComplete} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
