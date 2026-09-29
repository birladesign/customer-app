# Error Cases — Context File

Catalogue of every error, denial, validation, and edge-case state in the TSC post-purchase prototype. Written as context for humans and agents working in this repo.

**How to read this app's "errors":** it is a no-backend UI prototype (`src/`), so there are almost no thrown exceptions or network failures. Errors show up in four forms:

1. **Input validation** — field-level rules that block or flag a form.
2. **Ineligibility (C2)** — actions greyed out *with a reason* (PRD §9: never silently hidden, except policy-hidden ones).
3. **Rule denials / routing** — remediation, delivery, price-match and RTO rules that change or limit the outcome.
4. **Runtime/infra guards** — storage, clipboard, clock and hook-misuse fallbacks.

Source of truth for the policy is `TSC_PostPurchase_App_PRD_v3 (1).md`; file paths below are relative to the repo root.

---

## 1. Authentication & onboarding

| ID | Where | Trigger | Behaviour / copy |
|----|-------|---------|------------------|
| AUTH-01 | `src/screens/Login/PhoneStep.jsx` | Phone doesn't match `/^[6-9]\d{9}$/` (not 10 digits, or leading digit 0–5) | Red banner (`role="alert"`) + red pill: **"Please enter valid phone number."** Error clears on next keystroke. Input strips non-digits and caps at 10. Continue is disabled until 10 digits are typed. |
| AUTH-02 | `src/screens/Login/OtpStep.jsx` | Wrong OTP (mock code is `123456`, shown as a demo hint) | Banner: **"The OTP entered is incorrect/invalid. Please try again."** Boxes turn red, digits are cleared, focus returns to box 1. Status returns to `idle` on next keystroke. |
| AUTH-03 | `OtpStep.jsx` | 3 wrong attempts (`MAX_ATTEMPTS`) | Status `locked` for 30s (`LOCKOUT_SECONDS`): **"Too many incorrect attempts. Try again in {n}s."** Inputs disabled. After the countdown, attempts reset and inputs clear. |
| AUTH-04 | `OtpStep.jsx` | Resend tapped during cooldown | Not possible — shows **"Resend SMS in {n}s"** (30s `RESEND_COOLDOWN_SECONDS`). Resend resets attempts and status. |
| AUTH-05 | `OtpStep.jsx` | Paste of fewer than 6 digits | Fills partial boxes and focuses the next empty one; no verification. Paste of 6 digits verifies immediately. Paste is ignored while `verifying`/`locked`. |
| AUTH-06 | `OtpStep.jsx` | Input while verifying (900 ms simulated delay) | Boxes disabled; **"Verifying..."** shown. |
| AUTH-07 | `src/screens/Login/OnboardingStep.jsx` | Signup with empty first/last name, or invalid phone | Continue disabled. Phone field (only editable when none came from the OTP step) shows **"Please enter valid phone number."** after blur. |

## 2. Profile & address forms

| ID | Where | Rule |
|----|-------|------|
| ADDR-01 | `src/screens/Profile/AddAddress.jsx` | Save disabled until name, address line 1, city, state are non-empty **and** pincode matches `/^\d{6}$/`. |
| ADDR-02 | `AddAddress.jsx` | Billing address (when "different from shipping") needs line 1, city, state and a 6-digit pincode. |
| ADDR-03 | `AddAddress.jsx` | GSTIN (order flow only) is optional, but if entered must match `GSTIN_PATTERN` (`^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$`) **and** have a business name. A half-filled GST block cannot be saved. |
| PROF-01 | `src/screens/Profile/PersonalInformation.jsx` | Save disabled until a field is `dirty`. The phone pill is permanently disabled (read-only). |

## 3. Action availability (C2) — greyed with reason

Defined in `src/data/intents.js`, driven by the phase projection in `src/data/phases.js`. Phases: `pre_dispatch`, `in_transit`, `ofd`, `delivered_0_10`, `d11_100`, `post_100_warranty`, `terminal`. Terminal is reached via `section === 'closed'` or a status label of `Cancelled`, `Refund Completed`, or `Delivery Delayed — Refund Processed`.

