import { useNavigation } from '../navigation/NavigationContext.jsx';
import { getOrderStatus } from '../data/orders.js';
import Tracker from './Tracker.jsx';
import { ChevronRightIcon } from './icons.jsx';
import './HomeOrderPreviewCard.css';

// Deliberately separate from OrderCard — OrderCard carries banner/actions/
// rating/copy-id concerns that don't apply to this compact dashboard peek.
export default function HomeOrderPreviewCard({ order }) {
  const { navigate } = useNavigation();
  const status = getOrderStatus(order);

  return (
    <article
      className="home-order-preview-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate('orderDetails', { orderId: order.id })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate('orderDetails', { orderId: order.id });
        }
      }}
    >
      <div className="home-order-preview-card__header">
        <img className="home-order-preview-card__image" src={order.image} alt={order.product} />
        <div className="home-order-preview-card__text">
          <p className="home-order-preview-card__product">{order.product}</p>
          <p className="home-order-preview-card__status">{status.label}</p>
        </div>
        <ChevronRightIcon className="home-order-preview-card__chevron" aria-hidden="true" />
      </div>
      <Tracker steps={order.homeTracker.steps} currentIndex={order.homeTracker.currentIndex} />
    </article>
  );
}
