# TSC Post-Purchase Customer Mobile App

| Product | TSC Post-Purchase App :the single customer touchpoint for everything after an order is placed |
| :---- | :---- |
| **Version** | 3.0-B  |
| **Owner** | Shivam (Product) |
| **Status** | WIP |
| **Date** | 2026-07-02 |
| **Audience** | Engineering, Design, Operations, Finance, Customer Success  |
| **Scope note** | **The pre-order / pre-purchase journey (discovery, browsing, cart, checkout, payment, sales, offers, login, lead-gen) is OUT OF SCOPE.** The app begins at *Order Created*. See Scope [§6](#6.-scope). |

**How to read this document.** [§1](#1.-executive-summary)–[6](#6.-scope) set context, scope, and principles.  
 [§7](#7.-domain-model-&-policy-engine-\(the-brain\)) is the domain model and the policy engine (the "brain"). [§8](#8.-functional-requirements) is the functional-requirement catalogue with priorities (P0/P1/P2). [§9](#9.-screen-by-screen-ui-specification) is the screen-by-screen UI specification (wireframe-ready). [§10](#10.-system-architecture)–[15](#15.-risks-&-mitigations) cover architecture, integrations, NFRs, analytics, release plan, and risks. Appendices carry the VOC coverage map, the open product decisions awaiting sign-off, and the glossary.

> **Note for engineering.** Every policy value in this document is **final for build** :build exactly what is written. A small number of these values are defaults on policy points still awaiting formal product/finance sign-off; they are listed in **Appendix B** purely so Product can ratify or change them later. Changing any of them is a **config change, not a rebuild** :see [§7.1](#7.1-core-principle:-the-app-ships-no-policy-logic).

## 1\. Executive summary {#1.-executive-summary}

Everything that happens *after* purchase :tracking, edits, cancellations, returns, replacements, repairs, installation, refunds, warranty, complaints :is handled manually today across calls, email, Freshdesk\*, third-party logistics portals, and POS, guided by tribal agent knowledge and five operating SOPs. It is fragmented, slow, inconsistent, and leaks revenue at every "cancel" and "return."  
The Post-Purchase App consolidates the entire post-order lifecycle into one **App-first, self-service, retention-first** product. Its spine is a **deterministic policy engine**: the app carries no policy logic itself :it renders decisions produced by three server contracts (status projection, action-availability, resolution-verdict). Every outcome is traceable to a named rule; every human touchpoint (approval, technician, agent) is reached through a **context-carrying handover**, so the customer never repeats themselves.

**North-star:** convert post-purchase intents that would otherwise end in cancellation/return/refund into retained revenue (keep, expedite, edit, repair, part-replace, replace), while making self-service the default resolution path.

## 2\. Problem statement & current pain points

Customers must navigate multiple disconnected touchpoints to resolve post-order needs. Agents apply policy inconsistently from memory; retention is ad-hoc; approvals and refunds are slow; and "cancel"/"return" are the path of least resistance :directly leaking revenue a cheaper lever could have retained.

| Pain point | Customer impact | Business impact |
| :---- | :---- | :---- |
| Fragmented touchpoints | Juggles app, email, phone, courier portals, store | High inbound volume, redundant agent work |
| No real-time visibility | Unaware of status/ETA/issue progress | "Where is my order?" contacts dominate |
| Manual cancel/return | Multi-step, agent-dependent, no self-serve | High cost-per-contact, slow resolution, revenue leak |
| No case dashboard | Can't track raised issues | Duplicate tickets, poor CSAT |
| Disconnected technician scheduling | Unaware of assignment/TAT | Missed installs, repeat visits |
| Inconsistent refund comms | No clarity on timeline/status | Escalations, chargebacks, disputes |
| Policy applied from memory | Different answer per agent | Revenue leak, unfair outcomes, no audit trail |

**Root cause:** the absence of a unified post-order platform with a deterministic policy layer over OMS, WMS, Logistics, Technician Ops, CRM, and Finance. Every action requires manual cross-team co-ordination.

## 3\. Goals & objectives

- **G1** :One destination to manage all post-purchase needs.  
- **G2** :Real-time status across the whole post-order lifecycle.  
- **G3** :Self-service resolution as the default for the most frequent request types.  
- **G4** :Retention-first: deflect cancel/return/refund into the cheapest lever that solves the need.  
- **G5** :Deterministic, auditable policy :replace agent memory with a rules engine.  
- **G6** :Reach humans only when a rule requires it, always with full context.  
- **G7** :Architecture that extends to full case coverage → real OMS integration → internal agent app, without rework.

## 4\. Success metrics (KPIs) {#4.-success-metrics-(kpis)}

| Theme | Metric | Direction |
| :---- | :---- | :---- |
| Retention | Cancel-intent → retained %; Return-intent → repair/replace share (vs return/refund) | ↑ |
| Self-serve | First-contact resolution %; % zero-human-touch cases; app containment | ↑ |
| Speed | Median time-to-resolution per family; approval SLA adherence | ↓ / ↑ |
| Trust | Refund-clock adherence; fake-delivery investigation SLA; CSAT/NPS 7d & 30d | ↑ |
| Cost | Avg cost-of-remedy per case; RP/RPEX/RPCX/refund mix | optimize |
| Adoption | MAU, % post-order actions self-served in-app vs contact centre | ↑ |

## 5\. Personas

| Persona | Description | Primary use cases |
| :---- | :---- | :---- |
| **Direct consumer** | Bought online (website), store  | Tracking, edits, cancel, return/replace, technician, refund, Warranty registration & claims, technician scheduling |
| **B2B / GST customer** | Business buyer needing GST invoice / billing edits | GST update, invoice, order modification |
| **Warranty claimant** | Within-warranty customer reporting a defect | Warranty claim, inspection/technician, replacement |
| **Services** | Maintenance & Repair  | Repair, Refurbish, Uninstallation / Reinstallation, Maintenance Servicing (Deep cleaning, Oiling, Waxing, Varnish etc) |
| **Premium customer (≥₹1L)** | High-value order, white-glove entitlements | No-questions replacement, 48h install, RM, proactive updates |

## 6\. Scope {#6.-scope}

### 6.1 In scope (post-order lifecycle :begins at *Order Created*)

Order tracking & status · order modification (address, GST, contact, delivery-date/slot, delivery instructions, hold/unhold) · cancellation with retention · delivery issues (delay, dispatch-delay, fake-delivery, fake-RTO, no-movement, missing, double, courier behaviour, order-split (shipments), reverse-pickup-delayed) · returns / replacements / repairs (the remediation engine incl. RP / RPEX / RPCX) · installation & technician service (schedule, reschedule, dismantle, rearrange, repair, Milestone based tracking) · refunds, price-match to prevent return, payment-failure reconciliation · warranty\* registration & claims · complaints (structured, category-routed) · proactive outreach (OOS, COD, delay, pending pickup/visit) · context-carrying handover to human · spam auto-handling · invoice/GST documents.  
FLOWS: [https://drive.google.com/file/d/1jN71w4ERZjypfPKSBg33H2T7TMMFGaul/view?usp=sharing](https://drive.google.com/file/d/1jN71w4ERZjypfPKSBg33H2T7TMMFGaul/view?usp=sharing) 

### 6.2 Out of scope

- **The entire pre-order / pre-purchase journey** :product discovery, search, PDP, cart, checkout, payment for new orders, sales leads, marketing/offers, promotions, store information, website/account login. Where such a contact arrives, the app offers at most a "this is a sales/website question → here's how to reach the store" hand-off; it does not resolve it.  
  - *In-scope exceptions commonly mis-tagged as pre-purchase:* **warranty registration(automatic)** and **post-purchase product/care information** for an existing order.  
- New-order placement & checkout · payment-gateway integration for new purchases · store/retailer B2B portal · warehouse/inventory operations · the agent-facing CRM console (integration only in this phase; the agent app is Phase 4).

### 6.3 The lifecycle boundary

Stages 1–7 (discovery → cart → checkout → payment) are **out of scope**. The app becomes the primary interface from **Stage 8 :Order Created** onward:

| \# | Stage | System state | In app? |
| :---- | :---- | :---- | :---- |
| 1–7 | Discovery → Cart → Checkout → Payment | (pre-order) | ✗ out of scope |
| 8 | **Order Confirmation** | Order Created | ✓ **APP BEGINS** |
| 9–10 | Fulfilment / Warehouse | Processing → Packed | ✓ track |
| 11–12 | Logistics Handover / Movement | Dispatched → In Transit | ✓ track |
| 13 | Delivery Prep | Out for Delivery | ✓ track \+ refuse-at-door |
| 14 | Delivery | Delivered | ✓ full actions unlock |
| 15+ | Post-Delivery (Installation) | Post-order lifecycle active | ✓ all capabilities |
| 15+ | Warranty & Services ( Uninstall/Re-install, Repair) & Support (Warranty Info, Care manual) | Post-order lifecycle active | ✓ all capabilities |

### 6.4 Assumptions

- Customer identity/auth is provided by the host app shell (OTP \+ JWT).  
- Order/shipment/case data is available via OMS/WMS/CP/Tech/CRM integrations (Phase 3); Phase 1–2 may use a mock service layer with identical contracts.  
- The policy values in this document are the build spec. A few sit on points still awaiting formal product/finance sign-off (Appendix B); they are built as written and stand until product rules otherwise.

## 7\. Domain model & policy engine (the brain) {#7.-domain-model-&-policy-engine-(the-brain)}

### 7.1 Core principle: the app ships no policy logic {#7.1-core-principle:-the-app-ships-no-policy-logic}

All decisions come from three pure contracts. The UI only renders their output. This is a hard architectural rule: **no policy constant (window, charge, cap, eligibility) may be hardcoded in a screen.** A policy change must be a data/config change, never a UI code change. (This is also what makes the Appendix-B decisions cheap to change.)

| Contract | Input | Output | Powers |
| :---- | :---- | :---- | :---- |
| **C1 Projection** | raw system-status stream \+ shipment legs | {phase, display\_status, severity, timeline\[\]} | Order-360, status cards, notifications |
| **C2 Actions** | order (state, items, counters, flags) | \[{action\_id, enabled, variant, reason\_if\_disabled}\] | which actions render & why disabled |
| **C3 Verdict** | {order\_line, intent, reason, answers, evidence, env} | {levers\[\], denied\[\], charges, evidence\_required, approvals\[\], state\_writes\[\], trace\[\]} | options/deny screens, gates, execution plan |

**Render pipeline:** courier/WMS/tech events → OMS state machine → C1 → screen. On user intent → C3 → options. Screen \= template(id) rendered from C1 \+ C2 \+ C3.

### 7.2 Retention ladder (the product's organizing logic)

Levers are always offered **cheapest-first**:  
> **Keep as-is → Expedite/Hold/Reschedule → Edit/Change product → Repair → Part-replace → Replace → Return/Refund (last resort).**  
Cancel and Return are **never** first-class buttons; they are outcomes reached only after the ladder is exhausted. If any flow surfaces Cancel/Return before the ladder, it is a defect.

### 7.3 Order states & phases

29 order states (S01–S29) projected to **7 UI phases** used by the action matrix: pre\_dispatch · in\_transit · ofd · delivered\_0\_10 · d11\_100 · post\_100\_warranty · terminal.

### 7.4 Entities

Order → OrderLine\[\] · Shipment\[\] · Case\[\] · Job\[\] · Refund\[\].

**Stateful counters** (persisted on the order line, enforced by the engine :never agent memory): rp\_count(≤2) · rto\_count(≤2) · part\_rp\_count \+ first\_part\_rp\_day (60-day clock) · first\_attempt\_denied · damaged\_delivery\_count · topper\_provided · premium · channel · forgo\_pickup · policy\_anchor\_date · committed\_date \+ miss\_count.

### 7.5 The Case object (contract between the customer app and the future agent app)

id · order\_id · line\_id · family · bucket · intent · reason · who\_erred · tier(T1/T2/T3/T3+Sup/Service) · lane(logistics/tech/returns/refunds/general) · rule\_trace\[\] · verdict · offered\[\] · evidence\[\] · answers · created\_at · status(self\_resolved|booked|handover|open). Every escalation, booked action, and self-resolution writes one. Designed once, now, so Phase 4 plugs in with zero rework.

### 7.6 Policy engine :inputs

11 dimensions: product category · reason · **who-erred** · days-since-anchor · install-state · tech-verdict · approval-state · order-value · counters · channel · segment.

### 7.7 Mattress rules (M) {#7.7-mattress-rules-(m)}

| Rule | Condition | Verdict |
| :---- | :---- | :---- |
| M1 | damaged / defect · 0–100d | Replace/Return ✅ · no ship charge · images requested |
| M2 | wrong size, **TSC** erred · 0–100d | Replace/Return ✅ · no ship |
| M3 | wrong size/model, **customer** erred · 0–10d | Replace/Return ✅ · ship 6"₹3000 / 8"₹4000 / Royale₹6000 (waiver=approval) |
| M4 | wrong size/model, **customer** erred · 11–100d | **Retain first → insist → allow with charges** |
| M5 | discomfort / not-as-expected · 0–100d | Replace/Return ✅ via **retention ladder** (§7.11) |
| M6 | sagging\>1in / bump · post-100d in warranty | **Pro-rata** · images mandatory · depreciation schedule provisional (linear 10%/yr; Finance to confirm) |
| M7 | wrong model received (TSC) · 0–100d | Replace/Return ✅ · no ship |
| M8–M12 | smell (ventilate ≤2d / RP 3–4d+) · ≤0.5" tolerance deny · zipper-cover replace · out-of-window deny→exception |  |
| **Inv** | No manager approval; **no tech visit except** measurement (wrong-size-received) \+ sagging verification; ship charge only on customer error |  |

### 7.8 Non-mattress rules (N) {#7.8-non-mattress-rules-(n)}

| Rule | Condition | Verdict |
| :---- | :---- | :---- |
| N1 | damaged · before install · 0–10d | Replace ✅ no tech · Return ✅ \+manager · images mandatory |
| N2 | damaged · after install · 0–10d | **tech mandatory** → part-RP first · Return after tech+manager |
| N3 | wrong order (TSC) · before install · 0–10d | part-RP first · Return \+manager |
| N4 | wrong size/color (customer) · before install · 0–10d | part-RP first · Return \+manager |
| N5 | defect · after install · 0–10d | tech mandatory → part-RP first · Return after tech+manager |
| N6 | discomfort · after install · 0–10d | tech mandatory → part-RP first · **Return ❌** |
| N7 | discomfort · 11d–2yr | Replace ❌ Return ❌ (**inform-only** honesty screen) |
| N8 | defect / install issue · 11d–2yr | tech mandatory · **part-RP only · after 2 part-RPs → full-RP ≤60d** · Return ❌ |
| N9–N11 | refuse part-RP ≤10d → full RP · part unavailable → Return+refund · **damaged twice → Return+refund** |  |
| **Inv** | Ship never charged · **every Return needs manager approval** · post-install ⇒ tech first (except N7) · no reverse pickup of damaged parts · 26" sofa-seat deny-gate |  |

### 7.9 Accessories rules (A) {#7.9-accessories-rules-(a)}

| Rule | Condition | Verdict |
| :---- | :---- | :---- |
| A1 | damaged/quality · 0–10d | Replace ✅ **no pickup** · Return ❌ |
| A2/A3 | wrong size (any) / wrong model (TSC) · 0–10d | Replace no-pickup · Return ❌ |
| A4 | any concern · 10–100d · order **\>₹30K** | Replace no-pickup (exceptional) |
| A4b | any concern · 10–100d · order **≥₹50K** | Return with refund **cap ₹5,000** |
| A5/A6 | else 10–100d → Deny · discomfort any time → Deny |  |
| **Inv** | never ship charges · never images · **never pickup** (no reverse AWB) |  |

*Accessories reporting window \= 10 days.*

### 7.10 Evidence matrix {#7.10-evidence-matrix}

| Context | Images | Source |
| :---- | :---- | :---- |
| Mattress, all reasons | optional | customer |
| Mattress sagging/bump warranty (M6) | mandatory | customer |
| Non-mattress pre-install (N1,N3,N4) | mandatory | customer |
| Non-mattress post-install (N2,N5,N8) | mandatory | **technician** (app waits for Job) |
| Non-mattress discomfort (N6,N7) | optional | — |
| Accessories (A\*) | never | — |

### 7.11 Retention ladder (inside M5 :mattress discomfort)

posture-correction education → topper offer (firm/soft; not Snowtec; not Flipkart) → topper declined → replacement offer → replacement declined → return (last). State: topper\_provided.

### 7.12 Replacement modes {#7.12-replacement-modes}

| Mode | Behaviour | Gate | Order creation |
| :---- | :---- | :---- | :---- |
| **RP** | pickup old → QC → ship replacement | none | **sequential** (after pickup/QC) |
| **RPEX** | new delivered & old collected same trip | none · POS-only · Fynd-only | **parallel** :preferred when Fynd (best CX) |
| **RPCX** | new delivered now, old collected later | Director approval · manual · Fynd-only · return-first | **parallel** |

### 7.13 Caps & terminals {#7.13-caps-&-terminals}

rp\_count=2 → no further RP; **refund only as a supervisor-approved final resort** · rto\_count\>2 → cancel+refund · part\_rp\_count=2 (≤60d) → full-RP unlock · damaged\_delivery\_count=2 → Return+refund · complimentary ≤5% order value · miss orders ≤₹1,500.

### 7.14 Channel overlays {#7.14-channel-overlays}

Flipkart \= 10d hard, no trial, no discomfort, upgrade-only replacement ≤3, no RPCX/RPEX, Flipkart refunds · Amazon \= 100-night trial, platform refunds, 24h SLA loop · Pepperfry \= 7d, custom-size non-returnable, CRM-only repurchase · Tata CLiQ \= 7d/at-delivery, doorstep rejection w/o reason \= no refund · Cash-&-Carry \= anchor is pickup date · unverifiable marketplace orders → Ruta-team approval before any remediation.

### 7.15 Premium overlay (order ≥ ₹1L) {#7.15-premium-overlay-(order-≥-₹1l)}

Immediate replacement, no questions (evidence relaxed); install ≤48h of delivery; welcome call; proactive stage updates; RM assignment; 7d/30d surveys; SLA-miss auto-escalation.

### 7.16 Money & approvals {#7.16-money-&-approvals}

**Difference-amount ladder (RP):** ₹0–1.5K Agent · ₹1.5–3K Manager/AM (+OTP) · ₹3–10K Director (+OTP) · ₹10–20K COO · **\>₹20K cannot book** (evidence pack). The ₹20K cap applies to the **difference amount**, not cart value. **Price-match:** ≤₹2K Agent · ₹2–3.5K TL · ₹3.5–5K AM · \>₹5K HOD. **Charges:** ship 6"/8"/Royale \= ₹3000/4000/6000; relocation chair ₹800 / bed ₹1600 (prepaid); reimbursements NSL ₹500/₹800, failed-delivery ₹500/₹1000 (invoice required). **Refund:** baseline \= POS captured amount vs gateway; trigger \= **pickup-done** / RTO-AWB confirmed; reflect 3–5 business days.

### 7.17 TAT master (selected)

Reverse pickup metro \<3d / non-metro \<6d / EDL \<10d · pickup→origin ≤14d · inspection 48h · **fake-delivery investigation 24–48h → auto-replacement on breach** · premium install ≤48h · tech assignment ≤24h of delivery · standard install 48h (EDL 5d) · refund reflect 3–5 business days.

## 8\. Functional requirements {#8.-functional-requirements}

Priority key: **P0** \= MVP/launch-blocking · **P1** \= fast-follow · **P2** \= enhancement. Every flow terminates in exactly one of: *self-resolved · action booked (with tracker) · handover to human (context carried)*. Entry pattern everywhere: **Home → pick order → "What can we help with?"** No feature exposes Cancel or Return as a top-level entry.

### 8.1 Order tracking & status (C1) {#8.1-order-tracking-&-status-(c1)}

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| OT-01 | Display a complete order-journey timeline with timestamps per milestone (from C1) | P0 |
| OT-02 | Show real-time logistics status via courier APIs (ClickPost) keyed by AWB | P0 |
| OT-03 | Display EDD and update it on delay; show per-shipment EDD for split orders | P0 |
| OT-04 | Show delivery-executive name/contact when Out for Delivery | P1 |
| OT-05 | Milestone view when the delivery executive is en route | P0 |
| OT-06 | Push notifications at Dispatched / OFD / Delivered and on every notify=true status transition | P0 |
| OT-07 | Show delivery-confirmation details (PoD: signed-by, address, timestamp, OTP/image if present) | P0 |
| OT-08 | Severity never masked :LOST/DAMAGED/RETURN\_FAILED shown honestly \+ prompt card, never "Delayed" | P0 |

### 8.2 Order modification {#8.2-order-modification}

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| OM-01 | Address change only for pre-dispatch orders; serviceability validated before confirm | P0 |
| OM-02 | GST update (GSTIN, company, billing address) before invoice generation; **GST-invoice re-issue** after | P0 / P1 |
| OM-03 | Contact-detail update (phone/email) for active orders | P0 |
| OM-04 | Delivery date/slot \+ delivery-instructions change for pre-dispatch | P1 |
| OM-05 | Hold (pause dispatch) / Unhold (resume) requests | P1 |
| OM-06 | **Editability gate (C2):** store-order ∧ ≤24h ∧ nothing dispatched ∧ status∈{Pending,Assigned,Confirmed} ∧ customer OTP; website orders \= cancel+re-place | P0 |
| OM-07 | Post-dispatch modification executes via **RTO-Replacement sub-flow** ([§8.11](#8.11-rto-replacement-:shared-sub-flow)) with payment-link step only if a difference exists | P0 |
| OM-08 | Multi-shipment: if any shipment dispatched, lock order-level edit (offer per-shipment where supported) | P1 |
| OM-09 | Confirmation notification once a modification is applied | P0 |

###  8.3 Cancellation → retention ladder (flagship) {#8.3-cancellation-→-retention-ladder-(flagship)}

BE Decision(?) : Via UC\<\>CP, Shipment can only be

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| CX-01 | Never present "Cancel" as a first action :ask **why** first (mandatory reason capture) | P0 |
| CX-02 | Reason-specific deflection: *taking too long* → EDD \+ Expedite/Hold/revised-ETA; *changed mind on product* → Edit (if eligible) else Replace; *found cheaper* → Price-match; *don't need it* → soft retention (discount/hold) | P0 |
| CX-03 | Pre-dispatch cancel → instant OMS/POS cancel \+ auto-refund initiated ≤24h | P0 |
| CX-04 | Post-dispatch cancel → **RTO-intercept attempt** (honest "not guaranteed") → RTO-Replacement/refund sub-flow | P0 |
| CX-05 | Show refund amount, method, and expected timeline on confirmation | P0 |
| CX-06 | Refund triggered only after RTO completion for post-dispatch cancels | P0 |
| CX-07 | Real-time refund-status tracker | P1 |
| CX-08 | Write a Case (VOC: Before/After Dispatch / Retained) for every cancellation outcome | P0 |
| CX-09 | Cancel button reachable only after the reason-specific retention step | P0 |

### 8.4 Delivery issues {#8.4-delivery-issues}

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| DL-01 | Reasons **status-filtered** (e.g. "marked delivered, not received" only if status=Delivered) | P0 |
| DL-02 | Auto-audit: history, EDD breach, manifest reconciliation (missing), duplicate dispatch (double), order-split | P0 |
| DL-03 | Self-resolvable (before min-EDD, on-time) → answer card, FCR, no case | P0 |
| DL-04 | Qualifying issue → Logistics case with auto-attached evidence bundle | P0 |
| DL-05 | **Fake-delivery / fake-RTO:** show PoD evidence → open **24–48h investigation** with **auto-replacement-on-breach** (visible timer) | P0 |
| DL-06 | Missing/double/courier-behaviour/no-movement → correct VOC \+ Logistics routing | P0 |
| DL-07 | Reverse-pickup-delayed surfaced on the Execution Tracker with pickup-TAT clock (not a new case) | P1 |

### lk8.5 Returns / replacements / repairs (remediation :the heart) {#lk8.5-returns-/-replacements-/-repairs-(remediation-:the-heart)}

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| RR-01 | Intake: item \+ reason (damaged/defect/wrong-size-received/wrong-size-ordered/wrong-model/incorrect-product/discomfort/not-as-expected/sagging/smell/missing); engine derives category, days-since-anchor, **who-erred**, install-state | P0 |
| RR-02 | Eligibility & verdict from **C3 rule tables** (M/N/A, [§7.7](#7.7-mattress-rules-\(m\))–[7.9](#7.9-accessories-rules-\(a\))) :no window/rule hardcoded in UI | P0 |
| RR-03 | **Evidence gate** per matrix ([§7.10](#7.10-evidence-matrix)): images required/optional, customer- vs technician-sourced; block submit if missing | P0 |
| RR-04 | **Tech gate** where required (non-mattress post-install damage/defect/discomfort; wrong-size-received measurement; sagging verification) → book inspection → resume on verdict | P0 |
| RR-05 | **Retention-ordered levers** from C3: care/topper → repair/part-RP → replacement → return (last); each shows free-vs-charge (whose-fault) \+ approval chip | P0 |
| RR-06 | **Replacement-mode auto-selection** (RP/RPEX/RPCX, §[7.12](#7.12-replacement-modes)) from {Fynd?, value, same-vs-other, approval, channel}, explained in one line | P0 |
| RR-07 | Price-difference handling: collect before booking / refund after new item delivered | P0 |
| RR-08 | **Execution tracker** :shipment-legs (pickup→QC→swap→refund) as honest steps; per-mode order-creation (RP sequential, RPEX/RPCX parallel) | P0 |
| RR-09 | Manager-approval workflow for every non-mattress Return; refund after pickup (bank-detail collection if missing) | P0 |
| RR-10 | Enforce caps/counters ([§7.13](#7.13-caps-&-terminals)) in the engine (2-RP, 2-RTO, part-RP 60-day clock, damaged×2→refund) | P0 |
| RR-11 | Channel & Premium overlays ([§7.14](#7.14-channel-overlays)–[7.15](#7.15-premium-overlay-\(order-≥-₹1l\))) modify eligibility, windows, modes, refund executor | P1 |

### 8.6 Technician services {#8.6-technician-services}

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| TS-01 | DIY vs non-DIY eligibility check before scheduling; mattress → guides (no tech except measurement/sagging) | P0 |
| TS-02 | Auto-create technician job ≤24h of delivery for eligible products | P0 |
| TS-03 | Manual job creation; non-serviceable pincode → local-technician \+ invoice reimbursement (NSL) | P1 |
| TS-04 | Date \+ time-slot picker | P0 |
| TS-05 | Live technician tracking (Updates & milestones \+ ETA countdown) | P1 |
| TS-06 | Enforce TAT (48h standard / 5d EDL) | P0 |
| TS-07 | Auto-escalate to Tech team when outside TAT (VOC: Delayed Visit) \+ apology \+ new slot | P0 |
| TS-08 | Cancelled visit → auto-create new job (VOC: Rearrange Tech); dismantle/relocation chargeable (chair ₹800/bed ₹1600, pay-first) | P0 |
| TS-09 | Technician rating on completion | P2 |
| TS-10 | **Technician-initiated case origin** :defect found at install creates a remediation case without customer re-intake | P1 |

### 8.7 Warranty {#8.7-warranty}

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| WR-01 | Display warranty status, validity dates, coverage per product | P0 |
| WR-02 | Register warranty (invoice-as-proof fallback) | P1 |
| WR-03 | Validate coverage before accepting a claim | P0 |
| WR-04 | Claim submission with issue-type \+ mandatory evidence upload | P0 |
| WR-05 | Valid claim → inspection Job → pass=care guidance; fail=**pro-rata** calculator → replace/return at pro-rated value, or part-RP (N8). *Depreciation schedule provisional (linear 10%/yr); show value as "provisional" until Finance confirms :[Appendix B.](#appendix-b-:open-product-decisions-\(for-sign-off\))* | P0 |
| WR-06 | Claim-status tracking in My Cases | P0 |

### 8.8 Finance :refunds, price-match, payment-failure {#8.8-finance-:refunds,-price-match,-payment-failure}

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| FN-01 | Refund tracker: stage chain (triggered→initiated→ARN→credited) \+ clock from trigger (pickup-done); breach → "raise it" → Refunds queue | P0 |
| FN-02 | Price-match: capture proof → verdict \+ approval ladder (≤₹2K Agent … \>₹5K HOD) → credit or complimentary | P1 |
| FN-03 | **Payment-failure lane:** gateway reconciliation → *not charged* \= retry CTA; *charged, no order* \= auto-refund tracker entry | P1 |
| FN-04 | Refund method \= original payment; cash → bank-detail capture with beneficiary-name match | P0 |

### 8.9 Complaints & support

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| CM-01 | Structured complaint capture, category-routed to the correct lane (Logistics/Tech/Returns/Refunds/General) | P0 |
| CM-02 | Enforce FCR vs Non-FCR classification per rules | P0 |
| CM-03 | Unique case reference per complaint ([§9.10](#9.10-case-reference-conventions) conventions) | P0 |
| CM-04 | My Cases dashboard (open \+ resolved) with real-time CRM status sync | P0 |
| CM-05 | Status-update notifications at each resolution milestone | P0 |
| CM-06 | Resolution SLA: FCR same interaction; Non-FCR 24–48h | P0 |

### 8.10 Handover seam :"Talk to a human" (first-class primitive)

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| HO-01 | Any flow can escalate; escalation packages the full Case (order, intent, reason, whose-fault, rule trace, evidence, what was offered) | P0 |
| HO-02 | Route by lane: Logistics · Tech/Installation · Returns/Replacement (Warriors) · Refunds · General | P0 |
| HO-03 | Customer never re-asked anything already captured; case-dedup handles "already spoke"/"call transfer" artifacts | P0 |

### 8.11 RTO-Replacement :shared sub-flow {#8.11-rto-replacement-:shared-sub-flow}

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| RT-01 | Single named sub-flow (return-to-origin → replacement/refund) reused by post-dispatch edit ([8.2](#8.2-order-modification)), not-retained post-dispatch cancel ([8.3](#8.3-cancellation-→-retention-ladder-\(flagship\))), and damaged-delivery-rejection | P0 |
| RT-02 | Steps: RTO request → (payment link if difference) → RTO confirmed → OM books replacement OR Refunds processes refund | P0 |

### 8.12 Proactive (system-initiated) & spam {#8.12-proactive-(system-initiated)-&-spam}

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| PR-01 | OMS detectors raise one-tap prompt cards on Home: OOS → alternative SKU/wait/cancel; COD confirm; delay → acknowledge \+ new EDD; pending pickup/visit → reschedule | P1 |
| PR-02 | EDD-breach commit-timer (open → pending → auto-reopen on delivery → confirm-close) | P1 |
| PR-03 | Spam (test/blank/irrelevant) auto-closes without a customer-facing flow | P1 |

### 8.13 Documents & post-purchase info

| ID | Requirement | Pri |
| :---- | :---- | :---- |
| DOC-01 | Download invoice / GST invoice | P0 |
| DOC-02 | Self-serve info for an existing order: 100-nights T\&Cs, size confirmation, care, warranty info | P1 |

## 9\. Screen-by-screen UI specification {#9.-screen-by-screen-ui-specification}

iOS-native / Material pattern: card layouts, status-colour coding, timeline components. Each flow lists its screens (key elements \+ business rules) and a **Screen · User-Action · System-Response · Outcome** table. Ineligible actions render greyed **with the reason** (never silently hidden, except policy-hidden e.g. Return pre-delivery).

### 9.1 Home (My Orders) & Order-360

**Screen 1 :My Orders:** order cards (image, name, ID, date, status badge) in reverse-chronological order; status badges Delivered(green)/In-Transit(blue)/Processing(amber)/Cancelled(red); filter chips All·Active·Delivered·Cancelled; proactive prompt cards surface on top. **Screen 2 :Order-360:** full metadata (ID, product, amount, payment status, address); C1 timeline; **"What can we help with?"** intent list (plain language) :*not* raw Cancel/Return tiles; C2 renders eligible actions, greyed with reasons where blocked.

| Screen | User action | System response | Outcome |
| :---- | :---- | :---- | :---- |
| My Orders | Open app | Fetch orders from OMS; apply filters | Order list |
| My Orders | Tap filter | Filter by status | Filtered view |
| Order-360 | Tap order | Load metadata; C1 timeline; C2 action eligibility | Hub opens |
| Order-360 | Tap intent | C2 validates → route to flow | Flow opens |

### 9.2 Cancel → retention ladder

**S1 Order-360 (entry):** intent "I want to cancel" (never a red Cancel button up front). **S2 Reason:** mandatory reason; reason-specific retention content (expedite/hold, edit/replace, price-match, discount); CTAs *Keep My Order* (primary) and *Continue*. **S3 Confirm:** refund summary (amount, method, timeline), "what happens next" (pre- vs post-dispatch). **S4 Success:** case ref (e.g. CXL-2025-00441), refund timeline, Track-Refund CTA.

| Screen | User action | System response | Outcome |
| :---- | :---- | :---- | :---- |
| Reason | Pick "taking too long" | Show real EDD \+ Expedite/Hold | Often retained (FCR) |
| Reason | Pick "found cheaper" | Route to Price-match | Retained via match |
| Confirm | Cancel :pre-dispatch | POS cancel \+ auto-refund ≤24h | Cancelled, refund triggered |
| Confirm | Cancel :post-dispatch | RTO-intercept → RTO-Replacement sub-flow | RTO in progress |

### 9.3 Track order

**S1 entry:** AWB, courier, EDD, status card. **S2 Live tracking:** milestone+ executive card (name/AWB/ETA) \+ milestone timeline; Call-Executive when OFD. **S3 Delivered:** PoD (address/signed-by/timestamp); Report-Missing / Report-Damage.

| Screen | User action | System response | Outcome |
| :---- | :---- | :---- | :---- |
| Tracking | View before min-EDD | Answer card, query only | FCR |
| Tracking | Delay detected | Escalate Logistics | VOC: Delayed (Non-FCR) |
| Delivered | Report Missing | Create investigation → Logistics | Case (Non-FCR) |
| Delivered | Fake delivery | PoD shown → 24-48h investigation \+ auto RP on breach | Case \+ timer |

### 9.4 Return & Replace (remediation)

**S1 Reason:** policy-eligibility banner (rendered from C3, not hardcoded); reason options; Continue validates eligibility. **S2 Guided Qs \+ Evidence:** rule-driven questions; evidence upload per matrix (blocks submit if missing); tech-gate interstitial where required. **S3 Options:** rendered **only** from the C3 verdict :retention-ordered levers, free/charge tags, mode explanation ("we'll bring the new one and take the old one in the same visit"), gate chips ("needs technician confirmation", "needs approval :usually \<4h"). **S3-deny:** honest deny \+ alternatives; M4 insist-CTA; N7 inform-only. **S4 Execution tracker:** pickup→QC→swap→refund legs.

| Screen | User action | System response | Outcome |
| :---- | :---- | :---- | :---- |
| Reason | Choose reason | C3 verdict; outside window → deny screen | Options or deny |
| Evidence | Upload \+ submit | Validate matrix; if tech-gate → book inspection | Options or tech wait |
| Options | Pick lever | Build execution plan (mode-specific) | Booked \+ tracker |
| Options | Approval-gated lever | Approval-pending screen → resolve → refresh | Booked on approval |

### 9.5 Technician visit

**S1 Hub:** Schedule / Reschedule / Track / Cancel; current-job card. **S2 Schedule:** date chips \+ slots; TAT reminder. **S3 Track (live):** milestone & updates+ ETA; Call/Reschedule; outside-TAT auto-escalation. **S4 Completed:** summary \+ rating.

| Screen | User action | System response | Outcome |
| :---- | :---- | :---- | :---- |
| Hub | Schedule | DIY check → guide, or job create | Scheduled / DIY |
| Track | Within TAT | Query only | Monitoring |
| Track | Outside TAT | Ticket to Tech team, 24h target | VOC: Delayed Visit |
| Completed | Rate | Store rating; resolve | Resolved |

### 9.6 Warranty

**S1 Overview:** coverage banner \+ details; Register / Raise-Claim; active claims. **S2 Claim:** issue type \+ mandatory evidence. **S3 Submitted:** ref (e.g. WTY-2025-1102); validation → service request → outcome (inspection/part-RP/full-RP/pro-rata).

### 9.7 Modify order

**S1 Hub:** pre-dispatch banner; Address / GST / Contact / Delivery-date; Hold/Unhold. **S2 Edit sub-screen:** current value \+ form; validate. **S3 Confirmed:** ref; steps (Received → Eligibility → Applied); email.

| Screen | User action | System response | Outcome |
| :---- | :---- | :---- | :---- |
| Hub | Post-dispatch edit | Block inline → offer RTO-Replacement | RTO path |
| Edit | Pre-dispatch, price-diff | Payment link → apply on payment | Applied |
| Hub | Hold/Unhold | OM pause/resume; inform store | Resolved (FCR) |

### 9.8 Complaint

**S1 Category:** structured categories → distinct lane/SOP. **S2 Describe \+ Upload:** pre-filled category \+ order ref; evidence. **S3 Case created:** ref (e.g. CMP-2025-9023); SLA timeline; Track → My Cases.

### 9.9 My Cases (dashboard)

List of open/resolved cases with lane, status, SLA chip, and thread; real-time CRM sync; the agent view (Phase 4\) reads the same Case object.

### 9.10 Case-reference conventions {#9.10-case-reference-conventions}

CXL-YYYY-NNNNN cancellation · RR-YYYY-NNNNN return/replace · CMP-YYYY-NNNNN complaint · WTY-YYYY-NNNNN warranty · TEC-YYYY-NNNNN technician · RFD-YYYY-NNNNN refund.

## 10\. System architecture {#10.-system-architecture}

- **Client:** mobile-first app (iOS/Android/responsive web), thin renderer over C1/C2/C3; contains zero policy constants.  
- **Policy service:** C1/C2/C3 as server contracts over the rules dataset \+ stateful counters; every verdict emits a rule trace and writes a Case.  
- **Middleware/OMS:** order state machine (S01–S29), event catalogue, notification engine, counter persistence, approval registry.  
- **CRM abstraction:** ticketing behind an interface (Freshdesk today → Flocall later) so the customer app never changes when the backend swaps.  
- **Idempotency:** all writes carry client tokens; offline-tolerant with last-known projection.

## 11\. System integrations & dependencies

| System | Integration | Data / actions | Owner |
| :---- | :---- | :---- | :---- |
| **OMS** (order engine) | Bi-directional API | Order status, customer, modification, cancellation, hold/unhold, counters, C1/C2/C3 | Eng :OMS |
| **Unicommerce (WMS)** | Read \+ write | Packing status, multi-warehouse allocation/stock/hold, return pickup scheduling | Eng :WMS |
| **ClickPost (courier aggregator)** | Read (webhooks) | AWB tracking, delivery status, EDD, RTO/return/exchange legs, forgo-pickup flag | Logistics |
| **Technician App** | Bi-directional API | Job create/assign, technician location, verdict, completion, TAT | Tech Ops |
| **CRM (Freshdesk→Flocall)** | Bi-directional API | Case create/status, escalation routing, agent notes, VOC tagging | Customer Success |
| **Refunds/Finance engine** | Write API | Refund initiation/status, gateway reconciliation, bank-detail capture | Finance |
| **POS (custom)** | Write API | Pre-dispatch cancel, replacement booking, complimentary order, C\&C pickup-date anchor | Operations |
| **Fynd serviceability** | Read API | Pincode serviceability driving RPEX/RPCX eligibility | Logistics |
| **Push notification service** | Write API | Milestone alerts, case updates, technician status, refund confirmations | Eng :Platform |

**Sequencing dependency:** system-naming reconciliation (which legacy systems the OMS replaces) must be resolved before deep OMS integration.

## 12\. Non-functional requirements

| Category | Requirement | Target |
| :---- | :---- | :---- |
| Performance | App-launch → My Orders load | \< 2s on 4G |
| Performance | Tracking-data refresh latency | \< 30s from logistics update |
| Availability | Uptime (excl. planned maintenance) | ≥ 99.5% monthly |
| Scalability | Concurrent active sessions | 10,000+ |
| Security | Authentication | OTP login \+ JWT session management |
| Security | Data in transit | TLS 1.2+ on all API calls |
| Security | PII at rest | Encrypted; no PII in logs; evidence stored as access-controlled attachments |
| Auditability | Every rendered decision | Carries a rule trace; writes a Case; policy changes are config, not code |
| Compatibility | iOS / Android | iOS 14+ / Android 8.0 (API 26)+ |
| Accessibility | Screen reader & contrast | WCAG 2.1 AA (disabled-state reasons readable, not colour-only) |
| Localisation | Languages | English (P1), Hindi (Phase 2); copy externalized; ₹/India address model |
| Offline | Order-detail view | Cached (last 24h); all writes idempotent |

## 13\. Analytics & instrumentation

Per case, capture: family/bucket, intent, reason, who-erred, rule fired, lever offered vs chosen, retention outcome, human touches, approval type/latency, replacement mode, TAT adherence, refund-clock adherence, CSAT/NPS (7d/30d). These roll up to the [§4](#4.-success-metrics-\(kpis\)) KPIs. Instrument the retention ladder specifically (deflection rate per reason, ladder step reached before conversion).

## 14\. Release plan (phasing)

| Phase | Scope | Status |
| :---- | :---- | :---- |
| **1 :Customer hero journeys** | Cancel-retention · remediation with RP/RPEX/RPCX · delivery (incl. fake-delivery) · service · finance · warranty · handover seam; the P0 set; \~6–7 demo orders | ✅ Validated |
| **2 :Full customer coverage** | All case buckets into the same flows; channel overlays (Flipkart/Amazon/Pepperfry/CLiQ); Premium ≥₹1L; per-family edge cases; P1 set | ⏭ Next |
| **3 :OMS core integration** | Real OMS \+ C1/C2/C3 as server contracts; Unicommerce, ClickPost, Shopify, POS; real order objects for parallel/sequential creation | Blocked on system-naming |
| **4 :Internal agent app** | Second eye on the same Case; approval queues (money ladders \+ OTP ritual); manager/Director/COO gates; Warrior retention console; Freshdesk→Flocall | Later |

**Phase-1 acceptance (met):** a non-technical person can, on realistic data :open an order, try to cancel and be retained, report a damaged item and be guided to the right replacement mode (and see why), report a delivery problem, book a technician, check a refund, and at any point "talk to a human" and see their context carried; every policy number is traceable; policy is config-driven.

## 15\. Risks & mitigations {#15.-risks-&-mitigations}

| Risk | Mitigation |
| :---- | :---- |
| Policy shipped shallow (windows only, no rule engine) | This PRD embeds the full M/N/A engine, modes, caps, money :build to [§7](#7.-domain-model-&-policy-engine-\(the-brain\)), not to the screens alone |
| Retention perceived as "hard to cancel/return" | Ladder is honest and fast; last-resort levers always reachable; severity never masked |
| Replacement-mode mis-selection leaves customer empty-handed | Mode logic explicit ([§7.12)](#7.12-replacement-modes); parallel-vs-sequential enforced by engine |
| Approval/technician latency stalls flows | Visible SLA chips; TAT-breach auto-escalation; fake-delivery auto-replacement-on-breach |
| Policy hardcoded into UI | Architectural rule ([§7.1](#7.1-core-principle:-the-app-ships-no-policy-logic)): no policy constant in a screen; config-driven only |
| Scope creep into pre-order | Explicit out-of-scope ([§6](#6.-scope)) \+ route-out hand-off |
| A pending sign-off (Appendix B) changes | Each is a single config value; no rebuild :change and redeploy config |
| Integration naming ambiguity | Gate deep OMS integration on system-naming resolution |

## Appendix A :VOC coverage (post-purchase disposition tree)

The app produces these as *outcomes*; it never asks the customer to navigate the tag tree. All complaint/request/query categories are covered except pre-purchase (out of scope).

- **Complaints:** Delivery · Tech-Visit · Refund-Not-Received · Discomfort · Wrong-Size-Received · Wrong-Size-Ordered · Damaged-delivered · Damaged-Delivery-Rejected→RTO-Replacement · Manufacturing-Defect · Incorrect-Product-Received · Payment-Failure · Not-as-Expected · Incorrect-Product-Ordered · Double-Delivery → mapped to [§8.1](#8.1-order-tracking-&-status-\(c1\))/[8.4](#8.4-delivery-issues)/[8.5](#lk8.5-returns-/-replacements-/-repairs-\(remediation-:the-heart\))/[8.6](#8.6-technician-services)/[8.8](#8.8-finance-:refunds,-price-match,-payment-failure) and rules M/N/A.  
- **Requests:** Delivery (expedite/reschedule) · Invoice (normal/GST/update) · Order-Modification · Hold/Unhold · Tech-Visit · Refund-related (NSL/price-match) · Cancellation · RTO-Replacement → [§8.2](#8.2-order-modification)/[8.3](#8.3-cancellation-→-retention-ladder-\(flagship\))/[8.6](#8.6-technician-services)/[8.8](#8.8-finance-:refunds,-price-match,-payment-failure)/[8.11](#8.11-rto-replacement-:shared-sub-flow).  
- **Queries:** Delivery-status · Spam · Tech-Visit · **Pre-purchase → OUT OF SCOPE (§6)** · Post-purchase (warranty/100-nights/size/care) · Refund-query · Outreach (OOS/COD/delay) → [§8.1](#8.1-order-tracking-&-status-\(c1\))/[8.6](#8.6-technician-services)/[8.7](#8.7-warranty)/[8.8](#8.8-finance-:refunds,-price-match,-payment-failure)/[8.12](#8.12-proactive-\(system-initiated\)-&-spam).

## Appendix B :Open product decisions (for sign-off) {#appendix-b-:open-product-decisions-(for-sign-off)}

**Engineering: build exactly what the body of this PRD says :these are already baked in.** This appendix exists only so Product and Finance can *ratify or change* the nine policy points below, where TSC's source documents disagreed or were silent. Each is a single config value ([§7.1](#7.1-core-principle:-the-app-ships-no-policy-logic)), so changing one after sign-off is a config change and redeploy :never a rebuild.

| \# | Decision point | Baked-in default (in force) | Where it appears | Sign-off owner |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Non-mattress *returns* allowed at all? | Replacement-only; return \= manager-approved exception | [§7.8](#7.8-non-mattress-rules-\(n\)), RR-09 | Product \+ Ops |
| 2 | Accessories reporting window | 10 days | [§7.9](#7.9-accessories-rules-\(a\)) | Product |
| 3 | Mattress, customer error, after 10 days | Retain → allow with shipping charges (M4) | [§7.7](#7.7-mattress-rules-\(m\)) M4 | Product |
| 4 | ₹20K approval cap basis | On the price **difference**, not cart value | [§7.16](#7.16-money-&-approvals) | Finance \+ Ops |
| 5 | Return refund trigger | At **pickup-done** | [§7.16](#7.16-money-&-approvals), FN-01 | Finance |
| 6 | After 2 replacements :any refund? | Yes, supervisor-approved final resort | [§7.13](#7.13-caps-&-terminals) | Product \+ Ops |
| 7 | OOS part, customer won't wait | Full replacement first; refund fallback | [§7.13](#7.13-caps-&-terminals)/[§7.14](#7.14-channel-overlays) | Ops |
| 8 | Mattress technician visits | Only for measurement (wrong-size-received) \+ sagging verification | [§7.7](#7.7-mattress-rules-\(m\)) Inv, TS-01 | Ops |
| 9 | Warranty pro-rata depreciation schedule | **Provisional: linear 10%/yr** :value shown as "provisional" until confirmed | [§7.7](#7.7-mattress-rules-\(m\)) M6, WR-05 | **Finance (required before warranty pro-rata goes live)** |

## Appendix C :Glossary

**FCR/Non-FCR** first-contact resolution / requires escalation · **RP** replacement (sequential) · **RPEX** simultaneous exchange · **RPCX** deliver-first replacement · **RTO** return-to-origin · **NSL** no-service-location (local-tech reimbursement) · **EDD** expected delivery date · **EDL** extended-distance location · **AWB** airway-bill/tracking number · **TAT** turnaround time · **VOC** voice-of-customer disposition tag · **C\&C** Cash-&-Carry · **OMS/WMS/CP** order/warehouse/courier systems · **Fynd** serviceability network enabling RPEX/RPCX · **Warriors** internal returns/replacement retention team · **PoD** proof of delivery · **C1/C2/C3** projection / action-availability / verdict contracts · **who-erred** fault attribution (TSC vs customer) driving charges.

