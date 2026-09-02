import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SECTIONS, ORDERS, parseOrderDate } from '../data/orders.js';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import OrderCard from '../components/OrderCard.jsx';
import ShipmentCard from '../components/ShipmentCard.jsx';
import MultiShipmentOrderCard from '../components/MultiShipmentOrderCard.jsx';
import TabBar from '../components/TabBar.jsx';
import SearchAndFilterBar from '../components/SearchAndFilterBar.jsx';
import { InboxIcon, HelpCircleIcon } from '../components/icons.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import './MyOrders.css';

const TABS = [
  { key: 'all', label: 'All' },
  ...SECTIONS.filter((s) => s.tabKey === 'active').map((s) => ({ key: s.tabKey, label: s.tabLabel })),
];

// Orders sharing a shipmentId travelled together as multiple units of one SKU;
// they collapse into a single ShipmentCard rather than repeating an identical
// card per unit. Everything else passes through as its own entry. Order within
// the list is preserved — a group takes the position of its first member, so
// the date sort applied upstream still holds.
function groupByShipment(orders) {
  const entries = [];
  const groupIndexById = new Map();

  for (const order of orders) {
    if (!order.shipmentId) {
      entries.push({ key: order.id, order });
      continue;
    }
    const existing = groupIndexById.get(order.shipmentId);
    if (existing == null) {
      groupIndexById.set(order.shipmentId, entries.length);
      entries.push({ key: order.shipmentId, shipment: [order] });
    } else {
      entries[existing].shipment.push(order);
    }
  }

  // A shipment that ends up with a single unit (the rest filtered out by tab
  // or search) has nothing to collapse — show it as an ordinary card.
  return entries.map((entry) =>
    entry.shipment?.length === 1 ? { key: entry.shipment[0].id, order: entry.shipment[0] } : entry
  );
}

export default function MyOrders() {
  const { switchTab } = useNavigation();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState('all');
  const [query, setQuery] = useState('');

  const countsByTab = useMemo(() => {
    const counts = {};
    for (const s of SECTIONS) {
      counts[s.tabKey] = ORDERS.filter((o) => o.section === s.key).length;
    }
    return counts;
  }, []);

  // Tabs filter which orders are eligible, but never change the order
  // they're shown in — the list is always sorted by date, most recent first.
  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    let orders = ORDERS;

    if (activeTab !== 'all') {
      const section = SECTIONS.find((s) => s.tabKey === activeTab);
      orders = orders.filter((o) => o.section === section.key);
    }

    if (q) {
      orders = orders.filter(
        (o) => o.id.toLowerCase().includes(q) || o.product.toLowerCase().includes(q)
      );
    }

    return [...orders].sort((a, b) => parseOrderDate(b.date) - parseOrderDate(a.date));
  }, [activeTab, query]);

  const listEntries = useMemo(() => groupByShipment(filteredOrders), [filteredOrders]);

  const hasAnyResults = filteredOrders.length > 0;

  return (
    <div className="my-orders">
      <div className="my-orders__chrome">
        <header className="my-orders__topbar">
          <div className="my-orders__topbar-left">
            <h1>My Orders</h1>
          </div>
          <button className="my-orders__help-btn" onClick={() => switchTab('support', { openChat: true })}>
            <HelpCircleIcon width="14" height="14" />
            Need Help
          </button>
        </header>

        <SearchAndFilterBar query={query} onQueryChange={setQuery} />

        <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} countsByTab={countsByTab} />
        <div className="my-orders__chrome-edge" />
      </div>

      <main className="my-orders__list">
        {hasAnyResults ? (
          <div className="my-orders__cards">
            {/* Switching tabs or typing a search query changes which cards
                are eligible — without this, the list jump-cuts instead of
                reading as the same list settling into a new shape. `layout`
                lets survivors glide into their new position; entries that
                actually leave/arrive fade rather than snap. initial={false}
                skips animating the very first paint. */}
            <AnimatePresence initial={false}>
              {listEntries.map((entry) => (
                <motion.div
                  key={entry.key}
                  layout={!reduceMotion}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
                >
                  {entry.shipment ? (
                    <ShipmentCard orders={entry.shipment} />
                  ) : entry.order.items?.[0]?.shipmentGroupId ? (
                    <MultiShipmentOrderCard order={entry.order} />
                  ) : (
                    <OrderCard order={entry.order} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="my-orders__empty">
            <InboxIcon className="my-orders__empty-icon" aria-hidden="true" />
            <p className="my-orders__empty-title">No orders found</p>
            <p className="my-orders__empty-body">
              {query.trim()
                ? `No results for "${query}". Try a different order number or product name.`
                : 'No orders in this tab.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
