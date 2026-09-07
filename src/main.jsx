import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ORDERS } from './data/orders.js';
import { USER_CASES } from './data/support.js';
import { ADDRESSES } from './data/profile.js';
import { hydrate } from './data/persist.js';
// Self-hosted, bundled with the app — the whole point is a Montserrat that
// never falls back to a system font, which the Google Fonts CDN link this
// replaces couldn't guarantee on a slow or flaky connection.
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/global.css';

// Restore whatever the customer did last session before the first render, so
// the app doesn't paint the pristine fixtures and then swap them out.
hydrate({ orders: ORDERS, cases: USER_CASES, addresses: ADDRESSES });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
