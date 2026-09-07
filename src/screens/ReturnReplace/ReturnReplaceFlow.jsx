import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ORDERS, splitProductSpec, getDeliveredDate } from '../../data/orders.js';
import { getRemediationOptions, getPostBookingUpdate } from '../../data/remediation.js';
import { getVariants } from '../../data/variants.js';
import { isMattressProduct, daysSinceDelivery, getMattressVerdict, proRataRefund } from '../../data/mattressRules.js';
import { createCase } from '../../data/support.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../../motion.js';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import BottomSheet from '../../components/BottomSheet.jsx';
import EvidenceStep from './EvidenceStep.jsx';
import MattressReasonStep from './MattressReasonStep.jsx';
import MattressVerdictStep from './MattressVerdictStep.jsx';
import MattressVariantStep from './MattressVariantStep.jsx';
import OptionsStep from './OptionsStep.jsx';
import RefundMethodStep from './RefundMethodStep.jsx';
import ApprovalPendingStep from './ApprovalPendingStep.jsx';
import './ReturnReplaceFlow.css';

const STEP_TITLES = {
  // Reason and evidence used to be two separate steps/taps — merged into
  // one screen (EvidenceStep now owns both), so one title covers both.
  evidence: "What's the issue?",
  refundMethod: 'Confirm Refund',
  execution: 'Tracking it',
  mattressReason: "What's the issue?",
  mattressVariant: 'Choose Model & Size',
  variant: 'Choose Replacement Details',
};

function withSpec(name, spec) {
  return spec ? `${name} (${spec})` : name;
}

