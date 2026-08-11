import { useNavigation } from '../navigation/NavigationContext.jsx';
import { ORDERS, parseOrderDate } from '../data/orders.js';
import { CURRENT_USER, NOTIFICATIONS } from '../data/profile.js';
import { PROMO_BANNERS } from '../data/home.js';
import PromoCarousel from '../components/PromoCarousel.jsx';
import HomeOrderPreviewCard from '../components/HomeOrderPreviewCard.jsx';
import Avatar from '../components/Avatar.jsx';
import Logo from '../components/Logo.jsx';
import { BellIcon } from '../components/icons.jsx';
import './Home.css';

export default function Home() {
  const { switchTab, navigate } = useNavigation();
  const ongoingOrders = ORDERS.filter((o) => o.homeTracker)
    .sort((a, b) => parseOrderDate(b.date) - parseOrderDate(a.date))
    .slice(0, 3);
  const hasUnreadNotifications = NOTIFICATIONS.some((n) => !n.read);

  return (
    <div className="home">
      <header className="home__topbar">
        <Logo className="home__logo" />
        <div className="home__topbar-actions">
          <button className="home__bell-btn" aria-label="Notifications" onClick={() => navigate('notifications')}>
            <BellIcon width="18" height="18" />
            {hasUnreadNotifications && <span className="home__bell-badge" />}
          </button>
          <button className="home__profile-btn" aria-label="Profile" onClick={() => switchTab('profile')}>
            <Avatar initial={CURRENT_USER.avatarInitial} size={32} />
          </button>
        </div>
      </header>

      <main className="home__content">
        <PromoCarousel banners={PROMO_BANNERS} />

        {ongoingOrders.length > 0 && (
          <section className="home__section">
            <div className="home__section-heading">
              <h2>{ongoingOrders.length > 1 ? 'Current Orders' : 'Current Order'}</h2>
              <button className="home__view-all" onClick={() => switchTab('orders')}>
                View all
              </button>
            </div>
            <div className="home__order-list">
              {ongoingOrders.map((order) => (
                <HomeOrderPreviewCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
