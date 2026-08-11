import { useMemo, useState } from 'react';
import { SECTIONS, ORDERS, PROACTIVE_PROMPT, parseOrderDate } from '../data/orders.js';
import OrderCard from '../components/OrderCard.jsx';
import ProactiveCard from '../components/ProactiveCard.jsx';
import TabBar from '../components/TabBar.jsx';
import SearchAndFilterBar from '../components/SearchAndFilterBar.jsx';
import { InboxIcon } from '../components/icons.jsx';
import './MyOrders.css';

const TABS = [
  { key: 'all', label: 'All' },
  ...SECTIONS.filter((s) => s.tabKey === 'active' || s.tabKey === 'closed').map((s) => ({ key: s.tabKey, label: s.tabLabel })),
];

export default function MyOrders() {
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

  const hasAnyResults = filteredOrders.length > 0;
  const isFiltering = query.trim().length > 0 || activeTab !== 'all';

  return (
    <div className="my-orders">
      <div className="my-orders__chrome">
        <header className="my-orders__topbar">
          <div className="my-orders__topbar-left">
            <h1>My Orders</h1>
          </div>
        </header>

        <SearchAndFilterBar query={query} onQueryChange={setQuery} />

        <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} countsByTab={countsByTab} />
        <div className="my-orders__chrome-edge" />
      </div>

      <main className="my-orders__list">
        {activeTab === 'all' && !isFiltering && <ProactiveCard {...PROACTIVE_PROMPT} />}

        {hasAnyResults ? (
          <div className="my-orders__cards">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
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
