import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import {
  CASE_LANES,
  getOrdersForLane,
  findOpenCaseForOrder,
  createCase,
  updateCaseMessages,
  getOrderStatus,
} from '../../data/support.js';
import {
  JOURNEY_LANES,
  getJourneyContext,
  getIntentsFor,
  getChildIntents,
  resolveIntent,
} from '../../data/journeys.js';
import { useObjectUrlPreview } from '../../hooks/useObjectUrlPreview.js';
import { CopyIcon, CheckIcon, CameraIcon, CloseIcon, ArrowUpIcon } from '../../components/icons.jsx';
import './SupportChat.css';

const MIN_LENGTH = 10;
const VISIBLE_ORDER_COUNT = 3;
const GENERAL_LANE = JOURNEY_LANES.find((l) => l.key === 'general');

function isReturnEligible(order) {
  return Boolean(order) && getOrdersForLane('returns').some((o) => o.id === order.id);
}

// Delivered items can still be genuinely disputed — the courier's status
// isn't proof the customer actually has the item in hand — so Delivery &
// Logistics keeps offering a path in even after the system says delivered,
// instead of the option quietly disappearing the moment the status flips.
function isDelivered(selectedOrder, selectedItem) {
  if (!selectedOrder) return false;
  const label = selectedItem ? selectedItem.status.label : getOrderStatus(selectedOrder).label;
  return label === 'Delivered';
}

