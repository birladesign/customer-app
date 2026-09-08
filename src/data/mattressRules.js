// PRD §7.7 — Mattress remediation rules (M1-M9 implemented; M10-M12 need an
// on-site technician measurement to adjudicate ≤0.5" tolerance / zipper-cover
// -only replacement, which this no-backend prototype can't simulate, so they
// aren't modeled separately — see the comment on MATTRESS_REASONS).
//
// Invariants from the PRD: no manager approval anywhere in this table; the
// only technician visit is for measurement/sagging verification (not
// simulated here either); a shipping charge only ever applies when the
// customer, not TSC, was at fault.

import { getVariants } from './variants.js';
import { splitProductSpec } from './orders.js';
import { daysSince } from './clock.js';

// Accepts either the bare catalog name or the full "Name (Spec)" string an
// order/item actually carries — getVariants only recognizes the former, and
// every caller here has the latter, so splitting is the safe default rather
// than a footgun every call site has to remember.
export function isMattressProduct(product) {
  return getVariants(splitProductSpec(product).name)?.type === 'mattress';
}

// These day windows measure against the shared app clock (clock.js), the same
// one the installation/delivery pickers book against — a verdict and a
// calendar on the same screen must agree on what "today" means.
export function daysSinceDelivery(deliveredDateStr) {
  return daysSince(deliveredDateStr);
}

// M8-M9 (odor) and M6 (sagging) are their own reasons; M10 (tolerance) and
// M11 (zipper-cover) both start from the same customer-visible symptom as
// "Sagging or visible dip" and only diverge once a technician actually
// measures it on-site, so they aren't separate menu entries here.
export const MATTRESS_REASONS = [
  { key: 'damaged', label: 'Damaged / Defective' },
  { key: 'wrongSizeModel', label: 'Wrong size or model' },
  { key: 'discomfort', label: 'Discomfort / Not as expected' },
  { key: 'sagging', label: 'Sagging or visible dip' },
  { key: 'smell', label: 'Odor / Smell' },
];

// M5's ladder opens with a topper, which is the right first move for most
// discomfort but not all of it — and the ladder has no way to tell which,
// because it asks "firm or soft?" as a preference rather than asking what
// is actually wrong. These are the answers that change the route:
//
//   topper  — a topper genuinely fixes it; `topper` says which one
//   none    — no topper helps, so don't offer one; go to the swap
//   inspect — not a comfort problem at all; leave the ladder
//
// The last two matter most. Sending a foam layer to somebody who sleeps hot
// makes their bed hotter, and offering a free topper against what may be a
// manufacturing fault is the retention-as-dark-pattern the PRD warns about
// (§15). Both are cases where the honest answer is to stop selling the
// cheap fix.
export const DISCOMFORT_DIAGNOSES = [
  {
    key: 'tooFirm',
    label: 'It feels too hard',
    fix: 'topper',
    topper: 'soft',
    education:
      'New support foam is at its firmest in the first few weeks and softens measurably as it breaks in — plenty of people who find a mattress hard on night three no longer do by week four. A soft topper is the usual fix if it persists.',
  },
  {
    key: 'tooSoft',
    label: 'I sink in too much',
    fix: 'topper',
    topper: 'firm',
    education:
      'Excess sinking is often the base rather than the mattress — slats spaced wider than about 7cm, or a sagging old frame, let it dip in the middle whatever is on top. Worth a look before we change the mattress itself.',
  },
  {
    key: 'pain',
    label: 'I’m waking up with back or neck pain',
    fix: 'topper',
    topper: 'firm',
    education:
      'Neck and upper-back pain usually traces to pillow height rather than the mattress: on a newer, firmer surface you sink less, so a pillow that used to sit right now pushes your neck out of line. Try one height lower for a week. For lower-back pain a firmer surface generally helps.',
  },
  {
    key: 'hot',
    label: 'I sleep too hot',
    // Deliberately no topper — an extra foam layer traps more heat, so
    // offering one here would be selling a fix that makes it worse.
    fix: 'none',
    education:
      'Heat is usually bedding rather than the mattress, and a waterproof protector is the most common culprit — it seals heat in almost completely. Swap to a breathable cotton protector and cotton sheets first. We would rather not send a topper here: another foam layer traps more heat, not less.',
  },
  {
    key: 'partner',
    label: 'I feel my partner moving',
    // Motion isolation is a property of the construction; no surface layer
    // changes it.
    fix: 'none',
    education:
      'How much movement travels across a mattress comes down to what is inside it — pocketed springs isolate motion far better than a connected spring unit. A topper cannot change that, so if this is the problem, moving to a different construction is the honest fix.',
  },
  {
    key: 'uneven',
    label: 'It dips or feels uneven',
    // Not a preference. This is M6 territory and belongs with a technician.
    fix: 'inspect',
    education:
      'A visible dip or an uneven surface is not a comfort preference — it is a possible manufacturing fault, and we are not going to talk you into a topper for it. A technician should measure it, and if it is sagging beyond tolerance your warranty covers it.',
  },
];

