import { useState } from 'react';
import { getInvoiceOrders } from '../../data/profile.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import SearchAndFilterBar from '../../components/SearchAndFilterBar.jsx';
import { ChevronLeftIcon, InboxIcon } from '../../components/icons.jsx';
import './Invoices.css';

export default function Invoices() {
  const { goBack } = useNavigation();
  const [query, setQuery] = useState('');
  const orders = getInvoiceOrders();

  const q = query.trim().toLowerCase();
  const filtered = q
    ? orders.filter((o) => o.id.toLowerCase().includes(q) || o.product.toLowerCase().includes(q))
    : orders;

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
          filtered.map((order) => (
            <div className="invoices__card" key={order.id}>
              <div className="invoices__card-header">
                <img className="invoices__thumb" src={order.image} alt={order.product} />
                <div className="invoices__card-text">
                  <p className="invoices__product">{order.product}</p>
                  {(order.qty || order.color) && (
                    <p className="invoices__meta">
                      {order.qty && <span>Qty: {order.qty}</span>}
                      {order.color && <span>Color: {order.color}</span>}
                    </p>
                  )}
                </div>
              </div>
              <div className="invoices__actions">
                <button className="invoices__action-btn">Warranty</button>
                <button className="invoices__action-btn">Invoice</button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
