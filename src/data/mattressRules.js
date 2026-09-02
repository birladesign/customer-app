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

// Accepts either the bare catalog name or the full "Name (Spec)" string an
// order/item actually carries — getVariants only recognizes the former, and
// every caller here has the latter, so splitting is the safe default rather
// than a footgun every call site has to remember.
export function isMattressProduct(product) {
  return getVariants(splitProductSpec(product).name)?.type === 'mattress';
}

// A fixed "today" for this prototype's fictional order timeline (see
// orders.js's own hardcoded 2026 dates) — there's no real clock these day
// windows could sensibly measure against otherwise.
export const RULES_TODAY = new Date(2026, 7, 21);

function atMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysSinceDelivery(deliveredDateStr) {
  if (!deliveredDateStr) return 0;
  const ms = atMidnight(RULES_TODAY) - atMidnight(new Date(deliveredDateStr));
  return Math.max(0, Math.round(ms / 86400000));
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
