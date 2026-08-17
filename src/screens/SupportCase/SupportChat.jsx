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
import { useObjectUrlPreview } from '../../hooks/useObjectUrlPreview.js';
import { CopyIcon, CheckIcon, CameraIcon, CloseIcon } from '../../components/icons.jsx';
import './SupportChat.css';

const MIN_LENGTH = 10;
const VISIBLE_ORDER_COUNT = 3;
const GENERAL_LANE = CASE_LANES.find((l) => l.key === 'general');

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
      <button className="support-chat__case-id" onClick={handleCopy}>
        {copied ? <CheckIcon width="13" height="13" strokeWidth="3" /> : <CopyIcon width="13" height="13" />}
        <span>{caseResult.id}</span>
      </button>
      <p className="support-chat__case-sla">{caseResult.slaLabel}</p>
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
export default function SupportChat({ escalate, presetOrder, staleOrderId, resumeCase, intro, onClose, onOrderSelected }) {
  const { navigate } = useNavigation();
  const idRef = useRef(0);
  const seededRef = useRef(false);
  const caseIdRef = useRef(resumeCase?.id ?? null);
  const transcriptEndRef = useRef(null);
  // The most recent bot message that expected a specific answer (chips or an
  // order list) — reshown verbatim if the user types something unrelated
  // instead of tapping it, rather than the flow silently losing its place.
  const pendingPromptRef = useRef(null);
  // Holds whatever text is about to become the case description — either
  // typed through the composer (describe stage) or filled in by a quick
  // chip like "Did not Receive" — so handleSubmit always has a single
  // source of truth regardless of which path produced it.
  const descriptionRef = useRef('');

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
    pushBot({
      text: intro ?? (escalate ? "We'll connect you with a specialist. First, what's this about?" : 'Hi! What can we help with?'),
      chips: CASE_LANES.map((l) => ({ key: l.key, label: l.label, onClick: () => handleSelectLane(l) })),
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
      if (presetOrder && isReturnEligible(presetOrder)) {
        if (needsItemStep(selectedLane, presetOrder)) {
          askForItem(selectedLane, presetOrder);
          return;
        }
        navigate(selectedLane.redirectsTo, { orderId: presetOrder.id });
        return;
      }
      askForOrder(selectedLane);
      return;
    }

    if (presetOrder) {
      setOrder(presetOrder);
      pushBot({ text: `Got it — this is about ${presetOrder.product} (${presetOrder.id}).` });
      if (needsItemStep(selectedLane, presetOrder)) {
        askForItem(selectedLane, presetOrder);
        return;
      }
      askToDescribe(selectedLane, presetOrder);
      return;
    }

    askForOrder(selectedLane);
  }

  function askForOrder(selectedLane) {
    const candidates = getOrdersForLane(selectedLane.key);
    if (candidates.length === 0) {
      pushBot({
        text: 'None of your orders qualify for this category.',
        chips: [{ key: 'general', label: 'File as a general case instead', onClick: () => handleSelectLane(GENERAL_LANE) }],
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

    askToDescribe(selectedLane, selectedOrder);
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

    askToDescribe(selectedLane, selectedOrder, selectedItem);
  }

  function askToDescribe(selectedLane, selectedOrder, selectedItem = null) {
    const existingCase = findOpenCaseForOrder(selectedOrder?.id, selectedLane.key, selectedItem?.sku ?? null);
    if (existingCase) {
      pushBot({
        text: `You already have an open case (${existingCase.id}) for this. You can view it, or keep going to file a new one.`,
        chips: [{ key: 'view', label: 'View existing case', onClick: () => navigate('requests') }],
        tone: 'warning',
      });
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
      text: 'Ready to submit this case?',
      chips: [
        {
          key: 'submit',
          label: 'Submit Case',
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
        text: 'Ready to submit this case?',
        chips: [
          { key: 'submit', label: 'Submit Case', onClick: handleSubmit },
          { key: 'edit', label: 'Keep Editing', onClick: () => setStage('describe') },
        ],
      });
      return;
    }

    if (stage === 'followup') {
      pushUser({ text, photoUrl: attachSentPhoto() });
      pushBot({ text: "Thanks — we've added this to your case. Our team will follow up if there's anything more to share." });
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
    const record = createCase({
      lane: (overrides.lane ?? lane).key,
      order: overrides.order !== undefined ? overrides.order : order,
      item: overrides.item !== undefined ? overrides.item : item,
      description: descriptionRef.current,
      hasPhoto: Boolean(photoFile),
      escalate,
      messages,
    });
    caseIdRef.current = record.id;
    pushBot({
      text: 'Case filed.',
      caseResult: record,
      chips: [
        { key: 'view', label: 'View in My Cases', onClick: () => navigate('requests') },
        { key: 'close', label: 'End Chat', onClick: onClose },
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
          <button className="support-chat__send" disabled={!draft.trim()} onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
