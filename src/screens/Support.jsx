import { HeadsetIcon } from '../components/icons.jsx';
import './Support.css';

// Placeholder tab root — the real support journey (FAQ, case filing, chat)
// lives on the support-journey branch, not main. This just holds the tab's
// place until that's ready to ship here.
export default function Support() {
  return (
    <div className="support">
      <header className="support__topbar">
        <h1>Support</h1>
      </header>
      <main className="support__content">
        <span className="support__icon">
          <HeadsetIcon width="28" height="28" />
        </span>
        <p className="support__title">Work in Progress</p>
        <p className="support__body">We're building this out — check back soon.</p>
      </main>
    </div>
  );
}