export function getDiscomfortDiagnosis(key) {
  return DISCOMFORT_DIAGNOSES.find((d) => d.key === key) ?? null;
}

// Linear 10%/yr depreciation, provisional per the PRD pending Finance
// sign-off — floored at 20% residual so a very old claim isn't quoted ₹0.
export function proRataRefund(originalPrice, deliveredDateStr) {
  const years = daysSinceDelivery(deliveredDateStr) / 365;
  const residual = Math.max(0.2, 1 - years * 0.1);
  return Math.round(originalPrice * residual);
}

// `input`: { reasonKey, daysSinceDelivery, faultAttribution ('tsc'|'customer') }
// Returns a verdict: which levers are on the table, what evidence is
// needed, and whether this reason routes through a retention step first.
// There's never a shipping charge for a return or replace itself — the
// only money that ever moves for a replacement is a genuine SKU-level price
// difference (a bigger/smaller size or a different model), handled where
// the new SKU is actually chosen (see MattressVariantStep), not here.
export function getMattressVerdict(input) {
  const { reasonKey, daysSinceDelivery: days, faultAttribution } = input;

  switch (reasonKey) {
    case 'damaged':
      // M1
      return {
        rule: 'M1',
        leverOptions: ['replace', 'return'],
        images: 'optional',
        note: 'A quick photo helps us confirm the issue faster.',
      };

    case 'wrongSizeModel':
      if (faultAttribution === 'tsc') {
        // M2 / M7 — same treatment whether it's the wrong size or the wrong
        // model outright, since both are our error either way.
        return {
          rule: 'M2',
          leverOptions: ['replace', 'return'],
          images: 'optional',
          note: 'Since this was our mistake, we’ll take it from here.',
        };
      }
      if (days <= 10) {
        // M3
        return {
          rule: 'M3',
          leverOptions: ['replace', 'return'],
          images: 'optional',
          note: 'If a replacement is a different size or model, only the price difference (if any) applies — never a shipping charge.',
        };
      }
      // M4 — same as M3, but only after a retention prompt (it's past the
      // 10-day window).
      return {
        rule: 'M4',
        leverOptions: ['replace', 'return'],
        images: 'optional',
        retention: 'insist',
        note: "It's past the 10-day window for a size/model correction — going ahead is still free of any shipping charge; only a genuine price difference for a different size/model would apply.",
      };

    case 'discomfort':
      // M5 — resolved entirely through the retention ladder (§7.11).
      return {
        rule: 'M5',
        leverOptions: ['replace', 'return'],
        images: 'optional',
        retention: 'ladder',
        note: null,
      };

    case 'sagging':
      if (days <= 100) {
        // Within the ordinary return/replace window, a visible dip is
        // treated the same as any other defect (M1) rather than the
        // post-warranty pro-rata path below.
        return {
          rule: 'M1',
          leverOptions: ['replace', 'return'],
          images: 'mandatory',
          note: 'Photos of the affected area are required to verify this.',
        };
      }
      // M6 — out of the return window but still in warranty: a pro-rata
      // refund, not a replacement.
      return {
        rule: 'M6',
        leverOptions: ['proRataRefund'],
        images: 'mandatory',
        proRata: true,
        note: 'This is a warranty claim rather than a standard return — the refund is pro-rated for usage.',
      };

    case 'smell': {
      // M8 vs M9 — new foam can carry a mild odor; venting is the first
      // ask, and only becomes a pickup once that's genuinely been tried.
      if (days <= 2) {
        return {
          rule: 'M8',
          leverOptions: [],
          shipCharge: 0,
          images: 'optional',
          adviceOnly: true,
          note: 'New foam can carry a mild odor for the first couple of days — airing it out in a ventilated room for 48 hours usually resolves it.',
        };
      }
      return {
        rule: 'M9',
        leverOptions: ['replace', 'return'],
        shipCharge: 0,
        images: 'optional',
        note: "Since airing it out hasn't resolved it, we'll take it from here.",
      };
    }

    default:
      return { rule: null, leverOptions: ['replace', 'return'], shipCharge: 0, images: 'optional' };
  }
}
