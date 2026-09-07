import { useState } from 'react';
import { ORDERS, splitProductSpec, getExpectedDelivery } from '../../data/orders.js';
import { getPhase, PHASES } from '../../data/phases.js';
import {
  getAvailableIssueTypes,
  isSelfResolvable,
  getInvestigationClock,
  getProofOfDelivery,
} from '../../data/deliveryIssues.js';
import { createCase, CASE_PREFIX } from '../../data/support.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { ChevronLeftIcon, CheckIcon, AlertTriangleIcon, ClockIcon } from '../../components/icons.jsx';
import '../ReturnReplace/ExecutionStep.css';
import './DeliveryIssueFlow.css';

// PRD §8.4 — the delivery-issues module. Previously the only surface for any
// of this was a single canned chat chip ("Did not Receive"); everything here
// — the status-filtered reason list (DL-01), self-resolve before min-EDD
// (DL-03), the fake-delivery investigation with its visible timer and
// auto-replacement-on-breach (DL-05), and Missing/Double/Courier-behaviour
// routed correctly (DL-06) — is new. A damaged-on-arrival refusal at the
// door (OFD only) hands off into the shared RTO sub-flow (§8.11) rather than
// duplicating it here.
export default function DeliveryIssueFlow({ params }) {
  const { goBack, navigate } = useNavigation();
  const order = ORDERS.find((o) => o.id === params.orderId);
  const [issueKey, setIssueKey] = useState(null);
  const [caseRecord, setCaseRecord] = useState(null);
  const [breached, setBreached] = useState(false);

  if (!order) {
    return (
      <div className="delivery-issue">
        <header className="delivery-issue__topbar">
          <button className="delivery-issue__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Delivery Issue</h1>
          <span className="delivery-issue__icon-btn-spacer" />
        </header>
        <p className="delivery-issue__not-found">Order not found.</p>
      </div>
    );
  }

  const { name, spec } = splitProductSpec(order.product);
  const phase = getPhase(order);
  const issues = getAvailableIssueTypes(phase);
  const edd = getExpectedDelivery(order);
  const isOnTime = order.status?.dot !== 'red';
  const pod = getProofOfDelivery(order.timeline, { address: order.address });

  function handlePickIssue(issue) {
    if (issue.key === 'refuseDamaged') {
      // §8.11 RT-01 — a refused-at-the-door parcel is the RTO sub-flow's
      // third caller, not a case filed here.
      navigate('rtoReplace', { orderId: order.id, origin: 'damagedRejection' });
      return;
    }
    setIssueKey(issue.key);
  }

  const activeIssue = issues.find((i) => i.key === issueKey) ?? null;
  const selfResolve = activeIssue && isSelfResolvable(activeIssue.key, { edd, isOnTime });

  function fileLogisticsCase(issue, { description, escalate = true, extra = {} } = {}) {
    const record = createCase({
      lane: issue.lane,
      prefix: CASE_PREFIX.complaint,
      order,
      item: null,
      description: description ?? `${issue.label} — reported by customer`,
      hasPhoto: false,
      escalate,
      messages: [],
      intent: 'deliveryIssue',
      family: 'logistics',
      reason: issue.voc,
      ruleTrace: [`DL-0x ${issue.voc}`],
      offered: [],
      outcome: 'escalated',
      ...extra,
    });
    setCaseRecord(record);
    return record;
  }

  function handleReportGeneric() {
    fileLogisticsCase(activeIssue);
  }

  function handleReportFakeDelivery() {
    fileLogisticsCase(activeIssue, {
      description: 'Marked delivered but not received — investigation opened, PoD shown to customer',
      outcome: 'investigating',
    });
  }

  // Dev-only stand-in for real elapsed time: there's no backend clock ticking
  // toward the 48h deadline, so this simulates the breach the way RTO's
  // "Simulate Payment" simulates a payment gateway completing.
  function handleSimulateBreach() {
    setBreached(true);
    order.rpCount = (order.rpCount ?? 0) + 1;
    Object.assign(order, {
      status: { dot: 'blue', label: 'Replacement Dispatched' },
      caption: 'Investigation window passed without resolution — a replacement was dispatched automatically.',
    });
    order.timeline?.steps.push({
      label: 'Replacement Dispatched',
      timestamp: null,
      description: 'Auto-replacement — fake-delivery investigation breached its SLA (§7.17)',
    });
    if (order.timeline) order.timeline.currentIndex = order.timeline.steps.length - 1;
    createCase({
      lane: 'logistics',
      prefix: CASE_PREFIX.returnReplace,
      order,
      item: null,
      description: 'Fake-delivery investigation breached 48h SLA — auto-replacement dispatched',
      hasPhoto: false,
      escalate: false,
      messages: [],
      intent: 'deliveryIssue',
      family: 'logistics',
      reason: 'Fake-Delivery',
      ruleTrace: ['DL-05 auto-replacement-on-breach'],
      offered: ['investigate'],
      chosen: 'autoReplace',
      outcome: 'auto_replaced',
    });
  }

  const clock = caseRecord && activeIssue?.investigation ? getInvestigationClock(caseRecord.createdAt) : null;

  return (
    <div className="delivery-issue">
      <header className="delivery-issue__topbar">
        <button className="delivery-issue__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Delivery Issue</h1>
        <span className="delivery-issue__icon-btn-spacer" />
      </header>

      <div className="delivery-issue__stage">
        <div className="execution-step__card">
          <p className="execution-step__card-heading">Item</p>
          <div className="execution-step__item">
            <img className="execution-step__item-image" src={order.image} alt={order.product} />
            <div className="execution-step__item-text">
              <p className="execution-step__item-name">{name}</p>
              {spec && <p className="execution-step__item-spec">{spec}</p>}
            </div>
          </div>
        </div>

        {/* S1 — status-filtered reason list (DL-01) */}
        {!issueKey && (
          <>
            <p className="delivery-issue__prompt">What's the issue?</p>
            {issues.length === 0 ? (
              <p className="delivery-issue__empty">
                No delivery issues apply to this order right now — it hasn't shipped yet.
              </p>
            ) : (
              <div className="delivery-issue__list" role="radiogroup">
                {issues.map((issue) => (
                  <button key={issue.key} className="delivery-issue__option" onClick={() => handlePickIssue(issue)}>
                    <span className="delivery-issue__option-label">{issue.label}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* DL-03 — self-resolved: an answer card, no case, no escalation. */}
        {issueKey && selfResolve && (
          <div className="execution-step">
            <div className="execution-step__confirm">
              <span className="execution-step__confirm-icon">
                <ClockIcon width="18" height="18" strokeWidth="3" />
              </span>
              <div>
                <p className="execution-step__confirm-title">Still on track</p>
                <p className="execution-step__confirm-body">
                  Your order hasn't missed its delivery estimate yet — it's expected by {edd}. Courier scans can lag
                  behind the parcel's actual location, so this is usually nothing to worry about before then.
                </p>
              </div>
            </div>
            <button className="execution-step__done" onClick={goBack}>
              Got It
            </button>
          </div>
        )}

        {/* Fake-delivery: show PoD, then let the customer open the
            investigation (DL-05). */}
        {issueKey === 'fakeDelivery' && !selfResolve && !caseRecord && (
          <div className="execution-step">
            <p className="execution-step__card-heading">What we have on file</p>
            {pod ? (
              <div className="execution-step__card">
                <div className="execution-step__detail-row">
                  <span>Delivered</span>
                  <span className="execution-step__detail-strong">{pod.timestamp}</span>
                </div>
                <div className="execution-step__detail-row">
                  <span>Confirmed by</span>
                  <span>{pod.signedBy}</span>
                </div>
                {pod.address && (
                  <div className="execution-step__detail-row">
                    <span>Address</span>
                    <span>{pod.address}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="delivery-issue__empty">No proof-of-delivery record found for this order.</p>
            )}
            <p className="execution-step__confirm-body delivery-issue__spaced">
              If this doesn't match what happened, we'll open an investigation with the courier — most are resolved
              within 24–48 hours.
            </p>
            <button className="execution-step__done" onClick={handleReportFakeDelivery}>
              This Doesn't Match — Open Investigation
            </button>
          </div>
        )}

        {/* DL-05 — the investigation, with a visible timer and
            auto-replacement-on-breach. */}
        {issueKey === 'fakeDelivery' && caseRecord && (
          <div className="execution-step">
            <div className="execution-step__confirm">
              <span className="execution-step__confirm-icon">
                <AlertTriangleIcon width="18" height="18" strokeWidth="3" />
              </span>
              <div>
                <p className="execution-step__confirm-title">
                  {breached ? 'Auto-replacement dispatched' : 'Investigation in progress'}
                </p>
                <p className="execution-step__confirm-body">
                  {breached
                    ? "The 48-hour investigation window passed without resolution, so a replacement was dispatched automatically — no need to wait or follow up."
                    : "We're checking this with the courier. If it isn't resolved before the window below runs out, a replacement ships automatically — you won't need to ask."}
                </p>
              </div>
            </div>
            {!breached && clock && (
              <div className="delivery-issue__countdown">
                <ClockIcon width="16" height="16" />
                <span>{clock.hoursRemaining}h remaining until auto-replacement</span>
              </div>
            )}
            <div className="execution-step__card">
              <div className="execution-step__detail-row">
                <span>Reference ID</span>
                <span className="execution-step__detail-strong">{caseRecord.id}</span>
              </div>
              <div className="execution-step__detail-row">
                <span>Order ID</span>
                <span>{order.id}</span>
              </div>
            </div>
            {!breached && (
              <button className="delivery-issue__dev-link" onClick={handleSimulateBreach}>
                Simulate 48h passing
              </button>
            )}
            <button className="execution-step__done" onClick={goBack}>
              Back to Order Details
            </button>
          </div>
        )}

        {/* DL-06 — everything else: a Logistics case with the correct VOC
            tag, no case-per-click drama. */}
        {issueKey && !['fakeDelivery', 'refuseDamaged'].includes(issueKey) && !selfResolve && (
          <div className="execution-step">
            {!caseRecord ? (
              <>
                <p className="execution-step__confirm-body">
                  We'll route this to our Logistics team with your order's tracking history attached.
                </p>
                <button className="execution-step__done" onClick={handleReportGeneric}>
                  Report This Issue
                </button>
              </>
            ) : (
              <>
                <div className="execution-step__confirm">
                  <span className="execution-step__confirm-icon">
                    <CheckIcon width="18" height="18" strokeWidth="3" />
                  </span>
                  <div>
                    <p className="execution-step__confirm-title">Reported to Logistics</p>
                    <p className="execution-step__confirm-body">
                      {caseRecord.slaLabel ?? "We'll update you within 24–48 hours."}
                    </p>
                  </div>
                </div>
                <div className="execution-step__card">
                  <div className="execution-step__detail-row">
                    <span>Reference ID</span>
                    <span className="execution-step__detail-strong">{caseRecord.id}</span>
                  </div>
                </div>
                <button className="execution-step__done" onClick={goBack}>
                  Back to Order Details
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
