import { useNavigation } from '../navigation/NavigationContext.jsx';
import { HouseIcon, HouseFilledIcon, PackageIcon, PackageFilledIcon, HeadsetIcon, HeadsetFilledIcon } from './icons.jsx';
import './BottomTabBar.css';

const TABS = [
  { key: 'home', label: 'Home', Icon: HouseIcon, FilledIcon: HouseFilledIcon },
  { key: 'orders', label: 'My Orders', Icon: PackageIcon, FilledIcon: PackageFilledIcon },
  { key: 'support', label: 'Support', Icon: HeadsetIcon, FilledIcon: HeadsetFilledIcon },
];

// A floating glass pill, not a full-width bar — sits above content with
// margin on every side so it reads as its own material layer. The active
// tab swaps to its filled icon variant and a darker color — no shape
// change, no resize — so switching tabs never shifts anyone's layout.
// Present on every screen, pushed or not — only hidden while there's no
// tab context at all (login/onboarding).
export default function BottomTabBar() {
  const { activeTab, switchTab } = useNavigation();
  if (!activeTab) return null;

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
            <TabIcon width="20" height="20" strokeWidth={2} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
