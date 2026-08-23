# Handover — order-flow / damage-assessment work

**Branch:** `parallel` (cut from `claude/order-flow-damage-assessment-4lseuq` at commit `ea1be49`, which already has `main` merged in as of 2026-08-23). Also tracked as PR #17 (draft): https://github.com/birladesign/customer-app/pull/17

## What this codebase is

`birladesign/customer-app` — a React + Vite prototype (not React Native, despite folder names) of TSC's post-purchase customer app. No backend: everything is mocked module-level data mutated in place (see `src/data/orders.js`'s `ORDERS` array). The authoritative product spec is:

- **`TSC_PostPurchase_App_PRD_v3 (1).md`** (repo root) — read §7.7–7.11 (Mattress/Non-mattress/Accessories rule tables M/N/A, evidence matrix, retention ladder) and §8.5/8.6 (Returns/Replacements, Technician Services) before building more of the damage-assessment flow. This PRD describes the **full** target state; only a slice of it is implemented.

## What's implemented so far (this session, on top of independent upstream work)

- `src/screens/Login/*` — login/signup split (upstream did this independently while this branch was open); login never asks for a name, signup always does.
- `src/screens/Home.jsx` — "Active Orders" section.
- `src/components/OrderCard.jsx` + `src/data/orders.js` (`getOrderTat`) — TAT badge next to status; `order.tat` is a per-order authored string (only 2 demo orders have one: `TSC96210`, `TSC89203`).
- `src/components/OrderCard.jsx` — "Cancel" CTA on pre-delivery order cards (gated by `intents.js#getOrderIntents`), wired to `OrderDetails.jsx`'s existing cancel flow via a `params.openCancel` flag. "Edit Address" is upstream's kebab-menu item (`CardMoreMenu.jsx`), not duplicated here.
- `src/data/remediation.js` — the Return/Replace lever engine, extended with:
  - `isMattressProduct()` / `getReturnReasons()` — mattress vs non-mattress reason lists (`RETURN_REASONS` split into `MATTRESS_REASONS`/`NON_MATTRESS_REASONS`).
  - `Mattress Damage` / `Packaging Damage` → both levers `needsApproval: false` (auto-approved).
  - `Discomfort / Not as expected` (mattress only) → within 100 nights: `postureCorrection` lever recommending 4 weeks' use first, then Replace/Return; past 100 nights: `getDenialNotice()` returns an inform-only "trial window is over" message and `getRemediationOptions` returns `[]`.
  - Non-mattress `Damaged` within 10 days → `installerVisit` / `videoConsult` levers instead of direct Replace/Return.
  - `getDaysSinceOrder()` uses `Date.now()` — the demo's date data and the container clock are both pinned to Aug 2026, so this works in this environment; re-check if the sandbox clock ever drifts from the seeded order dates.
- `src/screens/ReturnReplace/OptionsStep.jsx` — renders the denial-notice inform-only screen when `getRemediationOptions` returns `[]`.

## What's very likely NOT implemented yet (PRD gaps — this is the "test what exists" work)

The remediation engine above is a hand-authored subset, not the real M/N/A rule tables. Known gaps against the PRD:

- **M-series (mattress):** M2 (TSC-erred wrong size), M3/M4 (customer-erred wrong size, 0–10d vs 11–100d, ship charges), M6 (sagging/bump pro-rata post-100d, depreciation schedule), M7 (wrong model TSC-erred), M8–M12 (smell, tolerance, zipper-cover) — none of these reasons/branches exist in `remediation.js` today.
- **N-series (non-mattress):** post-install damage/defect (N2/N5) requiring mandatory tech visit before part-RP, N6/N7 discomfort rules (return always ❌, inform-only past 10d), N8 part-RP counter → full-RP after 2, N9–N11 (refuse-part-RP, part-unavailable, damaged-twice) — not built.
- **A-series (accessories):** no accessories category/reasons exist at all (A1–A6, 10-day window, no-pickup/no-images invariants, the ₹30K/₹50K order-value branches).
- **Evidence matrix (§7.10):** `EvidenceStep.jsx` always requires a photo for every reason; the PRD says mandatory only for some (e.g. non-mattress pre/post-install) and optional/none for others (mattress general, accessories, non-mattress discomfort).
- **Retention ladder full sequence (§7.11):** today it's a single "posture correction" lever alongside Replace/Return, not the actual ladder (education → topper offer → topper declined → replacement offer → replacement declined → return-as-last-resort, with a `topper_provided` state).
- **Tech-gate (RR-04):** no "book inspection → resume on verdict" sub-flow exists; `installerVisit`/`videoConsult` just go straight to a generic execution tracker (`ExecutionStep.jsx`) with no actual verdict step feeding back into a remedy decision.
- No `days-since-anchor` concept distinguishing order-date vs delivery-date vs install-date anchors (PRD's 11-dimension model, §7.6) — this session's `getDaysSinceOrder` only knows order date.

## Key files to read first, next session

| Concern | File(s) |
|---|---|
| Product spec / rule tables | `TSC_PostPurchase_App_PRD_v3 (1).md` §7.6–7.11, §8.5, §8.6 |
| Order data model, demo orders | `src/data/orders.js` |
| Eligibility (cancel/edit/return-replace/warranty) | `src/data/intents.js` |
| Remediation levers (the part to extend) | `src/data/remediation.js` |
| Return/Replace step flow | `src/screens/ReturnReplace/ReturnReplaceFlow.jsx` + its `ReasonStep`/`EvidenceStep`/`OptionsStep`/`ExecutionStep`/`ApprovalPendingStep` |
| Order card CTAs / kebab menu | `src/components/OrderCard.jsx`, `src/components/CardMoreMenu.jsx` |
| Order details page (cancel/edit/help sheet) | `src/screens/OrderDetails.jsx` |

## How to test locally

No test suite exists — this is smoke-tested by running the app:
```bash
npm install
npm run dev -- --port 5173 --strictPort   # Vite dev server
npm run build                              # sanity build
```
There's no Playwright/browser-automation dependency installed in the repo itself — this session used a scratch `playwright-core` install (`npm install --no-save playwright-core` in a scratch dir) driving the pre-installed `/opt/pw-browsers/chromium` headlessly to click through flows and screenshot them. Demo login: any 10-digit number starting 6–9, OTP `123456`.

## PR / CI status as of hand-off

PR #17 (draft) is `mergeable_state: clean`, all 3 Vercel preview deployments (customer-app, customer-app-v2, rto-flow) green on the latest commit, no reviewer comments. An hourly check-in routine (`trig_...`, self-scheduled via `send_later`) has been polling it — if you pick this up in a fresh session, either keep riding that loop or cancel it if `parallel` supersedes the PR as home base.
