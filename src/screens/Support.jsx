import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import {
  FAQ_ITEMS,
  FAQ_CATEGORIES,
  CONTACT,
  getActiveConversations,
  getOrdersForHelp,
  getRefundBannerLabel,
  getOrderStatus,
} from '../data/support.js';
import { ORDERS } from '../data/orders.js';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import SearchAndFilterBar from '../components/SearchAndFilterBar.jsx';
import { HouseIcon, ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon, PackageIcon, CopyIcon, CheckIcon } from '../components/icons.jsx';
import SupportChat from './SupportCase/SupportChat.jsx';
import './Support.css';

// A cross-tab deep link (My Orders' "Need Help", Order Details' "Get Help")
// hands the chat its starting state via switchTab params.
function initialChatConfig(params) {
  if (!params.openChat) return null;
  const presetOrder = params.orderId ? ORDERS.find((o) => o.id === params.orderId) : null;
  const staleOrderId = params.orderId && !presetOrder ? params.orderId : null;
  return { escalate: Boolean(params.escalate), presetOrder, staleOrderId, resumeCase: null };
}

function formatConversationDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })} ${d.getFullYear()}, ${time}`;
}

function formatRupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// A plain dot reads clearly next to a "Delivered" status label without a
// dedicated checkmark icon import just for this one card.
function DeliveredDot() {
  return <span className="support__order-help-check" aria-hidden="true" />;
}

function OrderHelpCard({ order, onClick }) {
  const status = getOrderStatus(order);
  const delivered = /Delivered/.test(status.label);
  const banner = getRefundBannerLabel(order);
  const thumbs = order.items ? order.items.slice(0, 5).map((i) => i.image) : [order.image];
  const price = order.priceBreakup?.total ?? order.amount;

  return (
    <button className="support__order-help-card" onClick={onClick}>
      {banner && <span className="support__order-help-banner">{banner}</span>}
      <div className="support__order-help-row">
        <span className="support__order-help-status">
          {delivered && <DeliveredDot />}
          {status.label}
        </span>
        {typeof price === 'number' && <span className="support__order-help-amount">{formatRupees(price)}</span>}
      </div>
      <p className="support__order-help-date">Placed on {order.date}</p>
      <div className="support__order-help-thumbs">
        {thumbs.map((src, i) => (
          <img key={i} src={src} alt="" />
        ))}
      </div>
    </button>
  );
}

export default function Support({ params = {} }) {
  const { switchTab } = useNavigation();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [chatConfig, setChatConfig] = useState(() => initialChatConfig(params));
  const [ticketId, setTicketId] = useState(() => initialChatConfig(params)?.resumeCase?.id ?? null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  function openChat(config) {
    setTicketId(config.resumeCase?.id ?? null);
    setChatConfig(config);
  }

  function closeChat() {
    setChatConfig(null);
    setTicketId(null);
  }

  async function handleCopyTicket() {
    try {
      await navigator.clipboard.writeText(ticketId);
    } catch {
      // Clipboard API unavailable — the checkmark still confirms the tap.
    }
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 1200);
  }

  if (chatConfig) {
    return (
      <div className="support">
        <header className="support__topbar">
          <button className="support__icon-btn" onClick={() => switchTab('home')} aria-label="Home">
            <HouseIcon width="18" height="18" />
          </button>
          <div className="support__topbar-titles">
            <h1>
              {chatConfig.escalate ? 'Talk to a Human' : 'Raise a New Case'}
              {chatConfig.escalate && <span className="support__priority-badge">Priority</span>}
            </h1>
            {ticketId && (
              <button className="support__ticket-id" onClick={handleCopyTicket}>
                {copiedTicket ? <CheckIcon width="11" height="11" strokeWidth="3" /> : <CopyIcon width="11" height="11" />}
                <span>{ticketId}</span>
              </button>
            )}
          </div>
          <button className="support__close-btn" onClick={closeChat}>
            End Chat
          </button>
        </header>
        <SupportChat
          escalate={chatConfig.escalate}
          presetOrder={chatConfig.presetOrder}
          staleOrderId={chatConfig.staleOrderId}
          resumeCase={chatConfig.resumeCase}
          onClose={closeChat}
          onTicketReady={setTicketId}
        />
      </div>
    );
  }

  const activeConversations = getActiveConversations();
  const helpOrders = getOrdersForHelp(3);

  const q = query.trim().toLowerCase();
  const searchResults = q
    ? FAQ_ITEMS.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
    : null;
  const categoryItems = activeCategory ? FAQ_ITEMS.filter((f) => f.category === activeCategory) : null;
  const visibleFaqs = searchResults ?? categoryItems;

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
          <button
            className="support__hero-primary"
            onClick={() => openChat({ escalate: true, presetOrder: null, staleOrderId: null, resumeCase: null })}
          >
            Talk to a Human
          </button>
          <button
            className="support__hero-secondary"
            onClick={() => openChat({ escalate: false, presetOrder: null, staleOrderId: null, resumeCase: null })}
          >
            Raise a New Case
          </button>
        </div>

        {activeConversations.length > 0 && (
          <section className="support__section">
            <h2>Active Conversations</h2>
            <div className="support__conversation-list">
              {activeConversations.map((c) => (
                <button
                  key={c.id}
                  className="support__conversation-row"
                  onClick={() => openChat({ escalate: c.escalated, presetOrder: null, staleOrderId: null, resumeCase: c })}
                >
                  <span className="support__conversation-icon">
                    <PackageIcon width="18" height="18" />
                  </span>
                  <span className="support__conversation-text">
                    <span className="support__conversation-title">
                      {c.laneLabel}
                      {c.orderProduct ? ` · ${c.orderProduct}` : ''}
                    </span>
                    <span className="support__conversation-date">{formatConversationDate(c.createdAt)}</span>
                  </span>
                  <ChevronRightIcon className="support__conversation-chevron" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="support__section">
          <div className="support__section-heading">
            <h2>Get Help on Orders</h2>
            <button className="support__see-all" onClick={() => switchTab('orders')}>
              See All
            </button>
          </div>
          {helpOrders.length === 0 ? (
            <p className="support__cases-empty">No orders yet.</p>
          ) : (
            <div className="support__order-help-list">
              {helpOrders.map((order) => (
                <OrderHelpCard
                  key={order.id}
                  order={order}
                  onClick={() => openChat({ escalate: false, presetOrder: order, staleOrderId: null, resumeCase: null })}
                />
              ))}
            </div>
          )}
        </section>

        <section className="support__section">
          <div className="support__section-heading">
            <h2>Frequently Asked</h2>
            {activeCategory && !q && (
              <button className="support__see-all" onClick={() => setActiveCategory(null)}>
                <ChevronLeftIcon width="14" height="14" />
                Categories
              </button>
            )}
          </div>
          <SearchAndFilterBar query={query} onQueryChange={setQuery} placeholder="Search help topics" />

          {q && visibleFaqs.length === 0 ? (
            <div className="support__faq-empty">
              <p className="support__faq-empty-title">No results for &quot;{query}&quot;</p>
              <button
                className="support__faq-empty-cta"
                onClick={() => openChat({ escalate: false, presetOrder: null, staleOrderId: null, resumeCase: null })}
              >
                Raise a case instead
              </button>
            </div>
          ) : !q && !activeCategory ? (
            <div className="support__faq-categories">
              {FAQ_CATEGORIES.map((cat) => (
                <button key={cat.key} className="support__faq-category-row" onClick={() => setActiveCategory(cat.key)}>
                  <span>{cat.label}</span>
                  <ChevronRightIcon aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <div className="support__faq-list">
              {visibleFaqs.map((item) => {
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
