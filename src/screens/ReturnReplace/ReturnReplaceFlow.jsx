import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ORDERS, splitProductSpec, getDeliveredDate } from '../../data/orders.js';
import { getRemediationOptions, getPostBookingUpdate } from '../../data/remediation.js';
import { isMattressProduct, daysSinceDelivery, getMattressVerdict, proRataRefund } from '../../data/mattressRules.js';
import { createCase } from '../../data/support.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../../motion.js';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import EvidenceStep from './EvidenceStep.jsx';
import MattressReasonStep from './MattressReasonStep.jsx';
import MattressVerdictStep from './MattressVerdictStep.jsx';
import MattressVariantStep from './MattressVariantStep.jsx';
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
  mattressReason: "What's the issue?",
  mattressVerdict: 'Next Steps',
  mattressVariant: 'Choose New Size',
};

function withSpec(name, spec) {
  return spec ? `${name} (${spec})` : name;
}

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
  // Mattresses get the PRD's real rule table (§7.7, M1-M9) instead of the
  // generic reason→lever mock — a different category (chair, sofa, ...)
  // still uses the simpler flow below.
  const isMattress = Boolean(target && isMattressProduct(target.product));

  const [step, setStep] = useState(0);
  const [reason, setReason] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [selectedLever, setSelectedLever] = useState(presetLever);
  const [ticketId, setTicketId] = useState(null);
  const [faultAttribution, setFaultAttribution] = useState(null);
  // M8 (smell, ≤2 days) is advice-only — "it still smells" after following
  // that advice is what actually promotes it to M9's replace/return path,
  // not a fixed day count, so this overrides the real elapsed days once hit.
  const [smellPersists, setSmellPersists] = useState(false);
  const [newSpec, setNewSpec] = useState(null);
  // The only money that ever moves for a mattress replacement — a genuine
  // SKU-level price difference for a different size/height, never a
  // shipping charge (see MattressVariantStep).
  const [variantPriceDelta, setVariantPriceDelta] = useState(0);
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
  const deliveredDateStr = isMattress ? getDeliveredDate(target) : null;
  const effectiveDays = smellPersists ? 3 : daysSinceDelivery(deliveredDateStr);
  const mattressProductInfo = isMattress ? splitProductSpec(target.product) : null;
  const verdict =
    isMattress && reason
      ? getMattressVerdict({
          reasonKey: reason,
          daysSinceDelivery: effectiveDays,
          faultAttribution,
          productName: mattressProductInfo.name,
          spec: mattressProductInfo.spec,
        })
      : null;
  const proRataAmount = verdict?.proRata ? proRataRefund(itemPrice, deliveredDateStr) : 0;

  const MATTRESS_STEPS_RETURN = ['mattressReason', 'mattressVerdict', 'refundMethod', 'execution'];
  const MATTRESS_STEPS_REPLACE = ['mattressReason', 'mattressVerdict', 'mattressVariant', 'execution'];
  const baseStepKeys = selectedLever === 'return' ? STEPS_WITH_REFUND : STEPS_WITHOUT_REFUND;
  const stepKeys = isMattress
    ? selectedLever === 'return'
      ? MATTRESS_STEPS_RETURN
      : MATTRESS_STEPS_REPLACE
    : skipOptions
    ? baseStepKeys.filter((k) => k !== 'options')
    : baseStepKeys;
  const stepCount = stepKeys.length;
  const currentKey = stepKeys[step] ?? stepKeys[stepKeys.length - 1];
  // A needsApproval lever (currently only Return for Refund) ends the flow
  // at a plain "sent for review" screen instead of the automated tracker —
  // there's no system-driven progression to show once a human takes over.
  // Mattress rules carry their own "no manager approval" invariant (§7.7),
  // so a mattress return always resolves through the automated tracker.
  const needsApproval = isMattress
    ? false
    : Boolean(
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
    // Mattress returns never need approval (§7.7 invariant), so there's no
    // ticket to raise here — RefundMethodStep just hands off straight to
    // the automated tracker below.
    if (needsApproval && !ticketCreatedRef.current) {
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

  function handleChooseLever(lever) {
    setSelectedLever(lever);
    goNext();
  }

  // Topper accepted (M5's retention ladder) and a warranty claim (M6) both
  // resolve the issue without ever touching the standard replace/return
  // machinery below — each files its own case and returns straight to
  // Order Details, the same "receipt already shown, nothing left to track
  // here" shape as ApprovalPendingStep.
  function handleAcceptTopper() {
    createCase({
      lane: 'returns',
      order,
      item: item ?? null,
      description: 'Comfort topper requested (retention offer accepted)',
      hasPhoto: Boolean(photo),
      escalate: false,
      messages: [],
    });
    goBack();
  }

  function handleSubmitWarrantyClaim() {
    createCase({
      lane: 'returns',
      order,
      item: item ?? null,
      description: `Warranty claim (sagging/dip) — pro-rata refund ₹${proRataAmount.toLocaleString('en-IN')}`,
      hasPhoto: Boolean(photo),
      escalate: true,
      messages: [],
    });
    goBack();
  }

  function handleSmellPersists() {
    setSmellPersists(true);
  }

  function handleVariantContinue({ spec, delta }) {
    setNewSpec(spec);
    setVariantPriceDelta(delta);
    goNext();
  }

  // No backend in this prototype — mutate the shared order (or, for a
  // multi-SKU order, the one line item) in place, same pattern as
  // OrderDetails' handleCancelOrder/handlePutOnHold, so My Orders and Order
  // Details both reflect the booked journey the moment we navigate back.
  function handleJourneyComplete() {
    const update = getPostBookingUpdate(selectedLever, needsApproval);
    const newStatus = { dot: 'blue', label: update.label };
    // A replacement that changed size/height (mattress-only — see
    // MattressVariantStep) ships as the new spec, not a like-for-like
    // reprint of what didn't work out.
    const newPrice = itemPrice + variantPriceDelta;
    const specUpdate = newSpec
      ? { product: withSpec(splitProductSpec(item ? item.product : order.product).name, newSpec) }
      : {};
    // A different size/height is a different SKU price — only actually
    // apply it if it changed, so an unpriced/no-op replacement doesn't
    // silently rewrite priceBreakup with the exact same numbers.
    const priceUpdate =
      newSpec && variantPriceDelta !== 0
        ? item
          ? { price: newPrice }
          : { amount: newPrice, priceBreakup: { ...order.priceBreakup, itemPrice: newPrice, total: newPrice } }
        : {};

    if (item) {
      Object.assign(item, specUpdate, priceUpdate, {
        status: newStatus,
        tracker: { steps: update.trackerSteps, currentIndex: 0 },
      });
      item.timeline?.steps.push({ label: update.label, timestamp: null, description: update.description });
      if (item.timeline) item.timeline.currentIndex = item.timeline.steps.length - 1;
    } else {
      Object.assign(order, specUpdate, priceUpdate, {
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
            {currentKey === 'mattressReason' && (
              <MattressReasonStep
                order={target}
                price={itemPrice}
                savings={itemSavings}
                reason={reason}
                onSelectReason={setReason}
                faultAttribution={faultAttribution}
                onSelectFault={setFaultAttribution}
                photo={photo}
                onPhotoChange={setPhoto}
                onContinue={goNext}
              />
            )}
            {currentKey === 'mattressVerdict' && verdict && (
              <MattressVerdictStep
                verdict={verdict}
                proRataAmount={proRataAmount}
                onChooseLever={handleChooseLever}
                onAcceptTopper={handleAcceptTopper}
                onSubmitWarrantyClaim={handleSubmitWarrantyClaim}
                onSmellPersists={handleSmellPersists}
              />
            )}
            {currentKey === 'mattressVariant' && (
              <MattressVariantStep order={target} price={itemPrice} onContinue={handleVariantContinue} />
            )}
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
              <ExecutionStep
                order={target}
                leverId={selectedLever}
                priceDelta={newSpec ? variantPriceDelta : 0}
                onDone={handleJourneyComplete}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
