import { useState } from 'react';
import { NOTIFICATIONS } from '../../data/profile.js';
import { useNavigation } from '../../navigation/NavigationContext.jsx';
import { ChevronLeftIcon } from '../../components/icons.jsx';
import './Notifications.css';

export default function Notifications() {
  const { goBack } = useNavigation();
  const [items, setItems] = useState(NOTIFICATIONS);

  function markRead(id) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  return (
    <div className="notifications">
      <header className="notifications__topbar">
        <button className="notifications__icon-btn" onClick={goBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <h1>Notifications</h1>
        <span className="notifications__icon-btn-spacer" />
      </header>

      <main className="notifications__content">
        {items.map((n) => (
          <button
            key={n.id}
            className={`notifications__card${n.read ? ' notifications__card--read' : ''}`}
            onClick={() => markRead(n.id)}
          >
            <div className="notifications__card-header">
              <p className="notifications__card-title">{n.title}</p>
              <span className="notifications__card-meta">
                <span className="notifications__timestamp">{n.timestamp}</span>
                {!n.read && <span className="notifications__dot" aria-hidden="true" />}
              </span>
            </div>
            <p className="notifications__card-body">{n.body}</p>
          </button>
        ))}
      </main>
    </div>
  );
}
