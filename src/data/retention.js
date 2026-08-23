// The retention ladder for mattress discomfort (PRD §7.11, §7.2).
//
// The point of a ladder is not to hide the exit — it's to earn the right to
// keep the customer by actually solving the problem. So:
//
//   - It diagnoses before it offers. "Uncomfortable" is six different
//     problems with six different fixes; offering a topper to someone who
//     sleeps hot makes their bed hotter.
//   - It refuses to retain what it can't honestly fix. A mattress that dips
//     is a suspected defect, not a preference — that leaves the ladder
//     immediately for inspection. Selling a topper against a defect would be
//     a dark pattern, and the PRD names that as a risk to avoid.
//   - The exit is visible from every rung. Persuasion, not entrapment.
//   - It never re-offers a rung already given (topper_provided, CV-07).
//
// Rungs are ordered cheapest-first; each one the customer declines advances
// to the next. Return is always last and always reachable.

import { parseOrderDate, getDeliveredDate } from './orders.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const TRIAL_NIGHTS = 100;
const SETTLE_IN_WEEKS = 4;

// The trial is 100 *nights slept*, so it runs from delivery — not from the
// day the order was placed, which can be weeks earlier.
export function getNightsSinceDelivery(order) {
  const delivered = getDeliveredDate(order);
  const anchor = delivered ? parseOrderDate(delivered) : parseOrderDate(order.date);
  return Math.floor((Date.now() - anchor.getTime()) / DAY_MS);
}

export function isWithinTrial(order) {
  return getNightsSinceDelivery(order) <= TRIAL_NIGHTS;
}

// CV-07: toppers aren't offered on every mattress — some constructions
// can't take one, and marketplace channels don't carry the SKU.
function topperAvailable(order) {
  if (/snowtec/i.test(order.product ?? '')) return false;
  if (order.channel && order.channel !== 'direct') return false;
  return true;
}

// ── Diagnoses ───────────────────────────────────────────────────────
//
// `fix` is what would genuinely help, and it decides which rungs the ladder
// even builds:
//   topper-soft / topper-firm → a topper is a real fix, offer it
//   none                      → no topper helps; go straight to replacement
//   defect                    → not a comfort problem at all; leave the ladder

export const DIAGNOSES = [
  {
    key: 'too-firm',
    label: 'It feels too hard',
    fix: 'topper-soft',
    education: {
      title: 'Give the foam time to settle',
      body: `New support foam is at its firmest in the first few weeks — it softens measurably as it breaks in. Most people who find a mattress too hard on night three don't feel that by week four. Sleep on it as-is for ${SETTLE_IN_WEEKS} weeks before changing anything; adding a topper now would mask the break-in and make it harder to tell what you actually need.`,
    },
    topper: {
      title: 'A soft topper, on us',
      body: "If it's still too firm, we'll send a plush memory-foam topper free of charge. It takes the edge off the surface without losing the support underneath — for most people this is the whole fix.",
    },
  },
  {
    key: 'too-soft',
    label: 'I sink in too much',
    fix: 'topper-firm',
    education: {
      title: 'Check what’s under the mattress',
      body: 'Excess sinking is usually the base, not the mattress. A slatted frame with gaps wider than 7cm, or a sagging old base, lets the mattress dip in the middle no matter how good it is. Worth checking before we change the mattress itself.',
    },
    topper: {
      title: 'A firm topper, on us',
      body: "If the base checks out and it still feels too soft, we'll send a firm latex topper free of charge — it adds a supportive layer on top without you having to change the mattress.",
    },
  },
  {
    key: 'pain',
    label: 'I’m waking up with back or neck pain',
    fix: 'topper-firm',
    education: {
      title: 'It’s often the pillow, not the mattress',
      body: 'Neck and upper-back pain usually traces to pillow height rather than the mattress — on a new, firmer mattress you sink less, so a pillow that used to be right is now too tall and pushes your neck out of line. Try one pillow height lower for a week. If it’s lower-back pain, a firmer surface generally helps rather than hurts.',
    },
    topper: {
      title: 'A firmer surface, on us',
      body: "If the pain persists after adjusting your pillow, we'll send a firm topper free of charge to give your lower back more support.",
    },
  },
  {
    key: 'hot',
    label: 'I sleep too hot',
    // Deliberately no topper: an extra foam layer traps more heat. Offering
    // one here would be selling a fix that makes the problem worse.
    fix: 'none',
    education: {
      title: 'Start with what’s on top of it',
      body: 'Heat is usually bedding, not the mattress. A waterproof protector is the most common culprit — it seals in heat almost completely. Swap to a breathable cotton protector and cotton sheets before anything else. We’d rather not send you a topper here: another foam layer traps more heat, not less.',
    },
  },
  {
    key: 'partner',
    label: 'I feel my partner moving',
    // Motion isolation is a property of the construction — no topper fixes it.
    fix: 'none',
    education: {
      title: 'Motion transfer is built in, not added on',
      body: 'How much movement travels across a mattress comes down to its internal construction — pocketed springs isolate motion far better than a connected spring unit. That isn’t something a topper can change, so if this is the problem, moving to a different construction is the honest fix.',
    },
  },
  {
    key: 'uneven',
    label: 'It dips or feels uneven',
    // Not a preference — a possible manufacturing defect. Never retained.
    fix: 'defect',
    education: {
      title: 'That shouldn’t happen — let’s look at it',
      body: 'A visible dip or an uneven surface isn’t a comfort preference, it’s a possible manufacturing fault. We won’t try to talk you into a topper for this. A technician should measure it, and if it’s sagging beyond tolerance it’s covered by your warranty.',
    },
  },
];