### Order-level intents (`getOrderIntents`)

| Intent | Disabled when | Reason shown |
|--------|---------------|--------------|
| Return or Replace | Not delivered | "Available once the order is delivered" — or, when out for delivery, "Available once the order is delivered — it's out for delivery now" |
| Cancel Order | Delivered | "Order already delivered" |
| Cancel Order | Terminal | "Order already closed" |
| Warranty, Need Help | Never phase-gated | — |
| Any intent | `order.intentOverrides[key]` set | The override string wins over the phase default (see below) |

Item-level (`getItemIntents`): Return/Replace is disabled per line item until *that item* is delivered — "Available once this item is delivered". A delivered mattress doesn't wait on an in-transit bed frame in the same order.

### Per-order overrides (`intentOverrides` in `src/data/orders.js`)

| Intent | Reason |
|--------|--------|
| `deliveryIssue` | "An investigation is already open for this order" (orders at lines ~231, ~1191) |
| `warranty` | "Already mid-claim — see the evidence request above" (~267) |
| `returnReplace` | "A return is already in progress for this order" (~521) |
| `returnReplace` | "A replacement is already in progress for this order" (~573) |

After a flow is booked, `getPostBookingUpdate` (`src/data/remediation.js`) and the RTO helpers (`src/data/rto.js`) install these same override reasons on the order, blocking duplicate requests:

- "A missing-part request is already in progress for this order"
- "A replacement is already in progress for this order"
- "A return is already in progress for this order"
- "A return request is already awaiting approval for this order"
- "A delivery-delay cancellation is already in progress for this order"
- "A return-to-origin replacement is already in progress for this order"

### Editing (`src/data/intents.js`)

| Function | Denied when | Reason | `offerRto` |
|----------|-------------|--------|-----------|
| `getEditEligibility` | Terminal | "Order already closed" | no |
| `getEditEligibility` | Post-dispatch | "Editing is locked once it ships" | **yes** |
| `getShipmentEditEligibility` | Any unit terminal | "Order already closed" | no |
| `getShipmentEditEligibility` | Any unit post-dispatch (whole parcel locks) | "Editing is locked once the shipment ships" | **yes** |
| `getAddressEditEligibility` | Terminal | "Order already closed" | no |
| `getAddressEditEligibility` | Post-dispatch | "Address can no longer be edited once it’s dispatched" | **yes** |
| `getShipmentAddressEditEligibility` | Any unit post-dispatch | "Address can no longer be edited once the shipment is dispatched" | **yes** |

`offerRto: true` means the denial isn't a dead end — the screen routes into the RTO-Replacement sub-flow (PRD §8.2 OM-07, RT-01).

### Other disabled controls (UI-level)

| Control | File | Enabled only when |
|---------|------|-------------------|
| Get invoice | `OrderDetails.jsx` | Order is fully delivered (`aria-disabled` otherwise) |
| Edit button | `OrderDetails.jsx` | `editIntent.enabled` |
| Cancel "Continue" | `OrderDetails.jsx` | A cancel reason is chosen |
| Warranty row (per item) | `PrimaryItem.jsx`, `OrderDetails.jsx` | `intents.warranty.enabled` (row is styled `--disabled` when not) |
| Edit order / shipment "Continue" | `EditOrder.jsx`, `EditShipmentOrder.jsx` | There are changes (variant changed or a non-current address chosen) |
| Delivery / installation "Confirm" | `DeliverySchedule.jsx`, `InstallationSchedule.jsx` | Chosen date/slot differs from the current booking (`isUnchanged` guard) |
| Delivery-issue "Continue" | `DeliveryIssueFlow.jsx` | At least one SKU is in scope (`scopedSkus.length > 0`) |
| Support "Send" | `SupportChat.jsx`, `RequestDetail.jsx` | Draft is non-empty (request reply also accepts a photo alone) |
| Support chat chips/rows | `SupportChat.jsx` | Only the active message; older ones render muted/disabled as history |

