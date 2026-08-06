import { BellIcon } from './icons.jsx';
import './ProactiveCard.css';

export default function ProactiveCard({ title, body, actionLabel }) {
  return (
    <div className="proactive-card">
      <p className="proactive-card__title">
        <BellIcon className="proactive-card__title-icon" aria-hidden="true" />
        {title}
      </p>
      <p className="proactive-card__body">{body}</p>
      <button className="proactive-card__action">{actionLabel}</button>
    </div>
  );
}
