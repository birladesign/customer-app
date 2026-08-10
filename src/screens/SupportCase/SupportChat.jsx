import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { CASE_LANES, getOrdersForLane, findOpenCaseForOrder, createCase } from '../../data/support.js';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import { CopyIcon, CheckIcon } from '../../components/icons.jsx';
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

// Replaces the old 5-screen wizard (Category/Order/Describe/Review/Success)
// with a single chat transcript embedded in the Support screen — same
// underlying data/support.js logic (lanes, dedup, classification, Returns
// redirect), just presented as a conversation instead of pushed screens.
export default function SupportChat({ escalate, presetOrder, staleOrderId, onClose }) {
  const { navigate } = useNavigation();
  const idRef = useRef(0);
  const transcriptEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [stage, setStage] = useState('lane'); // lane | order | describe | confirm | done
  const [lane, setLane] = useState(null);
  const [order, setOrder] = useState(null);
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState(null);

  function nextId() {
    idRef.current += 1;
    return idRef.current;
  }

  function pushBot(partial) {
    setMessages((m) => [...m, { id: nextId(), from: 'bot', ...partial }]);
  }

  function pushUser(partial) {
    setMessages((m) => [...m, { id: nextId(), from: 'user', ...partial }]);
  }

  useEffect(() => {
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

  function handleSend() {
    const text = draft.trim();
    if (text.length < MIN_LENGTH) {
      pushBot({ text: `A few more words would help (${text.length}/${MIN_LENGTH}).` });
      return;
    }
    pushUser({ text, photoUrl: photo ? URL.createObjectURL(photo) : null });
    setStage('confirm');
    pushBot({
      text: 'Ready to submit this case?',
      chips: [
        { key: 'submit', label: 'Submit Case', onClick: handleSubmit },
        { key: 'edit', label: 'Keep Editing', onClick: () => setStage('describe') },
      ],
    });
  }

  function handleSubmit() {
    const record = createCase({ lane: lane.key, order, description: draft, hasPhoto: Boolean(photo), escalate });
    setDraft('');
    setPhoto(null);
    pushBot({
      text: 'Case filed.',
      caseResult: record,
      chips: [
        { key: 'view', label: 'View in My Cases', onClick: () => navigate('requests') },
        { key: 'close', label: 'Close', onClick: onClose },
      ],
    });
    setStage('done');
  }

  return (
    <div className="support-chat">
      <div className="support-chat__transcript">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}
        <div ref={transcriptEndRef} />
      </div>

      {stage === 'describe' && (
        <div className="support-chat__composer">
          <PhotoUploadTile onChange={setPhoto} />
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
      )}
    </div>
  );
}