## 4. Return / Replace / Repair (remediation)

### 4.1 Generic engine — `src/data/remediation.js`

A mocked stand-in for C3; a few branches keyed on the reason. Lever order is cheapest-first; "Return for Refund" is always last (PRD "never first-class").

| Reason | Levers | Notes |
|--------|--------|-------|
| Missing parts | `sendPart` only | No return offered. **Hidden for pillows/accessories** (`getReturnReasons`, PRD §7.9) — single-piece items can't have missing parts |
| Damaged / Defective / Not working | `replace`, `return` | `return` has `needsApproval: true` |
| Wrong size or model | `replace`, `return` | `return` has `needsApproval: true` |
| Discomfort / Not as expected, or any unknown reason | `replace`, `return` | Unknown reasons fall through to this default branch |

- `return` (Return for Refund) always sets `needsApproval: true` → lands in **Return Request Created / Under Review / Approved**, not a running pickup (`APPROVAL_PENDING_UPDATE`). The UI must not claim pickup progress before a human approves.
- `OptionsStep.jsx`: Continue disabled until a lever is selected.
- `EvidenceStep.jsx`: Continue disabled until reason chosen **and** fault question answered **and** at least one photo attached.
- Changing the reason invalidates any earlier fault answer (`ReturnReplaceFlow.jsx`, ~L358 and ~L366).

### 4.2 Mattress rules M1–M9 — `src/data/mattressRules.js`

`getMattressVerdict({ reasonKey, daysSinceDelivery, faultAttribution })`. Invariants: no manager approval, no shipping charge on a return/replace itself, tech visits are never simulated.

| Reason | Condition | Rule | Levers | Photos | Notes |
|--------|-----------|------|--------|--------|-------|
| damaged | any | M1 | replace, return | optional | — |
| wrongSizeModel | fault = `tsc` | M2/M7 | replace, return | optional | "our mistake" copy |
| wrongSizeModel | customer fault, ≤10 days | M3 | replace, return | optional | Only price difference may apply; never a shipping charge |
| wrongSizeModel | customer fault, >10 days | M4 | replace, return | optional | `retention: 'insist'` — retention prompt first |
| discomfort | any | M5 | replace, return | optional | `retention: 'ladder'` (§7.11) |
| sagging | ≤100 days | M1 | replace, return | **mandatory** | "Photos of the affected area are required" |
| sagging | >100 days | M6 | `proRataRefund` **only** (no replacement) | **mandatory** | Warranty claim; refund pro-rated |
| smell | ≤2 days | M8 | **none** — `adviceOnly` | optional | "Air it out 48h"; no case created |
| smell | >2 days | M9 | replace, return | optional | — |
| unknown key | — | `rule: null` | replace, return | optional | Safe default |

