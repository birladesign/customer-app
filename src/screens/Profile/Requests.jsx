import { getAllCases } from '../../data/support.js';
import { getOrderStatus } from '../../data/orders.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import './Requests.css';

// Case status pill — a different domain from OrderDetails' STATUS_PILL (order
// severity dot colors), so it gets its own small local map rather than
// extending that one.
const STATUS_PILL = {
  open: { bg: 'var(--color-warning-tint)', color: 'var(--color-warning)', label: 'In Progress' },
  resolved: { bg: 'var(--color-success-tint)', color: 'var(--color-success)', label: 'Resolved' },
};

export default function Requests() {
  const { goBack } = useNavigation();
  const cases = getAllCases();
  const openCount = cases.filter((c) => c.status === 'open').length;
  const resolvedCount = cases.filter((c) => c.status === 'resolved').length;

  return (
    <div className="requests">
      <header className="requests__topbar">
        <button className="requests__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <div className="requests__title-block">
          <h1>Requests</h1>
          <p className="requests__subtitle">
            {openCount} open · {resolvedCount} resolved
          </p>
        </div>
        <span className="requests__icon-btn-spacer" />
      </header>

      <main className="requests__content">
        {cases.length === 0 ? (
          <div className="requests__empty">
            <p className="requests__empty-title">No Requests Yet</p>
            <p className="requests__empty-body">
              Any return, replacement, warranty, or support case you open will show up here.
            </p>
          </div>
        ) : (
          cases.map((c) => {
            const pill = STATUS_PILL[c.status];
            if (c.legacyOrder) {
              const order = c.legacyOrder;
              return (
                <div className="requests__card" key={order.id}>
                  <div className="requests__card-top">
                    <div className="requests__id-row">
                      <p className="requests__id">{order.id}</p>
                      <span className="requests__pill" style={{ background: pill.bg, color: pill.color }}>
                        {pill.label}
                      </span>
                    </div>
                  </div>
                  <div className="requests__divider" />
                  <p className="requests__ordered-on">Ordered on {order.date}</p>
                  <div className="requests__divider" />
                  <p className="requests__case-title">{getOrderStatus(order).label}</p>
                  {order.caption && <p className="requests__case-desc">{order.caption}</p>}
                  <div className="requests__sla">
                    <strong>Next SLA:</strong> {order.banner?.text ?? "We'll update you as soon as there's progress."}
                  </div>
                </div>
              );
            }
            return (
              <div className="requests__case-card" key={c.id}>
                <div className="requests__card-top">
                  <div className="requests__id-row">
                    <p className="requests__id">{c.id}</p>
                    <span className="requests__pill" style={{ background: pill.bg, color: pill.color }}>
                      {pill.label}
                    </span>
                    {c.escalated && <span className="requests__escalated-badge">Escalated</span>}
                  </div>
                </div>
                <div className="requests__divider" />
                <p className="requests__case-title">
                  {c.laneLabel}
                  {c.orderProduct ? ` · ${c.orderProduct}` : ''}
                </p>
                {c.description && <p className="requests__case-desc">{c.description}</p>}
                <div className="requests__sla">
                  <strong>Next SLA:</strong> {c.slaLabel}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
