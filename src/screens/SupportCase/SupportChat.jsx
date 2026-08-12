import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { CASE_LANES, getOrdersForLane, findOpenCaseForOrder, createCase, updateCaseMessages } from '../../data/support.js';
import { useObjectUrlPreview } from '../../hooks/useObjectUrlPreview.js';
import { CopyIcon, CheckIcon, CameraIcon, CloseIcon } from '../../components/icons.jsx';
import './SupportChat.css';

const MIN_LENGTH = 10;
const GENERAL_LANE = CASE_LANES.find((l) => l.key === 'general');

function isReturnEligible(order) {
  return Boolean(order) && getOrdersForLane('returns').some((o) => o.id === order.id);
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
export default function SupportChat({ escalate, presetOrder, staleOrderId, resumeCase, onClose, onTicketReady }) {
  const { navigate } = useNavigation();
  const idRef = useRef(0);
  const seededRef = useRef(false);
  const caseIdRef = useRef(resumeCase?.id ?? null);
  const transcriptEndRef = useRef(null);
  // The most recent bot message that expected a specific answer (chips or an
  // order list) — reshown verbatim if the user types something unrelated
  // instead of tapping it, rather than the flow silently losing its place.
  const pendingPromptRef = useRef(null);

  const [messages, setMessages] = useState(() => resumeCase?.messages ?? []);
  const [stage, setStage] = useState(resumeCase ? 'followup' : 'lane'); // lane | order | describe | confirm | followup
  const [lane, setLane] = useState(null);
  const [order, setOrder] = useState(null);
  const [draft, setDraft] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const fileInputRef = useRef(null);
  const { previewUrl, handleFile, clear: clearPhoto } = useObjectUrlPreview(setPhotoFile);

  function nextId() {
    idRef.current += 1;
    return idRef.current;
  }

  function pushBot(partial) {
    if (partial.chips || partial.orders) pendingPromptRef.current = partial;
    setMessages((m) => [...m, { id: nextId(), from: 'bot', ...partial }]);
  }

  function pushUser(partial) {
    setMessages((m) => [...m, { id: nextId(), from: 'user', ...partial }]);
  }

  useEffect(() => {
    if (resumeCase) onTicketReady?.(resumeCase.id);
    if (seededRef.current || resumeCase) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    if (staleOrderId) {
      pushBot({ text: `We couldn't find order ${staleOrderId} — let's start fresh.` });
    }
    pushBot({
      text: escalate ? "We'll connect you with a specialist. First, what's this about?" : 'Hi! What can we help with?',
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

  function handleSelectLane(selectedLane) {
    pushUser({ text: selectedLane.label });
    setLane(selectedLane);

    if (selectedLane.redirectsTo) {
      if (presetOrder && isReturnEligible(presetOrder)) {
        navigate(selectedLane.redirectsTo, { orderId: presetOrder.id });
        return;
      }
      askForOrder(selectedLane);
      return;
    }

    if (presetOrder) {
      setOrder(presetOrder);
      pushBot({ text: `Got it — this is about ${presetOrder.product} (${presetOrder.id}).` });
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
    pushBot({
      text: 'Which order is this about?',
      orders: candidates,
      allowSkip: selectedLane.key === 'general',
      onSelectOrder: (o) => handleSelectOrder(selectedLane, o),
    });
    setStage('order');
  }

  function handleSelectOrder(selectedLane, selectedOrder) {
    pushUser({ text: selectedOrder ? `${selectedOrder.product} (${selectedOrder.id})` : 'Not related to an order' });

    if (selectedLane.redirectsTo && selectedOrder) {
      navigate(selectedLane.redirectsTo, { orderId: selectedOrder.id });
      return;
    }

    setOrder(selectedOrder);
    askToDescribe(selectedLane, selectedOrder);
  }

  function askToDescribe(selectedLane, selectedOrder) {
    const existingCase = findOpenCaseForOrder(selectedOrder?.id, selectedLane.key);
    if (existingCase) {
      pushBot({
        text: `You already have an open case (${existingCase.id}) for this. You can view it, or keep going to file a new one.`,
        chips: [{ key: 'view', label: 'View existing case', onClick: () => navigate('requests') }],
        tone: 'warning',
      });
    }
    pushBot({ text: 'Tell us what happened — type your message below.' });
    setStage('describe');
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
      const { text: pendingText, chips, orders, allowSkip, onSelectOrder, tone } = pending;
      pushBot({ text: pendingText, chips, orders, allowSkip, onSelectOrder, tone });
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

  function handleSubmit() {
    const record = createCase({ lane: lane.key, order, description: draft, hasPhoto: Boolean(photoFile), escalate, messages });
    caseIdRef.current = record.id;
    onTicketReady?.(record.id);
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
