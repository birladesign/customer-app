import { useState } from 'react';
import { BellIcon, CheckCircleIcon } from './icons.jsx';
import './ProactiveCard.css';

export default function ProactiveCard({ title, body, actionLabel }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="proactive-card">
      <p className="proactive-card__title">
        {confirmed ? (
          <CheckCircleIcon className="proactive-card__title-icon proactive-card__title-icon--success" aria-hidden="true" />
        ) : (
          <BellIcon className="proactive-card__title-icon" aria-hidden="true" />
        )}
        {confirmed ? 'Order Confirmed' : title}
      </p>
      <p className="proactive-card__body">
        {confirmed ? 'Thanks — your delivery stays on schedule.' : body}
      </p>
      <button
        className={`proactive-card__action${confirmed ? ' proactive-card__action--done' : ''}`}
        onClick={confirmed ? undefined : () => setConfirmed(true)}
        disabled={confirmed}
      >
        {confirmed ? 'Confirmed' : actionLabel}
      </button>
    </div>
  );
}
