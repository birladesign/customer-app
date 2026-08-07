import { getRequestOrders } from '../../data/profile.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { ChevronLeftIcon, ChevronRightIcon, ShieldIcon } from '../../components/icons.jsx';
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
  const cases = getRequestOrders().map((order) => ({
    order,
    state: order.section === 'closed' ? 'resolved' : 'open',
  }));
  const openCount = cases.filter((c) => c.state === 'open').length;
  const resolvedCount = cases.filter((c) => c.state === 'resolved').length;

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
            <span className="requests__empty-icon">
              <ShieldIcon width="28" height="28" />
            </span>
            <p className="requests__empty-title">No Requests Yet</p>
            <p className="requests__empty-body">
              Any return, replacement, or warranty case you open will show up here.
            </p>
          </div>
        ) : (
          cases.map(({ order, state }) => {
            const pill = STATUS_PILL[state];
            return (
              <div className="requests__card" key={order.id}>
                <div className="requests__card-top">
                  <div className="requests__id-row">
                    <p className="requests__id">{order.id}</p>
                    <span className="requests__pill" style={{ background: pill.bg, color: pill.color }}>
                      {pill.label}
                    </span>
                  </div>
                  <ChevronRightIcon className="requests__chevron" aria-hidden="true" />
                </div>
                <div className="requests__divider" />
                <p className="requests__ordered-on">Ordered on {order.date}</p>
                <div className="requests__divider" />
                <p className="requests__case-title">{order.status.label}</p>
                {order.caption && <p className="requests__case-desc">{order.caption}</p>}
                <div className="requests__sla">
                  <strong>Next SLA:</strong> {order.banner?.text ?? "We'll update you as soon as there's progress."}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