- **Pro-rata (`proRataRefund`)**: linear 10%/yr depreciation, **floored at 20% residual** (never quotes ₹0). Provisional until Finance signs off (PRD WR-05 / Appendix B) — the UI should label it "provisional".
- **Not modelled:** M10–M12 (≤0.5" tolerance, zipper-cover-only) need an on-site measurement.
- Continue gating: `MattressReasonStep.jsx` needs a reason, the fault question answered, and a photo when `photoRequired`. `MattressVerdictStep.jsx` needs a topper selected. `MattressVariantStep.jsx` disables Continue when the chosen variant is unchanged. `WrongItemEvidenceStep.jsx` needs a photo **and** a non-empty "what you received" text.

### 4.3 PRD-level denials to remember (not fully enforced in prototype)

- Counters: `rp_count ≤ 2`, `rto_count ≤ 2`, `part_rp_count` with a 60-day clock, `damaged_delivery_count`, `first_attempt_denied`, `miss_count` (PRD §7 stateful counters).
- Difference-amount ladder for RP: ₹0–1.5K Agent · ₹1.5–3K Manager/AM (+OTP) · ₹3–10K Director (+OTP) · ₹10–20K COO · **>₹20K cannot book** (evidence pack). The cap applies to the *difference*, not cart value.
- Channel exceptions: Flipkart (10d hard, no trial), Amazon (100-night), Pepperfry (custom-size non-returnable), Tata CLiQ (doorstep rejection without reason = no refund), Cash-&-Carry (anchor = pickup date). Unverifiable marketplace orders → Ruta approval.
- Charges: shipping 6"/8"/Royale = ₹3000/4000/6000, only on customer error; relocation chair ₹800 / bed ₹1600.

## 5. Delivery issues — `src/data/deliveryIssues.js`

Reportable issue types are **filtered by phase** (DL-01), so most "errors" are simply not offered.

| Issue | Offered in phase(s) | Special handling |
|-------|---------------------|------------------|
| No movement | in_transit | Self-resolves (answer card, no case) **only if** EDD is set, `isOnTime !== false` and today is before EDD (DL-03). Otherwise a case is filed |
| Courier behaviour | in_transit, ofd | Logistics lane |
| Refuse — visibly damaged | ofd | `routesToRto` → shared RTO flow, no case filed directly |
| "I have not received my order" (fake delivery) | delivered_0_10 | 48h investigation clock (`FAKE_DELIVERY_INVESTIGATION_HOURS`); report window 10 days (`isFakeDeliveryReportable`) |
| Delivered shipment incomplete | delivered_0_10, d11_100 | Logistics lane |
| Received twice | delivered_0_10, d11_100 | Logistics lane |

- `getInvestigationClock(openedAt)`: `breached: true` once 48h have elapsed; `hoursRemaining` floors at 0. Anchored to case `createdAt` so it doesn't drift.
- `getProofOfDelivery`: returns `null` if the timeline has no delivered step with a timestamp; defaults `signedBy` to "Signed for at the doorstep" and `address` to `null`.
- Product problems (damaged / defective / wrong item) are **not** delivery issues — they route to Return & Replace.
- Delivery-issue flow: Continue disabled if no SKU is in scope.
- Failed-delivery demo orders in `orders.js` (~L884–938): three failed attempts → "marked undeliverable" → return-to-origin. PRD OT-08: severity must never be masked — LOST / DAMAGED / RETURN_FAILED are shown honestly with a prompt card, never as "Delayed".

## 6. Return-to-Origin sub-flow — `src/data/rto.js`, `src/screens/RtoReplace/RtoReplaceFlow.jsx`

One flow, three origins (RT-01): `cancel` (post-dispatch cancel), `edit` (post-dispatch edit), `damagedRejection`.

| Case | Behaviour |
|------|-----------|
| Replacement with a price increase (`variantChoice.delta > 0`) and payment not confirmed | Primary button becomes **"Pay ₹{delta} to Confirm"** with `aria-disabled` and a no-op click (kept tappable-looking so a payment-link hint can show, rather than a dead `disabled` button) |
| Cancel or damaged-rejection origin | Replacement variant change is never offered ("give me a different one" is edit-only) |
| Intercept fails | Confirm copy warns it'll be returned to the warehouse before refund |
| Tracker labels | Refund: Return to Origin → Return Confirmed → Refund Initiated. Replacement adds Replacement Booked → New Item Dispatched |

## 7. Price match — `src/data/priceMatch.js`, `src/screens/PriceMatch/PriceMatchFlow.jsx`

- Submit disabled until competitor name is non-empty **and** price parses to `> 0` **and** one photo is attached (`max={1}`).
- Approval ladder by price difference: ≤₹2,000 Agent (auto-approve) · ≤₹3,500 Team Lead · ≤₹5,000 Area Manager · above HOD. Only the first tier auto-approves.

## 8. Scheduling — `DeliverySchedule.jsx`, `InstallationSchedule.jsx`, `src/data/clock.js`

- Confirm is disabled when the selection is unchanged.
- A failed delivery has to cycle back through the hub first, so the reschedule window respects that (comment at `DeliverySchedule.jsx` ~L11).
- `bookingWindow({ leadDays = 1, spanDays = 30 })` is relative to today so the picker can't run out of dates. `CalendarPicker` enforces `min`/`max` on the date input.
- `daysSince()` returns `0` for a missing date, an unparseable date (NaN), or a future date — never negative. Phase and rule windows therefore treat bad dates as "just delivered".
- Demo clock is pinned to `DEMO_TODAY = 21 Aug 2026` so fixtures, verdicts and calendars agree. Set to `null` to use the real clock.

## 9. Photos & uploads

- `PhotoUploadTile.jsx`: accepts `image/*` only, multiple selection; truncates silently to `max` (default 5, price-match uses 1); tile disappears once `max` is reached; object URLs are revoked on removal. **No file-size validation, no explicit error for non-image or over-limit files.**
- `Avatar.jsx` and `SupportChat.jsx` also use `accept="image/*"` with no size/format error UI.

## 10. Runtime / infrastructure guards

| Area | File | Behaviour |
|------|------|-----------|
| localStorage unavailable / quota exceeded | `src/data/persist.js` | `safeRead` returns `null`; `safeWrite` and `clearSnapshot` swallow errors. App works but state won't survive a reload |
| Snapshot version mismatch | `persist.js` | `VERSION = 3`; a different version discards the snapshot rather than migrating. Bump on any fixture shape change |
| Non-array snapshot fields | `persist.js` `replaceContents` | Ignored if not an array |
| Clipboard API unavailable | `OrderDetails.jsx`, `OrderCard.jsx`, `ShipmentCard.jsx`, `MultiShipmentOrderCard.jsx`, `SupportChat.jsx` | Copy silently fails; the checkmark still shows on tap |
| `useNavigation` outside provider | `src/navigation/NavigationContext.jsx` | Throws `Error('useNavigation must be used within a NavigationProvider')` — the **only** explicit throw in the codebase |
| Tracker with >4 steps | `src/components/Tracker.jsx` | `MAX_STEPS = 4`; older steps are trimmed |
| Missing entity / timeline | `phases.js` | `getPhase(null)` → `pre_dispatch`; `hasReachedStep` returns `false` when there are no timeline steps |
| Unknown product name | `variants.js` / `isMattressProduct` | `getVariants()` returns nothing → treated as non-mattress / non-accessory |

## 11. Payments, refunds & other PRD error states

- **Payment failure** (FN-03): gateway reconciliation → *not charged* = retry CTA; *charged, no order* = auto-refund tracker entry. Support quick-question exists: "My payment failed but money was deducted" (`src/data/support.js` ~L109).
- Payment statuses in fixtures: `Paid`, `Pending` (COD), `Refunded`.
- **Refund**: baseline = POS captured amount vs gateway; trigger = pickup-done / RTO-AWB confirmed; reflects in 3–5 business days.
- **Warranty** (WR-05): valid claim → inspection job → pass = care guidance; fail = pro-rata calculator.
- Complaint taxonomy for routing (PRD §13): Delivery, Tech-Visit, Refund-Not-Received, Discomfort, Wrong-Size-Received/Ordered, Damaged-delivered, Damaged-Delivery-Rejected→RTO-Replacement, Manufacturing-Defect, Incorrect-Product-Received/Ordered, Payment-Failure, Not-as-Expected, Double-Delivery. Pre-purchase questions are **out of scope**.

---

## Known gaps (no error handling today)

- No network/API failure states (no backend). Verify, submit and booking actions never fail.
- No inline field-level messages except phone and OTP; address/profile/price-match forms only disable the button without saying why.
- No file size/type validation beyond `accept="image/*"`; excess photos are dropped silently.
- No error boundary; a render error would blank the app.
- Rules not modelled: M10–M12, stateful counters (`rp_count`, `rto_count`, …), the ₹20K RP cap, channel-specific policies.
- Pro-rata depreciation and the 48h investigation TAT are provisional/assumed.
