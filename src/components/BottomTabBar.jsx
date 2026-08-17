import { useNavigation } from '../navigation/NavigationContext.jsx';
import { HouseIcon, HouseFilledIcon, PackageIcon, PackageFilledIcon, HeadsetIcon, HeadsetFilledIcon } from './icons.jsx';
import './BottomTabBar.css';

const TABS = [
  { key: 'home', label: 'Home', Icon: HouseIcon, FilledIcon: HouseFilledIcon },
  { key: 'orders', label: 'My Orders', Icon: PackageIcon, FilledIcon: PackageFilledIcon },
  { key: 'support', label: 'Support', Icon: HeadsetIcon, FilledIcon: HeadsetFilledIcon },
];

// A fixed, full-width bar docked to the bottom edge — not a floating pill.
// The active tab has exactly one signal: its icon swaps to the filled
// variant. No sliding capsule, no label recoloring, no scale bump — the
// icon fill is the whole story.
//
// Present on every screen, pushed or not — only hidden while there's no
// tab context at all (login/onboarding).
export default function BottomTabBar() {
  const { activeTab, switchTab, hideTabBar } = useNavigation();
  if (!activeTab || hideTabBar) return null;

  return (
    <nav className="bottom-tab-bar">
      {TABS.map(({ key, label, Icon, FilledIcon }) => {
        const active = activeTab === key;
        const TabIcon = active ? FilledIcon : Icon;
        return (
          <button
            key={key}
            className={`bottom-tab-bar__tab${active ? ' bottom-tab-bar__tab--active' : ''}`}
            onClick={() => switchTab(key)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottom-tab-bar__icon">
              <TabIcon width="20" height="20" strokeWidth={2} />
            </span>
            <span className="bottom-tab-bar__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
