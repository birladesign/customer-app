import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import { SECTIONS, ORDERS, PROACTIVE_PROMPT, parseOrderDate } from '../data/orders.js';
import OrderCard from '../components/OrderCard.jsx';
import ProactiveCard from '../components/ProactiveCard.jsx';
import TabBar from '../components/TabBar.jsx';
import SearchAndFilterBar from '../components/SearchAndFilterBar.jsx';
import FilterSheet from '../components/FilterSheet.jsx';
import { HelpCircleIcon, InboxIcon, HouseIcon } from '../components/icons.jsx';
import './MyOrders.css';

const TABS = [
  { key: 'all', label: 'All' },
  ...SECTIONS.filter((s) => s.tabKey === 'active').map((s) => ({ key: s.tabKey, label: s.tabLabel })),
];

export default function MyOrders() {
  const { switchTab } = useNavigation();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState('all');
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingChip, setPendingChip] = useState('All');
  const [appliedChip, setAppliedChip] = useState(null);

  const countsByTab = useMemo(() => {
    const counts = {};
    for (const s of SECTIONS) {
      counts[s.tabKey] = ORDERS.filter((o) => o.section === s.key).length;
    }
    return counts;
  }, []);

  // Tabs/chips filter which orders are eligible, but never change the order
  // they're shown in — the list is always sorted by date, most recent first.
  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    let orders = ORDERS;

    if (activeTab !== 'all') {
      const section = SECTIONS.find((s) => s.tabKey === activeTab);
      orders = orders.filter((o) => o.section === section.key);
    }

    if (appliedChip === 'Returns') {
      orders = orders.filter((o) => o.status.label.toLowerCase().includes('return'));
    }

    if (q) {
      orders = orders.filter(
        (o) => o.id.toLowerCase().includes(q) || o.product.toLowerCase().includes(q)
      );
    }

    return [...orders].sort((a, b) => parseOrderDate(b.date) - parseOrderDate(a.date));
  }, [activeTab, query, appliedChip]);

  const hasAnyResults = filteredOrders.length > 0;
  const isFiltering = query.trim().length > 0 || activeTab !== 'all' || appliedChip;

  function openFilters() {
    setPendingChip(appliedChip ?? 'All');
    setFilterOpen(true);
  }

  function applyFilters() {
    setAppliedChip(pendingChip === 'All' ? null : pendingChip);
    if (pendingChip === 'Active') {
      setActiveTab('active');
    } else if (pendingChip === 'All') {
      setActiveTab('all');
    }
    setFilterOpen(false);
  }

  function clearFilters() {
    setPendingChip('All');
  }

  return (
    <div className="my-orders">
      <div className="my-orders__chrome">
        <header className="my-orders__topbar">
          <div className="my-orders__topbar-left">
            <button className="my-orders__icon-btn" onClick={() => switchTab('home')} aria-label="Home">
              <HouseIcon width="18" height="18" />
            </button>
            <h1>My Orders</h1>
          </div>
          <button className="my-orders__help-btn" onClick={() => switchTab('support', { openChat: true })}>
            <HelpCircleIcon />
            Need Help
          </button>
        </header>

        <SearchAndFilterBar
          query={query}
          onQueryChange={setQuery}
          activeFilterCount={appliedChip ? 1 : 0}
          onOpenFilters={openFilters}
        />

        <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} countsByTab={countsByTab} />
        <div className="my-orders__chrome-edge" />
      </div>

      <motion.main
        className="my-orders__list"
        animate={
          filterOpen && !reduceMotion ? { scale: 0.97, opacity: 0.85 } : { scale: 1, opacity: 1 }
        }
        transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
        style={{ transformOrigin: 'center top' }}
      >
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
                : 'No orders match these filters.'}
            </p>
          </div>
        )}
      </motion.main>

      <FilterSheet
        open={filterOpen}
        selected={pendingChip}
        onSelect={setPendingChip}
        onClear={clearFilters}
        onApply={applyFilters}
        onClose={() => setFilterOpen(false)}
      />
    </div>
  );
}