// Refund method + pickup confirmation only makes sense for "Return for
// Refund" — replace/sendPart never move money, so those levers skip
// straight to Execution instead of carrying a dead step. Options ("Choose
// an option") isn't in here either — like the mattress verdict, it's a
// quick decision that surfaces as a bottom sheet over the reason screen,
// not a destination of its own.
const STEPS_WITH_REFUND = ['evidence', 'refundMethod', 'execution'];
const STEPS_WITHOUT_REFUND = ['evidence', 'execution'];

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
  const [photo, setPhoto] = useState([]);
  const [selectedLever, setSelectedLever] = useState(presetLever);
  const [ticketId, setTicketId] = useState(null);
  // MattressVerdictStep ("Next Steps") and the generic OptionsStep ("Choose
  // an option") both render as a bottom sheet layered on the reason screen
  // rather than their own step — independent of `step`/stepKeys, which only
  // track full-page navigation.
  const [verdictSheetOpen, setVerdictSheetOpen] = useState(false);
  const [optionsSheetOpen, setOptionsSheetOpen] = useState(false);
  // "Request Return" nudges toward Replace first (free, no wait for a
  // refund) whenever Replace is actually on the table for this reason —
  // the same cheapest-first ordering the retention ladder already applies
  // elsewhere (§7.2), just one more prompt before Return actually commits.
  const [returnNudgeOpen, setReturnNudgeOpen] = useState(false);
  // M8 (smell, ≤2 days) is advice-only — "it still smells" after following
  // that advice is what actually promotes it to M9's replace/return path,
  // not a fixed day count, so this overrides the real elapsed days once hit.
  const [smellPersists, setSmellPersists] = useState(false);
  const [newSpec, setNewSpec] = useState(null);
  // Set only when the replacement journey (mattress or generic) actually
  // switched to a different model — null means the same model, just a
  // different size/color/etc.
  const [newModel, setNewModel] = useState(null);
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
  // A self-serve action (sendPart/replace/mattress replace or return) never
  // needed a human, so there's nothing to wait for once it's booked — the
  // status update applies itself the instant this step is reached, and the
  // customer lands straight back on Order Details (which already shows the
  // tracker/status this would otherwise have repeated on its own page).
  // Return-for-Refund still stops at ApprovalPendingStep first — a human
  // review really is pending there, so that confirmation stays.
  const journeyCompletedRef = useRef(false);

  // Only skip Options while the preset lever is still actually on offer for
  // whatever reason gets picked — "Missing parts" only offers Send Part, so
  // a preset Replace/Return falls back to asking normally in that one case
  // rather than forcing a lever that was never available.
  const skipOptions = Boolean(
    presetLever && (!reason || getRemediationOptions(order, reason).some((o) => o.id === presetLever))
  );
  // "Wrong size or model" + Replace is the obvious case for asking which
  // model/color/size the customer actually wants instead of shipping back a
  // like-for-like unit — but Discomfort can just as easily mean "I don't
  // get on with this specific model", so it gets the same choice rather
  // than a mystery "Replacement Requested" that never says what changed.
  const VARIANT_ELIGIBLE_REASONS = ['Wrong size or model', 'Discomfort / Not as expected'];
  const showVariantStep = Boolean(
    !isMattress &&
      VARIANT_ELIGIBLE_REASONS.includes(reason) &&
      selectedLever === 'replace' &&
      target &&
      getVariants(splitProductSpec(target.product).name)
  );
  const deliveredDateStr = isMattress ? getDeliveredDate(target) : null;
  const effectiveDays = smellPersists ? 3 : daysSinceDelivery(deliveredDateStr);
  const mattressProductInfo = isMattress ? splitProductSpec(target.product) : null;
  // "Wrong size or model" has an obvious fix — pick the right size — so it
  // skips the verdict/lever-choice sheet entirely and heads straight to
  // MattressVariantStep instead of asking whose mistake it was first or
  // making the customer pick Replace off a card.
  const isWrongSizeModel = isMattress && reason === 'wrongSizeModel';
  const verdict =
    isMattress && reason && !isWrongSizeModel
      ? getMattressVerdict({
          reasonKey: reason,
          daysSinceDelivery: effectiveDays,
          productName: mattressProductInfo.name,
          spec: mattressProductInfo.spec,
        })
      : null;
  const proRataAmount = verdict?.proRata ? proRataRefund(itemPrice, deliveredDateStr) : 0;
  // Whether Replace is actually a real alternative to offer at the return
  // nudge — "Missing parts" only ever offers Send Part, and M6/M8's own
  // proRata/advice-only verdicts never put Replace on the table either.
  const canReplaceInstead = isMattress
    ? Boolean(verdict?.leverOptions?.includes('replace'))
    : Boolean(reason && getRemediationOptions(order, reason).some((o) => o.id === 'replace'));

  // "Next Steps" (MattressVerdictStep) now surfaces as a bottom sheet over
  // the reason screen instead of its own page — it's a quick decision, not
  // a destination — so it's no longer one of these named steps.
  const MATTRESS_STEPS_RETURN = ['mattressReason', 'refundMethod', 'execution'];
  const MATTRESS_STEPS_REPLACE = ['mattressReason', 'mattressVariant', 'execution'];
  const baseStepKeys = selectedLever === 'return' ? STEPS_WITH_REFUND : STEPS_WITHOUT_REFUND;
  const stepKeysWithVariant = showVariantStep
    ? baseStepKeys.flatMap((k) => (k === 'execution' ? ['variant', 'execution'] : [k]))
    : baseStepKeys;
  const stepKeys = isMattress
    ? selectedLever === 'return'
      ? MATTRESS_STEPS_RETURN
      : MATTRESS_STEPS_REPLACE
    : stepKeysWithVariant;
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
        hasPhoto: Boolean(photo?.length),
        escalate: true,
        messages: [],
      });
      setTicketId(record.id);
    }
    goNext();
  }

  // Tapping "Request Return" doesn't commit right away when Replace is
  // still a live option — the nudge sheet gets one more chance to steer
  // toward it first, same as OptionsStep already orders levers cheapest
  // (least drastic) first.
  function handleRequestReturnTap() {
    if (canReplaceInstead) {
      setReturnNudgeOpen(true);
      return;
    }
    handleSubmitReturnRequest();
  }

  function handleNudgeContinueReturn() {
    setReturnNudgeOpen(false);
    handleSubmitReturnRequest();
  }

  // Switches the lever and jumps to whatever comes right after the reason
  // screen for a replace journey — index 1 lands on 'mattressVariant' for a
  // mattress or 'variant'/'execution' for the generic flow (both occupy
  // that same position — see stepKeys above), so this works without
  // needing to recompute the array here.
  function handleNudgeReplaceInstead() {
    setSelectedLever('replace');
    setReturnNudgeOpen(false);
    goToStep(1);
  }

  function handleChooseLever(lever) {
    setSelectedLever(lever);
    setVerdictSheetOpen(false);
    goNext();
  }

  // "Wrong size or model" skips the verdict sheet entirely (see
  // isWrongSizeModel above) — lock the lever in here, the moment the
  // customer moves past the reason screen, so downstream (ExecutionStep,
  // the post-booking status update) still sees the replace it's actually
  // running. Every other mattress reason opens the "Next Steps" sheet on
  // top of this same reason screen instead of navigating away.
  function handleMattressReasonContinue() {
    if (isWrongSizeModel) {
      setSelectedLever('replace');
      goNext();
      return;
    }
    setVerdictSheetOpen(true);
  }

  // Same shortcut as the mattress reason screen: a preset lever (tapped
  // Replace/Return straight off Order Details) already answers what
  // Options would ask, so continuing just advances; otherwise it opens the
  // Options sheet over this same reason screen instead of navigating away.
  function handleEvidenceContinue() {
    if (skipOptions) {
      goNext();
      return;
    }
    // A preset lever from Order Details (e.g. "Replace") can be stale here —
    // "Missing parts" only ever offers Send Part, so a leftover 'replace'
    // would otherwise leave Confirm Choice looking already-answered without
    // the customer ever actually picking the one option on offer.
    if (selectedLever && !getRemediationOptions(order, reason).some((o) => o.id === selectedLever)) {
      setSelectedLever(null);
    }
    setOptionsSheetOpen(true);
  }

  function handleOptionsContinue() {
    setOptionsSheetOpen(false);
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
      hasPhoto: Boolean(photo?.length),
      escalate: false,
      messages: [],
    });
    setVerdictSheetOpen(false);
    goBack();
  }

  function handleSubmitWarrantyClaim() {
    createCase({
      lane: 'returns',
      order,
      item: item ?? null,
      description: `Warranty claim (sagging/dip) — pro-rata refund ₹${proRataAmount.toLocaleString('en-IN')}`,
      hasPhoto: Boolean(photo?.length),
      escalate: true,
      messages: [],
    });
    setVerdictSheetOpen(false);
    goBack();
  }

  function handleSmellPersists() {
    setSmellPersists(true);
  }

  function handleVariantContinue({ model, spec, delta }) {
    setNewModel(model ?? null);
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
    // A replacement that changed variant (mattress size/height/model, chair
    // color, sofa seating/color — see MattressVariantStep) ships as the new
    // spec, not a like-for-like reprint of what didn't work out. `newModel`
    // is only set when the customer actually switched to a different
    // catalog model, not just a different size/color of the same one.
    const newPrice = itemPrice + variantPriceDelta;
    const baseName = splitProductSpec(item ? item.product : order.product).name;
    const specUpdate = newSpec ? { product: withSpec(newModel ?? baseName, newSpec) } : {};
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

  useEffect(() => {
    if (currentKey === 'execution' && !needsApproval && !journeyCompletedRef.current) {
      journeyCompletedRef.current = true;
      handleJourneyComplete();
    }
    // handleJourneyComplete reads plenty of state but is only ever invoked
    // here at the one instant currentKey/needsApproval actually reach this
    // combination — re-running it on every unrelated state change would
    // both be wrong (the ref guard already exists for a reason) and unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, needsApproval]);

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
                photo={photo}
                onPhotoChange={setPhoto}
                onContinue={handleMattressReasonContinue}
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
                onContinue={handleEvidenceContinue}
              />
            )}
            {currentKey === 'variant' && (
              <MattressVariantStep order={target} price={itemPrice} onContinue={handleVariantContinue} />
            )}
            {currentKey === 'refundMethod' && (
              <RefundMethodStep order={target} refundAmount={itemPrice} onSubmit={handleRequestReturnTap} />
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
            {/* No JSX here for execution+!needsApproval — the effect above
                applies the update and navigates back to Order Details the
                instant this step is reached, so there's nothing to render. */}
          </motion.div>
        </AnimatePresence>
      </div>

      {isMattress && (
        <BottomSheet open={verdictSheetOpen} onClose={() => setVerdictSheetOpen(false)}>
          {verdict && (
            <MattressVerdictStep
              verdict={verdict}
              proRataAmount={proRataAmount}
              onChooseLever={handleChooseLever}
              onAcceptTopper={handleAcceptTopper}
              onSubmitWarrantyClaim={handleSubmitWarrantyClaim}
              onSmellPersists={handleSmellPersists}
            />
          )}
        </BottomSheet>
      )}

      {!isMattress && (
        <BottomSheet open={optionsSheetOpen} onClose={() => setOptionsSheetOpen(false)}>
          {reason && (
            <OptionsStep
              order={target}
              reason={reason}
              selectedLever={selectedLever}
              onSelectLever={setSelectedLever}
              onContinue={handleOptionsContinue}
            />
          )}
        </BottomSheet>
      )}

      {canReplaceInstead && (
        <BottomSheet open={returnNudgeOpen} onClose={() => setReturnNudgeOpen(false)}>
          <p className="return-replace__nudge-title">Try a replacement instead?</p>
          <p className="return-replace__nudge-body">
            Replacing this item is free and doesn't need you to wait for a refund — we'll get the exchange moving
            right away instead of sending your money back.
          </p>
          <button className="return-replace__nudge-primary" onClick={handleNudgeReplaceInstead}>
            Replace Instead
          </button>
          <button className="return-replace__nudge-secondary" onClick={handleNudgeContinueReturn}>
            Continue with Return
          </button>
        </BottomSheet>
      )}
    </div>
  );
}
