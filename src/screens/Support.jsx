import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { FAQ_ITEMS, CONTACT, getAllCases } from '../data/support.js';
import { ORDERS } from '../data/orders.js';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import SearchAndFilterBar from '../components/SearchAndFilterBar.jsx';
import { HouseIcon, ChevronDownIcon } from '../components/icons.jsx';
import SupportChat from './SupportCase/SupportChat.jsx';
import './Support.css';

const STATUS_PILL = {
  open: { bg: 'var(--color-warning-tint)', color: 'var(--color-warning)', label: 'In Progress' },
  resolved: { bg: 'var(--color-success-tint)', color: 'var(--color-success)', label: 'Resolved' },
};

// A cross-tab deep link (My Orders' "Need Help", Order Details' "Get Help")
// hands the chat its starting state via switchTab params, same shape the old
// pushed supportCase route used to take (see git history) — resolved once at
// mount so re-rendering never re-derives a stale preset order.
function initialChatConfig(params) {
  if (!params.openChat) return null;
  const presetOrder = params.orderId ? ORDERS.find((o) => o.id === params.orderId) : null;
  const staleOrderId = params.orderId && !presetOrder ? params.orderId : null;
  return { escalate: Boolean(params.escalate), presetOrder, staleOrderId };
}

export default function Support({ params = {} }) {
  const { switchTab, navigate } = useNavigation();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [chatConfig, setChatConfig] = useState(() => initialChatConfig(params));

  const recentCases = getAllCases().slice(0, 3);

  const q = query.trim().toLowerCase();
  const filteredFaqs = q
    ? FAQ_ITEMS.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
    : FAQ_ITEMS;

  if (chatConfig) {
    return (
      <div className="support">
        <header className="support__topbar">
          <button className="support__icon-btn" onClick={() => switchTab('home')} aria-label="Home">
            <HouseIcon width="18" height="18" />
          </button>
          <h1>{chatConfig.escalate ? 'Talk to a Human' : 'Raise a New Case'}</h1>
          <button className="support__close-btn" onClick={() => setChatConfig(null)}>
            Close
          </button>
        </header>
        <SupportChat
          escalate={chatConfig.escalate}
          presetOrder={chatConfig.presetOrder}
          staleOrderId={chatConfig.staleOrderId}
          onClose={() => setChatConfig(null)}
        />
      </div>
    );
  }

  return (
    <div className="support">
      <header className="support__topbar">
        <button className="support__icon-btn" onClick={() => switchTab('home')} aria-label="Home">
          <HouseIcon width="18" height="18" />
        </button>
        <h1>Support</h1>
      </header>

      <main className="support__content">
        <div className="support__hero">
          <p className="support__hero-heading">Talk to a Human</p>
          <p className="support__hero-body">
            We'll package your order, issue, and evidence so you don't have to repeat yourself.
          </p>
          <button className="support__hero-primary" onClick={() => setChatConfig({ escalate: true, presetOrder: null, staleOrderId: null })}>
            Talk to a Human
          </button>
          <button className="support__hero-secondary" onClick={() => setChatConfig({ escalate: false, presetOrder: null, staleOrderId: null })}>
            Raise a New Case
          </button>
        </div>

        <section className="support__section">
          <div className="support__section-heading">
            <h2>Your Cases</h2>
            <button className="support__see-all" onClick={() => navigate('requests')}>
              See all
            </button>
          </div>
          {recentCases.length === 0 ? (
            <p className="support__cases-empty">No cases yet.</p>
          ) : (
            <div className="support__cases-list">
              {recentCases.map((c) => {
                const pill = STATUS_PILL[c.status] ?? STATUS_PILL.open;
                return (
                  <button key={c.id} className="support__case-row" onClick={() => navigate('requests')}>
                    <span className="support__case-row-text">
                      <span className="support__case-row-id">{c.id}</span>
                      <span className="support__case-row-meta">{c.laneLabel ?? c.orderProduct ?? 'General'}</span>
                    </span>
                    <span className="support__case-row-pill" style={{ background: pill.bg, color: pill.color }}>
                      {pill.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="support__section">
          <h2>Frequently Asked</h2>
          <SearchAndFilterBar query={query} onQueryChange={setQuery} activeFilterCount={0} placeholder="Search help topics" />

          {filteredFaqs.length === 0 ? (
            <div className="support__faq-empty">
              <p className="support__faq-empty-title">No results for &quot;{query}&quot;</p>
              <button
                className="support__faq-empty-cta"
                onClick={() => setChatConfig({ escalate: false, presetOrder: null, staleOrderId: null })}
              >
                Raise a case instead
              </button>
            </div>
          ) : (
            <div className="support__faq-list">
              {filteredFaqs.map((item) => {
                const isOpen = openId === item.id;
                return (
                  <div className="support__faq-item" key={item.id}>
                    <button
                      className="support__faq-question"
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      aria-expanded={isOpen}
                    >
                      <span>{item.question}</span>
                      <ChevronDownIcon
                        className={`support__faq-chevron${isOpen ? ' support__faq-chevron--open' : ''}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
                          style={{ overflow: 'hidden' }}
                        >
                          <p className="support__faq-answer">{item.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="support__section">
          <h2>Still need help?</h2>
          <div className="support__contact-list">
            <a className="support__contact-row" href={`tel:${CONTACT.phone}`}>
              <span className="support__contact-text">
                <span className="support__contact-label">Call Us</span>
                <span className="support__contact-value">
                  {CONTACT.phoneDisplay} · {CONTACT.hours}
                </span>
              </span>
            </a>
            <a className="support__contact-row" href={`mailto:${CONTACT.email}`}>
              <span className="support__contact-text">
                <span className="support__contact-label">Email Us</span>
                <span className="support__contact-value">{CONTACT.email}</span>
              </span>
            </a>
            <a
              className="support__contact-row"
              href={`https://wa.me/${CONTACT.whatsapp.replace('+', '')}`}
              target="_blank"
              rel="noreferrer"
            >
              <span className="support__contact-text">
                <span className="support__contact-label">WhatsApp</span>
                <span className="support__contact-value">{CONTACT.whatsappDisplay}</span>
              </span>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
