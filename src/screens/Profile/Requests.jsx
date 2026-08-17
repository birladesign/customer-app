import { useState } from 'react';
import { getActiveConversations, getResolvedConversations } from '../../data/support.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import TabBar from '../../components/TabBar.jsx';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import './Requests.css';

const STATUS_PILL = {
  open: { bg: 'var(--color-warning-tint)', color: 'var(--color-warning)', label: 'In Progress' },
  resolved: { bg: 'var(--color-success-tint)', color: 'var(--color-success)', label: 'Resolved' },
};

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
];

function formatCaseDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })} ${d.getFullYear()}`;
}

export default function Requests() {
  const { goBack, navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState('active');
  const activeCases = getActiveConversations();
  const resolvedCases = getResolvedConversations();
  const cases = activeTab === 'active' ? activeCases : resolvedCases;

  return (
    <div className="requests">
      <header className="requests__topbar">
        <button className="requests__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <div className="requests__title-block">
          <h1>Requests</h1>
          <p className="requests__subtitle">
            {activeCases.length} open · {resolvedCases.length} resolved
          </p>
        </div>
        <span className="requests__icon-btn-spacer" />
      </header>

      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} countsByTab={{}} />

      <main className="requests__content">
        {cases.length === 0 ? (
          <div className="requests__empty">
            <p className="requests__empty-title">
              {activeTab === 'active' ? 'No Active Conversations' : 'No Resolved Conversations'}
            </p>
            <p className="requests__empty-body">
              {activeTab === 'active'
                ? 'Any request you raise with our support team will show up here.'
                : "Requests we've wrapped up will show up here."}
            </p>
          </div>
        ) : (
          cases.map((c) => {
            const pill = STATUS_PILL[c.status];
            return (
              <button
                className="requests__card"
                key={c.id}
                onClick={() => navigate('requestDetail', { caseId: c.id })}
              >
                <div className="requests__card-top">
                  <div className="requests__id-row">
                    <p className="requests__id">{c.id}</p>
                    <span className="requests__pill" style={{ background: pill.bg, color: pill.color }}>
                      {pill.label}
                    </span>
                  </div>
                  {c.escalated && <span className="requests__escalated-badge">Escalated</span>}
                </div>
                <div className="requests__divider" />
                <p className="requests__ordered-on">
                  {c.orderId ? `${c.orderId} · ` : ''}Opened {formatCaseDate(c.createdAt)}
                </p>
                <div className="requests__divider" />
                <p className="requests__case-title">{c.laneLabel}</p>
                {(c.itemProduct ?? c.orderProduct) && (
                  <p className="requests__case-desc">{c.itemProduct ?? c.orderProduct}</p>
                )}
                <div className="requests__sla">
                  <strong>Next SLA:</strong> {c.slaLabel}
                </div>
              </button>
            );
          })
        )}
      </main>
    </div>
  );
}
