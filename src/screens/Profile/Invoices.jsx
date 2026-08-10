import { useState } from 'react';
import { getInvoiceOrders } from '../../data/profile.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import SearchAndFilterBar from '../../components/SearchAndFilterBar.jsx';
import { ChevronLeftIcon, InboxIcon, FileTextIcon, ShieldIcon } from '../../components/icons.jsx';
import './Invoices.css';

function yearOf(dateStr) {
  return dateStr.split(' ').pop();
}

export default function Invoices() {
  const { goBack } = useNavigation();
  const [query, setQuery] = useState('');
  const orders = getInvoiceOrders();

  const q = query.trim().toLowerCase();
  const filtered = q
    ? orders.filter((o) => o.id.toLowerCase().includes(q) || o.product.toLowerCase().includes(q))
    : orders;

  // Orders already arrive sorted by date descending — a lightweight year
  // divider (rather than a full groupBy) is enough to orient a long list
  // without re-sorting or restructuring the data.
  let lastYear = null;

  return (
    <div className="invoices">
      <header className="invoices__topbar">
        <button className="invoices__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Invoices</h1>
        <span className="invoices__icon-btn-spacer" />
      </header>

      <div className="invoices__search-row">
        <SearchAndFilterBar
          query={query}
          onQueryChange={setQuery}
          activeFilterCount={0}
          placeholder="Search invoices"
        />
      </div>

      <main className="invoices__content">
        {filtered.length === 0 ? (
          <div className="invoices__empty">
            <InboxIcon className="invoices__empty-icon" aria-hidden="true" />
            <p className="invoices__empty-title">No invoices found</p>
            <p className="invoices__empty-body">
              No results for "{query}". Try a different order number or product name.
            </p>
          </div>
        ) : (
          filtered.map((order) => {
            const year = yearOf(order.date);
            const showYear = year !== lastYear;
            lastYear = year;
            return (
              <div key={order.id}>
                {showYear && <p className="invoices__year-divider">{year}</p>}
                <div className="invoices__card">
                  <div className="invoices__card-header">
                    <img className="invoices__thumb" src={order.image} alt={order.product} />
                    <div className="invoices__card-text">
                      <p className="invoices__product">{order.product}</p>
                      <p className="invoices__order-meta">
                        {order.id} · {order.date}
                      </p>
                      {(order.qty || order.color) && (
                        <p className="invoices__meta">
                          {order.qty && <span>Qty: {order.qty}</span>}
                          {order.color && <span>Color: {order.color}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="invoices__divider" />
                  <div className="invoices__actions">
                    <button className="invoices__warranty-link">
                      <ShieldIcon width="14" height="14" />
                      Warranty
                    </button>
                    <button className="invoices__download-btn">
                      <FileTextIcon width="14" height="14" />
                      Download Invoice
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
