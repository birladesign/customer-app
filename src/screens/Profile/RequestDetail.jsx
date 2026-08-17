import { useState } from 'react';
import { ORDERS, getOrderStatus } from '../../data/orders.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import './RequestDetail.css';

const STATUS_PILL = {
  open: { bg: 'var(--color-warning-tint)', color: 'var(--color-warning)', label: 'In Progress' },
  resolved: { bg: 'var(--color-success-tint)', color: 'var(--color-success)', label: 'Resolved' },
};

const QUICK_REPLIES = ['Any update on this?', 'Please escalate this case'];

// Every step's updates, oldest first, each tagged with the step it belongs
// to — the same timeline data OrderDetails' tracker reads, just flattened
// into a case activity log instead of a stepper.
function buildActivity(timeline) {
  if (!timeline) return [];
  return timeline.steps.flatMap((step) =>
    (step.updates ?? []).map((update) => ({
      ...update,
      author: update.author ?? 'System',
      stepLabel: step.label,
    }))
  );
}

export default function RequestDetail({ params }) {
  const { goBack } = useNavigation();
  const order = ORDERS.find((o) => o.id === params.orderId);
  const [reply, setReply] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [activity, setActivity] = useState(() => buildActivity(order?.timeline));

  if (!order) {
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

  const isResolved = order.section === 'closed';
  const pill = STATUS_PILL[isResolved ? 'resolved' : 'open'];
  const status = getOrderStatus(order);
  const nextSla = order.disabledReason ?? order.banner?.text ?? "We'll update you as soon as there's progress.";
  const canReply = !isResolved;

  function handleSend() {
    const text = reply.trim();
    if (!text && !photo) return;
    const photoUrl = photo ? URL.createObjectURL(photo) : null;
    setActivity((prev) => [
      ...prev,
      { author: 'You', text, timestamp: 'Just now', photo: photoUrl, stepLabel: status.label },
    ]);
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
            <p className="request-detail__id">{order.id}</p>
            <span className="request-detail__pill" style={{ background: pill.bg, color: pill.color }}>
              {pill.label}
            </span>
          </div>
          <p className="request-detail__ordered-on">Ordered on {order.date}</p>
          <p className="request-detail__case-title">{status.label}</p>
          {order.caption && <p className="request-detail__case-desc">{order.caption}</p>}
        </div>

        <div className="request-detail__meta-grid">
          <div className="request-detail__meta-cell">
            <span className="request-detail__meta-label">Order ID</span>
            <span className="request-detail__meta-value">{order.id}</span>
          </div>
          <div className="request-detail__meta-cell">
            <span className="request-detail__meta-label">Opened</span>
            <span className="request-detail__meta-value">{order.date}</span>
          </div>
          <div className="request-detail__meta-cell">
            <span className="request-detail__meta-label">Owner</span>
            <span className="request-detail__meta-value">Returns Team</span>
          </div>
          <div className="request-detail__meta-cell">
            <span className="request-detail__meta-label">Next SLA</span>
            <span className="request-detail__meta-value">{nextSla}</span>
          </div>
        </div>

        <section className="request-detail__activity">
          <p className="request-detail__section-heading">Activity</p>
          {activity.length === 0 ? (
            <p className="request-detail__activity-empty">No activity yet.</p>
          ) : (
            <div className="request-detail__activity-list">
              {activity.map((item, i) => (
                <div className="request-detail__activity-item" key={i}>
                  <span className="request-detail__activity-dot" />
                  <div className="request-detail__activity-body">
                    <div className="request-detail__activity-meta">
                      <strong>{item.author}</strong>
                      <span>{item.timestamp}</span>
                    </div>
                    {item.text && <p className="request-detail__activity-text">{item.text}</p>}
                    {item.photo && <img className="request-detail__activity-photo" src={item.photo} alt="Attachment" />}
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
              placeholder="Share an update, ask a question or add context for the team handling this case…"
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
