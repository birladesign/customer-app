import { useState } from 'react';
import { getCaseById, getOpenCaseForOrder, updateCaseMessages } from '../../data/support.js';
import { ORDERS } from '../../data/orders.js';
import { CURRENT_USER } from '../../data/profile.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import PhotoUploadTile from '../../components/PhotoUploadTile.jsx';
import { ChevronLeftIcon, UserIcon, PhoneIcon } from '../../components/icons.jsx';
import './RequestDetail.css';

const STATUS_PILL = {
  open: { bg: 'var(--color-warning-tint)', color: 'var(--color-warning)', label: 'In Progress' },
  resolved: { bg: 'var(--color-success-tint)', color: 'var(--color-success)', label: 'Resolved' },
};

function formatRupees(amount) {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

const QUICK_REPLIES = ['Any update on this?', 'Please escalate this request'];

function formatCaseDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })} ${d.getFullYear()}`;
}

export default function RequestDetail({ params }) {
  const { goBack } = useNavigation();
  const kase = params.caseId ? getCaseById(params.caseId) : getOpenCaseForOrder(params.orderId);
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
  const exchange = kase.exchange;
  const order = exchange && kase.orderId ? ORDERS.find((o) => o.id === kase.orderId) : null;

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

        {exchange && (
          <section className="request-detail__exchange">
            <p className="request-detail__section-heading">Exchange Summary</p>

            <div className="request-detail__exchange-cards">
              <div className="request-detail__exchange-card">
                <span className="request-detail__exchange-label request-detail__exchange-label--refund">Returned</span>
                <div className="request-detail__exchange-item">
                  <img src={exchange.returnedItem.image} alt={exchange.returnedItem.product} />
                  <div className="request-detail__exchange-item-text">
                    <p className="request-detail__exchange-item-name">{exchange.returnedItem.product}</p>
                    <p className="request-detail__exchange-item-spec">
                      {exchange.returnedItem.spec} &middot; Qty {exchange.returnedItem.qty}
                    </p>
                  </div>
                </div>
                <div className="request-detail__exchange-lines">
                  <div className="request-detail__exchange-line">
                    <span>Item Price</span>
                    <span>{formatRupees(exchange.returnedItem.price)}</span>
                  </div>
                  {exchange.returnedItem.discounts.map((d) => (
                    <div className="request-detail__exchange-line" key={d.label}>
                      <span>{d.label}</span>
                      <span>&minus;{formatRupees(d.amount)}</span>
                    </div>
                  ))}
                  <div className="request-detail__exchange-line request-detail__exchange-line--total">
                    <span>Refund Amount</span>
                    <span className="request-detail__exchange-amount--refund">
                      {formatRupees(exchange.returnedItem.refund)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="request-detail__exchange-card">
                <span className="request-detail__exchange-label request-detail__exchange-label--charge">New Item</span>
                <div className="request-detail__exchange-item">
                  <img src={exchange.newItem.image} alt={exchange.newItem.product} />
                  <div className="request-detail__exchange-item-text">
                    <p className="request-detail__exchange-item-name">{exchange.newItem.product}</p>
                    <p className="request-detail__exchange-item-spec">
                      {exchange.newItem.spec} &middot; Qty {exchange.newItem.qty}
                    </p>
                  </div>
                </div>
                <div className="request-detail__exchange-lines">
                  <div className="request-detail__exchange-line">
                    <span>Item Price</span>
                    <span>{formatRupees(exchange.newItem.price)}</span>
                  </div>
                  {exchange.newItem.carriedDiscounts.map((d) => (
                    <div className="request-detail__exchange-line" key={d.label}>
                      <span>{d.label}</span>
                      <span>&minus;{formatRupees(d.amount)}</span>
                    </div>
                  ))}
                  <div className="request-detail__exchange-line request-detail__exchange-line--total">
                    <span>New Item Total</span>
                    <span className="request-detail__exchange-amount--charge">
                      {formatRupees(exchange.newItem.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="request-detail__exchange-final">
              <p className="request-detail__exchange-final-heading">Final Calculation</p>
              <div className="request-detail__exchange-line">
                <span>Refund for returned item</span>
                <span>&minus;{formatRupees(exchange.returnedItem.refund)}</span>
              </div>
              <div className="request-detail__exchange-line">
                <span>New item total</span>
                <span>+{formatRupees(exchange.newItem.total)}</span>
              </div>
              {exchange.adjustments.map((a) => (
                <div className="request-detail__exchange-line" key={a.label}>
                  <span>{a.label}</span>
                  <span>{a.amount === 0 ? 'FREE' : `${a.amount > 0 ? '+' : '−'}${formatRupees(a.amount)}`}</span>
                </div>
              ))}
              <div className="request-detail__exchange-divider" />
              <div className="request-detail__exchange-line request-detail__exchange-line--total">
                <span>{exchange.youPay >= 0 ? 'You Pay' : "You'll Be Refunded"}</span>
                <span className="request-detail__exchange-amount--due">{formatRupees(exchange.youPay)}</span>
              </div>
            </div>

            <div className="request-detail__exchange-payment">
              <div className="request-detail__exchange-payment-row">
                <span>Payment Status</span>
                <span className="request-detail__exchange-status--paid">{exchange.paymentStatus}</span>
              </div>
              <div className="request-detail__exchange-payment-row">
                <span>Paid via {exchange.transaction.method}</span>
                <span>{formatRupees(exchange.youPay)}</span>
              </div>
              <p className="request-detail__exchange-payment-meta">
                {exchange.transaction.reference} &middot; {exchange.transaction.paidOn}
              </p>
            </div>

            {order?.address && (
              <div className="request-detail__exchange-address">
                <p className="request-detail__section-heading">Delivery Address</p>
                <div className="request-detail__exchange-address-card">
                  <div className="request-detail__exchange-address-row">
                    <UserIcon width="15" height="15" />
                    <div>
                      <p className="request-detail__exchange-address-name">
                        {CURRENT_USER.firstName} {CURRENT_USER.lastName}
                      </p>
                      <p className="request-detail__exchange-address-value">{order.address}</p>
                    </div>
                  </div>
                  <div className="request-detail__exchange-address-divider" />
                  <div className="request-detail__exchange-address-row">
                    <PhoneIcon width="14" height="14" />
                    <span>+91 {CURRENT_USER.phone}</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

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