export function getDiagnosis(key) {
  return DIAGNOSES.find((d) => d.key === key) ?? null;
}

// ── Ladder construction ─────────────────────────────────────────────

const TOPPER_KIND = { 'topper-soft': 'soft', 'topper-firm': 'firm' };

// Returns the ordered rungs for this order + diagnosis. The UI walks them:
// accepting a rung ends the ladder, declining advances to the next.
//
// `topperProvided` is read off the order, so a customer who already took a
// topper and came back doesn't get offered the same thing twice — the ladder
// resumes at replacement (CV-07).
export function buildLadder(order, diagnosisKey) {
  const diagnosis = getDiagnosis(diagnosisKey);
  if (!diagnosis) return [];

  // A suspected defect leaves the ladder entirely — one rung, and it's an
  // exit to inspection rather than an offer.
  if (diagnosis.fix === 'defect') {
    return [
      {
        key: 'defect-exit',
        kind: 'exit',
        title: diagnosis.education.title,
        body: diagnosis.education.body,
        acceptLabel: 'Book an inspection',
        outcome: 'inspection',
      },
    ];
  }

  const rungs = [
    {
      key: 'education',
      kind: 'education',
      title: diagnosis.education.title,
      body: diagnosis.education.body,
      acceptLabel: `I'll give it ${SETTLE_IN_WEEKS} weeks`,
      declineLabel: 'I’ve already tried that',
      outcome: 'retained_education',
    },
  ];

  const topperKind = TOPPER_KIND[diagnosis.fix];
  if (topperKind && !order.topperProvided && topperAvailable(order)) {
    rungs.push({
      key: 'topper',
      kind: 'offer',
      title: diagnosis.topper.title,
      body: diagnosis.topper.body,
      acceptLabel: 'Send me the topper',
      declineLabel: 'I’d rather change the mattress',
      outcome: 'retained_topper',
      topperKind,
    });
  }

  rungs.push({
    key: 'replace',
    kind: 'offer',
    title: 'Swap it for a different feel',
    body: order.topperProvided
      ? "Since the topper didn't do it, let's change the mattress itself. We'll help you pick a different firmness and swap it — you only pay a difference if you move to a pricier model."
      : "We'll help you pick a model that suits how you actually sleep, and swap this one for it. You only pay a difference if you move to a pricier model.",
    acceptLabel: 'Look at other models',
    declineLabel: 'I’d rather return it',
    outcome: 'retained_replacement',
  });

  rungs.push({
    key: 'return',
    kind: 'exit',
    title: 'Return it for a refund',
    body: `You're within your ${TRIAL_NIGHTS}-night trial, so this is your call and there's no charge. We'll collect it and refund to your original payment method once it's picked up.`,
    acceptLabel: 'Return it',
    outcome: 'returned',
  });

  return rungs;
}

// Past the trial window there's nothing honest left to offer for comfort
// preference — an inform-only screen rather than a silently empty ladder.
export function getTrialExpiredNotice(order) {
  const nights = getNightsSinceDelivery(order);
  if (nights <= TRIAL_NIGHTS) return null;
  return {
    title: `Your ${TRIAL_NIGHTS}-night trial has ended`,
    body: `It's been ${nights} nights since this was delivered, so the comfort trial has closed and we can't take it back for preference alone. If something is actually wrong with it — sagging, a fault, damage — that's covered separately and we should look at it.`,
  };
}

// What accepting a rung does to the order. Mirrors remediation.js's
// getPostBookingUpdate shape so the flow can apply either the same way.
export function getLadderOutcome(rung) {
  switch (rung.outcome) {
    case 'retained_education':
      return {
        label: 'Settling-in guidance sent',
        trackerSteps: ['Guidance Sent', 'Checking Back In'],
        description: `We'll check in before your ${TRIAL_NIGHTS}-night trial closes to see how it's going.`,
        actions: [{ label: 'Report an Issue', variant: 'secondary' }],
        overrideReason: 'Settling-in guidance is already in progress for this order',
        setsTopperProvided: false,
      };
    case 'retained_topper':
      return {
        label: 'Topper on its way',
        trackerSteps: ['Topper Confirmed', 'Dispatched', 'Delivered'],
        description: "Your complimentary topper is on its way — no charge, nothing to send back.",
        actions: [{ label: 'Track Topper', variant: 'secondary' }],
        overrideReason: 'A topper has already been sent for this order',
        setsTopperProvided: true,
      };
    case 'inspection':
      return {
        label: 'Inspection requested',
        trackerSteps: ['Inspection Requested', 'Technician Assigned', 'Measured'],
        description: 'A technician will measure the surface and confirm whether it’s outside tolerance.',
        actions: [{ label: 'Track Inspection', variant: 'secondary' }],
        overrideReason: 'An inspection is already booked for this order',
        setsTopperProvided: false,
      };
    default:
      return null;
  }
}
