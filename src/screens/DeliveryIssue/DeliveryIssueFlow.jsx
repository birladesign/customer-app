import { useState } from 'react';
import { ORDERS, splitProductSpec, getExpectedDelivery } from '../../data/orders.js';
import { getPhase } from '../../data/phases.js';
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
  // A multi-SKU order (order.items) can have an issue with one specific item
  // or with the shipment as a whole — a single-item order has nothing to
  // choose, so scope is implicit and this question never renders for it.
  const orderItems = order?.items ?? null;
  const isMultiItem = Boolean(orderItems && orderItems.length > 1);

  const [scope, setScope] = useState(null); // 'item' | 'order' — only meaningful when isMultiItem
  // Entered from an item's own Order Details view, so "This Item" already has
  // its answer and skips the picker; "Entire Order" ignores it and asks which
  // items are affected instead.
  const [scopedSku, setScopedSku] = useState(params.sku ?? null);
  const [scopedSkus, setScopedSkus] = useState([]);
  const [itemsConfirmed, setItemsConfirmed] = useState(false);
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

  // Whether the scope questions still need answering before anything else
  // (the item card, the reason list) can resolve to a real target.
  const needsScopeChoice = isMultiItem && !scope;
  const needsItemPick = isMultiItem && scope === 'item' && !scopedSku;
  const needsItemsPick = isMultiItem && scope === 'order' && !itemsConfirmed;
  const scopeResolved = !needsScopeChoice && !needsItemPick && !needsItemsPick;

  const scopedItem = isMultiItem && scope === 'item' ? orderItems.find((i) => i.sku === scopedSku) ?? null : null;
  const affectedItems =
    isMultiItem && scope === 'order' && itemsConfirmed ? orderItems.filter((i) => scopedSkus.includes(i.sku)) : null;
  // What the rest of the flow (phase, PoD, the reason list, the case itself)
  // actually reports against — the one chosen item, or the order as a whole
  // (a single-item order and an "Entire Order" scope both fall through here).
  const target = scopedItem
    ? { ...order, product: scopedItem.product, image: scopedItem.image, timeline: scopedItem.timeline, status: scopedItem.status }
    : order;

  const { name, spec } = splitProductSpec(target.product);
  // What the reason list is actually filtered against. A multi-item order
  // carries no timeline of its own — its items each carry theirs — so an
  // "Entire Order" report reads the items the customer picked instead, and
  // only offers an issue every one of them supports: "I have not received my
  // order" across a set where one is still in transit would be a claim about
  // a parcel that was never due yet.
  const scopeEntities = affectedItems?.length ? affectedItems : [target];
  const representative = scopeEntities[0];
  const issues = getAvailableIssueTypes(getPhase(representative)).filter((issue) =>
    scopeEntities.every((entity) => getAvailableIssueTypes(getPhase(entity)).some((i) => i.key === issue.key))
  );
  const edd = getExpectedDelivery(order);
  const isOnTime = representative.status?.dot !== 'red';
  const pod = getProofOfDelivery(representative.timeline, { address: order.address });

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

  // Nothing's been filed yet (still looking at the scope/item pickers, the
  // reason list, the PoD screen, the pre-report DL-06 prompt, or the "still
  // on track" answer) — the back arrow undoes one step at a time instead of
  // exiting the whole flow and losing that context. Once a case actually
  // exists, there's no "undo": the back arrow goes back to Order Details like
  // every other terminal step.
  function handleHeaderBack() {
    if (issueKey && !caseRecord) {
      setIssueKey(null);
      return;
    }
    if (isMultiItem && scope === 'item' && scopedSku) {
      setScopedSku(null);
      return;
    }
    if (isMultiItem && scope === 'order' && itemsConfirmed) {
      setItemsConfirmed(false);
      return;
    }
    if (isMultiItem && scope) {
      setScope(null);
      return;
    }
    goBack();
  }

  function toggleScopedSku(sku) {
    setScopedSkus((prev) => (prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]));
  }

  function fileLogisticsCase(issue, { description, escalate = true, extra = {} } = {}) {
    // "Entire Order" with more than one item picked has no single item to
    // attach to the case (createCase only ever carries one) — folded into the
    // description instead so which SKUs are affected isn't lost.
    const affectedNote =
      affectedItems && affectedItems.length
        ? ` — ${affectedItems.map((i) => splitProductSpec(i.product).name).join(', ')}`
        : '';
    const record = createCase({
      lane: issue.lane,
      prefix: CASE_PREFIX.complaint,
      order,
      item: scopedItem,
      description: description ?? `${issue.label}${affectedNote} — reported by customer`,
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
    // Same gate Order Details already reads for a booked replace/return
    // (order.intentOverrides.returnReplace) — a delivery issue that's already
    // been filed can't be reported again, so the CTA needs to know.
    order.intentOverrides = { ...order.intentOverrides, deliveryIssue: 'An investigation is already open for this order' };
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
        <button className="delivery-issue__icon-btn" onClick={handleHeaderBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Delivery Issue</h1>
        <span className="delivery-issue__icon-btn-spacer" />
      </header>

      <div className="delivery-issue__stage">
        <div className="execution-step__card">
          <p className="execution-step__card-heading">
            {!scopeResolved ? 'Order' : affectedItems ? 'Items' : 'Item'}
          </p>
          {!scopeResolved ? (
            <div className="execution-step__item">
              <img className="execution-step__item-image" src={order.image} alt={order.product} />
              <div className="execution-step__item-text">
                <p className="execution-step__item-name">{splitProductSpec(order.product).name}</p>
              </div>
            </div>
          ) : affectedItems ? (
            affectedItems.map((it) => (
              <div className="execution-step__item" key={it.sku}>
                <img className="execution-step__item-image" src={it.image} alt={it.product} />
                <div className="execution-step__item-text">
                  <p className="execution-step__item-name">{splitProductSpec(it.product).name}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="execution-step__item">
              <img className="execution-step__item-image" src={target.image} alt={target.product} />
              <div className="execution-step__item-text">
                <p className="execution-step__item-name">{name}</p>
                {spec && <p className="execution-step__item-spec">{spec}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Scope, asked before anything else on a multi-item order: one item,
            or the whole order (in which case the customer says which items). */}
        {needsScopeChoice && (
          <>
            <p className="delivery-issue__prompt">What does this affect?</p>
            <div className="delivery-issue__list" role="radiogroup">
              <button className="delivery-issue__option" onClick={() => setScope('item')}>
                <span className="delivery-issue__option-label">This Item</span>
              </button>
              <button className="delivery-issue__option" onClick={() => setScope('order')}>
                <span className="delivery-issue__option-label">Entire Order</span>
              </button>
            </div>
          </>
        )}

        {needsItemPick && (
          <>
            <p className="delivery-issue__prompt">Which item?</p>
            <div className="delivery-issue__list" role="radiogroup">
              {orderItems.map((it) => (
                <button key={it.sku} className="delivery-issue__option" onClick={() => setScopedSku(it.sku)}>
                  <span className="delivery-issue__option-label">{splitProductSpec(it.product).name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {needsItemsPick && (
          <>
            <p className="delivery-issue__prompt">Which items have an issue?</p>
            <div className="delivery-issue__list" role="group">
              {orderItems.map((it) => {
                const checked = scopedSkus.includes(it.sku);
                return (
                  <button
                    key={it.sku}
                    className={`delivery-issue__option${checked ? ' delivery-issue__option--selected' : ''}`}
                    onClick={() => toggleScopedSku(it.sku)}
                    role="checkbox"
                    aria-checked={checked}
                  >
                    <span className="delivery-issue__option-label">{splitProductSpec(it.product).name}</span>
                    <span className="delivery-issue__checkbox" aria-hidden="true">
                      {checked && <CheckIcon width="12" height="12" strokeWidth="3" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              className="execution-step__done delivery-issue__continue"
              disabled={scopedSkus.length === 0}
              onClick={() => setItemsConfirmed(true)}
            >
              Continue
            </button>
          </>
        )}

        {/* S1 — status-filtered reason list (DL-01) */}
        {scopeResolved && !issueKey && (
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
              Doesn't look right? We'll investigate with the courier. Most cases are resolved within 48 hours.
            </p>
            <button className="execution-step__done" onClick={handleReportFakeDelivery}>
              Open Investigation
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
                    ? "The investigation time ended without resolution. A free replacement has been shipped automatically."
                    : "We're checking with the courier. If it isn't resolved within 48 hours, a free replacement will ship automatically."}
                </p>
              </div>
            </div>
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
                  We'll send this straight to our delivery team for review.
                </p>
                <button className="execution-step__done" onClick={handleReportGeneric}>
                  Report Issue
                </button>
              </>
            ) : (
              <>
                <div className="execution-step__confirm">
                  <span className="execution-step__confirm-icon">
                    <CheckIcon width="18" height="18" strokeWidth="3" />
                  </span>
                  <div>
                    <p className="execution-step__confirm-title">Issue Reported</p>
                    <p className="execution-step__confirm-body">
                      {caseRecord.slaLabel ?? "We'll update you within 48 hours."}
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
