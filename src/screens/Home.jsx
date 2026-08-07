import { useNavigation } from '../navigation/NavigationContext.jsx';
import { ORDERS } from '../data/orders.js';
import { QUICK_ACTIONS, PROMO_BANNERS } from '../data/home.js';
import QuickActionTile from '../components/QuickActionTile.jsx';
import PromoCarousel from '../components/PromoCarousel.jsx';
import HomeOrderPreviewCard from '../components/HomeOrderPreviewCard.jsx';
import { BellIcon, TruckIcon, WrenchIcon, ShieldIcon } from '../components/icons.jsx';
import './Home.css';

const QUICK_ACTION_ICON = { truck: TruckIcon, wrench: WrenchIcon, shield: ShieldIcon };

export default function Home() {
  const { switchTab, navigate } = useNavigation();
  const featuredOrder = ORDERS.find((o) => o.homeTracker);

  return (
    <div className="home">
      <header className="home__topbar">
        <span className="home__logo">The Sleep Company</span>
        <button className="home__bell-btn" aria-label="Notifications" onClick={() => navigate('notifications')}>
          <BellIcon width="18" height="18" />
          <span className="home__bell-badge" />
        </button>
      </header>

      <main className="home__content">
        <div className="home__quick-actions">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionTile
              key={action.key}
              icon={QUICK_ACTION_ICON[action.icon]}
              label={action.label}
              onClick={action.key === 'track' ? () => switchTab('orders') : undefined}
            />
          ))}
        </div>

        <PromoCarousel banners={PROMO_BANNERS} />

        {featuredOrder && (
          <section className="home__section">
            <div className="home__section-heading">
              <h2>Current Order</h2>
              <button className="home__view-all" onClick={() => switchTab('orders')}>
                View all
              </button>
            </div>
            <HomeOrderPreviewCard order={featuredOrder} />
          </section>
        )}
      </main>
    </div>
  );
}
