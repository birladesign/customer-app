import { useNavigation } from '../navigation/NavigationContext.jsx';
import { HouseIcon, PackageIcon, HeadsetIcon, UserIcon } from './icons.jsx';
import './BottomTabBar.css';

const TABS = [
  { key: 'home', label: 'Home', Icon: HouseIcon },
  { key: 'orders', label: 'Orders', Icon: PackageIcon },
  { key: 'support', label: 'Support', Icon: HeadsetIcon },
  { key: 'profile', label: 'Profile', Icon: UserIcon },
];

// Only visible on a tab's own root (depth 1) — the moment anything is pushed
// (Order Details, Return & Replace, Payment Details) it disappears rather
// than competing with that screen's own back affordance.
export default function BottomTabBar() {
  const { depth, activeTab, switchTab } = useNavigation();
  if (depth > 1) return null;

  return (
    <nav className="bottom-tab-bar">
      {TABS.map(({ key, label, Icon }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            className={`bottom-tab-bar__tab${active ? ' bottom-tab-bar__tab--active' : ''}`}
            onClick={() => switchTab(key)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon width="22" height="22" strokeWidth={active ? 2.5 : 2} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
