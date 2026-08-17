import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Self-hosted, bundled with the app — the whole point is a Montserrat that
// never falls back to a system font, which the Google Fonts CDN link this
// replaces couldn't guarantee on a slow or flaky connection.
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
