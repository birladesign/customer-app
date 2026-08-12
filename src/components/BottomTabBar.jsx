import { motion, useReducedMotion } from 'motion/react';
import { useNavigation } from '../navigation/NavigationContext.jsx';
import { SPRING_STANDARD, DURATION_REDUCED } from '../motion.js';
import { ORDERS } from '../data/orders.js';
import { HouseIcon, HouseFilledIcon, PackageIcon, PackageFilledIcon, HeadsetIcon, HeadsetFilledIcon } from './icons.jsx';
import './BottomTabBar.css';

const TABS = [
  { key: 'home', label: 'Home', Icon: HouseIcon, FilledIcon: HouseFilledIcon },
  { key: 'orders', label: 'My Orders', Icon: PackageIcon, FilledIcon: PackageFilledIcon },
  { key: 'support', label: 'Support', Icon: HeadsetIcon, FilledIcon: HeadsetFilledIcon },
];

// A floating glass pill, not a full-width bar — sits above content with
// margin on every side so it reads as its own material layer.
//
// The active tab gets three signals, not just one: a soft tinted capsule
// slides in behind it (layoutId — every tab occupies an equal flex:1
// column, so the capsule is always the same size and only ever slides,
// never resizes/stretches chasing a wider or narrower label), its icon
// swaps to the filled variant and springs up slightly, and its label
// darkens. My Orders also carries a small dot when something in there
// needs the customer's attention, the same badge language as Home's bell.
//
// Present on every screen, pushed or not — only hidden while there's no
// tab context at all (login/onboarding).
export default function BottomTabBar() {
  const { activeTab, switchTab, hideTabBar } = useNavigation();
  const reduceMotion = useReducedMotion();
  if (!activeTab || hideTabBar) return null;

  const hasOrdersNeedingAttention = ORDERS.some((o) => o.section === 'needsAttention');

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
            {active && (
              <motion.span
                layoutId="bottom-tab-bar__indicator"
                className="bottom-tab-bar__indicator"
                transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
              />
            )}
            <motion.span
              className="bottom-tab-bar__icon"
              animate={{ scale: active ? 1.1 : 1 }}
              transition={reduceMotion ? DURATION_REDUCED : SPRING_STANDARD}
            >
              <TabIcon width="20" height="20" strokeWidth={2} />
              {key === 'orders' && hasOrdersNeedingAttention && (
                <span className="bottom-tab-bar__badge" aria-hidden="true" />
              )}
            </motion.span>
            <span className="bottom-tab-bar__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