function CaseResultCard({ caseResult }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(caseResult.id);
    } catch {
      // Clipboard API unavailable — the checkmark still confirms the tap.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="support-chat__case-result">
      <div className="support-chat__case-result-heading">
        <CheckIcon width="13" height="13" strokeWidth="3" />
        <span>Request Filed</span>
      </div>
      <button className="support-chat__case-id" onClick={handleCopy}>
        {copied ? <CheckIcon width="13" height="13" strokeWidth="3" /> : <CopyIcon width="13" height="13" />}
        <span>{caseResult.id}</span>
      </button>
      <p className="support-chat__case-sla">Next: {caseResult.slaLabel}</p>
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.from === 'user';
  return (
    <div className={`support-chat__row support-chat__row--${isUser ? 'user' : 'bot'}`}>
      {msg.text && (
        <div className={`support-chat__bubble support-chat__bubble--${isUser ? 'user' : 'bot'}${msg.tone === 'warning' ? ' support-chat__bubble--warning' : ''}`}>
          {msg.photoUrl && <img className="support-chat__bubble-photo" src={msg.photoUrl} alt="Attached evidence" />}
          <p className="support-chat__bubble-text">{msg.text}</p>
        </div>
      )}

      {msg.answerCard && (
        <div className="support-chat__answer">
          <p className="support-chat__answer-title">{msg.answerCard.title}</p>
          <p className="support-chat__answer-body">{msg.answerCard.body}</p>
        </div>
      )}

      {msg.caseResult && <CaseResultCard caseResult={msg.caseResult} />}

      {msg.orders && (
        <div className="support-chat__orders">
          {msg.allowSkip && (
            <button className="support-chat__order-skip" onClick={() => msg.onSelectOrder(null)}>
              Not related to an order
            </button>
          )}
          {msg.orders.map((o) => (
            <button key={o.id} className="support-chat__order-row" onClick={() => msg.onSelectOrder(o)}>
              <img className="support-chat__order-thumb" src={o.image} alt="" />
              <span className="support-chat__order-text">
                <span className="support-chat__order-product">{o.product}</span>
                <span className="support-chat__order-meta">
                  {o.id} · {o.date}
                </span>
              </span>
            </button>
          ))}
          {msg.onViewAll && (
            <button className="support-chat__order-skip" onClick={msg.onViewAll}>
              View All Orders ({msg.moreCount} more)
            </button>
          )}
        </div>
      )}

      {msg.items && (
        <div className="support-chat__orders">
          {msg.allowSkipItem && (
            <button className="support-chat__order-skip" onClick={() => msg.onSelectItem(null)}>
              The whole order
            </button>
          )}
          {msg.items.map((it) => (
            <button key={it.sku} className="support-chat__order-row" onClick={() => msg.onSelectItem(it)}>
              <img className="support-chat__order-thumb" src={it.image} alt="" />
              <span className="support-chat__order-text">
                <span className="support-chat__order-product">{it.product}</span>
                <span className="support-chat__order-meta">{it.status?.label}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {msg.chips && (
        <div className="support-chat__chips">
          {msg.chips.map((chip) => (
            <button key={chip.key} className="support-chat__chip" onClick={chip.onClick}>
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// A single chat transcript embedded in the Support screen — same underlying
// data/support.js logic as the old wizard (lanes, dedup, classification,
// Returns redirect), plus: an always-visible composer (real chat apps don't
// hide the input while you're picking an option), a resumable/persisted
// ticket (see resumeCase + updateCaseMessages), and a guard against off-topic
// input derailing whatever the bot is currently waiting on an answer to.
export default function SupportChat({ escalate, presetOrder, presetShipment, staleOrderId, resumeCase, intro, onClose, onOrderSelected }) {
  const { navigate } = useNavigation();
  // A shipment of exactly one order is just a preset order that arrived via
  // a different prop; only a genuine multi-order shipment needs its own
  // "which product?" step before the rest of the flow can proceed.
  const effectivePresetOrder = presetOrder ?? (presetShipment?.length === 1 ? presetShipment[0] : null);
  const multiShipmentOrders = !presetOrder && presetShipment?.length > 1 ? presetShipment : null;
  const idRef = useRef(0);
  const seededRef = useRef(false);
  const caseIdRef = useRef(resumeCase?.id ?? null);
  const transcriptEndRef = useRef(null);
  // The most recent bot message that expected a specific answer (chips or an
  // order list) — reshown verbatim if the user types something unrelated
  // instead of tapping it, rather than the flow silently losing its place.
  const pendingPromptRef = useRef(null);
  // Whether the follow-up stage has already sent its one specific
  // acknowledgement — after that, further messages get a shorter, plainer
  // ack instead of repeating the same sentence verbatim every time.
  const followupAckedRef = useRef(false);
  // Holds whatever text is about to become the case description — either
  // typed through the composer (describe stage) or filled in by a quick
  // chip like "Did not Receive" — so handleSubmit always has a single
  // source of truth regardless of which path produced it.
  const descriptionRef = useRef('');
  // Set when a journey leaf resolves to a case — carries that leaf's own
  // reference prefix, headline and SLA through to createCase, so a warranty
  // claim files as WTY-… with its own promise rather than a generic CMP-….
  const journeyRef = useRef(null);

  const [messages, setMessages] = useState(() => resumeCase?.messages ?? []);
  const [stage, setStage] = useState(resumeCase ? 'followup' : 'lane'); // lane | order | item | describe | confirm | followup
  const [lane, setLane] = useState(null);
  const [order, setOrder] = useState(null);
  const [item, setItem] = useState(null);
  const [draft, setDraft] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const fileInputRef = useRef(null);
  const { previewUrl, handleFile, clear: clearPhoto } = useObjectUrlPreview(setPhotoFile);

  function nextId() {
    idRef.current += 1;
    return idRef.current;
  }

  function pushBot(partial) {
    if (partial.chips || partial.orders || partial.items) pendingPromptRef.current = partial;
    setMessages((m) => [...m, { id: nextId(), from: 'bot', ...partial }]);
  }

  function pushUser(partial) {
    setMessages((m) => [...m, { id: nextId(), from: 'user', ...partial }]);
  }

  useEffect(() => {
    if (seededRef.current || resumeCase) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    if (staleOrderId) {
      pushBot({ text: `We couldn't find order ${staleOrderId} — let's start fresh.` });
    }
    if (multiShipmentOrders) {
      pushBot({ text: `This is about shipment ${multiShipmentOrders[0].shipmentId} (${multiShipmentOrders.length} items).` });
    }
    pushBot({
      text: intro ?? (escalate ? "We'll connect you with a specialist. First, what's this about?" : 'Hi! What can we help with?'),
      chips: JOURNEY_LANES.map((l) => ({ key: l.key, label: l.label, onClick: () => handleSelectLane(l) })),
    });
    // Seed the conversation once — intentionally not re-run on prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  // Persists the transcript onto the case record every time it grows — but
  // only once a ticket actually exists (fresh conversations that never file
  // don't leave anything behind, matching the old wizard's discard-on-close
  // behavior).
  useEffect(() => {
    if (caseIdRef.current) updateCaseMessages(caseIdRef.current, messages);
  }, [messages]);

  // Item-level granularity only earns its keep where a case is almost
  // always about one specific product, not the whole shipment: a damaged
  // or missing item (logistics), a technician visit for one piece
  // (installation), or a return/replace, which needs a real sku to hand
  // off to the Return & Replace wizard. Payments/refunds and general
  // questions stay order-level — asking "which item?" for a billing
  // question would just be friction with no payoff.
  const ITEM_SCOPED_LANES = new Set(['logistics', 'tech', 'returns']);

  function needsItemStep(selectedLane, selectedOrder) {
    return Boolean(selectedOrder?.items?.length > 1) && ITEM_SCOPED_LANES.has(selectedLane.key);
  }

  function handleSelectLane(selectedLane) {
    pushUser({ text: selectedLane.label });
    setLane(selectedLane);

    if (selectedLane.redirectsTo) {
      if (effectivePresetOrder && isReturnEligible(effectivePresetOrder)) {
        if (needsItemStep(selectedLane, effectivePresetOrder)) {
          askForItem(selectedLane, effectivePresetOrder);
          return;
        }
        navigate(selectedLane.redirectsTo, { orderId: effectivePresetOrder.id });
        return;
      }
      if (multiShipmentOrders) {
        const eligible = multiShipmentOrders.filter(isReturnEligible);
        if (eligible.length > 0) {
          askForShipmentOrder(selectedLane, eligible);
          return;
        }
      }
      askForOrder(selectedLane);
      return;
    }

    if (multiShipmentOrders) {
      askForShipmentOrder(selectedLane, multiShipmentOrders);
      return;
    }

    if (effectivePresetOrder) {
      setOrder(effectivePresetOrder);
      pushBot({ text: `Got it — this is about ${effectivePresetOrder.product} (${effectivePresetOrder.id}).` });
      if (needsItemStep(selectedLane, effectivePresetOrder)) {
        askForItem(selectedLane, effectivePresetOrder);
        return;
      }
      askForIntent(selectedLane, effectivePresetOrder);
      return;
    }

    askForOrder(selectedLane);
  }

  // Scoped counterpart to askForOrder — the candidates are already known
  // (every sibling in the shipment the customer tapped "Need Help" from),
  // so this skips straight to "which product?" instead of surfacing the
  // customer's entire order history for a lane they've already narrowed down.
  function askForShipmentOrder(selectedLane, candidates) {
    pushBot({
      text: 'Which item in this shipment is this about?',
      orders: candidates,
      allowSkip: selectedLane.key === 'general',
      onSelectOrder: (o) => handleSelectOrder(selectedLane, o),
    });
    setStage('order');
  }

  function askForOrder(selectedLane) {
    const candidates = getOrdersForLane(selectedLane.key);
    if (candidates.length === 0) {
      pushBot({
        text: 'None of your orders qualify for this category.',
        chips: [{ key: 'general', label: 'File as a general request instead', onClick: () => handleSelectLane(GENERAL_LANE) }],
      });
      return;
    }
    const visible = candidates.slice(0, VISIBLE_ORDER_COUNT);
    const rest = candidates.slice(VISIBLE_ORDER_COUNT);
    pushBot({
      text: 'Which order is this about? Here are your most recent:',
      orders: visible,
      allowSkip: selectedLane.key === 'general',
      onSelectOrder: (o) => handleSelectOrder(selectedLane, o),
      moreCount: rest.length,
      onViewAll: rest.length > 0 ? () => revealMoreOrders(selectedLane, rest) : undefined,
    });
    setStage('order');
  }

  // "View All Orders" doesn't replace the first message — it adds a second
  // one with the rest, so the 3 already shown don't jump around or vanish.
  function revealMoreOrders(selectedLane, rest) {
    pushUser({ text: 'View All Orders' });
    pushBot({
      text: 'Here are the rest of your orders:',
      orders: rest,
      onSelectOrder: (o) => handleSelectOrder(selectedLane, o),
    });
  }

  function handleSelectOrder(selectedLane, selectedOrder) {
    pushUser({ text: selectedOrder ? `${selectedOrder.product} (${selectedOrder.id})` : 'Not related to an order' });
    setOrder(selectedOrder);
    if (selectedOrder) onOrderSelected?.(selectedOrder);

    if (needsItemStep(selectedLane, selectedOrder)) {
      askForItem(selectedLane, selectedOrder);
      return;
    }

    if (selectedLane.redirectsTo && selectedOrder) {
      navigate(selectedLane.redirectsTo, { orderId: selectedOrder.id });
      return;
    }

    askForIntent(selectedLane, selectedOrder);
  }

  function askForItem(selectedLane, selectedOrder) {
    pushBot({
      text: 'Which item is this about?',
      items: selectedOrder.items,
      // Returns must resolve to one real line item — the wizard it hands
      // off to needs a sku — so "the whole order" isn't offered there.
      allowSkipItem: !selectedLane.redirectsTo,
      onSelectItem: (selectedItem) => handleSelectItem(selectedLane, selectedOrder, selectedItem),
    });
    setStage('item');
  }

  function handleSelectItem(selectedLane, selectedOrder, selectedItem) {
    pushUser({ text: selectedItem ? selectedItem.product : 'The whole order' });
    setItem(selectedItem);

    if (selectedLane.redirectsTo) {
      navigate(selectedLane.redirectsTo, { orderId: selectedOrder.id, sku: selectedItem?.sku });
      return;
    }

    askForIntent(selectedLane, selectedOrder, selectedItem);
  }

  // The journey step: instead of one free-text box per lane, offer the
  // intents that actually apply to this order's state (data/journeys.js).
  // Falls through to plain description capture if a lane has no tree or
  // nothing in it fits.
  function askForIntent(selectedLane, selectedOrder, selectedItem = null) {
    const ctx = getJourneyContext(selectedOrder, selectedItem);
    const intents = getIntentsFor(selectedLane.key, ctx);
    if (intents.length === 0) {
      askToDescribe(selectedLane, selectedOrder, selectedItem);
      return;
    }
    pushBot({
      text: 'What’s happening?',
      chips: [
        ...intents.map((intent) => ({
          key: intent.key,
          label: intent.label,
          onClick: () => handleSelectIntent(selectedLane, selectedOrder, selectedItem, intent, ctx),
        })),
        {
          key: 'other',
          label: 'Something else',
          onClick: () => {
            pushUser({ text: 'Something else' });
            askToDescribe(selectedLane, selectedOrder, selectedItem);
          },
        },
      ],
    });
    setStage('intent');
  }

  function handleSelectIntent(selectedLane, selectedOrder, selectedItem, intent, ctx) {
    pushUser({ text: intent.label });

    const children = getChildIntents(intent, ctx);
    if (children.length > 0) {
      pushBot({
        text: 'Which is it?',
        chips: children.map((child) => ({
          key: child.key,
          label: child.label,
          onClick: () => handleSelectIntent(selectedLane, selectedOrder, selectedItem, child, ctx),
        })),
      });
      setStage('intent');
      return;
    }

    applyResolution(selectedLane, selectedOrder, selectedItem, resolveIntent(intent, ctx), ctx);
  }

  function applyResolution(selectedLane, selectedOrder, selectedItem, resolution, ctx) {
    if (!resolution) {
      askToDescribe(selectedLane, selectedOrder, selectedItem);
      return;
    }

    if (resolution.kind === 'redirect') {
      navigate(resolution.screen, {
        orderId: selectedOrder?.id,
        sku: selectedItem?.sku,
        ...resolution.params,
      });
      return;
    }

    // Self-resolved (FCR): answer the question outright and let them leave
    // without a ticket — but never trap them there if it didn't help.
    if (resolution.kind === 'answer') {
      pushBot({
        answerCard: { title: resolution.title, body: resolution.body },
        chips: [
          ...(resolution.chips ?? []).map((chip) => ({
            key: chip.key,
            label: chip.label,
            onClick: () =>
              navigate(chip.redirect, { orderId: selectedOrder?.id, sku: selectedItem?.sku }),
          })),
          { key: 'done', label: 'That answers it', onClick: onClose },
          ...(resolution.stillNeedHelp
            ? [
                {
                  key: 'more',
                  label: 'I still need help',
                  onClick: () => {
                    pushUser({ text: 'I still need help' });
                    askToDescribe(selectedLane, selectedOrder, selectedItem);
                  },
                },
              ]
            : []),
        ],
      });
      setStage('resolved');
      return;
    }

    // Case leaf: carry the journey's own reference prefix, headline and SLA
    // into the ticket rather than filing everything as a generic complaint.
    journeyRef.current = {
      prefix: resolution.prefix,
      title: resolution.title,
      sla: resolution.sla,
      lane: resolution.lane ?? selectedLane.key,
    };
    askToDescribe(selectedLane, selectedOrder, selectedItem, resolution);
  }

  function askToDescribe(selectedLane, selectedOrder, selectedItem = null, resolution = null) {
    const existingCase = findOpenCaseForOrder(selectedOrder?.id, selectedLane.key, selectedItem?.sku ?? null);
    if (existingCase) {
      pushBot({
        text: `You already have an open request (${existingCase.id}) for this. You can view it, or keep going to file a new one.`,
        chips: [{ key: 'view', label: 'View existing request', onClick: () => navigate('requests') }],
        tone: 'warning',
      });
    }
    // A journey leaf already knows what the customer picked, so it offers
    // that back as a one-tap summary rather than making them retype it.
    if (resolution?.prefill) {
      pushBot({
        text: resolution.needsPhoto
          ? 'Add a photo and anything else worth knowing — or send the summary as-is.'
          : 'Anything you’d like to add? Send the summary as-is, or type your own.',
        chips: [
          {
            key: 'prefill',
            label: 'Send this summary',
            onClick: () => handleQuickDescribe(selectedLane, selectedOrder, selectedItem, resolution.prefill),
          },
        ],
      });
      setStage('describe');
      return;
    }

    if (selectedLane.key === 'logistics' && isDelivered(selectedOrder, selectedItem)) {
      pushBot({
        text: 'Tell us what happened — type your message below, or pick an option:',
        chips: [
          {
            key: 'not-received',
            label: 'Did not Receive',
            onClick: () =>
              handleQuickDescribe(
                selectedLane,
                selectedOrder,
                selectedItem,
                'This shows as delivered, but I have not received it.'
              ),
          },
        ],
      });
      setStage('describe');
      return;
    }

    pushBot({ text: 'Tell us what happened — type your message below.' });
    setStage('describe');
  }

  // Shortcut for canned, one-tap descriptions (e.g. "Did not Receive") that
  // skip straight to confirm the same way a typed message does via
  // handleSend, without requiring the customer to type it out themselves.
  // Takes the lane/order/item explicitly (rather than reading state) since
  // it's invoked from a chip built in the same synchronous handler as the
  // setLane/setOrder/setItem calls that would otherwise not have flushed yet.
  function handleQuickDescribe(selectedLane, selectedOrder, selectedItem, text) {
    descriptionRef.current = text;
    pushUser({ text, photoUrl: attachSentPhoto() });
    setStage('confirm');
    pushBot({
      text: 'Ready to submit this request?',
      chips: [
        {
          key: 'submit',
          label: 'Submit Request',
          onClick: () => handleSubmit({ lane: selectedLane, order: selectedOrder, item: selectedItem }),
        },
        { key: 'edit', label: 'Keep Editing', onClick: () => setStage('describe') },
      ],
    });
  }

  // Off-topic guard: if the bot is waiting on a specific tap (a lane, an
  // order, submit/keep-editing) and the user types something else instead,
  // don't let the flow lose its place — acknowledge it briefly, then put the
  // same question and options right back in front of them.
  function reaskPending(text) {
    pushUser({ text });
    const pending = pendingPromptRef.current;
    pushBot({ text: "We hear you — let's sort this out first." });
    if (pending) {
      const {
        text: pendingText,
        chips,
        orders,
        allowSkip,
        onSelectOrder,
        tone,
        moreCount,
        onViewAll,
        items,
        allowSkipItem,
        onSelectItem,
      } = pending;
      pushBot({ text: pendingText, chips, orders, allowSkip, onSelectOrder, tone, moreCount, onViewAll, items, allowSkipItem, onSelectItem });
    }
  }

  function attachSentPhoto() {
    const sentPhotoUrl = photoFile ? URL.createObjectURL(photoFile) : null;
    clearPhoto();
    return sentPhotoUrl;
  }

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');

    if (stage === 'describe') {
      if (text.length < MIN_LENGTH) {
        pushUser({ text });
        pushBot({ text: `A few more words would help (${text.length}/${MIN_LENGTH}).` });
        return;
      }
      descriptionRef.current = text;
      pushUser({ text, photoUrl: attachSentPhoto() });
      setStage('confirm');
      pushBot({
        text: 'Ready to submit this request?',
        chips: [
          { key: 'submit', label: 'Submit Request', onClick: handleSubmit },
          { key: 'edit', label: 'Keep Editing', onClick: () => setStage('describe') },
        ],
      });
      return;
    }

    if (stage === 'followup') {
      pushUser({ text, photoUrl: attachSentPhoto() });
      if (!followupAckedRef.current) {
        followupAckedRef.current = true;
        pushBot({
          text: `Got it — added to ${caseIdRef.current}. Anything else, or are you all set?`,
          chips: [{ key: 'done', label: "I'm All Set", onClick: onClose }],
        });
      } else {
        pushBot({ text: 'Noted — thanks for the extra detail.' });
      }
      return;
    }

    reaskPending(text);
  }

  // Accepts explicit overrides for lane/order/item rather than always
  // trusting component state — a chip pushed in the same synchronous
  // handler as setLane/setOrder/setItem (e.g. the "Did not Receive"
  // quick-reply) closes over the pre-update render, so its state reads
  // would still be null/stale when the chip is actually tapped later.
  function handleSubmit(overrides = {}) {
    const journey = journeyRef.current;
    const record = createCase({
      lane: journey?.lane ?? (overrides.lane ?? lane).key,
      order: overrides.order !== undefined ? overrides.order : order,
      item: overrides.item !== undefined ? overrides.item : item,
      description: descriptionRef.current,
      hasPhoto: Boolean(photoFile),
      escalate,
      messages,
      journey,
    });
    caseIdRef.current = record.id;
    pushBot({
      text: "You're all set — we've logged this and the team will take it from here.",
      caseResult: record,
      chips: [
        { key: 'view', label: 'Track This Request', onClick: () => navigate('requestDetail', { caseId: record.id }) },
        { key: 'close', label: "I'm Done", onClick: onClose },
      ],
    });
    setStage('followup');
  }

  return (
    <div className="support-chat">
      <div className="support-chat__transcript">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}
        <div ref={transcriptEndRef} />
      </div>

      <div className="support-chat__composer">
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
        {previewUrl && (
          <div className="support-chat__photo-chip">
            <img src={previewUrl} alt="Attached" />
            <button type="button" className="support-chat__photo-remove" onClick={clearPhoto} aria-label="Remove photo">
              <CloseIcon width="10" height="10" />
            </button>
          </div>
        )}
        <div className="support-chat__composer-row">
          <button type="button" className="support-chat__camera" onClick={() => fileInputRef.current?.click()} aria-label="Attach photo">
            <CameraIcon width="18" height="18" />
          </button>
          <textarea
            className="support-chat__input"
            rows={1}
            placeholder="Type your message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button className="support-chat__send" disabled={!draft.trim()} onClick={handleSend} aria-label="Send">
            <ArrowUpIcon width="16" height="16" />
          </button>
        </div>
      </div>
    </div>
  );
}
