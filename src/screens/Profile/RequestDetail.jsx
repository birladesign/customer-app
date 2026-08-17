import { useState } from 'react';
import { getCaseById, updateCaseMessages } from '../../data/support.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import './RequestDetail.css';

const STATUS_PILL = {
  open: { bg: 'var(--color-warning-tint)', color: 'var(--color-warning)', label: 'In Progress' },
  resolved: { bg: 'var(--color-success-tint)', color: 'var(--color-success)', label: 'Resolved' },
};

const QUICK_REPLIES = ['Any update on this?', 'Please escalate this request'];

function formatCaseDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })} ${d.getFullYear()}`;
}

export default function RequestDetail({ params }) {
  const { goBack } = useNavigation();
  const kase = getCaseById(params.caseId);
  const [reply, setReply] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [messages, setMessages] = useState(() => kase?.messages ?? []);

  if (!kase) {
    return (
      <div className="request-detail">
        <header className="request-detail__topbar">
          <button className="request-detail__icon-btn" onClick={goBack} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          <h1>Request</h1>
          <span className="request-detail__icon-btn-spacer" />
        </header>
        <p className="request-detail__not-found">Request not found.</p>
      </div>
    );
  }

  const isResolved = kase.status === 'resolved';
  const pill = STATUS_PILL[kase.status];
  const canReply = !isResolved;

  function handleSend() {
    const text = reply.trim();
    if (!text && !photo) return;
    const photoUrl = photo ? URL.createObjectURL(photo) : null;
    const next = [...messages, { id: messages.length + 1, from: 'user', text, photoUrl }];
    setMessages(next);
    updateCaseMessages(kase.id, next);
    setReply('');
    setPhoto(null);
    setPhotoKey((k) => k + 1);
  }

  return (
    <div className="request-detail">
      <header className="request-detail__topbar">
        <button className="request-detail__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Request Details</h1>
        <span className="request-detail__icon-btn-spacer" />
      </header>

      <main className="request-detail__content">
        <div className="request-detail__header-card">
          <div className="request-detail__id-row">
            <p className="request-detail__id">{kase.id}</p>
            <span className="request-detail__pill" style={{ background: pill.bg, color: pill.color }}>
              {pill.label}
            </span>
          </div>
          {kase.orderId && <p className="request-detail__ordered-on">Order {kase.orderId}</p>}
          <p className="request-detail__case-title">{kase.laneLabel}</p>
          {(kase.itemProduct ?? kase.orderProduct) && (
            <p className="request-detail__case-desc">{kase.itemProduct ?? kase.orderProduct}</p>
          )}
        </div>

        <div className="request-detail__meta-grid">
          <div className="request-detail__meta-cell">
            <span className="request-detail__meta-label">Request ID</span>
            <span className="request-detail__meta-value">{kase.id}</span>
          </div>
          <div className="request-detail__meta-cell">
            <span className="request-detail__meta-label">Opened</span>
            <span className="request-detail__meta-value">{formatCaseDate(kase.createdAt)}</span>
          </div>
          <div className="request-detail__meta-cell">
            <span className="request-detail__meta-label">Owner</span>
            <span className="request-detail__meta-value">Support Team</span>
          </div>
          <div className="request-detail__meta-cell">
            <span className="request-detail__meta-label">Next SLA</span>
            <span className="request-detail__meta-value">{kase.slaLabel}</span>
          </div>
        </div>

        <section className="request-detail__activity">
          <p className="request-detail__section-heading">Conversation</p>
          {messages.length === 0 ? (
            <p className="request-detail__activity-empty">No messages yet.</p>
          ) : (
            <div className="request-detail__activity-list">
              {messages.map((msg) => (
                <div className="request-detail__activity-item" key={msg.id}>
                  <span className="request-detail__activity-dot" />
                  <div className="request-detail__activity-body">
                    <div className="request-detail__activity-meta">
                      <strong>{msg.from === 'user' ? 'You' : 'Support Team'}</strong>
                    </div>
                    {msg.text && <p className="request-detail__activity-text">{msg.text}</p>}
                    {msg.photoUrl && (
                      <img className="request-detail__activity-photo" src={msg.photoUrl} alt="Attachment" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {canReply && (
          <section className="request-detail__reply">
            <p className="request-detail__section-heading">Your Message</p>
            <textarea
              className="request-detail__reply-input"
              placeholder="Share an update, ask a question or add context for the team handling this request…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
            />
            <div className="request-detail__quick-replies">
              {QUICK_REPLIES.map((q) => (
                <button key={q} className="request-detail__quick-chip" onClick={() => setReply(q)}>
                  {q}
                </button>
              ))}
            </div>
            <PhotoUploadTile key={photoKey} onChange={setPhoto} />
            <button className="request-detail__send" disabled={!reply.trim() && !photo} onClick={handleSend}>
              Send Reply
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
