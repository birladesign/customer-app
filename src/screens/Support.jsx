import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import {
  FAQ_ITEMS,
  FAQ_CATEGORIES,
  CONTACT,
  USER_CASES,
  getActiveConversations,
  getOrdersForHelp,
  getRefundBannerLabel,
  getRefundOrders,
  getOrderStatus,
} from '../data/support.js';
import { ORDERS, splitProductSpec } from '../data/orders.js';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import SearchAndFilterBar from '../components/SearchAndFilterBar.jsx';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  TruckIcon,
  WrenchIcon,
  PackageIcon,
  WalletIcon,
  HelpCircleIcon,
} from '../components/icons.jsx';
import SupportChat from './SupportCase/SupportChat.jsx';
import './Support.css';

const CHAT_INTRO = {
  chat: "We'll connect you with a specialist over chat. First, what's this about?",
};

// One glance at the icon should say what kind of conversation this is,
// before reading a word of the label — logistics/tech/returns/refunds each
// get their own, "general" falls back to a plain question mark.
const LANE_ICON = {
  logistics: TruckIcon,
  tech: WrenchIcon,
  returns: PackageIcon,
  refunds: WalletIcon,
  general: HelpCircleIcon,
};

// A cross-tab deep link (My Orders' "Need Help", Order Details' "Get Help",
// Order Details' "Support Ticket" banner) hands the chat its starting state
// via switchTab params.
function initialChatConfig(params) {
  if (params.resumeCaseId) {
    const resumeCase = USER_CASES.find((c) => c.id === params.resumeCaseId) ?? null;
    if (resumeCase) return { escalate: resumeCase.escalated, presetOrder: null, presetShipment: null, staleOrderId: null, resumeCase };
  }
  if (!params.openChat) return null;
  const presetOrder = params.orderId ? ORDERS.find((o) => o.id === params.orderId) : null;
  // A shipment card's own "Need Help" hands over every sibling order in the
  // shipment (order.shipmentId) rather than one — the chat then shows the
  // whole shipment up front and lets the customer pick which product it's
  // actually about, instead of assuming the first unit.
  const presetShipment = params.shipmentId ? ORDERS.filter((o) => o.shipmentId === params.shipmentId) : null;
  const staleOrderId = params.orderId && !presetOrder ? params.orderId : null;
  return {
    escalate: Boolean(params.escalate),
    presetOrder,
    presetShipment,
    staleOrderId,
    resumeCase: null,
    // Set when the customer picked a topic on the order itself — the chat
    // then opens straight onto that lane's intents instead of re-asking
    // something they've already answered.
    presetLaneKey: params.laneKey ?? null,
  };
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

// Pinned in the chat topbar itself, right next to the back button, for the
// whole conversation — previously the order was only ever named once, in a
// bot message that scrolled away with the rest of the transcript, so there
// was nothing to check back against once you'd scrolled a few messages down.
// Just enough to identify which order this is: image, name, shipment id —
// price and status belong to the order itself, not to a support chat about it.
function ChatOrderSummary({ order }) {
  const { name } = splitProductSpec(order.product);
  return (
    <div className="support__chat-order-summary">
      <img className="support__chat-order-summary-image" src={order.image} alt="" />
      <div className="support__chat-order-summary-details">
        <p className="support__chat-order-summary-name">{name}</p>
        <p className="support__chat-order-summary-id">{order.shipmentId ?? order.id}</p>
      </div>
    </div>
  );
}

// Same pinned-header treatment as ChatOrderSummary, for the window between
// opening chat on a whole shipment and the customer actually picking which
// product it's about — shows the shipment as a group rather than guessing
// at one representative order.
function ChatShipmentSummary({ orders }) {
  const [first] = orders;
  return (
    <div className="support__chat-order-summary">
      <img className="support__chat-order-summary-image" src={first.image} alt="" />
      <div className="support__chat-order-summary-details">
        <p className="support__chat-order-summary-name">{orders.length} Items</p>
        <p className="support__chat-order-summary-id">{first.shipmentId}</p>
      </div>
    </div>
  );
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

// Support hub's "Refunds" widget — a quick status check for money already in
// motion, separate from "Get Help on Orders" (which is about starting a new
// request). Tapping goes straight to that order's own Bill Summary rather
// than into chat, since there's nothing to ask yet if the refund's already
// moving on schedule.
function RefundCard({ order, onClick }) {
  const banner = getRefundBannerLabel(order);
  const { name } = splitProductSpec(order.product);

  return (
    <button className="support__order-help-card" onClick={onClick}>
      <span className="support__order-help-banner">{banner}</span>
      <div className="support__order-help-row">
        <span className="support__order-help-status">{name}</span>
        <span className="support__order-help-amount">{formatRupees(order.refund.amount)}</span>
      </div>
      <p className="support__order-help-date">
        {banner === 'Refund Completed' ? 'Credited' : 'Expected'} {order.refund.expectedDate}
      </p>
    </button>
  );
}

export default function Support({ params = {} }) {
  const { navigate, switchTab, setHideTabBar } = useNavigation();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [chatConfig, setChatConfig] = useState(() => initialChatConfig(params));
  const [chatOrderId, setChatOrderId] = useState(
    () => initialChatConfig(params)?.presetOrder?.id ?? initialChatConfig(params)?.resumeCase?.orderId ?? null
  );
  // The bottom tab bar has no place in a conversation — Support stays at its
  // tab root the whole time (chat is just local state, not a pushed route),
  // so nothing else would ever hide it otherwise. Cleared on unmount too, in
  // case the tab bar's own "Support" tap remounts this screen mid-chat.
  useEffect(() => {
    setHideTabBar(Boolean(chatConfig));
    return () => setHideTabBar(false);
  }, [chatConfig, setHideTabBar]);

  function openChat(config) {
    setChatOrderId(config.presetOrder?.id ?? config.resumeCase?.orderId ?? null);
    setChatConfig(config);
  }

  function closeChat() {
    setChatConfig(null);
    setChatOrderId(null);
  }

  if (chatConfig) {
    const chatOrder = chatOrderId ? ORDERS.find((o) => o.id === chatOrderId) : null;
    return (
      <div className="support">
        <header className="support__topbar support__topbar--chat">
          <button className="support__icon-btn" onClick={closeChat} aria-label="Back">
            <ChevronLeftIcon />
          </button>
          {chatOrder ? (
            <ChatOrderSummary order={chatOrder} />
          ) : chatConfig.presetShipment?.length > 1 ? (
            <ChatShipmentSummary orders={chatConfig.presetShipment} />
          ) : (
            chatOrderId && <span className="support__chat-order-id">Order ID: {chatOrderId}</span>
          )}
        </header>
        <SupportChat
          escalate={chatConfig.escalate}
          presetOrder={chatConfig.presetOrder}
          presetShipment={chatConfig.presetShipment}
          presetLaneKey={chatConfig.presetLaneKey}
          staleOrderId={chatConfig.staleOrderId}
          resumeCase={chatConfig.resumeCase}
          intro={chatConfig.intro}
          onClose={closeChat}
          onOrderSelected={(order) => setChatOrderId(order.id)}
        />
      </div>
    );
  }

  const activeConversations = getActiveConversations();
  const visibleConversations = activeConversations.slice(0, 2);
  const refundOrders = getRefundOrders();
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
        <h1>Support</h1>
        <button
          className="support__chat-btn"
          onClick={() => openChat({ escalate: true, presetOrder: null, staleOrderId: null, resumeCase: null, intro: CHAT_INTRO.chat })}
        >
          Chat with us
        </button>
      </header>

      <main className="support__content">
        {activeConversations.length > 0 && (
          <section className="support__section">
            <div className="support__section-heading">
              <h2>Active Conversations</h2>
              {activeConversations.length > 2 && (
                <button className="support__see-all" onClick={() => navigate('requests')}>
                  See All
                </button>
              )}
            </div>
            <div className="support__conversation-list">
              {visibleConversations.map((c) => {
                const LaneIcon = LANE_ICON[c.lane] ?? HelpCircleIcon;
                const rawProduct = c.itemProduct ?? c.orderProduct;
                const product = rawProduct ? splitProductSpec(rawProduct).name : null;
                return (
                  <button
                    key={c.id}
                    className="support__conversation-row"
                    onClick={() => openChat({ escalate: c.escalated, presetOrder: null, staleOrderId: null, resumeCase: c })}
                  >
                    <span className="support__conversation-icon" aria-hidden="true">
                      <LaneIcon width="16" height="16" />
                    </span>
                    <span className="support__conversation-text">
                      <span className="support__conversation-title">{c.laneLabel}</span>
                      {product && <span className="support__conversation-product">{product}</span>}
                      <span className="support__conversation-date">
                        {c.orderId ? `${c.orderId} · ` : ''}
                        {formatConversationDate(c.createdAt)}
                      </span>
                    </span>
                    <ChevronRightIcon className="support__conversation-chevron" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {refundOrders.length > 0 && (
          <section className="support__section">
            <div className="support__section-heading">
              <h2>Refunds</h2>
            </div>
            <div className="support__order-help-list">
              {refundOrders.map((order) => (
                <RefundCard key={order.id} order={order} onClick={() => navigate('orderDetails', { orderId: order.id })} />
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
                Raise a request instead
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
